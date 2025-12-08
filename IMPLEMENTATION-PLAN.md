# LoyaltyGen - Comprehensive Implementation Plan

**Generated:** 2025-12-08  
**Status:** Ready to Begin Implementation  
**Project Phase:** Design Complete → Implementation Starting

---

## 📋 Executive Summary

LoyaltyGen is an **API-First customer loyalty platform** built with TypeScript, Firebase, and Next.js. The project has completed its design phase with comprehensive documentation including architecture specifications, API contracts, coding guidelines, and a detailed work plan. This document synthesizes all project documentation into an actionable implementation roadmap.

### Project Objectives
- Provide a RESTful API for managing customer loyalty programs
- Support multiple loyalty accounts per customer
- Implement robust audit trails for all operations
- Create an intuitive admin dashboard for management
- Ensure enterprise-grade security and scalability

---

## 🏗️ Architecture Overview

### Technology Stack

**Backend:**
- **Language:** TypeScript 5.x (strict mode)
- **Runtime:** Node.js LTS
- **API Framework:** Express.js on Cloud Functions for Firebase
- **Database:** Cloud Firestore (NoSQL)
- **Storage:** Firebase Storage (for profile photos)
- **Authentication:** Firebase Authentication (JWT tokens)
- **Validation:** Zod (runtime type validation)

**Frontend:**
- **Framework:** Next.js 14+ with App Router
- **Styling:** Tailwind CSS
- **Components:** Shadcn/ui
- **State Management:** Zustand
- **Forms:** React Hook Form

**Infrastructure:**
- **Hosting:** Firebase Hosting (CDN with SSL)
- **Functions:** Cloud Functions for Firebase (serverless)
- **Analytics (Future):** BigQuery

### Key Architectural Patterns

1. **API-First Design:** OpenAPI 3.0 contract (`openapi.yaml`) is the single source of truth
2. **Schema-Driven Development:** Zod schemas define data models; TypeScript types are inferred
3. **Thin Controllers:** Routes validate input and delegate to services
4. **Atomic Transactions:** Credit/debit operations update source and denormalized data together
5. **Comprehensive Audit:** All state changes create audit log records

### Data Model (Firestore Collections)

```
clients/                          # Root collection
  {clientId}/
    - name: { firstName, secondName, firstLastName, secondLastName }
    - email: string | null
    - identity_document: { type, number } | null
    - photoUrl: string | null
    - phones: array<{ type, number, extension, isPrimary }>
    - addresses: array<{ type, street, number, locality, state, country, ... }>
    - account_balances: { [accountId]: points }  # Denormalized
    - affinityGroupIds: string[]
    - created_at, updated_at
    
    loyaltyAccounts/              # Subcollection
      {accountId}/
        - account_name: string
        - points: integer         # Source of truth
        - created_at, updated_at
        
        pointTransactions/        # Subcollection
          {transactionId}/
            - transaction_type: 'credit' | 'debit'
            - amount: integer
            - description: string
            - timestamp

affinityGroups/                   # Root collection
  {groupId}/
    - name: string
    - description: string
    - created_at

auditLogs/                        # Root collection
  {logId}/
    - action: string (e.g., 'CLIENT_CREATED')
    - resource_type: string
    - resource_id: string
    - actor: { uid, email }
    - changes: { before, after }
    - metadata: object
    - timestamp
```

---

## 🎯 Implementation Roadmap

### Phase 1: Backend Foundation (Week 1-2)

**Epic 1: Project Setup & Core Infrastructure**

#### Task 1.1: Backend Scaffolding ⭐ START HERE
**Priority:** Highest | **Estimated Time:** 4-6 hours

**Deliverables:**
- [ ] Firebase Functions project structure created
- [ ] `package.json` with all dependencies installed:
  - Production: `express`, `firebase-admin`, `firebase-functions`, `zod`, `cors`
  - Dev: `typescript`, `@types/*`, `eslint`, `prettier`, `ts-node`
- [ ] `tsconfig.json` configured with strict mode
- [ ] `.eslintrc.js` with TypeScript rules (prohibit `any` type)
- [ ] `.prettierrc` for code formatting
- [ ] Core error classes in `src/core/errors.ts`:
  - `AppError`, `NotFoundError`, `ConflictError`, `ValidationError`
  - `MissingIdentifierError`, `InsufficientBalanceError`
