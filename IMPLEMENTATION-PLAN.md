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

#### Task 1.1: Backend Scaffolding ⭐ ✅ COMPLETED
**Priority:** Highest | **Estimated Time:** 4-6 hours

**Deliverables:**
- [x] Firebase Functions project structure created
- [x] `package.json` with all dependencies installed:
  - Production: `express`, `firebase-admin`, `firebase-functions`, `zod`, `cors`
  - Dev: `typescript`, `@types/*`, `eslint`, `prettier`, `ts-node`
- [x] `tsconfig.json` configured with strict mode
- [x] `.eslintrc.js` with TypeScript rules (prohibit `any` type)
- [x] `.prettierrc` for code formatting
- [x] Core error classes in `src/core/errors.ts`:
  - `AppError`, `NotFoundError`, `ConflictError`, `ValidationError`
  - `MissingIdentifierError`, `InsufficientBalanceError`
- [x] Basic Express app in `src/index.ts` with:
  - CORS enabled
  - JSON body parser
  - Health check endpoint: `GET /health`
  - Exported as Cloud Function

**Acceptance Criteria:**
- ✅ `npm run build` compiles without errors
- ✅ `npm run lint` passes with no errors
- ✅ `GET /health` returns `{ "status": "ok" }`

**Reference:** WORK-PLAN.md Task 1.1

---

#### Task 1.2: Authentication Middleware ✅ COMPLETED
**Priority:** Highest | **Estimated Time:** 2-3 hours

**Deliverables:**
- [x] `src/api/middleware/auth.middleware.ts` created
- [x] JWT token verification using Firebase Admin SDK
- [x] Proper error handling (401 responses)
- [x] `req.user` populated with decoded token
- [x] NO logging of tokens or sensitive data

**Acceptance Criteria:**
- ✅ Returns 401 with proper error format when token is missing
- ✅ Returns 401 when token is invalid/expired
- ✅ Attaches decoded token to `req.user` on success
- ✅ No tokens logged in console/logs

**Security Note:** Never log the actual token value - log only that verification failed

**Reference:** WORK-PLAN.md Task 1.2

---

#### Task 1.3: Error Handling Middleware ✅ COMPLETED
**Priority:** Highest | **Estimated Time:** 2 hours

**Deliverables:**
- [x] `src/api/middleware/error.middleware.ts` created
- [x] Handles Zod validation errors → 400 response
- [x] Handles AppError subclasses → appropriate status codes
- [x] Generic error handler for unexpected errors → 500
- [x] All errors formatted per API spec: `{ error: { code, message } }`
- [x] No stack traces exposed in responses

**Acceptance Criteria:**
- ✅ Zod errors return 400 with `VALIDATION_FAILED` code
- ✅ AppError subclasses return correct status code and error code
- ✅ Unexpected errors return 500 with `INTERNAL_SERVER_ERROR`
- ✅ Error format matches openapi.yaml schema

**Reference:** WORK-PLAN.md Task 1.3

---

### Phase 2: Data Models (Week 2)

#### Task 2.1: Zod Schemas ✅ COMPLETED
**Priority:** Highest | **Estimated Time:** 6-8 hours

**Deliverables:**
- [x] `src/schemas/common.schema.ts`:
  - Pagination params schema
  - Paginated response interface
- [x] `src/schemas/client.schema.ts`:
  - Structured name schema (firstName, secondName, firstLastName, secondLastName)
  - Identity document schema (type: enum, number: alphanumeric)
  - Phone schema (type, number, extension, isPrimary)
  - Address schema (full structure per openapi.yaml)
  - CreateClientRequest (requires email OR identity_document)
  - UpdateClientRequest
  - Client schema (complete model)
- [x] `src/schemas/group.schema.ts`
- [x] `src/schemas/account.schema.ts`
- [x] `src/schemas/transaction.schema.ts`
- [x] `src/schemas/audit.schema.ts`
- [x] `src/schemas/index.ts` (barrel export)

