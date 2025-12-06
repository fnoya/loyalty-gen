# Firestore Search Solution Design

## Context
This document outlines the viable solution for implementing server-side search in Firestore for the LoyaltyGen platform, addressing issue #17.

## Current Requirements
Based on issue #17, the search functionality must:
1. Search by multiple name components: First Name, Second Name, First Surname, Second Surname
2. Search by identity document number
3. Search by phone number
4. Support queries like "Francisco Noya" → firstName startsWith "Francisco" AND firstSurname startsWith "Noya"
5. Support queries like "2889956" → identity document startsWith "2889956" OR phone endsWith "2889956"

## Firestore Query Capabilities & Limitations

### What Firestore Supports
- **Range queries**: `>=`, `<=`, `>`, `<` operators
- **Equality queries**: `==` operator
- **Array membership**: `array-contains`, `array-contains-any`
- **IN queries**: `in` operator (up to 10 values)
- **Compound queries**: Multiple `where` clauses with restrictions
- **Ordering**: `orderBy` clauses

### What Firestore Does NOT Support
- **Native `startsWith`**: Must be simulated using range queries (`>= 'prefix'` and `< 'prefix\uf8ff'`)
- **Native `endsWith`**: No native support
- **OR queries**: Limited support (only through `in` or `array-contains-any`, not arbitrary OR conditions)
- **Full-text search**: No native full-text search capabilities
- **Case-insensitive queries**: All queries are case-sensitive

### Firestore Compound Query Restrictions
- Can use only ONE inequality filter (`>`, `<`, `>=`, `<=`) per query
- If using inequality, the first `orderBy` must be on the same field
- Cannot perform range queries on multiple different fields in the same query
- OR conditions require multiple separate queries or special operators

## Viable Solution for MVP

### Phase 1: Data Model Updates

#### Updated Client Schema
```typescript
{
  id: string,
  // Separate name fields for search
  firstName: string,          // Primer Nombre (required)
  secondName?: string,         // Segundo Nombre (optional)
  firstSurname: string,        // Primer Apellido (required)
  secondSurname?: string,      // Segundo Apellido (optional)
  
  // Searchable fields (lowercase for case-insensitive search)
  firstName_lower: string,     // toLowerCase() version
  secondName_lower?: string,   // toLowerCase() version
  firstSurname_lower: string,  // toLowerCase() version
  secondSurname_lower?: string,// toLowerCase() version
  
  // Contact information
  email?: string,
  phoneNumbers?: string[],     // Array of phone numbers
  
  // Identity document
  identity_document?: {
    type: string,
    number: string,
    number_lower: string       // toLowerCase() version for case-insensitive search
  },
  
  // Existing fields
  extra_data: object,
  created_at: timestamp,
  updated_at: timestamp,
  affinityGroupIds: string[],
  account_balances: object
}
```

### Phase 2: Search Strategy

Given Firestore's limitations, we'll implement a **multi-query approach** that performs separate queries and merges results:

#### Search Pattern Recognition
1. **Name-based search** (contains spaces or only letters):
   - Parse input to extract name components
   - Example: "Francisco Noya" → ["Francisco", "Noya"]
   
2. **Number/Code search** (contains digits):
   - Search identity document numbers
   - Search phone numbers

#### Implementation Approach

##### A. Name Search (e.g., "Francisco Noya")
```typescript
// Parse: "Francisco Noya" → firstName="Francisco", surname="Noya"
// Execute TWO separate queries (due to Firestore inequality limitation):

// Query 1: Search by firstName
where('firstName_lower', '>=', 'francisco')
where('firstName_lower', '<', 'francisco\uf8ff')

// Query 2: Search by firstSurname  
where('firstSurname_lower', '>=', 'noya')
where('firstSurname_lower', '<', 'noya\uf8ff')

// Merge results and find intersection (clients matching BOTH conditions)
```