- [ ] Basic Express app in `src/index.ts` with:
  - CORS enabled
  - JSON body parser
  - Health check endpoint: `GET /health`
  - Exported as Cloud Function

**Acceptance Criteria:**
- `npm run build` compiles without errors
- `npm run lint` passes with no errors
- `GET /health` returns `{ "status": "ok" }`

**Reference:** WORK-PLAN.md Task 1.1

---

#### Task 1.2: Authentication Middleware
**Priority:** Highest | **Estimated Time:** 2-3 hours

**Deliverables:**
- [ ] `src/api/middleware/auth.middleware.ts` created
- [ ] JWT token verification using Firebase Admin SDK
- [ ] Proper error handling (401 responses)
- [ ] `req.user` populated with decoded token
- [ ] NO logging of tokens or sensitive data

**Acceptance Criteria:**
- Returns 401 with proper error format when token is missing
- Returns 401 when token is invalid/expired
- Attaches decoded token to `req.user` on success
- No tokens logged in console/logs

**Security Note:** Never log the actual token value - log only that verification failed

**Reference:** WORK-PLAN.md Task 1.2

---

#### Task 1.3: Error Handling Middleware
**Priority:** Highest | **Estimated Time:** 2 hours

**Deliverables:**
- [ ] `src/api/middleware/error.middleware.ts` created
- [ ] Handles Zod validation errors → 400 response
- [ ] Handles AppError subclasses → appropriate status codes
- [ ] Generic error handler for unexpected errors → 500
- [ ] All errors formatted per API spec: `{ error: { code, message } }`
- [ ] No stack traces exposed in responses

**Acceptance Criteria:**
- Zod errors return 400 with `VALIDATION_FAILED` code
- AppError subclasses return correct status code and error code
- Unexpected errors return 500 with `INTERNAL_SERVER_ERROR`
- Error format matches openapi.yaml schema

**Reference:** WORK-PLAN.md Task 1.3

---

### Phase 2: Data Models (Week 2)

#### Task 2.1: Zod Schemas ⚠️ CRITICAL
**Priority:** Highest | **Estimated Time:** 6-8 hours

**Deliverables:**
- [ ] `src/schemas/common.schema.ts`:
  - Pagination params schema
  - Paginated response interface
- [ ] `src/schemas/client.schema.ts`:
  - Structured name schema (firstName, secondName, firstLastName, secondLastName)
  - Identity document schema (type: enum, number: alphanumeric)
  - Phone schema (type, number, extension, isPrimary)
  - Address schema (full structure per openapi.yaml)
  - CreateClientRequest (requires email OR identity_document)
  - UpdateClientRequest
  - Client schema (complete model)
- [ ] `src/schemas/group.schema.ts`
- [ ] `src/schemas/account.schema.ts`
- [ ] `src/schemas/transaction.schema.ts`
- [ ] `src/schemas/index.ts` (barrel export)

**Key Validations:**
- At least one identifier required (email OR identity_document)
- Only one phone can have `isPrimary: true`
- Only one address can have `isPrimary: true`
- Identity document types: 'cedula_identidad' or 'pasaporte'
- Name fields: letters, spaces, hyphens, apostrophes only

**Acceptance Criteria:**
- All schemas validate correct data successfully
- All schemas reject invalid data with clear error messages
- TypeScript types inferred with `z.infer<typeof schema>`
- No manual TypeScript interfaces duplicating schema structure
- Code compiles without type errors

**Reference:** WORK-PLAN.md Task 2.1, openapi.yaml components/schemas

---

### Phase 3: Client Management (Week 3-4)

#### Task 2.2: Client API Endpoints ⚠️ CRITICAL
**Priority:** Highest | **Estimated Time:** 12-16 hours

**Deliverables:**
- [ ] `src/services/client.service.ts` with methods:
  - `create()` - with uniqueness checks for email and identity_document
  - `list()` - with cursor-based pagination
  - `getById()` - with 404 handling
  - `update()` - prevent email/identity_document changes
  - `delete()` - mark for async deletion
  - `search()` - **CRITICAL** Firestore-based search implementation