**Key Validations:**
- ✅ At least one identifier required (email OR identity_document)
- ✅ Only one phone can have `isPrimary: true`
- ✅ Only one address can have `isPrimary: true`
- ✅ Identity document types: 'cedula_identidad' or 'pasaporte'
- ✅ Name fields: letters, spaces, hyphens, apostrophes only

**Acceptance Criteria:**
- ✅ All schemas validate correct data successfully
- ✅ All schemas reject invalid data with clear error messages
- ✅ TypeScript types inferred with `z.infer<typeof schema>`
- ✅ No manual TypeScript interfaces duplicating schema structure
- ✅ Code compiles without type errors
- ✅ 41/41 tests passing

**Reference:** WORK-PLAN.md Task 2.1, openapi.yaml components/schemas

---

### Phase 3: Client Management (Week 3-4) ✅ COMPLETED

#### Task 2.2: Client API Endpoints ✅ COMPLETED
**Priority:** Highest | **Estimated Time:** 12-16 hours | **Actual:** ~16 hours

**Deliverables:**
- [x] `src/services/client.service.ts` (442 lines) with methods:
  - `createClient()` - with uniqueness checks for email and identity_document
  - `listClients()` - with cursor-based pagination
  - `getClient()` - with 404 handling
  - `updateClient()` - only allows updating name, phones, addresses, extra_data, photoUrl
  - `deleteClient()` - hard delete for MVP
  - `searchClients()` - Firestore-based search implementation
- [x] Search functionality supporting:
  - Simple name search: "Francisco" → searches all name fields
  - Full name search: "Francisco Noya" → firstName AND firstLastName
  - Number search: "2889956" → identity_document.number OR phoneNumbers
  - Case-insensitive using `_lower` fields
- [x] `src/api/routes/client.routes.ts` (230 lines) with all endpoints
- [x] Register routes in `src/index.ts`
- [x] Photo management integrated:
  - `src/services/photo.service.ts` (199 lines) with uploadPhoto and deletePhoto
  - `POST /clients/:id/photo` endpoint
  - `DELETE /clients/:id/photo` endpoint
- [x] Multer 2.0.2 installed for file upload handling
- [x] Firebase Storage emulator support configured
- [x] Storage security rules created (`storage.rules`)

**Search Implementation Notes:**
- ✅ Store normalized fields: `name_lower.firstName`, `name_lower.firstLastName`, etc.
- ✅ Store phone numbers in `phone_numbers: string[]` array
- ✅ Use Firestore prefix queries (`>=`, `< term\uf8ff`) for name matching
- ✅ Limitation: Phone search only supports startsWith (MVP constraint)

**Test Results:**
- ✅ 41/41 unit tests passing (schemas + error handling)
- ✅ 20/20 integration tests passing (CRUD, auth, search, validation, photos)
- ✅ Build passing (TypeScript strict mode)
- ✅ Lint passing (ESLint with explicit return types)
- ✅ Code compiles with zero errors
- ✅ Zero `any` types used

**Acceptance Criteria:**
- ✅ `POST /clients` creates client, returns 201
- ✅ `POST /clients` returns 400 if no identifier provided (Zod validation)
- ✅ `POST /clients` returns 409 if email exists
- ✅ `POST /clients` returns 409 if identity_document exists
- ✅ `GET /clients` returns paginated list with cursor
- ✅ `GET /clients/:id` returns client or 404
- ✅ `PUT /clients/:id` updates client or 404
- ✅ `DELETE /clients/:id` returns 202 Accepted
- ✅ `GET /clients/search?q={query}` searches by name/document/phone
- ✅ All endpoints require authentication (401 without token)
- ✅ All errors follow standard format
- ✅ Photo upload implementation complete with validation
- ✅ Code compiles with no errors
- ✅ Linter passes
- ✅ All tests (41 unit + 20 integration) passing

**Reference:** WORK-PLAN.md Task 2.2, docs/FIRESTORE-SEARCH-SOLUTION.md, PHASE-3-COMPLETE.md

---

#### Task 2.2.1: Photo Management ✅ COMPLETED
**Priority:** High | **Estimated Time:** 6-8 hours | **Actual:** ~8 hours

