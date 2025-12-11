# Audit System API Guide

## Overview

The LoyaltyGen Audit System provides comprehensive tracking of all operations performed on clients, loyalty accounts, and affinity groups. This guide explains how to query and use audit logs.

## Authentication

All audit endpoints require Firebase Authentication. Include your JWT token in the Authorization header:

```
Authorization: Bearer <your-firebase-id-token>
```

## Endpoints

### 1. List All Audit Logs

**GET** `/api/v1/audit-logs`

Query audit logs with optional filters and pagination.

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `action` | string | Filter by action type | `CLIENT_CREATED` |
| `resource_type` | string | Filter by resource type | `client` |
| `client_id` | string | Filter by client ID | `abc123` |
| `account_id` | string | Filter by account ID | `xyz789` |
| `start_date` | string (ISO 8601) | Filter logs after this date | `2025-01-01T00:00:00Z` |
| `end_date` | string (ISO 8601) | Filter logs before this date | `2025-12-31T23:59:59Z` |
| `limit` | number | Results per page (1-100) | `50` |
| `next_cursor` | string | Pagination cursor | `cursor_value` |

**Example Request:**
```bash
curl -X GET "http://localhost:5001/loyalty-gen/us-central1/api/api/v1/audit-logs?action=CLIENT_CREATED&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "data": [
    {
      "id": "audit_log_id",
      "action": "CLIENT_CREATED",
      "resource_type": "client",
      "resource_id": "client_id",
      "client_id": "client_id",
      "account_id": null,
      "group_id": null,
      "transaction_id": null,
      "actor": {
        "uid": "user_firebase_uid",
        "email": "user@example.com"
      },
      "changes": {
        "before": null,
        "after": {
          "name": {
            "firstName": "John",
            "firstLastName": "Doe"
          },
          "email": "john@example.com"
        }
      },
      "metadata": {
        "ip_address": null,
        "user_agent": null,
        "description": null
      },
      "timestamp": "2025-01-15T10:30:00.000Z"
    }
  ],
  "paging": {
    "next_cursor": "next_page_cursor"
  }
}
```

### 2. Get Client Audit Logs

**GET** `/api/v1/clients/:clientId/audit-logs`

Retrieve all audit logs for a specific client.

**Path Parameters:**
- `clientId` - The ID of the client

**Query Parameters:**
- `limit` (optional) - Number of results (1-100, default 30)
- `next_cursor` (optional) - Pagination cursor

**Example Request:**
```bash
curl -X GET "http://localhost:5001/loyalty-gen/us-central1/api/api/v1/clients/abc123/audit-logs?limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Use Cases:**
- Customer service: View complete history of a client's account
- GDPR requests: Export all actions performed on a client's data
- Debugging: Investigate issues with a specific client

### 3. Get Account Audit Logs

**GET** `/api/v1/clients/:clientId/loyalty-accounts/:accountId/audit-logs`

Retrieve all audit logs for a specific loyalty account.

**Path Parameters:**
- `clientId` - The ID of the client
- `accountId` - The ID of the loyalty account

**Query Parameters:**
- `limit` (optional) - Number of results (1-100, default 30)
- `next_cursor` (optional) - Pagination cursor

**Example Request:**
```bash
curl -X GET "http://localhost:5001/loyalty-gen/us-central1/api/api/v1/clients/abc123/loyalty-accounts/xyz789/audit-logs" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Use Cases:**
- Transaction history: View all credits and debits on an account
- Reconciliation: Audit point balance changes
- Fraud detection: Identify suspicious activity on an account

## Audit Actions

### Client Operations

| Action | Description | Changes Captured |
|--------|-------------|------------------|
| `CLIENT_CREATED` | New client registration | `before: null`, `after: <client_data>` |
| `CLIENT_UPDATED` | Client profile update | `before: <old_data>`, `after: <new_data>` |
| `CLIENT_DELETED` | Client account deletion | `before: <client_data>`, `after: null` |

### Loyalty Account Operations

| Action | Description | Changes Captured |
|--------|-------------|------------------|
| `ACCOUNT_CREATED` | New account creation | `before: null`, `after: <account_data>` |
| `POINTS_CREDITED` | Points added | `before: {points: X}`, `after: {points: X+N}` |
| `POINTS_DEBITED` | Points deducted | `before: {points: X}`, `after: {points: X-N}` |

**Note:** Credit and debit operations include the transaction details in the log.

### Affinity Group Operations

| Action | Description | Changes Captured |
|--------|-------------|------------------|
| `GROUP_CREATED` | New group creation | `before: null`, `after: <group_data>` |
| `CLIENT_ADDED_TO_GROUP` | Client assigned to group | Group ID and client ID |
| `CLIENT_REMOVED_FROM_GROUP` | Client removed from group | Group ID and client ID |

## Common Query Patterns

### 1. Recent Activity

Get the most recent 50 operations:
```bash
GET /api/v1/audit-logs?limit=50
```

### 2. Client History

Get all operations for a specific client:
```bash
GET /api/v1/clients/abc123/audit-logs
```