- [ ] Search functionality supporting:
  - Simple name search: "Francisco" → searches all name fields
  - Full name search: "Francisco Noya" → firstName AND firstLastName
  - Number search: "2889956" → identity_document.number OR phoneNumbers
  - Case-insensitive using `_lower` fields
- [ ] `src/api/routes/client.routes.ts` with all endpoints
- [ ] Register routes in `src/index.ts`

**Search Implementation Notes:**
- Store normalized fields: `firstName_lower`, `firstSurname_lower`, etc.
- Store phone numbers in `phoneNumbers: string[]` array for array-contains queries
- Use Firestore prefix queries (`>=`, `<`) for name matching
- Limitation: Phone search only supports startsWith (MVP constraint)

**Acceptance Criteria:**
- `POST /clients` creates client, returns 201
- `POST /clients` returns 400 if no identifier provided
- `POST /clients` returns 409 if email exists
- `POST /clients` returns 409 if identity_document exists
- `GET /clients` returns paginated list
- `GET /clients/:id` returns client or 404
- `PUT /clients/:id` updates client or 404
- `DELETE /clients/:id` returns 202 Accepted
- `GET /clients/search?q={query}` searches by name/document/phone
- All endpoints require authentication (401 without token)
- All errors follow standard format

**Reference:** WORK-PLAN.md Task 2.2, docs/FIRESTORE-SEARCH-SOLUTION.md

---

#### Task 2.2.1: Photo Management
**Priority:** High | **Estimated Time:** 6-8 hours

**Deliverables:**
- [ ] `src/services/photo.service.ts`:
  - `uploadPhoto()` - validate format, size, upload to Storage
  - `deletePhoto()` - remove from Storage
  - `deleteAllClientPhotos()` - cleanup on client deletion
- [ ] `src/api/routes/photo.routes.ts`:
  - `POST /clients/:id/photo` - upload/update photo
  - `DELETE /clients/:id/photo` - remove photo
- [ ] Update client schema with `photoUrl: string | null`
- [ ] Modify ClientService.delete() to cleanup photos

**Validations:**
- File types: JPEG, PNG, WEBP only
- Max size: 5 MB
- Storage path: `/client-photos/{clientId}/{timestamp}_{filename}`

**Acceptance Criteria:**
- Photo upload works and updates client.photoUrl
- Returns 400 for invalid format or size
- Old photo deleted when new one uploaded
- Photo deleted when client deleted
- URLs are publicly accessible

**Reference:** WORK-PLAN.md Task 2.2.1, docs/CLIENT-PHOTO-FEATURE.md

---

### Phase 4: Groups & Accounts (Week 4-5)

#### Task 2.3: Affinity Groups
**Priority:** High | **Estimated Time:** 4-6 hours

**Deliverables:**
- [ ] `src/services/group.service.ts`
- [ ] `src/api/routes/group.routes.ts`
- [ ] Endpoints: create group, list groups, assign/unassign clients

**Reference:** WORK-PLAN.md Task 2.3

---

#### Task 2.4: Loyalty Accounts ⚠️ CRITICAL - ATOMIC TRANSACTIONS
**Priority:** Highest | **Estimated Time:** 10-14 hours

**Deliverables:**
- [ ] `src/services/account.service.ts` with:
  - `create()` - create loyalty account for client
  - `credit()` - **ATOMIC** transaction updating account.points AND client.account_balances
  - `debit()` - **ATOMIC** transaction with balance validation
  - `getTransactionHistory()` - list transactions with pagination
- [ ] `src/api/routes/account.routes.ts`
- [ ] All endpoints registered

**CRITICAL RULE:**
```typescript
// MUST use Firestore transaction for credit/debit
await db.runTransaction(async (transaction) => {
  // 1. Read account and client
  // 2. Calculate new balance
  // 3. Create transaction document
  // 4. Update account.points
  // 5. Update client.account_balances[accountId]
  // 6. Commit atomically
});
```

