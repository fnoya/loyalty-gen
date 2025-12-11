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
7. **Phase 7: Frontend Dashboard Foundation** (Week 7-8) - Next.js setup, auth flow, basic client UI (HU1-HU3)
8. **Phase 8: Frontend - Client Detail & Loyalty** (Week 8-9) - Client detail panel, credit/debit, search, filters (HU4-HU8)
9. **Phase 9: Frontend - Groups & Audit** (Week 9-10) - Group management, audit logs, global audit panel (HU9-HU12)
10. **Phase 10: Advanced Features** (Week 10-11) - Family circle feature (optional)
11. **Phase 11: Deployment** (Week 11-12) - Production deployment, monitoring, documentation

---

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

### Phase 7: Frontend Dashboard Foundation (Week 7-8)

#### Task 3.1: Next.js Scaffolding
**Priority:** High | **Estimated Time:** 4-6 hours

**Deliverables:**
- [ ] Next.js 14+ project with App Router
- [ ] Install dependencies: Tailwind, Shadcn/ui, Zustand, React Hook Form
- [ ] Configure Firebase SDK for client-side auth
- [ ] Environment variables setup

---

#### Task 3.2: Basic Dashboard Structure & Authentication
**Priority:** High | **Estimated Time:** 8-10 hours

**Deliverables:**
- [ ] Responsive layout with sidebar navigation
- [ ] Authentication flow (login, logout, protected routes)
- [ ] Route protection middleware
- [ ] User session management with Zustand

**Reference:** WORK-PLAN.md Épica 3, docs/UI-UX-GUIDELINES.md

---

#### Task 3.3: Client Management UI (HU1, HU2, HU3)
**Priority:** High | **Estimated Time:** 12-16 hours

**Deliverables:**
- [ ] `app/dashboard/clients/page.tsx` - Client listing page (HU1)
  - Table with columns: Name, Email, Identity Document
  - `Skeleton` loading state
  - Empty state component with "Create New Client" CTA
  - `DropdownMenu` for each row with View/Edit/Delete actions
- [ ] `components/empty-state.tsx` - Reusable empty state component
- [ ] `app/dashboard/clients/new/page.tsx` - Client creation page (HU2)
- [ ] `components/clients/client-form.tsx` - Reusable form component
  - Zod validation for required fields
  - Identity document type selector (Cédula/Pasaporte)
  - Form state management with React Hook Form
  - Disabled state until form is valid
  - Spinner during submission
  - Toast notification on success
  - Conflict error handling (409) for duplicate email/document
- [ ] `components/clients/delete-client-dialog.tsx` - Deletion confirmation (HU3)
  - `AlertDialog` with destructive styling
  - Clear warning message about irreversibility
  - Spinner during deletion
  - Toast notification on 202 Accepted

**Acceptance Criteria:**
- [ ] All HU1 criteria met (listing, skeleton, empty state, dropdown menu)
- [ ] All HU2 criteria met (form validation, submission, error handling)
- [ ] All HU3 criteria met (confirmation dialog, async deletion)

**Reference:** USER-STORIES.md HU1-HU3

---

### Phase 8: Frontend - Client Detail & Loyalty Management (Week 8-9)

#### Task 3.4: Client Detail Panel (HU4)
**Priority:** High | **Estimated Time:** 10-14 hours

**Deliverables:**
- [ ] `app/dashboard/clients/[id]/page.tsx` - Client detail page
- [ ] `components/clients/client-info-card.tsx` - Basic client info display
  - Name and email in `Card` component
  - Client photo or avatar placeholder
- [ ] `components/clients/affinity-groups-section.tsx` - Groups display
  - Groups shown as `Badge` components
  - Link to add groups (for HU9)
- [ ] `components/clients/accounts-summary.tsx` - Account balances overview
  - Uses `GET /clients/{id}/balance` endpoint
  - Shows all account balances in summary format
  - `Card` component with proper spacing
- [ ] `components/clients/account-card.tsx` - Individual account card
  - Account name and current balance
  - Placeholder for credit/debit forms (HU5, HU6)
  - Recent transactions list (last 5)
  - "View more" link to full transaction history
- [ ] `components/clients/transactions-list.tsx` - Transaction list component
  - Displays transaction type, amount, description, timestamp
  - Proper formatting for credit/debit types
  - Empty state when no transactions

**Skeleton Loading:**
- [ ] Implement `Skeleton` components for each section during data loading
- [ ] Ensure smooth loading experience

**Acceptance Criteria:**
- [ ] Client basic info displayed correctly
- [ ] Groups shown as badges
- [ ] All account balances visible in summary
- [ ] Each account shows with recent transactions
- [ ] Skeleton loaders work during data fetch
- [ ] Navigation from client list works correctly

