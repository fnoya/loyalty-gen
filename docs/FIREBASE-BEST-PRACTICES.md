# Firebase Best Practices - LoyaltyGen

This document contains critical best practices learned from implementing and testing the LoyaltyGen backend with Firebase. These patterns are **required** for all Firebase/Firestore operations.

## 🔥 Critical Rules

### 1. FieldValue Imports

**ALWAYS** import `FieldValue` directly from `firebase-admin/firestore`:

```typescript
// ✅ CORRECT
import { FieldValue } from "firebase-admin/firestore";

// ❌ WRONG - undefined in emulator environments
const FieldValue = admin.firestore.FieldValue;
```

### 2. Server Timestamps

**NEVER** use `admin.firestore.Timestamp.now()` - it's undefined in emulators.

**For writes:**
```typescript
await docRef.set({
  name: "Example",
  created_at: FieldValue.serverTimestamp(),
  updated_at: FieldValue.serverTimestamp()
});
```

**For reads:**
```typescript
const doc = await docRef.get();
const data = doc.data()!;

return schema.parse({
  id: doc.id,
  name: data.name,
  created_at: data.created_at.toDate ? data.created_at.toDate() : data.created_at,
  updated_at: data.updated_at.toDate ? data.updated_at.toDate() : data.updated_at
});
```

### 3. Validation with Server Timestamps

**NEVER** validate objects containing `FieldValue.serverTimestamp()` - it's a sentinel value, not a Date:

```typescript
// ✅ CORRECT Pattern
async createEntity(data: CreateRequest): Promise<Entity> {
  const docRef = this.firestore.collection("entities").doc();
  
  // 1. Write with sentinel
  await docRef.set({
    name: data.name,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp()
  });
  
  // 2. Fetch to get actual timestamps
  const doc = await docRef.get();
  const docData = doc.data()!;
  
  // 3. Convert and validate
  return entitySchema.parse({
    id: doc.id,
    name: docData.name,
    created_at: docData.created_at.toDate(),
    updated_at: docData.updated_at.toDate()
  });
}

// ❌ WRONG - will fail Zod validation
const entity = {
  id: docRef.id,
  name: data.name,
  created_at: FieldValue.serverTimestamp(), // ❌ Not a Date!
  updated_at: FieldValue.serverTimestamp()  // ❌ Not a Date!
};
return entitySchema.parse(entity); // ❌ Validation error!
```

### 4. Array Operations

Use imported `FieldValue` for array operations:

```typescript
// ✅ CORRECT
await clientRef.update({
  affinityGroupIds: FieldValue.arrayUnion(groupId)
});

// ❌ WRONG - undefined in emulators
await clientRef.update({
  affinityGroupIds: admin.firestore.FieldValue.arrayUnion(groupId)
});
```

### 5. Transactions with Timestamps

After a transaction completes, **refetch** to get actual server timestamps:

```typescript
// ✅ CORRECT
async creditPoints(accountId: string, amount: number): Promise<Account> {
  const accountRef = this.firestore.collection("accounts").doc(accountId);
  
  // Execute transaction with sentinel
  await this.firestore.runTransaction(async (transaction) => {
    const doc = await transaction.get(accountRef);
    const currentPoints = doc.data()!.points;
    
    transaction.update(accountRef, {
      points: currentPoints + amount,
      updated_at: FieldValue.serverTimestamp() // ✅ Sentinel
    });
  });
  
  // Fetch after transaction to get actual timestamp
  const updatedDoc = await accountRef.get();
  const data = updatedDoc.data()!;
  
  return accountSchema.parse({
    id: updatedDoc.id,
    points: data.points,
    created_at: data.created_at.toDate(),
    updated_at: data.updated_at.toDate() // ✅ Now it's a real Timestamp
  });
}

// ❌ WRONG - can't validate sentinel in return value
async creditPoints(accountId: string, amount: number): Promise<Account> {
  const result = await this.firestore.runTransaction(async (transaction) => {
    // ... transaction logic ...
    return {
      id: accountId,
      points: newPoints,
      updated_at: FieldValue.serverTimestamp() // ❌ Sentinel!
    };
  });
  
  return accountSchema.parse(result); // ❌ Validation will fail!
}
```

## 📋 Common Patterns

### Create Operation