**Deliverables:**
- [x] `src/services/photo.service.ts` (199 lines):
  - `uploadPhoto()` - validate format, size, upload to Storage
  - `deletePhoto()` - remove from Storage
  - Automatic cleanup of old photos on upload
  - Emulator-aware URL generation (public URLs vs signed URLs)
- [x] Photo endpoints in `src/api/routes/client.routes.ts`:
  - `POST /clients/:id/photo` - upload/update photo (multipart/form-data)
  - `DELETE /clients/:id/photo` - remove photo
- [x] Client schema includes `photoUrl: string | null`
- [x] Firebase Storage configuration:
  - `storage.rules` (25 lines) - Security rules with auth + validation
  - `firebase.json` updated with storage configuration
  - Storage emulator running on port 9199

**Validations:**
- ✅ File types: JPEG, PNG, WEBP only
- ✅ Max size: 5 MB
- ✅ Storage path: `/client-photos/{clientId}/{timestamp}-{randomId}.{ext}`
- ✅ Authentication required for all operations
- ✅ Storage rules validate file size and content type

**Implementation Notes:**
- Photo functionality is **production-ready**
- Emulator URLs: `http://localhost:9199/v0/b/{bucket}/o/{path}?alt=media`
- Production URLs: Signed URLs with 50-year expiry
- Manual testing confirms all endpoints work correctly
- All automated tests passing (20/20)

**Acceptance Criteria:**
- ✅ Photo upload validates format and size
- ✅ Returns 400 for invalid format or size (verified in code)
- ✅ Old photo deleted when new one uploaded
- ✅ URL generation handles both emulator and production
- ✅ Photo service integrated with client routes
- ✅ Storage rules configured and active
- ✅ Multipart handling configured (using Busboy for compatibility)

**Reference:** WORK-PLAN.md Task 2.2.1, docs/CLIENT-PHOTO-FEATURE.md, PHASE-3-COMPLETE.md

---

### Phase 4: Groups & Accounts (Week 4-5) ✅ COMPLETED

#### Task 2.3: Affinity Groups ✅ COMPLETED
**Priority:** High | **Estimated Time:** 4-6 hours | **Actual:** ~6 hours

**Deliverables:**
- [x] `src/services/group.service.ts` (203 lines) with methods:
  - `createGroup()` - creates new affinity group
  - `listGroups()` - lists all groups
  - `getGroup()` - retrieves single group with 404 handling
  - `assignClientToGroup()` - assigns client to group with validation
  - `removeClientFromGroup()` - removes client from group with validation
- [x] `src/api/routes/group.routes.ts` (4 endpoints):
  - `GET /api/v1/groups` - list all groups
  - `POST /api/v1/groups` - create new group
  - `POST /api/v1/groups/:groupId/clients/:clientId` - assign client to group
  - `DELETE /api/v1/groups/:groupId/clients/:clientId` - remove client from group
- [x] Routes registered in `src/app.ts`
- [x] Comprehensive unit tests (14 tests) in `src/api/routes/group.routes.test.ts`
- [x] All tests passing (✅ 90/90 total)

**Reference:** WORK-PLAN.md Task 2.3

---

#### Task 2.4: Loyalty Accounts ✅ COMPLETED - ATOMIC TRANSACTIONS
**Priority:** Highest | **Estimated Time:** 10-14 hours | **Actual:** ~14 hours

**Deliverables:**
- [x] `src/services/account.service.ts` (418 lines) with methods:
  - `createAccount()` - creates loyalty account for client with validation
  - `listAccounts()` - lists all accounts for a client
  - `getAccount()` - retrieves single account with 404 handling
  - `creditPoints()` - **ATOMIC** transaction updating account.points AND client.account_balances
  - `debitPoints()` - **ATOMIC** transaction with balance validation
  - `listTransactions()` - paginated transaction history with cursor
  - `getAllBalances()` - retrieves all account balances for a client
  - `getAccountBalance()` - retrieves specific account balance