**Acceptance Criteria:**
- Credit/debit operations are atomic
- Debit fails if insufficient balance (InsufficientBalanceError)
- Denormalized data always consistent with source of truth
- Transaction history includes all credit/debit operations
- All operations require authentication

**Reference:** WORK-PLAN.md Task 2.4

---

### Phase 5: Audit System (Week 5-6)

#### Task 2.5.1-2.5.4: Complete Audit Implementation ⚠️ CRITICAL
**Priority:** Highest | **Estimated Time:** 12-16 hours

**Deliverables:**
- [ ] `src/schemas/audit.schema.ts` with audit log schema
- [ ] `src/services/audit.service.ts`:
  - `createAuditLog()` - create audit record
  - `listAuditLogs()` - query with filters
  - `getClientAuditLogs()` - client-specific logs
  - `getAccountAuditLogs()` - account-specific logs
- [ ] Integrate audit logging in ALL services:
  - ClientService: CLIENT_CREATED, CLIENT_UPDATED, CLIENT_DELETED
  - GroupService: GROUP_CREATED, CLIENT_ADDED_TO_GROUP, etc.
  - AccountService: LOYALTY_ACCOUNT_CREATED, POINTS_CREDITED, POINTS_DEBITED
- [ ] `src/api/routes/audit.routes.ts` with query endpoints
- [ ] **CRITICAL:** Audit logs for credit/debit created within same transaction

**Audit Log Structure:**
```typescript
{
  id: string,
  action: string,  // e.g., 'CLIENT_CREATED'
  resource_type: string,  // e.g., 'client'
  resource_id: string,
  actor: {
    uid: string,
    email: string | null
  },
  changes: {
    before: object | null,  // null for CREATE
    after: object | null    // null for DELETE
  },
  metadata: object,  // IP, user agent, etc.
  timestamp: Date
}
```

**Acceptance Criteria:**
- Every CRUD operation creates audit log
- Update operations include before/after states
- Credit/debit audit logs created atomically with transaction
- Audit queries support filtering by action, date, resource
- No PII logged in audit metadata

**Reference:** WORK-PLAN.md Épica 2.5, docs/SPECS.md

---

### Phase 6: Testing (Week 6-7)

#### Task 4.1-4.2: Test Suite ⚠️ CRITICAL
**Priority:** Highest | **Estimated Time:** 16-20 hours

**Deliverables:**
- [ ] Jest configuration with ts-jest
- [ ] Firebase Functions Test setup
- [ ] Mock helpers for Firestore
- [ ] Coverage threshold: 80%
- [ ] Unit tests for all services
- [ ] Middleware tests (auth, error handling)
- [ ] Integration tests for routes
- [ ] Test atomic transactions
- [ ] Test audit log creation

**Test Categories:**
1. **Service Tests:** Business logic, validation, Firestore operations
2. **Middleware Tests:** Auth token verification, error formatting
3. **Integration Tests:** Full request/response cycle with mocked Firestore
4. **Transaction Tests:** Verify atomicity of credit/debit operations
5. **Audit Tests:** Verify log creation on all operations

**Acceptance Criteria:**
- `npm test` runs all tests successfully
- Code coverage > 80%
- All critical paths tested (CRUD, transactions, audit)
- Edge cases covered (validation errors, not found, conflicts)

**Reference:** WORK-PLAN.md Épica 4

---

### Phase 7: Frontend Dashboard (Week 7-9)

#### Task 3.1: Next.js Scaffolding
**Priority:** High | **Estimated Time:** 4-6 hours

**Deliverables:**
- [ ] Next.js 14+ project with App Router
- [ ] Install dependencies: Tailwind, Shadcn/ui, Zustand, React Hook Form
- [ ] Configure Firebase SDK for client-side auth
- [ ] Environment variables setup

---

#### Task 3.2-3.9: Dashboard Implementation
**Priority:** High | **Estimated Time:** 30-40 hours

**Deliverables:**
- [ ] Responsive layout with sidebar navigation
- [ ] Authentication flow (login, logout, protected routes)
- [ ] Client management UI:
  - Listing with search and filters (HU1, HU7)
  - Creation form with all fields (HU2)
  - Detail view
  - Delete confirmation (HU3)
