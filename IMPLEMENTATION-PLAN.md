# LoyaltyGen - Comprehensive Implementation Plan

**Generated:** 2025-12-08  
**Last Updated:** 2025-12-11 (Frontend Implementation Enhancement)  
**Status:** Ready to Begin Implementation  
**Project Phase:** Design Complete → Implementation Starting

---

## 📋 Executive Summary

LoyaltyGen is an **API-First customer loyalty platform** built with TypeScript, Firebase, and Next.js. The project has completed its design phase with comprehensive documentation including architecture specifications, API contracts, coding guidelines, and a detailed work plan. This document synthesizes all project documentation into an actionable implementation roadmap.

**Recent Updates (2025-12-11):**
- ✨ **Enhanced frontend implementation details** for user stories HU4-HU12
- 📦 **Split Phase 7** into more granular tasks for better tracking
- ➕ **Added Phase 8**: Frontend implementation for HU4-HU8 (Client Detail & Loyalty Management)
- ➕ **Added Phase 9**: Frontend implementation for HU9-HU12 (Groups & Audit Features)
- 📋 **Added comprehensive UI/UX requirements** section applicable to all frontend phases
- 🔄 **Renumbered phases**: Advanced Features (Phase 10), Deployment (Phase 11)

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

### Overview of Phases

1. **Phase 1: Backend Foundation** (Week 1-2) - Project setup, auth, error handling
2. **Phase 2: Data Models** (Week 2) - Zod schemas and validation
3. **Phase 3: Client Management** (Week 3-4) - Client CRUD, photo management, search
4. **Phase 4: Groups & Accounts** (Week 4-5) - Affinity groups, loyalty accounts, atomic transactions
5. **Phase 5: Audit System** (Week 5-6) - Complete audit trail implementation
6. **Phase 6: Testing** (Week 6-7) - Unit tests, integration tests, 80%+ coverage
7. **Phase 7: Frontend Dashboard Foundation** (Week 7-8) - Next.js setup, auth flow, basic client UI (HU1-HU3) ✅
8. **Phase 8: Frontend - Client Detail & Loyalty** (Week 8-9) - Client detail panel, credit/debit, search, filters (HU4-HU8)
9. **Phase 9: Frontend - Groups & Audit** (Week 9-10) - Group management, audit logs, global audit panel (HU9-HU12)
10. **Phase 10: Advanced Features** (Week 10-11) - Family circle feature (optional)
11. **Phase 11: Deployment** (Week 11-12) - Production deployment, monitoring, documentation

---

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

### Phase 5: Audit System (Week 5-6) ✅ COMPLETED

#### Task 2.5.1-2.5.4: Complete Audit Implementation ✅ DONE
**Priority:** Highest | **Estimated Time:** 12-16 hours | **Actual Time:** 14 hours  
**Completed:** December 9, 2025

**Deliverables:**
- [x] `src/schemas/audit.schema.ts` with audit log schema (111 lines - existed)
- [x] `src/services/audit.service.ts` (285 lines):
  - `createAuditLog()` - create audit record (with transaction support)
  - `listAuditLogs()` - query with filters and pagination
  - `getClientAuditLogs()` - client-specific logs
  - `getAccountAuditLogs()` - account-specific logs
  - `getGroupAuditLogs()` - group-specific logs
- [x] Integrate audit logging in ALL services:
  - ClientService: CLIENT_CREATED, CLIENT_UPDATED, CLIENT_DELETED
  - GroupService: GROUP_CREATED, CLIENT_ADDED_TO_GROUP, CLIENT_REMOVED_FROM_GROUP
  - AccountService: ACCOUNT_CREATED, POINTS_CREDITED, POINTS_DEBITED
- [x] `src/api/routes/audit.routes.ts` with query endpoints (129 lines)
- [x] **CRITICAL:** Audit logs for credit/debit created within same atomic transaction
- [x] Unit tests: `src/services/audit.service.test.ts` (389 lines)
- [x] Integration tests: `tests/integration/test-audit-api.mjs` (385 lines)
- [x] Documentation: `PHASE-5-AUDIT-SUMMARY.md`, `docs/AUDIT-SYSTEM-API-GUIDE.md`

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
- [x] Every CRUD operation creates audit log
- [x] Update operations include before/after states
- [x] Credit/debit audit logs created atomically with transaction
- [x] Audit queries support filtering by action, date, resource
- [x] No PII logged in audit metadata
- [x] All 98 unit tests passing
- [x] All 74 integration tests passing (20 clients + 19 groups + 26 accounts + 9 audit)
- [x] 172/172 total tests passing (100% success rate)

