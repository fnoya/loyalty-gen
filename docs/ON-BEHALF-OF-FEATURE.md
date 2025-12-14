# On Behalf Of Transaction Feature

## Overview

The `on_behalf_of` feature allows family circle members to perform credit and debit transactions on behalf of the account holder, with proper permission validation and audit trails.

## Feature Components

### 1. Query Parameter

Both credit and debit endpoints accept an optional `on_behalf_of` query parameter:

```
POST /api/v1/clients/{clientId}/accounts/{accountId}/credit?on_behalf_of={memberClientId}
POST /api/v1/clients/{clientId}/accounts/{accountId}/debit?on_behalf_of={memberClientId}
```

### 2. Permission Validation

When `on_behalf_of` is provided:

1. The system verifies the member is part of the holder's family circle
2. The system checks the member has the appropriate permission:
   - `allowMemberCredits: true` for credit transactions
   - `allowMemberDebits: true` for debit transactions
3. If validation fails, returns `403 FORBIDDEN` with error code `FAMILY_CIRCLE_PERMISSION_DENIED`
4. If member not in circle, returns `404 NOT_FOUND`

### 3. Transaction Originator Tracking

All transactions include an `originatedBy` field that tracks who initiated the transaction:

```json
{
  "transaction_type": "credit",
  "amount": 500,
  "description": "Reward bonus",
  "originatedBy": {
    "clientId": "member-client-id",
    "isCircleMember": true,
    "relationshipType": "child"
  }
}
```

For direct holder transactions (no `on_behalf_of`), `originatedBy` is `null`.

## API Examples

### Example 1: Member Credits on Behalf of Holder

```bash
# Member (child) credits 500 points to holder's account
curl -X POST \
  "http://localhost:5001/loyalty-gen/us-central1/api/v1/clients/holder-123/accounts/account-456/credit?on_behalf_of=member-789" \
  -H "Authorization: Bearer ${MEMBER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "description": "Reward bonus"
  }'
```

**Response:**
```json
{
  "id": "account-456",
  "account_name": "Primary Rewards",
  "points": 1500,
  "familyCircleConfig": {
    "allowMemberCredits": true,
    "allowMemberDebits": false,
    "updatedAt": "2024-01-15T10:30:00Z",
    "updatedBy": "holder-uid"
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T14:20:00Z"
}
```

### Example 2: Member Attempts Debit Without Permission

```bash
# Member tries to debit but doesn't have permission
curl -X POST \
  "http://localhost:5001/loyalty-gen/us-central1/api/v1/clients/holder-123/accounts/account-456/debit?on_behalf_of=member-789" \
  -H "Authorization: Bearer ${MEMBER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "description": "Redemption"
  }'
```

**Error Response (403):**
```json
{
  "error": {
    "code": "FAMILY_CIRCLE_PERMISSION_DENIED",
    "message": "Member does not have permission to debit points"
  }
}
```

### Example 3: Holder Direct Transaction (No on_behalf_of)

```bash
# Holder credits their own account directly
curl -X POST \
  "http://localhost:5001/loyalty-gen/us-central1/api/v1/clients/holder-123/accounts/account-456/credit" \
  -H "Authorization: Bearer ${HOLDER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "description": "Initial points"
  }'
```

Transaction will have `originatedBy: null` (direct holder transaction).

## Implementation Details

### Route Handler Logic

```typescript
// Extract on_behalf_of query parameter
const onBehalfOf = req.query.on_behalf_of as string | undefined;

let originator = null;
if (onBehalfOf) {
  // Validate member has permission
  const relationshipType = await familyCircleService.validateMemberTransactionPermission(
    clientId!,
    onBehalfOf,
    accountId!,
    "credit" // or "debit"
  );
  
  // Build originator object
  originator = {
    clientId: onBehalfOf,
    isCircleMember: true,
    relationshipType
  };
}

// Pass originator to service
await accountService.instance.creditPoints(
  clientId!,
  accountId!,
  validated,
  actor,
  originator
);
```

### Service Layer

The `creditPoints()` and `debitPoints()` methods accept an optional `originator` parameter:

```typescript
async creditPoints(
  clientId: string,
  accountId: string,
  request: CreditDebitRequest,
  actor: AuditActor,
  originator?: {
    clientId: string;
    isCircleMember: boolean;
    relationshipType: string;
  } | null
): Promise<LoyaltyAccount>
```

Transactions are created with:

```typescript
const transaction = {
  transaction_type: "credit",
  amount: request.amount,
  balance_after: newPoints,
  description: request.description,
  created_at: FieldValue.serverTimestamp(),
  originatedBy: originator || null, // Track who initiated
};
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `FAMILY_CIRCLE_PERMISSION_DENIED` | 403 | Member doesn't have credit/debit permission |
| `CLIENT_NOT_FOUND` | 404 | Member client ID not found |
| `VALIDATION_FAILED` | 400 | Invalid query parameter format |

## Configuration

To enable member transactions, the holder must configure permissions:

```bash
PATCH /api/v1/clients/{clientId}/accounts/{accountId}/family-circle-config
{
  "allowMemberCredits": true,
  "allowMemberDebits": false
}
```

## Audit Trail

All transactions are logged in the audit system with:
- Actor (the authenticated user performing the API call)
- Resource (the account and transaction)
- Originator field in transaction (who initiated - member or holder)

This provides complete traceability:
1. Who made the API call (actor)
2. On whose behalf the transaction was made (originator)
3. Which account was affected (resource)

## Testing

### Integration Tests

File: `/tests/integration/test-on-behalf-of.mjs`

**Test Coverage (6/6 passing):**
1. ✅ Member credits on behalf of holder (with permission)
2. ✅ Member debits on behalf of holder (with permission)
3. ✅ Holder direct transactions still work (no `on_behalf_of`)
4. ✅ Credit permission denied (403)
5. ✅ Debit permission denied (403)
6. ✅ Non-member cannot use `on_behalf_of` (404)

### Unit Tests

File: `/functions/src/api/routes/__tests__/account.routes.test.ts`

Tests verify:
- Route handlers pass `null` originator for direct transactions
- Route handlers call service with proper originator when `on_behalf_of` provided
- Error handling for invalid member IDs

## Schema Changes

### Transaction Schema

Added optional `originatedBy` field:

```typescript
export const transactionOriginatorSchema = z
  .object({
    clientId: firestoreIdSchema.describe("ID of the client who originated transaction"),
    isCircleMember: z.boolean().describe("Whether originator is a family circle member"),
    relationshipType: z.string().describe("Relationship to holder (e.g., 'child', 'spouse')"),
  })
  .nullable();

export const transactionSchema = z.object({
  // ... existing fields
  originatedBy: transactionOriginatorSchema.optional(),
});
```

## Backward Compatibility

✅ Fully backward compatible:
- `on_behalf_of` parameter is optional
- Existing transactions without `originatedBy` field work normally
- Direct holder transactions use `originatedBy: null`

## Future Enhancements

Possible future improvements:
1. Add transaction type filtering by originator
2. Dashboard showing member activity
3. Per-member transaction limits
4. Time-based permission windows
5. Transaction approval workflows

## Related Documentation

- [Family Circle Feature](./FAMILY-CIRCLE-FEATURE.md)
- [API Design](./API-DESIGN.md)
- [Architecture](./ARCHITECTURE.md)