```typescript
async create(request: CreateRequest): Promise<Entity> {
  const docRef = this.firestore.collection("entities").doc();
  
  await docRef.set({
    field1: request.field1,
    field2: request.field2,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp()
  });
  
  const doc = await docRef.get();
  const data = doc.data()!;
  
  return entitySchema.parse({
    id: doc.id,
    field1: data.field1,
    field2: data.field2,
    created_at: data.created_at.toDate(),
    updated_at: data.updated_at.toDate()
  });
}
```

### Update Operation

```typescript
async update(id: string, request: UpdateRequest): Promise<Entity> {
  const docRef = this.firestore.collection("entities").doc(id);
  
  await docRef.update({
    ...request,
    updated_at: FieldValue.serverTimestamp()
  });
  
  const doc = await docRef.get();
  const data = doc.data()!;
  
  return entitySchema.parse({
    id: doc.id,
    ...data,
    created_at: data.created_at.toDate(),
    updated_at: data.updated_at.toDate()
  });
}
```

### List Operation

```typescript
async list(): Promise<Entity[]> {
  const snapshot = await this.firestore
    .collection("entities")
    .orderBy("created_at", "desc")
    .get();
  
  const entities: Entity[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    entities.push(
      entitySchema.parse({
        id: doc.id,
        field1: data.field1,
        field2: data.field2,
        created_at: data.created_at.toDate ? data.created_at.toDate() : data.created_at,
        updated_at: data.updated_at.toDate ? data.updated_at.toDate() : data.updated_at
      })
    );
  });
  
  return entities;
}
```

### Atomic Transaction with Denormalization

```typescript
async atomicUpdate(id: string, data: UpdateData): Promise<Entity> {
  const entityRef = this.firestore.collection("entities").doc(id);
  const relatedRef = this.firestore.collection("related").doc(data.relatedId);
  
  // Execute atomic transaction
  await this.firestore.runTransaction(async (transaction) => {
    const entityDoc = await transaction.get(entityRef);
    if (!entityDoc.exists) throw new NotFoundError("Entity", id);
    
    // Update source of truth
    transaction.update(entityRef, {
      value: data.value,
      updated_at: FieldValue.serverTimestamp()
    });
    
    // Update denormalized data in SAME transaction
    transaction.update(relatedRef, {
      [`entity_data.${id}`]: data.value,
      updated_at: FieldValue.serverTimestamp()
    });
  });
  
  // Refetch to get actual timestamps
  const updatedDoc = await entityRef.get();
  const docData = updatedDoc.data()!;
  
  return entitySchema.parse({
    id: updatedDoc.id,
    ...docData,
    created_at: docData.created_at.toDate(),
    updated_at: docData.updated_at.toDate()
  });
}
```

## 🧪 Testing Considerations

### Integration Tests vs Unit Tests

- **Unit tests** with mocks won't catch FieldValue issues
- **Integration tests** with Firebase emulators are essential
- Emulator behavior matches production for timestamp handling

### Auth in Emulators

For auth emulator, exchange custom token for ID token:

```javascript
// Generate custom token
const customToken = await admin.auth().createCustomToken(uid);

// Exchange for ID token via emulator REST API
const response = await fetch(
  'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true })
  }
);

const { idToken } = await response.json();
// Use idToken in Authorization: Bearer header
```

## 📚 References

- **Phase 4 Integration Report:** `PHASE-4-INTEGRATION-TEST-REPORT.md`
- **Copilot Instructions:** `.github/copilot-instructions.md`
- **Coding Guidelines:** `docs/GUIDELINES.md`

## ⚠️ Common Mistakes to Avoid

| ❌ Wrong | ✅ Correct |
|---------|----------|
| `admin.firestore.Timestamp.now()` | `FieldValue.serverTimestamp()` |
| `admin.firestore.FieldValue` | `import { FieldValue } from "firebase-admin/firestore"` |
| Validate before write | Write → Fetch → Convert → Validate |
| Return sentinel from transaction | Refetch after transaction |
| `data.timestamp` (Firestore Timestamp) | `data.timestamp.toDate()` (JavaScript Date) |

## 🎯 Key Takeaways

1. **FieldValue is imported**, not accessed via `admin.firestore`
2. **Server timestamps are sentinels**, must refetch to get actual values
3. **Zod validation requires Dates**, not FieldValue sentinels or Firestore Timestamps
4. **Atomic transactions** + denormalization = consistency
5. **Integration tests** with emulators are essential for catching these issues

---

**Last Updated:** December 9, 2025  
**Source:** Lessons learned from Phase 4 integration testing