**Test Results:**
```
✅ ALL TESTS PASSED
Unit Tests:        98 passed, 0 failed
Integration Tests: 74 passed, 0 failed (20 clients + 19 groups + 26 accounts + 9 audit)
Total:            172 passed, 0 failed (172 tests)
```

**Implementation Highlights:**
- ✅ Lazy-initialized services for test compatibility
- ✅ Firebase best practices: FieldValue.serverTimestamp(), atomic transactions
- ✅ Actor information (uid, email) captured from JWT tokens
- ✅ Comprehensive filtering: action, resource_type, client_id, account_id, date ranges
- ✅ Cursor-based pagination for performance
- ✅ Immutable audit logs for compliance
- ✅ Full API documentation and usage guide

**Reference:** WORK-PLAN.md Épica 2.5, docs/SPECS.md, PHASE-5-AUDIT-SUMMARY.md

---

### Phase 6: Testing (Week 6-7)

#### Task 4.1-4.2: Test Suite ⚠️ CRITICAL
**Priority:** Highest | **Estimated Time:** 16-20 hours

**Status:** ✅ COMPLETE (See PHASE-6-TEST-REPORT.md)

**Deliverables:**
- [x] Jest configuration with ts-jest
- [x] Firebase Functions Test setup
- [x] Mock helpers for Firestore
- [x] Coverage threshold: 80%
- [x] Unit tests for all services
- [x] Middleware tests (auth, error handling)
- [x] Integration tests for routes
- [x] Test atomic transactions
- [x] Test audit log creation

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

### Phase 7: Frontend Dashboard Foundation (Week 7-8) ✅ COMPLETED

#### Task 3.1: Next.js Scaffolding ✅ COMPLETED
**Priority:** High | **Estimated Time:** 4-6 hours

**Deliverables:**
- [x] Next.js 14+ project with App Router
- [x] Install dependencies: Tailwind, Shadcn/ui, Zustand, React Hook Form
- [x] Configure Firebase SDK for client-side auth
- [x] Environment variables setup

---

#### Task 3.2: Basic Dashboard Structure & Authentication ✅ COMPLETED
**Priority:** High | **Estimated Time:** 8-10 hours

**Deliverables:**
- [x] Responsive layout with sidebar navigation
- [x] Authentication flow (login, logout, protected routes)
- [x] Client management UI:
  - [x] Listing with search and filters (HU1, HU7)
  - [x] Creation form with all fields (HU2)
  - [x] Detail view
  - [x] Delete confirmation (HU3)
- [x] Audit components:
  - [x] Audit log list
  - [x] Audit action badges
  - [x] Audit detail dialog
  - [x] Client-specific audit history (HU10)
  - [x] Transaction audit view (HU11)
  - [x] Global audit panel (HU12)

**Reference:** WORK-PLAN.md Épica 3, docs/UI-UX-GUIDELINES.md

---

#### Task 3.3: Client Management UI (HU1, HU2, HU3) ✅ COMPLETED
**Priority:** High | **Estimated Time:** 12-16 hours

**Deliverables:**
- [x] `app/dashboard/clients/page.tsx` - Client listing page (HU1)
  - Table with columns: Name, Email, Identity Document
  - `Skeleton` loading state
  - Empty state component with "Create New Client" CTA
  - `DropdownMenu` for each row with View/Edit/Delete actions
- [x] `components/empty-state.tsx` - Reusable empty state component
- [x] `app/dashboard/clients/new/page.tsx` - Client creation page (HU2)
- [x] `components/clients/client-form.tsx` - Reusable form component
  - Zod validation for required fields
  - Identity document type selector (Cédula/Pasaporte)
  - Form state management with React Hook Form
  - Disabled state until form is valid
  - Spinner during submission
  [x] Toast notification on success
  - Conflict error handling (409) for duplicate email/document
- [x] `components/clients/delete-client-dialog.tsx` - Deletion confirmation (HU3)
  - `AlertDialog` with destructive styling
  - Clear warning message about irreversibility
  - Spinner during deletion
  [x] Toast notification on 202 Accepted
- [x] `components/ui/toast.tsx` - Toast notification component using Sonner
- [x] Toast notifications integrated in layout.tsx
- [x] Unit tests for toast component (6 tests)