### 3. Point Transactions

Get all credit and debit operations:
```bash
GET /api/v1/audit-logs?action=POINTS_CREDITED
GET /api/v1/audit-logs?action=POINTS_DEBITED
```

### 4. Date Range Query

Get operations within a date range:
```bash
GET /api/v1/audit-logs?start_date=2025-01-01T00:00:00Z&end_date=2025-01-31T23:59:59Z
```

### 5. Account Transaction History

Get all transactions for a specific account:
```bash
GET /api/v1/clients/abc123/loyalty-accounts/xyz789/audit-logs
```

### 6. User Activity

Get all operations performed by a specific user (requires filtering response data by actor.uid):
```bash
GET /api/v1/audit-logs
# Then filter client-side: data.filter(log => log.actor.uid === 'target_user_uid')
```

## Pagination

The API uses cursor-based pagination for efficient querying:

1. **First Request:** Omit `next_cursor` parameter
2. **Subsequent Requests:** Use the `next_cursor` from the previous response

**Example:**
```bash
# First page
GET /api/v1/audit-logs?limit=10

# Response includes: { "paging": { "next_cursor": "abc123" } }

# Next page
GET /api/v1/audit-logs?limit=10&next_cursor=abc123
```

**Important:** `next_cursor` will be `null` when there are no more results.

## Error Responses

All errors follow the standard format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

**Common Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_TOKEN` | 401 | Authentication token is invalid or expired |
| `UNAUTHORIZED` | 401 | Missing authentication token |
| `VALIDATION_ERROR` | 400 | Invalid query parameters |
| `NOT_FOUND` | 404 | Resource not found |

## Best Practices

### 1. Pagination
- Use reasonable page sizes (10-50 records)
- Implement cursor-based pagination in your client
- Cache results locally when appropriate

### 2. Filtering
- Apply filters server-side for better performance
- Combine filters for more specific queries
- Use date ranges to limit result sets

### 3. Performance
- Request only the data you need
- Implement client-side caching for frequently accessed logs
- Use specific endpoints (client/account logs) instead of filtering all logs

### 4. Compliance
- Store audit log query results for compliance documentation
- Implement automated exports for regulatory reporting
- Set up alerts for critical operations (deletions, large debits)

### 5. Security
- Never expose audit logs to end users without proper authorization
- Implement role-based access control (admin-only)
- Sanitize sensitive data before displaying logs

## Example Use Cases

### Customer Service Dashboard
```javascript
// Get complete client history
const response = await fetch(
  `${API_BASE}/clients/${clientId}/audit-logs?limit=50`,
  {
    headers: { Authorization: `Bearer ${token}` }
  }
);
const logs = await response.json();
// Display timeline of all client activities
```

### Fraud Detection
```javascript
// Monitor recent high-value transactions
const response = await fetch(
  `${API_BASE}/audit-logs?action=POINTS_DEBITED&start_date=${today}`,
  {
    headers: { Authorization: `Bearer ${token}` }
  }
);
const logs = await response.json();
// Alert on debits > threshold
```

### Compliance Report
```javascript
// Monthly activity report
const response = await fetch(
  `${API_BASE}/audit-logs?start_date=${monthStart}&end_date=${monthEnd}&limit=100`,
  {
    headers: { Authorization: `Bearer ${token}` }
  }
);
let allLogs = [];
let nextCursor = null;

// Paginate through all results
do {
  const url = nextCursor 
    ? `${API_BASE}/audit-logs?start_date=${monthStart}&end_date=${monthEnd}&limit=100&next_cursor=${nextCursor}`
    : `${API_BASE}/audit-logs?start_date=${monthStart}&end_date=${monthEnd}&limit=100`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  
  allLogs = allLogs.concat(data.data);
  nextCursor = data.paging.next_cursor;
} while (nextCursor);

// Generate compliance report from allLogs
```

### Account Reconciliation
```javascript
// Get all transactions for an account
const response = await fetch(
  `${API_BASE}/clients/${clientId}/loyalty-accounts/${accountId}/audit-logs`,
  {
    headers: { Authorization: `Bearer ${token}` }
  }
);
const logs = await response.json();

// Calculate expected balance
const balance = logs.data
  .filter(log => log.action === 'POINTS_CREDITED' || log.action === 'POINTS_DEBITED')
  .reduce((sum, log) => {
    const points = log.changes.after.points - log.changes.before.points;
    return sum + points;
  }, 0);
```

## Testing

For testing with Firebase emulators:

```bash
# Start emulators
firebase emulators:start --only functions,firestore,auth

# Generate test auth token
curl -X POST "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key" \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_CUSTOM_TOKEN","returnSecureToken":true}'

# Use the returned idToken for API requests
```

## Support

For issues or questions about the Audit System:
1. Check the main documentation in `docs/`
2. Review the OpenAPI specification in `openapi.yaml`
3. Examine the integration tests in `tests/integration/test-audit-api.mjs`

## Version

Current API Version: v1  
Last Updated: January 2025  
Phase: 5 (Audit System Implementation)