- [ ] Audit components:
  - Audit log list
  - Audit action badges
  - Audit detail dialog
  - Client-specific audit history (HU10)
  - Transaction audit view (HU11)
  - Global audit panel (HU12)

**UI/UX Requirements:**
- Follow docs/UI-UX-GUIDELINES.md
- Responsive design (mobile, tablet, desktop)
- Loading states for all async operations
- Empty states with helpful messages
- Error states with actionable feedback
- Toast notifications for user actions
- Accessibility: WCAG 2.1 AA compliance

**Reference:** WORK-PLAN.md Épica 3, docs/UI-UX-GUIDELINES.md, docs/USER-STORIES.md

---

### Phase 8: Advanced Features (Week 9-10)

#### Task 2.6: Family Circle Feature (Optional)
**Priority:** Medium | **Estimated Time:** 20-24 hours

**Note:** This is an advanced feature that can be deferred to post-MVP if time is constrained.

**Deliverables:**
- [ ] Extended schemas for family circles
- [ ] Firestore composite indexes
- [ ] Family circle service with member management
- [ ] Permission validation for "on behalf of" transactions
- [ ] API routes for family circle operations

**Reference:** WORK-PLAN.md Épica 2.6

---

### Phase 9: Deployment (Week 10)

#### Deployment Checklist
**Priority:** Highest | **Estimated Time:** 6-8 hours

**Deliverables:**
- [ ] Firebase project created and configured
- [ ] Environment variables set (dev, staging, prod)
- [ ] Firestore indexes deployed
- [ ] Security rules configured and tested
- [ ] Backend deployed to Cloud Functions
- [ ] Frontend deployed to Firebase Hosting
- [ ] Domain configured (if applicable)
- [ ] Monitoring and alerts configured
- [ ] API documentation published

**Pre-Deployment Checks:**
- [ ] All tests passing
- [ ] No high/critical npm audit vulnerabilities
- [ ] ESLint passes with no errors
- [ ] Code coverage > 80%
- [ ] All API endpoints tested with real Firebase project
- [ ] Security rules prevent unauthorized access
- [ ] Backup strategy in place

---

## 🔒 Security Requirements

### Authentication & Authorization
- ✅ All API endpoints protected with Firebase Authentication
- ✅ JWT tokens verified on every request
- ✅ No endpoints accessible without valid token
- ✅ Service accounts follow Principle of Least Privilege

### Data Protection
- ✅ No secrets hardcoded in code
- ✅ Environment variables for all sensitive config
- ✅ Firestore security rules enforce data access policies
- ✅ HTTPS only (enforced by Firebase Hosting)

### Logging & Monitoring
- ❌ **DO NOT LOG:**
  - Email addresses
  - Names
  - extra_data fields
  - Authentication tokens
  - Authorization headers
  - API keys
- ✅ **DO LOG:**
  - Failed authentication attempts
  - Resource deletions
  - Permission changes
  - Audit-worthy security events

### Vulnerability Management
- ✅ Run `npm audit --audit-level=high` before every deploy
- ✅ Build fails on high or critical vulnerabilities
- ✅ Dependencies updated regularly

---

## 💻 Code Quality Standards

### TypeScript
- ✅ Strict mode enabled (`"strict": true`)
- ✅ `any` type prohibited - use `unknown` with validation
- ✅ All functions have explicit return types
- ✅ No `@ts-ignore` or `@ts-expect-error` without justification

### Code Style
- ✅ ESLint configuration enforced
- ✅ Prettier for automatic formatting
- ✅ No linting errors allowed
- ✅ Consistent naming conventions:
  - Functions: camelCase
  - Classes: PascalCase
  - Constants: SCREAMING_SNAKE_CASE
  - Files: kebab-case

### Testing
- ✅ Unit tests for all services
- ✅ Integration tests for API routes
- ✅ Minimum 80% code coverage
- ✅ Test both success and error cases
- ✅ Mock external dependencies (Firestore, Storage)

### Documentation
- ✅ All public functions have JSDoc comments
- ✅ Complex logic explained with inline comments
- ✅ README updated with setup instructions
- ✅ API examples provided

---