##### B. Document Number Search (e.g., "2889956")
```typescript
// Query: Search identity document
where('identity_document.number_lower', '>=', '2889956')
where('identity_document.number_lower', '<', '2889956\uf8ff')
```

##### C. Phone Number Search (e.g., "2889956")
**Problem**: Firestore doesn't support `endsWith`

**Solutions** (choose based on complexity/performance tradeoffs):

**Option 1: Store reversed phone numbers** (Recommended for MVP)
```typescript
// Store: phoneNumbers = ["099123456"]
//        phoneNumbers_reversed = ["654321990"]

// Search for endsWith("123456"):
where('phoneNumbers_reversed', 'array-contains-any', ['654321'])
```

**Option 2: Partial phone search array**
```typescript
// Store all suffixes in an array
// phoneNumbers = ["099123456"]
// phoneSearchTerms = ["099123456", "99123456", "9123456", "123456", "23456", "3456", "456", "56", "6"]

// Search:
where('phoneSearchTerms', 'array-contains', '123456')
```

**Option 3: StartsWith only** (Simplified approach)
```typescript
// Only support prefix search for phone numbers
where('phoneNumbers', 'array-contains', '099')
```

**Recommendation**: For MVP, use **Option 3** (startsWith only) and document the limitation. This avoids storing additional denormalized data and complex indexing.

### Phase 3: Search API Endpoint

#### Endpoint Design
```
GET /api/v1/clients/search?q={query}&limit={limit}&next_cursor={cursor}
```

#### Query Parameter
- `q`: Search query string
  - Name search: "Francisco", "Francisco Noya", "Noya Lopez"
  - Number search: "2889956", "099123456"
- `limit`: Results per page (default 30, max 100)
- `next_cursor`: Pagination cursor

#### Response Format
```json
{
  "data": [
    {
      "id": "client_id",
      "firstName": "Francisco",
      "secondName": "José",
      "firstSurname": "Noya",
      "secondSurname": "López",
      "email": "francisco@example.com",
      "phoneNumbers": ["099123456"],
      "identity_document": {
        "type": "cedula_identidad",
        "number": "2889956"
      },
      // ... other fields
    }
  ],
  "paging": {
    "next_cursor": "...",
    "has_more": true
  },
  "metadata": {
    "total_results": 5,
    "query": "Francisco Noya",
    "search_type": "name"
  }
}
```

### Phase 4: Required Firestore Indexes

Firestore requires composite indexes for compound queries:

```yaml
# firestore.indexes.json
indexes:
  - collectionGroup: clients
    queryScope: COLLECTION
    fields:
      - fieldPath: firstName_lower
        order: ASCENDING
      - fieldPath: firstSurname_lower
        order: ASCENDING
        
  - collectionGroup: clients
    queryScope: COLLECTION
    fields:
      - fieldPath: identity_document.number_lower
        order: ASCENDING
```

## Search Algorithm Pseudocode

