# Copilot Instructions for LoyaltyGen

This document provides context and guidelines for GitHub Copilot when working on the LoyaltyGen codebase.
You should follow the task plan contained in WROK-PLAN.md and adhere to the coding standards and architectural principles outlined below.  Make sure you know all the docs in the `docs/` folder as they contain important information about the project.  Also, it is CRITICAL that you adhere to the API definitions in `openapi.yaml` as that is the source of truth for the API contract, as well as the coding conventions in `docs/API-DESIGN.md`.  
For the frontend, make sure you follow the instructions contained in `UI-UX-GUIDELINES.md`.

## Project Overview

LoyaltyGen is an API-First customer loyalty platform that provides a RESTful API for managing clients, affinity programs, and point accounts. The platform is designed to be flexible, powerful, and developer-friendly.

## Tech Stack

- **Language:** TypeScript (strict mode enabled)
- **Runtime:** Node.js LTS
- **API Framework:** Express.js on Cloud Functions for Firebase
- **Database:** Cloud Firestore
- **Authentication:** Firebase Authentication
- **Frontend:** Next.js (v14+ with App Router), Tailwind CSS, Shadcn/ui
- **Hosting:** Firebase Hosting
- **Data Validation:** Zod
- **State Management:** Zustand

## Code Style and Conventions

### TypeScript

- Strict mode is **mandatory** (`"strict": true` in `tsconfig.json`)
- The `any` type is **prohibited** - use `unknown` with type validation instead
- Use Zod schemas as the single source of truth for data models
- Infer TypeScript types from Zod schemas using `z.infer<typeof schema>`

### Code Formatting

- Use **Prettier** for code formatting
- Use **ESLint** with TypeScript plugins for linting
- Code must have no linting errors

### API Conventions

- **Endpoints:** Use `kebab-case`, plural resource names (e.g., `/api/v1/clients`, `/api/v1/loyalty-accounts`)
- **JSON fields:** Use `camelCase` (e.g., `clientId`, `accountName`, `createdAt`)
- **Query parameters:** Use `snake_case` (e.g., `page_size`, `next_cursor`)
- **Versioning:** URL-based versioning (e.g., `/api/v1/...`)

### Error Response Format

All API errors must follow this standardized format:

```json
{
  "error": {
    "code": "ERROR_CODE_IN_UPPERCASE",
    "message": "A clear, descriptive message for the developer."
  }
}
```

## Architecture

### Project Structure

```
/loyalty-gen
├── functions/
│   ├── src/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   └── middleware/
│   │   ├── core/
│   │   ├── models/
│   │   ├── services/
│   │   ├── schemas/
│   │   └── index.ts
│   └── ...
├── .firebaserc
├── firebase.json
├── firestore.rules
└── .gitignore
```

### Layer Responsibilities

- **Routes/Controllers (`functions/src/api/routes/`):** Must be "thin" - only validate input (via middleware), call the appropriate service, and handle the HTTP response. No business logic.
- **Services (`functions/src/services/`):** Contain all business and domain logic. Interact with Firestore and orchestrate operations.
- **Schemas (`functions/src/schemas/`):** Define Zod schemas for data validation. TypeScript types are inferred from these.

### Data Denormalization

**Critical Rule:** Operations that modify the source of truth (e.g., `points` in `loyaltyAccount`) **must** update denormalized data (e.g., `account_balances` in `client`) within the **same atomic Firestore transaction**.

## Firebase & Firestore Best Practices

### Running emulators

When in need of restarting or starting emulators, consider using the following command to ensure a clean environment:

```bash
cd /Users/fnoya/Projects/google/loyalty-gen/functions && npm run build && pkill -f "firebase emulators" && sleep 2 && cd /Users/fnoya/Projects/google/loyalty-gen && nohup firebase emulators:start --only functions,firestore,auth,storage > /tmp/firebase-emulator.log 2>&1 &
```
Wait 10 seconds for emulators to start before running tests or making requests.
You can tail the log file to monitor startup or to
 catch any errors:

```bash
tail -f /tmp/firebase-emulator.log
```

### Timestamp Handling

**CRITICAL:** When working with Firebase emulators or production:

1. **Always import FieldValue from firebase-admin/firestore:**
   ```typescript
   import { FieldValue } from "firebase-admin/firestore";
   ```

2. **NEVER use `admin.firestore.Timestamp.now()`** - it's undefined in emulator environments

3. **For writes, use `FieldValue.serverTimestamp()`:**
   ```typescript
   await docRef.set({
     name: data.name,
     created_at: FieldValue.serverTimestamp(),
     updated_at: FieldValue.serverTimestamp()
   });
   ```

4. **For reads, convert Firestore Timestamps to Dates:**
   ```typescript
   const data = doc.data()!;
   return schema.parse({
     id: doc.id,
     name: data.name,
     created_at: data.created_at.toDate ? data.created_at.toDate() : data.created_at,
     updated_at: data.updated_at.toDate ? data.updated_at.toDate() : data.updated_at
   });
   ```

5. **NEVER validate objects containing `FieldValue.serverTimestamp()`** - it's a sentinel value, not a Date:
   - Write to Firestore with sentinel
   - Fetch the document back
   - Convert timestamps to Dates
   - Then validate with Zod

6. **Use imported FieldValue for array operations:**
   ```typescript
   // ✅ CORRECT
   affinityGroupIds: FieldValue.arrayUnion(groupId)
   
   // ❌ WRONG - undefined in emulators
   affinityGroupIds: admin.firestore.FieldValue.arrayUnion(groupId)
   ```

### Atomic Transactions

- `FieldValue.serverTimestamp()` can't be validated in transaction return values
- Must refetch documents after atomic transactions to get actual server timestamps
- All denormalized updates must be in the same transaction as source of truth updates

### Common Pattern for Create Operations

```typescript
async createEntity(data: CreateRequest): Promise<Entity> {
  const docRef = this.firestore.collection("entities").doc();
  
  // Write with server timestamp sentinel
  await docRef.set({
    name: data.name,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp()
  });
  
  // Fetch to get actual timestamps
  const doc = await docRef.get();
  const docData = doc.data()!;
  
  // Convert and validate
  return entitySchema.parse({
    id: doc.id,
    name: docData.name,
    created_at: docData.created_at.toDate(),
    updated_at: docData.updated_at.toDate()
  });
}
```

### Common Pattern for Transaction Operations

```typescript
async updateWithTransaction(id: string, data: UpdateData): Promise<Entity> {
  const docRef = this.firestore.collection("entities").doc(id);
  
  // Execute transaction with server timestamp
  await this.firestore.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    if (!doc.exists) throw new NotFoundError("Entity", id);
    
    transaction.update(docRef, {
      ...data,
      updated_at: FieldValue.serverTimestamp()
    });
  });
  
  // Fetch after transaction to get actual timestamp
  const updatedDoc = await docRef.get();
  const docData = updatedDoc.data()!;
  
  return entitySchema.parse({
    id: updatedDoc.id,
    ...docData,
    created_at: docData.created_at.toDate(),
    updated_at: docData.updated_at.toDate()
  });
}
```

## Security Guidelines

- All API endpoints must be protected with Firebase Authentication (JWT tokens)
- Apply the Principle of Least Privilege (PoLP) to service accounts
- Never hardcode secrets - use Firebase environment variables
- Run `npm audit --audit-level=high` for vulnerability scanning
- Builds must fail on `high` or `critical` vulnerabilities

### Logging Policy

- **DO NOT log:** PII (email, name, extra_data), authentication tokens, Authorization headers, API keys
- **DO log:** Security events (failed access attempts, deletions, permission changes)
- In production, do not include full stack traces in error logs unless sent to a secure logging system

## Testing

- **Framework:** Jest with `firebase-functions-test`
- Write unit tests for services (using mocks) and integration tests for Cloud Functions
- Target code coverage: **>80%**

## Commit Messages

Follow the **Conventional Commits** specification strictly.

## Documentation Reference

For detailed specifications, refer to:

- `docs/ARCHITECTURE.md` - System architecture and data models
- `docs/GUIDELINES.md` - Coding guidelines and conventions
- `docs/API-DESIGN.md` - API design standards
- `docs/SPECS.md` - Functional and non-functional requirements
- `openapi.yaml` - The formal API contract (source of truth for API)