**Reference:** USER-STORIES.md HU4

---

#### Task 3.5: Credit Points Feature (HU5)
**Priority:** High | **Estimated Time:** 6-8 hours

**Deliverables:**
- [ ] `components/clients/credit-debit-form.tsx` - Reusable form for credit/debit
  - `Input` field for amount (numeric, min 1)
  - `Input` field for description (optional)
  - Zod validation schema
  - `Button` with "Acreditar" label (default variant)
  - Spinner state during submission
- [ ] Integration with `POST /clients/{client_id}/accounts/{account_id}/credit`
- [ ] Real-time balance update after credit
  - Consider using Firestore `onSnapshot` for real-time updates
  - Or implement refetch mechanism
- [ ] Transaction list auto-update after credit
- [ ] Form reset after successful operation
- [ ] Success `Toast` notification

**Acceptance Criteria:**
- [ ] Form validates amount >= 1
- [ ] Spinner shows during submission
- [ ] Balance updates automatically after credit
- [ ] New transaction appears in list
- [ ] Success toast displayed
- [ ] Form resets after success

**Reference:** USER-STORIES.md HU5

---

#### Task 3.6: Debit Points Feature (HU6)
**Priority:** High | **Estimated Time:** 6-8 hours

**Deliverables:**
- [ ] Extend `components/clients/credit-debit-form.tsx` with `type="debit"` prop
  - `Button` with "Debitar" label (secondary variant)
  - Same validation as credit form
  - Spinner during submission
- [ ] Integration with `POST /clients/{client_id}/accounts/{account_id}/debit`
- [ ] Insufficient balance error handling
  - Detect 400 response with `INSUFFICIENT_BALANCE` code
  - Display error message: "El saldo de la cuenta es insuficiente para realizar el débito."
  - Use shadcn/ui form error component
- [ ] Real-time balance update after debit
- [ ] Transaction list auto-update
- [ ] Success `Toast` notification

**Acceptance Criteria:**
- [ ] Form validates amount >= 1
- [ ] Insufficient balance error displayed correctly
- [ ] Balance updates after successful debit
- [ ] New transaction appears in list
- [ ] Button uses secondary variant
- [ ] Form resets after success

**Reference:** USER-STORIES.md HU6

---

#### Task 3.7: Client Search Enhancement (HU7)
**Priority:** High | **Estimated Time:** 6-8 hours

**Deliverables:**
- [ ] `components/clients/client-search.tsx` - Search input component
  - `Input` with search icon (from lucide-react)
  - Placeholder: "Buscar cliente..."
  - Debounce implementation (300ms)
  - Custom hook `useDebouncedValue` if needed
- [ ] MVP Implementation: Client-side filtering
  - Filter loaded results by name, email, document number
  - Case-insensitive search
- [ ] Search empty state
  - Message: "No se encontraron clientes para '[término]'"
  - "Limpiar búsqueda" button
  - Resets search and shows all clients
- [ ] Clear search functionality
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
- [ ] `components/clients/transactions-filter.tsx` - Filter controls
  - `DateRangePicker` from shadcn/ui (using react-day-picker)
  - `Select` for transaction type with options:
    - "Todas" (null)
    - "Crédito" (credit)
    - "Débito" (debit)
  - "Limpiar filtros" button
  - Horizontal layout for filter controls
- [ ] Integration with `GET /clients/{client_id}/accounts/{account_id}/transactions`
  - Pass date range and type query parameters
- [ ] Debounce on date selection (500ms)
- [ ] Filter application updates transaction list
- [ ] Clear filters resets to initial state
- [ ] Loading state while fetching filtered results

**Acceptance Criteria:**
- [ ] DateRangePicker functions correctly
- [ ] Type Select has all options
- [ ] Filters update transaction list
- [ ] "Limpiar filtros" button resets all controls
- [ ] 500ms debounce works on date picker
- [ ] Loading state shown during filter application

**Reference:** USER-STORIES.md HU8

---

### Phase 9: Frontend - Groups & Audit Features (Week 9-10)

#### Task 3.9: Group Assignment Management (HU9)
**Priority:** High | **Estimated Time:** 10-12 hours

**Deliverables:**
- [ ] `components/clients/group-assignment.tsx` - Group management component
  - Display current groups as `Badge` components
  - Each badge has remove button (X icon)
  - `Combobox` from shadcn/ui for adding groups
- [ ] Group `Combobox` implementation
  - Loads all groups via `GET /groups`
  - Filters list by typed text (case-insensitive)
  - Excludes groups client already belongs to
  - Shows "No se encontraron grupos" when no matches
  - Spinner during group loading