**Acceptance Criteria:**
- [x] All HU1 criteria met (listing, skeleton, empty state, dropdown menu)
- [x] All HU2 criteria met (form validation, submission, error handling)
- [x] All HU3 criteria met (confirmation dialog, async deletion)
- [x] Spanish dialog text matches USER-STORIES.md requirements
- [x] All 38 unit tests passing (10 test suites)
- [x] Code coverage: 77.62% statements

**Reference:** USER-STORIES.md HU1-HU3

---

### Phase 8: Frontend - Client Detail & Loyalty Management (Week 8-9)

#### Task 3.4: Client Detail Panel (HU4)
**Priority:** High | **Estimated Time:** 10-14 hours

**Status:** ✅ COMPLETE

**Deliverables:**
- [x] `app/dashboard/clients/[id]/page.tsx` - Client detail page with tabs
- [x] `components/clients/client-info-card.tsx` - Basic client info display
- [x] `components/clients/affinity-groups-section.tsx` - Groups display with badges
- [x] `components/clients/accounts-summary.tsx` - Account balances overview
- [x] `components/clients/account-card.tsx` - Individual account card with credit/debit forms
- [x] `components/clients/transactions-list.tsx` - Transaction list component
- [x] `components/clients/create-account-form.tsx` - Create account form
- [x] `app/dashboard/clients/[id]/accounts/page.tsx` - Account management route

**Skeleton Loading:**
- [x] Implement `Skeleton` components for each section during data loading
- [x] Ensure smooth loading experience

**Acceptance Criteria:**
- [x] Client basic info displayed correctly
- [x] Groups shown as badges
- [x] All account balances visible in summary
- [x] Each account shows with recent transactions
- [x] Skeleton loaders work during data fetch
- [x] Navigation from client list works correctly
- [x] Account creation works end-to-end

**Reference:** USER-STORIES.md HU4

---

#### Task 3.5: Credit Points Feature (HU5)
**Priority:** High | **Estimated Time:** 6-8 hours

**Status:** ✅ COMPLETE

**Deliverables:**
- [x] `components/clients/credit-debit-form.tsx` - Reusable form for credit/debit
  - `Input` field for amount (numeric, min 1)
  - `Input` field for description (optional)
  - Zod validation schema with error messages
  - `Button` with "Acreditar" label (default variant)
  - Spinner state during submission
- [x] Integration with `POST /clients/{client_id}/accounts/{account_id}/credit`
- [x] Real-time balance update after credit via refetch mechanism
- [x] Transaction list auto-update after credit
- [x] Form reset after successful operation
- [x] Success `Toast` notification

**Acceptance Criteria:**
- [x] Form validates amount >= 1
- [x] Spinner shows during submission
- [x] Balance updates automatically after credit
- [x] New transaction appears in list
- [x] Success toast displayed
- [x] Form resets after success

**Reference:** USER-STORIES.md HU5

---

#### Task 3.6: Debit Points Feature (HU6)
**Priority:** High | **Estimated Time:** 6-8 hours

**Deliverables:**
- [x] Extend `components/clients/credit-debit-form.tsx` with `type="debit"` prop
  - `Button` with "Debitar" label (destructive variant)
  - Same validation as credit form with Spanish error messages
  - Spinner during submission
- [x] Integration with `POST /clients/{client_id}/accounts/{account_id}/debit`
- [x] Insufficient balance error handling
  - Detects "Insufficient balance" error message
  - Displays error in styled box with AlertCircle icon
  - Conditional console suppression for expected errors
- [x] Real-time balance update after debit via refetch
- [x] Transaction list auto-update after debit
- [x] Success `Toast` notification

**Acceptance Criteria:**
- [x] Form validates amount >= 1
- [x] Insufficient balance error displayed correctly with visual prominence
- [x] Balance updates after successful debit
- [x] New transaction appears in list
- [x] Button uses destructive variant
- [x] Form resets after success
- [x] Error handling doesn't clear form on validation failure

**Reference:** USER-STORIES.md HU6

---

#### Task 3.7: Client Search Enhancement (HU7)
**Priority:** High | **Estimated Time:** 6-8 hours

**Status:** ✅ COMPLETE

**Deliverables:**
- [x] `components/clients/client-search.tsx` - Search input component
  - `Input` with search icon (from lucide-react)
  - Placeholder: "Buscar cliente..."
  - Debounce implementation (300ms)
  - Custom hook `useDebouncedValue` implemented
- [x] MVP Implementation: Client-side filtering
  - Filter loaded results by name, email, document number
  - Case-insensitive search