- [x] `src/api/routes/account.routes.ts` (7 endpoints):
  - `GET /api/v1/clients/:clientId/accounts` - list accounts
  - `POST /api/v1/clients/:clientId/accounts` - create account
  - `POST /api/v1/clients/:clientId/accounts/:accountId/credit` - credit points
  - `POST /api/v1/clients/:clientId/accounts/:accountId/debit` - debit points
  - `GET /api/v1/clients/:clientId/accounts/:accountId/transactions` - list transactions
  - `GET /api/v1/clients/:clientId/balance` - get all balances
  - `GET /api/v1/clients/:clientId/accounts/:accountId/balance` - get account balance
- [x] Routes registered in `src/app.ts`
- [x] Comprehensive unit tests (17 tests) in `src/api/routes/account.routes.test.ts`
- [x] All tests passing (✅ 90/90 total)

**CRITICAL IMPLEMENTATION:**
```typescript
// ✅ Implemented: Firestore transaction for credit/debit
await this.firestore.runTransaction(async (transaction) => {
  // 1. Read account document
  // 2. Calculate new balance
  // 3. Update account.points (source of truth)
  // 4. Update client.account_balances[accountId] (denormalized)
  // 5. Create transaction record
  // 6. All commits happen atomically
});
```

**Key Features:**
- ✅ Credit/debit operations are fully atomic
- ✅ Debit fails with AppError (400) if insufficient balance
- ✅ Denormalized data (`client.account_balances`) always consistent with source of truth (`account.points`)
- ✅ Transaction history includes all credit/debit operations with timestamps
- ✅ All operations require authentication
- ✅ Proper error handling with NotFoundError for missing resources
- ✅ Transaction schema includes `originatedBy` field (set to null for now, ready for family circle feature)

**Test Coverage:**
- ✅ All 31 new tests (14 group + 17 account) passing
- ✅ Integration with existing 59 tests (total 90/90)
- ✅ Error cases properly tested (404s, 400s, validation)
- ✅ Timestamp handling correctly tested
- ✅ No linting errors

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
- [x] 100% of code passes ESLint
- [x] 100% of code formatted with Prettier
- [x] 0 uses of `any` type
- [x] Test coverage: 41 unit tests + 16 integration tests passing
- [x] 0 high/critical npm audit vulnerabilities

### API Completeness
- [x] Client management endpoints implemented (8 endpoints)
- [x] All endpoints require authentication
- [x] All endpoints follow error format standard
- [x] Pagination implemented correctly (cursor-based)
- [x] Search functionality working (name, document, phone)
- [ ] Groups endpoints (Phase 4)
- [ ] Loyalty accounts endpoints (Phase 4)
- [ ] Audit endpoints (Phase 5)

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

### ✅ Completed Phases
1. **Phase 1: Backend Foundation** - COMPLETE
   - Backend scaffolding
   - Authentication middleware
   - Error handling middleware
   
2. **Phase 2: Data Models** - COMPLETE
   - All Zod schemas implemented (41 unit tests passing)
   
3. **Phase 3: Client Management** - COMPLETE
   - Client CRUD operations (8 endpoints)
   - Search functionality (name, document, phone)
   - Photo upload/delete with Storage integration
   - 16 integration tests passing
   - Production-ready code

### 🚀 Next Phase: Phase 4 - Groups & Accounts

#### Immediate Next Steps:

1. **Task 2.3: Affinity Groups** (4-6 hours)
   - Create `src/services/group.service.ts`
   - Create `src/api/routes/group.routes.ts`
   - Implement: create group, list groups, assign/unassign clients
   - Write unit and integration tests

2. **Task 2.4: Loyalty Accounts** (10-14 hours) ⚠️ CRITICAL
   - Create `src/services/account.service.ts`
   - Implement atomic transactions for credit/debit operations
   - Create `src/api/routes/account.routes.ts`
   - **MUST:** Ensure denormalized data consistency
   - Write comprehensive tests for transaction atomicity

3. **Post Phase 4: Phase 5 - Audit System** (12-16 hours)
   - Integrate audit logging across all services
   - Create audit query endpoints
   - Ensure audit logs created within transactions

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