## 📝 API Conventions

### Endpoints
- **Format:** `/api/v1/{resource}` (kebab-case, plural)
- **Examples:** `/api/v1/clients`, `/api/v1/loyalty-accounts`

### Request Body (JSON)
- **Field naming:** camelCase
- **Examples:** `clientId`, `accountName`, `createdAt`

### Query Parameters
- **Format:** snake_case
- **Examples:** `page_size`, `next_cursor`, `on_behalf_of`

### Error Responses
**Standard Format:**
```json
{
  "error": {
    "code": "ERROR_CODE_IN_UPPERCASE",
    "message": "Clear, descriptive message for the developer."
  }
}
```

**Common Error Codes:**
- `VALIDATION_FAILED` - 400 Bad Request
- `INVALID_TOKEN` - 401 Unauthorized
- `NOT_CIRCLE_HOLDER` - 403 Forbidden
- `RESOURCE_NOT_FOUND` - 404 Not Found
- `CONFLICT` - 409 Conflict (duplicate email, identity_document)
- `INTERNAL_SERVER_ERROR` - 500 Server Error

---

## 📚 Documentation Reference

### Core Documents
- 📐 **ARCHITECTURE.md** - System architecture, tech stack, data model
- 📋 **openapi.yaml** - API contract (SOURCE OF TRUTH)
- 🔧 **API-DESIGN.md** - API conventions, versioning, error format
- 📝 **SPECS.md** - Functional and non-functional requirements
- 💻 **GUIDELINES.md** - Coding standards, security policies
- 📅 **WORK-PLAN.md** - Detailed task breakdown with instructions

### Feature Documents
- 🔍 **FIRESTORE-SEARCH-SOLUTION.md** - Search implementation strategy
- 📸 **CLIENT-PHOTO-FEATURE.md** - Photo upload specifications
- 📋 **CLIENT-FIELDS-SPEC.md** - Client model detailed specification
- 🎨 **UI-UX-GUIDELINES.md** - Frontend design principles
- 👤 **USER-STORIES.md** - Feature requirements from user perspective

### Reference Documents
- ✅ **RECOMMENDATIONS.md** - Architecture audit findings
- 🏛️ **STEERING.md** - Project vision and principles
- 🎯 **DESIGN.md** - Architectural decision records (ADRs)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 24+ (LTS)
- npm 9+ or yarn 1.22+
- Firebase CLI: `npm install -g firebase-tools`
- Google Cloud/Firebase account

### Initial Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/fnoya/loyalty-gen.git
   cd loyalty-gen
   ```

2. **Firebase Setup**
   ```bash
   firebase login
   firebase projects:create loyalty-gen-dev
   firebase use loyalty-gen-dev
   ```

3. **Backend Setup**
   ```bash
   cd functions
   npm install
   npm run build    # Should succeed
   npm run lint     # Should pass
   ```

4. **Frontend Setup** (when implemented)
   ```bash
   cd web
   npm install
   npm run dev
   ```

5. **Run Tests**
   ```bash
   cd functions
   npm test
   npm run test:coverage  # Should be > 80%
   ```

### Development Workflow

1. **Start Emulators** (for local development)
   ```bash
   firebase emulators:start
   ```

2. **Make Changes** (follow task order in WORK-PLAN.md)

3. **Run Checks**
   ```bash
   npm run lint
   npm run build
   npm test
   ```

4. **Commit** (use Conventional Commits)
   ```bash
   git commit -m "feat: implement client creation endpoint"
   ```

5. **Deploy** (when ready)
   ```bash
   firebase deploy --only functions
   firebase deploy --only hosting
   firebase deploy --only firestore:indexes
   ```

---

## ⚠️ Critical Implementation Notes

### 1. Atomic Transactions
**NEVER** update `loyaltyAccount.points` without updating `client.account_balances` in the same transaction. Example:

```typescript
await db.runTransaction(async (transaction) => {
  const accountRef = db.collection('clients').doc(clientId)
    .collection('loyaltyAccounts').doc(accountId);
  const clientRef = db.collection('clients').doc(clientId);
  
  // Read both documents
  const accountSnap = await transaction.get(accountRef);
  const clientSnap = await transaction.get(clientRef);
  
  // Calculate new balance
  const newPoints = accountSnap.data().points + amount;
  
  // Write both updates atomically
  transaction.update(accountRef, { points: newPoints });
  transaction.update(clientRef, { 
    [`account_balances.${accountId}`]: newPoints 
  });
  
  // Create transaction document
  const txnRef = accountRef.collection('pointTransactions').doc();
  transaction.set(txnRef, { /* transaction data */ });
});
```

### 2. Search Implementation
Client search uses Firestore native queries with normalized fields:

```typescript
// Store these additional fields when creating/updating client
{
  firstName: "Francisco",
  firstName_lower: "francisco",  // For case-insensitive search
  firstSurname: "Noya",
  firstSurname_lower: "noya",
  phoneNumbers: ["+59899123456", "99123456"],  // For array-contains
  identity_document: {
    type: "cedula_identidad",
    number: "12345678",
    number_lower: "12345678"
  }
}
```

### 3. Audit Logging
Every state change MUST create an audit log:

```typescript
await auditService.createAuditLog({
  action: 'CLIENT_UPDATED',
  resource_type: 'client',
  resource_id: clientId,
  actor: {
    uid: req.user.uid,
    email: req.user.email
  },
  changes: {
    before: oldClientData,  // State before update
    after: newClientData    // State after update
  },
  metadata: {
    ip: req.ip,
    userAgent: req.headers['user-agent']
  }
});
```

### 4. Error Handling
Always use custom error classes and let middleware format responses:

```typescript
// In service
if (!client) {
  throw new NotFoundError('Cliente', clientId);
}