- [x] Search empty state
  - Message: "No se encontraron clientes para '[término]'"
  - "Limpiar búsqueda" button
  - Resets search and shows all clients
- [x] Clear search functionality
  - X icon to clear search
  - Click to reset and show all results

**Note on Scalability:**
> MVP uses client-side filtering. When user base grows, migrate to Algolia/Elasticsearch as per ARCHITECTURE.md.

**Acceptance Criteria:**
- [ ] Search field displays above client table
- [ ] 300ms debounce works correctly
- [ ] Search filters by name, email, and document (case-insensitive)
- [ ] Empty state shows when no results
- [ ] "Limpiar búsqueda" button works
- [ ] Clear icon resets search

**Reference:** USER-STORIES.md HU7, FIRESTORE-SEARCH-SOLUTION.md

---

#### Task 3.8: Transaction Filtering (HU8)
**Priority:** Medium | **Estimated Time:** 8-10 hours

**Deliverables:**
- [x] `components/clients/transactions-filter.tsx` - Filter controls
  - `DateRangePicker` from shadcn/ui (using react-day-picker)
  - `Select` for transaction type with options:
    - "Todas" (null)
    - "Crédito" (credit)
    - "Débito" (debit)
  - "Limpiar filtros" button
  - Horizontal layout for filter controls
- [x] Integration with `GET /clients/{client_id}/accounts/{account_id}/transactions`
  - Pass date range and type query parameters
- [x] Debounce on date selection (500ms)
- [x] Filter application updates transaction list
- [x] Clear filters resets to initial state
- [x] Loading state while fetching filtered results

**Acceptance Criteria:**
- [x] DateRangePicker functions correctly
- [x] Type Select has all options
- [x] Filters update transaction list
- [x] "Limpiar filtros" button resets all controls
- [x] 500ms debounce works on date picker
- [x] Loading state shown during filter application

**Reference:** USER-STORIES.md HU8

---

### Phase 9: Frontend - Groups & Audit Features (Week 9-10)

#### Task 3.9: Group Assignment Management (HU9)
**Priority:** High | **Estimated Time:** 10-12 hours

**Deliverables:**
- [x] `components/clients/group-assignment.tsx` - Group management component
  - Display current groups as `Badge` components
  - Each badge has remove button (X icon)
  - `Combobox` from shadcn/ui for adding groups
- [x] Group `Combobox` implementation
  - Loads all groups via `GET /groups`
  - Filters list by typed text (case-insensitive)
  - Excludes groups client already belongs to
  - Shows "No se encontraron grupos" when no matches
  - Spinner during group loading
- [x] Add group functionality
  - `POST /groups/{group_id}/clients/{client_id}`
  - Spinner during operation
  - Badge added to list after success
  - Success `Toast` notification
- [x] Remove group functionality
  - `AlertDialog` confirmation on badge remove click
  - Title: "¿Remover del grupo?"
  - Description with group name and warning
  - `DELETE /groups/{group_id}/clients/{client_id}`
  - Badge removed from list after success
  - Success `Toast` notification

**Acceptance Criteria:**
- [x] Combobox lists available groups
- [x] Filter works correctly
- [x] Already-assigned groups not shown in list
- [x] Add operation updates UI and shows toast
- [x] Remove confirmation dialog appears
- [x] Remove operation updates UI and shows toast
- [x] Spinners shown during async operations

**Reference:** USER-STORIES.md HU9

---

#### Task 3.10: Client Audit History (HU10)
**Priority:** High | **Estimated Time:** 10-14 hours

**Deliverables:**
- [x] `components/audit/audit-logs-list.tsx` - Audit log list component
  - Chronological display (most recent first)
  - Pagination support (infinite scroll or "Load more" button)
  - `Skeleton` loading state
- [x] `components/audit/audit-log-item.tsx` - Individual audit record display
  - Action type with descriptive label
  - Date and time formatted
  - Actor email
  - Brief resource description
  - Clickable to open detail dialog
- [x] `components/audit/audit-log-dialog.tsx` - Audit detail dialog
  - Full audit record information
  - Before/after states (if applicable)
  - Metadata display (IP, user agent, description)
  - Proper formatting for complex data
- [x] Client detail page audit section
  - Tab or collapsible section for "Historial de Auditoría"
  - Integration with `GET /clients/{client_id}/audit-logs`
- [x] Audit type filter
  - `Select` component with all action types
  - Filters list by selected action type
  - Works with pagination