- [ ] Add group functionality
  - `POST /groups/{group_id}/clients/{client_id}`
  - Spinner during operation
  - Badge added to list after success
  - Success `Toast` notification
- [ ] Remove group functionality
  - `AlertDialog` confirmation on badge remove click
  - Title: "¿Remover del grupo?"
  - Description with group name and warning
  - `DELETE /groups/{group_id}/clients/{client_id}`
  - Badge removed from list after success
  - Success `Toast` notification

**Acceptance Criteria:**
- [ ] Combobox lists available groups
- [ ] Filter works correctly
- [ ] Already-assigned groups not shown in list
- [ ] Add operation updates UI and shows toast
- [ ] Remove confirmation dialog appears
- [ ] Remove operation updates UI and shows toast
- [ ] Spinners shown during async operations

**Reference:** USER-STORIES.md HU9

---

#### Task 3.10: Client Audit History (HU10)
**Priority:** High | **Estimated Time:** 10-14 hours

**Deliverables:**
- [ ] `components/audit/audit-logs-list.tsx` - Audit log list component
  - Chronological display (most recent first)
  - Pagination support (infinite scroll or "Load more" button)
  - `Skeleton` loading state
- [ ] `components/audit/audit-log-item.tsx` - Individual audit record display
  - Action type with descriptive label
  - Date and time formatted
  - Actor email
  - Brief resource description
  - Clickable to open detail dialog
- [ ] `components/audit/audit-log-dialog.tsx` - Audit detail dialog
  - Full audit record information
  - Before/after states (if applicable)
  - Metadata display (IP, user agent, description)
  - Proper formatting for complex data
- [ ] Client detail page audit section
  - Tab or collapsible section for "Historial de Auditoría"
  - Integration with `GET /clients/{client_id}/audit-logs`
- [ ] Audit type filter
  - `Select` component with all action types
  - Filters list by selected action type
  - Works with pagination

**Acceptance Criteria:**
- [ ] Audit section visible in client detail page
- [ ] Records displayed chronologically (most recent first)
- [ ] Action type filter works
- [ ] Detail dialog shows complete information
- [ ] Pagination functions correctly
- [ ] Skeleton shown during loading
- [ ] Click on record opens detail dialog

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
- [ ] Account audit section
  - Tab or section showing "Auditoría de Cuenta"
  - Uses `GET /clients/{client_id}/accounts/{account_id}/audit-logs`
  - Displays all account-related audit records
  - Same list component as client audit

**Acceptance Criteria:**
- [ ] "Ver Auditoría" button appears on each transaction
- [ ] Dialog shows complete audit information
- [ ] Appropriate message shown if no audit record
- [ ] Account audit section functions correctly
- [ ] All transaction audit details formatted properly

**Reference:** USER-STORIES.md HU11

---

#### Task 3.12: Global Audit Panel (HU12)
**Priority:** High | **Estimated Time:** 12-16 hours

**Deliverables:**
- [ ] `app/dashboard/audit/page.tsx` - Global audit page
  - Route: `/dashboard/audit`
  - Full-page audit log viewer
- [ ] Sidebar navigation entry
  - "Auditoría" menu item
  - Navigates to `/dashboard/audit`
  - Appropriate icon (Shield, FileSearch, or similar)
- [ ] `components/audit/audit-filters.tsx` - Advanced filter component
  - `DateRangePicker` for date range filtering
  - `Select` for action type (all possible actions)
  - `Input` for client ID search
  - `Input` for account ID search
  - "Limpiar filtros" button
  - Horizontal or grid layout for filters
- [ ] Global audit table
  - Columns: Date, Action, Resource, Actor, Related Client
  - Sortable by date
  - Integration with `GET /audit-logs` endpoint
  - Cursor-based pagination
  - "Load more" button or infinite scroll
- [ ] Audit detail dialog
  - Click on row opens dialog
  - Shows complete audit record details
  - Reuses `audit-log-dialog.tsx`
- [ ] Filter debounce (500ms)
  - Applied after any filter change
  - Shows loading state during filter application
- [ ] Loading and empty states
  - `Skeleton` during initial load
  - Empty state if no logs match filters
  - Clear message when filters return no results

**Acceptance Criteria:**
- [ ] Global audit page accessible from sidebar
- [ ] Table displays all audit logs with correct columns
- [ ] All filters work correctly (date, action, client, account)
- [ ] 500ms debounce on filters
- [ ] "Limpiar filtros" resets all controls
- [ ] Pagination works correctly
- [ ] Click on row opens detail dialog
- [ ] Loading states work properly
- [ ] Empty states display appropriately

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

**Last Updated:** 2025-12-11  
**Document Version:** 1.1 (Frontend Implementation Enhancement)  
**Status:** Ready for Implementation