```typescript
async function searchClients(query: string): Promise<Client[]> {
  const normalizedQuery = query.trim().toLowerCase();
  
  // Determine search type
  const hasDigits = /\d/.test(normalizedQuery);
  const hasMultipleWords = normalizedQuery.split(/\s+/).length > 1;
  
  let results: Client[] = [];
  
  if (!hasDigits && hasMultipleWords) {
    // NAME SEARCH: "Francisco Noya"
    const words = normalizedQuery.split(/\s+/);
    const firstName = words[0];
    const surname = words[1];
    
    // Query 1: Search by firstName
    const query1Results = await db.collection('clients')
      .where('firstName_lower', '>=', firstName)
      .where('firstName_lower', '<', firstName + '\uf8ff')
      .get();
    
    // Query 2: Search by firstSurname
    const query2Results = await db.collection('clients')
      .where('firstSurname_lower', '>=', surname)
      .where('firstSurname_lower', '<', surname + '\uf8ff')
      .get();
    
    // Find intersection
    results = findIntersection(query1Results, query2Results);
    
  } else if (!hasDigits) {
    // SINGLE WORD NAME SEARCH: "Francisco"
    // Search across firstName, secondName, firstSurname, secondSurname
    
    const queries = [
      db.collection('clients').where('firstName_lower', '>=', normalizedQuery).where('firstName_lower', '<', normalizedQuery + '\uf8ff'),
      db.collection('clients').where('secondName_lower', '>=', normalizedQuery).where('secondName_lower', '<', normalizedQuery + '\uf8ff'),
      db.collection('clients').where('firstSurname_lower', '>=', normalizedQuery).where('firstSurname_lower', '<', normalizedQuery + '\uf8ff'),
      db.collection('clients').where('secondSurname_lower', '>=', normalizedQuery).where('secondSurname_lower', '<', normalizedQuery + '\uf8ff'),
    ];
    
    const queryResults = await Promise.all(queries.map(q => q.get()));
    results = mergeAndDeduplicate(queryResults);
    
  } else {
    // NUMBER SEARCH: "2889956"
    
    // Query 1: Identity document
    const docResults = await db.collection('clients')
      .where('identity_document.number_lower', '>=', normalizedQuery)
      .where('identity_document.number_lower', '<', normalizedQuery + '\uf8ff')
      .get();
    
    // Query 2: Phone numbers (startsWith only for MVP)
    // Note: This is limited - we only find phones that START with the query
    // Full endsWith would require reversed phone storage
    const phoneResults = await db.collection('clients')
      .where('phoneNumbers', 'array-contains', normalizedQuery)
      .get();
    
    results = mergeAndDeduplicate([docResults, phoneResults]);
  }
  
  return results;
}
```

## Migration Strategy

### For Existing Clients
If there are existing clients with the old schema:
1. Run a migration script to split `name` field into firstName/firstSurname
2. Generate lowercase versions of all searchable fields
3. Update Firestore security rules to require new fields

### For New Clients
All new clients must provide separated name fields in the API.

## Limitations & Future Enhancements

### MVP Limitations
1. **Phone search**: Only supports `startsWith`, not `endsWith`
2. **Case sensitivity**: Requires storing lowercase duplicates
3. **Complex queries**: Multiple separate queries needed for name+surname search
4. **Performance**: O(n) intersection for multi-field name searches
5. **No fuzzy matching**: Exact prefix match only
6. **No typo tolerance**: Must match exactly

### Future Enhancements (Post-MVP)
When scaling beyond Firestore's capabilities:
1. Integrate **Algolia** or **Elasticsearch** for full-text search
2. Implement fuzzy matching and typo tolerance
3. Add search analytics
4. Support complex boolean queries
5. Implement search suggestions/autocomplete
6. Add search ranking/relevance scoring

## Recommendations

### For MVP (Immediate Implementation)
- ✅ Split name into separate fields (firstName, secondName, firstSurname, secondSurname)
- ✅ Store lowercase versions for case-insensitive search
- ✅ Support multi-word name searches with query intersection
- ✅ Support identity document prefix search
- ✅ Support phone number prefix search (NOT endsWith due to complexity)
- ✅ Document limitations clearly in API documentation

### For Post-MVP (Future Phase)
- ⏭️ Integrate Algolia/Elasticsearch when user base grows
- ⏭️ Implement reversed phone numbers for endsWith support
- ⏭️ Add comprehensive search analytics

## Conclusion

This solution provides a viable search implementation within Firestore's constraints for the MVP. While not perfect, it addresses the core requirements:
- ✅ Server-side search (not client-side)
- ✅ Search by name components
- ✅ Search by identity document
- ✅ Partial phone search support
- ⚠️ Limitation: Phone endsWith not supported in MVP

The architecture is designed to be replaceable with a dedicated search service (Algolia/Elasticsearch) in the future without major refactoring.