// Middleware will format as:
// {
//   "error": {
//     "code": "RESOURCE_NOT_FOUND",
//     "message": "Cliente con ID 'abc123' no fue encontrado."
//   }
// }
```

### 5. Zod Schema Pattern
Define schema once, infer type:

```typescript
// ✅ Correct
export const clientSchema = z.object({
  name: z.string(),
  email: z.string().email()
});

export type Client = z.infer<typeof clientSchema>;

// ❌ Wrong - Don't duplicate
export interface Client {  // DON'T DO THIS
  name: string;
  email: string;
}
```

---

## 📊 Success Metrics

### Code Quality
- [ ] 100% of code passes ESLint
- [ ] 100% of code formatted with Prettier
- [ ] 0 uses of `any` type
- [ ] Test coverage > 80%
- [ ] 0 high/critical npm audit vulnerabilities

### API Completeness
- [ ] All endpoints from openapi.yaml implemented
- [ ] All endpoints require authentication
- [ ] All endpoints follow error format standard
- [ ] Pagination implemented correctly
- [ ] Search functionality working

### Data Integrity
- [ ] All credit/debit operations use atomic transactions
- [ ] Denormalized data always consistent
- [ ] Audit logs created for all state changes
- [ ] No orphaned data after deletions

### Frontend
- [ ] All user stories (HU1-HU12) implemented
- [ ] Responsive on mobile, tablet, desktop
- [ ] Loading/empty/error states implemented
- [ ] WCAG 2.1 AA compliance

---

## 🎯 Next Immediate Actions

1. **Start Backend Scaffolding** (Task 1.1)
   - Create `functions/` directory
   - Initialize npm project
   - Install dependencies
   - Configure TypeScript, ESLint, Prettier
   - Create directory structure
   - Implement core error classes
   - Create basic Express app with health endpoint

2. **Verify Setup**
   - Run `npm run build`
   - Run `npm run lint`
   - Test health endpoint

3. **Proceed to Task 1.2** (Auth Middleware)

---

## 📞 Support & Resources

- **Project Repository:** https://github.com/fnoya/loyalty-gen
- **Firebase Console:** https://console.firebase.google.com
- **Firebase Documentation:** https://firebase.google.com/docs
- **TypeScript Docs:** https://www.typescriptlang.org/docs
- **Zod Documentation:** https://zod.dev
- **Next.js Documentation:** https://nextjs.org/docs

---

**Last Updated:** 2025-12-08  
**Document Version:** 1.0  
**Status:** Ready for Implementation