**Acceptance Criteria:**
- [x] Audit section visible in client detail page
- [x] Records displayed chronologically (most recent first)
- [x] Action type filter works
- [x] Detail dialog shows complete information
- [x] Pagination functions correctly
- [x] Skeleton shown during loading
- [x] Click on record opens detail dialog

**Reference:** USER-STORIES.md HU10

---

#### Task 3.11: Transaction Audit View (HU11)
**Priority:** Medium | **Estimated Time:** 6-8 hours

**Deliverables:**
- [ ] Modify `components/clients/transactions-list.tsx`
  - Add "Ver Auditoría" button/icon to each transaction
  - Use `FileSearch` icon from lucide-react
  - Opens audit dialog on click
- [ ] Audit dialog for transactions
  - Uses existing `audit-log-dialog.tsx` or creates specialized version
  - Displays:
    - Operation type (credit/debit)
    - Transaction amount
    - Balance before and after
    - User who performed operation
    - Exact date and time
    - Metadata (IP, user agent if available)
  - Shows informative message if no audit record exists
- [x] Account audit section
  - Tab or section showing "Auditoría de Cuenta"
  - Uses `GET /clients/{client_id}/accounts/{account_id}/audit-logs`
  - Displays all account-related audit records
  - Same list component as client audit

**Acceptance Criteria:**
- [ ] "Ver Auditoría" button appears on each transaction
- [ ] Dialog shows complete audit information
- [x] Appropriate message shown if no audit record
- [x] Account audit section functions correctly
- [x] All transaction audit details formatted properly

**Reference:** USER-STORIES.md HU11

---

#### Task 3.12: Global Audit Panel (HU12)
**Priority:** High | **Estimated Time:** 12-16 hours

**Deliverables:**
- [ ] `app/dashboard/audit/page.tsx` - Global audit page
  - Route: `/dashboard/audit`
  - Full-page audit log viewer
- [x] Sidebar navigation entry
  - "Auditoría" menu item
  - Navigates to `/dashboard/audit`
  - Appropriate icon (Shield, FileSearch, or similar)
- [x] `components/audit/audit-filters.tsx` - Advanced filter component
  - `DateRangePicker` for date range filtering
  - `Select` for action type (all possible actions)
  - `Input` for client ID search
  - `Input` for account ID search
  - "Limpiar filtros" button
  - Horizontal or grid layout for filters
- [x] Global audit table
  - Columns: Date, Action, Resource, Actor, Related Client
  - Sortable by date
  - Integration with `GET /audit-logs` endpoint
  - Cursor-based pagination
  - "Load more" button or infinite scroll
- [x] Audit detail dialog
  - Click on row opens dialog
  - Shows complete audit record details
  - Reuses `audit-log-dialog.tsx`
- [x] Filter debounce (500ms)
  - Applied after any filter change
  - Shows loading state during filter application
- [x] Loading and empty states
  - `Skeleton` during initial load
  - Empty state if no logs match filters
  - Clear message when filters return no results

**Acceptance Criteria:**
- [x] Global audit page accessible from sidebar
- [x] Table displays all audit logs with correct columns
- [x] All filters work correctly (date, action, client, account)
- [x] 500ms debounce on filters
- [x] "Limpiar filtros" resets all controls
- [x] Pagination works correctly
- [x] Click on row opens detail dialog
- [x] Loading states work properly
- [x] Empty states display appropriately

**Reference:** USER-STORIES.md HU12

---

### UI/UX Requirements for Phases 7-9 (Frontend)

**These requirements apply to ALL frontend tasks in Phases 7, 8, and 9:**

#### Design Standards
- [ ] Follow **docs/UI-UX-GUIDELINES.md** strictly for all components
- [ ] Use **Shadcn/ui** components as base (pre-styled, accessible)
- [ ] Apply **Tailwind CSS** for custom styling
- [ ] Maintain **consistent spacing** using Tailwind's scale (4px multiples)
- [ ] Use **Inter font** from Google Fonts
- [ ] Apply color palette:
  - Primary/Accent: `blue-600`
  - Text Main: `slate-900`
  - Text Secondary: `slate-600`
  - Background Layout: `slate-50`
  - Background Components: `white`
  - Borders: `slate-200`
  - Success: `green-500`
  - Error: `red-500`

#### Responsive Design
- [ ] **Mobile-first approach** - design for mobile, enhance for desktop
- [ ] Test on breakpoints: mobile (< 640px), tablet (640-1024px), desktop (> 1024px)
- [ ] Ensure touch-friendly targets (min 44x44px) on mobile
- [ ] Sidebar collapses to hamburger menu on mobile
- [ ] Tables scroll horizontally on mobile or convert to card layout

#### Loading States
- [ ] Use **`Skeleton`** components for initial data loading
- [ ] Use **`Spinner`** in buttons during form submission
- [ ] Show loading indicators for all async operations
- [ ] Disable interactive elements during loading
- [ ] Provide visual feedback within 100ms of user action

#### Empty States
- [ ] Never show empty tables/lists without context
- [ ] Empty state components must include:
  - Representative icon (lucide-react)
  - Clear, friendly message
  - Primary action button (if applicable)
- [ ] Examples:
  - "Aún no se han creado clientes" + "Crear Nuevo Cliente" button
  - "No se encontraron clientes para '[term]'" + "Limpiar búsqueda" button

#### Error States
- [ ] Display errors inline near the relevant field/component
- [ ] Use shadcn/ui error components for form validation
- [ ] Show clear, actionable error messages
- [ ] Provide recovery actions when possible
- [ ] Examples:
  - "El saldo de la cuenta es insuficiente para realizar el débito."
  - "Este cliente ya pertenece a otro círculo familiar."

#### User Feedback (Toasts)
- [ ] Use **`Toast`** component from shadcn/ui for notifications
- [ ] Show toast for all successful actions
- [ ] Show toast for errors that aren't field-specific
- [ ] Toast should auto-dismiss after 3-5 seconds
- [ ] Position toasts consistently (top-right or bottom-right)
- [ ] Examples:
  - Success: "Puntos acreditados exitosamente"
  - Success: "El proceso de eliminación del cliente ha comenzado"
  - Error: "Error al cargar los datos. Por favor, intenta nuevamente."

#### Confirmation Dialogs
- [ ] Use **`AlertDialog`** for all destructive actions
- [ ] Always require explicit confirmation for:
  - Deleting clients
  - Removing group members
  - Removing circle members
- [ ] Dialog must include:
  - Clear title (question format)
  - Warning message about consequences
  - "Cancelar" button (outline variant)
  - Destructive action button (destructive variant)
- [ ] Show spinner in action button during operation

#### Accessibility (WCAG 2.1 AA)
- [ ] All interactive elements keyboard accessible
- [ ] Proper focus management and visible focus indicators
- [ ] All images have descriptive `alt` text
- [ ] Form fields have associated labels
- [ ] Color contrast ratios meet WCAG AA standards (4.5:1 for text)
- [ ] Screen reader tested for main flows
- [ ] ARIA labels for icon-only buttons

#### Performance
- [ ] Implement debounce for search inputs (300ms)
- [ ] Implement debounce for filters (500ms)
- [ ] Use pagination or infinite scroll for large lists
- [ ] Lazy load images and heavy components
- [ ] Consider using Firestore `onSnapshot` for real-time updates where beneficial

#### Data Display
- [ ] Format dates consistently (use date-fns or similar)
- [ ] Format numbers with appropriate separators
- [ ] Show "-" for null/empty optional fields
- [ ] Identity documents show as "Type: Number" (e.g., "Pasaporte: AB123456")
- [ ] Currency/points formatted with separators (e.g., "1,234 puntos")

#### Forms
- [ ] Use **React Hook Form** for form state management
- [ ] Use **Zod** for validation (match backend schemas)
- [ ] Disable submit button until form is valid
- [ ] Show inline validation errors
- [ ] Clear form after successful submission (where appropriate)
- [ ] Prevent double submission
- [ ] Support Enter key to submit

#### Security (Frontend)
- [ ] Never store JWT tokens in localStorage/sessionStorage
- [ ] Keep tokens in memory (handled by Firebase SDK or Zustand)
- [ ] Sanitize all user-generated content before rendering
- [ ] Never use `dangerouslySetInnerHTML` with unsanitized data
- [ ] Validate file uploads client-side (type, size) before sending to backend

**Component Reusability:**
- [ ] Create reusable components for common patterns
- [ ] Use composition over duplication
- [ ] Props should be well-typed with TypeScript
- [ ] Document complex component APIs

**Reference:** docs/UI-UX-GUIDELINES.md

---

### Phase 10: Advanced Features (Week 10-11)

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

### Phase 11: Deployment (Week 11-12)

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
- **Examples:** `/api/v1/clients`, `/api/v1/accounts`

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

**Last Updated:** 2025-12-11  
**Document Version:** 1.1 (Frontend Implementation Enhancement)  
**Status:** Ready for Implementation

