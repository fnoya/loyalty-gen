/**
 * Integration Tests for Audit API
 * 
 * Tests the complete audit logging system including:
 * - Audit logs created for all CRUD operations
 * - Query and filtering of audit logs
 * - Audit trail for client, account, and group operations
 */

import fetch from 'node-fetch';
import admin from 'firebase-admin';

const BASE_URL = 'http://127.0.0.1:5001/loyalty-gen/us-central1/api/v1';
const EMULATOR_AUTH_URL = 'http://127.0.0.1:9099';
let authToken = null;
let testClientId = null;
let testAccountId = null;
let testGroupId = null;

// Configure Firebase Admin for emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.GCLOUD_PROJECT = 'loyalty-gen';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'loyalty-gen' });
}

// Generate auth token for testing
async function getAuthToken() {
  const customToken = await admin.auth().createCustomToken('test-user-123');

  // Exchange custom token for ID token
  const response = await fetch(
    `${EMULATOR_AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );

  const data = await response.json();
  return data.idToken;
}

async function makeRequest(method, path, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  const data = await response.json();
  
  return { status: response.status, data };
}

async function testAuditSystem() {
  console.log('🔍 Starting Audit System Integration Tests...\n');

  try {
    // Get auth token
    authToken = await getAuthToken();
    console.log('✓ Authentication configured\n');

    // Test 1: Create a client and verify audit log
    console.log('Test 1: Client creation generates audit log');
    const clientResponse = await makeRequest('POST', '/clients', {
      name: {
        firstName: 'Audit',
        firstLastName: 'Test'
      },
      email: `audit-test-${Date.now()}@example.com`
    });
    
    if (clientResponse.status !== 201) {
      throw new Error(`Failed to create client: ${JSON.stringify(clientResponse.data)}`);
    }
    
    testClientId = clientResponse.data.id;
    console.log(`  ✓ Client created: ${testClientId}`);

    // Wait a moment for audit log to be written
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Fetch client audit logs
    const clientAuditResponse = await makeRequest('GET', `/clients/${testClientId}/audit-logs`);
    
    if (clientAuditResponse.status !== 200) {
      throw new Error(`Failed to fetch client audit logs: ${JSON.stringify(clientAuditResponse.data)}`);
    }
    
    const clientAuditLogs = clientAuditResponse.data.data;
    const createLog = clientAuditLogs.find(log => log.action === 'CLIENT_CREATED');
    
    if (!createLog) {
      throw new Error('CLIENT_CREATED audit log not found');
    }
    
    console.log(`  ✓ CLIENT_CREATED audit log verified`);
    console.log(`    - Resource ID: ${createLog.resource_id}`);
    console.log(`    - Actor UID: ${createLog.actor.uid}`);
    console.log(`    - Timestamp: ${createLog.timestamp}\n`);

    // Test 2: Update client and verify audit log
    console.log('Test 2: Client update generates audit log');
    const updateResponse = await makeRequest('PUT', `/clients/${testClientId}`, {
      name: {
        firstName: 'Audit Updated',
        firstLastName: 'Test'
      }
    });
    
    if (updateResponse.status !== 200) {
      throw new Error(`Failed to update client: ${JSON.stringify(updateResponse.data)}`);
    }
    
    console.log(`  ✓ Client updated`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const updateAuditResponse = await makeRequest('GET', `/clients/${testClientId}/audit-logs`);
    const updateAuditLogs = updateAuditResponse.data.data;
    const updateLog = updateAuditLogs.find(log => log.action === 'CLIENT_UPDATED');
    
    if (!updateLog) {
      throw new Error('CLIENT_UPDATED audit log not found');
    }
    
    console.log(`  ✓ CLIENT_UPDATED audit log verified`);
    console.log(`    - Before: ${updateLog.changes.before.name.firstName}`);
    console.log(`    - After: ${updateLog.changes.after.name.firstName}\n`);

    // Test 3: Create loyalty account and verify audit log
    console.log('Test 3: Account creation generates audit log');
    const accountResponse = await makeRequest('POST', `/clients/${testClientId}/accounts`, {
      account_name: 'Audit Test Account'
    });
    
    if (accountResponse.status !== 201) {
      throw new Error(`Failed to create account: ${JSON.stringify(accountResponse.data)}`);
    }
    
    testAccountId = accountResponse.data.id;
    console.log(`  ✓ Account created: ${testAccountId}`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const accountAuditResponse = await makeRequest('GET', `/clients/${testClientId}/accounts/${testAccountId}/audit-logs`);
    
    if (accountAuditResponse.status !== 200) {
      throw new Error(`Failed to fetch account audit logs: ${JSON.stringify(accountAuditResponse.data)}`);
    }
    
    const accountAuditLogs = accountAuditResponse.data.data;
    const accountCreateLog = accountAuditLogs.find(log => log.action === 'ACCOUNT_CREATED');
    
    if (!accountCreateLog) {
      throw new Error('ACCOUNT_CREATED audit log not found');
    }
    
    console.log(`  ✓ ACCOUNT_CREATED audit log verified\n`);

    // Test 4: Credit points and verify audit log (atomic transaction)
    console.log('Test 4: Point credit generates audit log (atomic)');
    const creditResponse = await makeRequest('POST', `/clients/${testClientId}/accounts/${testAccountId}/credit`, {
      amount: 100,
      description: 'Test credit for audit'
    });
    
    if (creditResponse.status !== 200) {
      throw new Error(`Failed to credit points: ${JSON.stringify(creditResponse.data)}`);
    }
    
    console.log(`  ✓ Points credited: 100`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const creditAuditResponse = await makeRequest('GET', `/clients/${testClientId}/accounts/${testAccountId}/audit-logs`);
    const creditAuditLogs = creditAuditResponse.data.data;
    const creditLog = creditAuditLogs.find(log => log.action === 'POINTS_CREDITED');
    
    if (!creditLog) {
      throw new Error('POINTS_CREDITED audit log not found');
    }
    
    console.log(`  ✓ POINTS_CREDITED audit log verified`);
    console.log(`    - Before: ${creditLog.changes.before.points} points`);
    console.log(`    - After: ${creditLog.changes.after.points} points\n`);

    // Test 5: Debit points and verify audit log (atomic transaction)
    console.log('Test 5: Point debit generates audit log (atomic)');
    const debitResponse = await makeRequest('POST', `/clients/${testClientId}/accounts/${testAccountId}/debit`, {
      amount: 50,
      description: 'Test debit for audit'
    });
    
    if (debitResponse.status !== 200) {
      throw new Error(`Failed to debit points: ${JSON.stringify(debitResponse.data)}`);
    }
    
    console.log(`  ✓ Points debited: 50`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const debitAuditResponse = await makeRequest('GET', `/clients/${testClientId}/accounts/${testAccountId}/audit-logs`);
    const debitAuditLogs = debitAuditResponse.data.data;
    const debitLog = debitAuditLogs.find(log => log.action === 'POINTS_DEBITED');
    
    if (!debitLog) {
      throw new Error('POINTS_DEBITED audit log not found');
    }
    
    console.log(`  ✓ POINTS_DEBITED audit log verified`);
    console.log(`    - Before: ${debitLog.changes.before.points} points`);
    console.log(`    - After: ${debitLog.changes.after.points} points\n`);

    // Test 6: Create affinity group and verify audit log
    console.log('Test 6: Group creation generates audit log');
    const groupResponse = await makeRequest('POST', '/groups', {
      name: 'Audit Test Group',
      description: 'Group for audit testing'
    });
    
    if (groupResponse.status !== 201) {
      throw new Error(`Failed to create group: ${JSON.stringify(groupResponse.data)}`);
    }
    
    testGroupId = groupResponse.data.id;
    console.log(`  ✓ Group created: ${testGroupId}`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const groupAuditResponse = await makeRequest('GET', `/audit-logs?resource_type=group&limit=10`);
    const groupAuditLogs = groupAuditResponse.data.data;
    const groupCreateLog = groupAuditLogs.find(log => log.action === 'GROUP_CREATED' && log.resource_id === testGroupId);
    
    if (!groupCreateLog) {
      throw new Error('GROUP_CREATED audit log not found');
    }
    
    console.log(`  ✓ GROUP_CREATED audit log verified\n`);

    // Test 7: Assign client to group and verify audit log
    console.log('Test 7: Client-to-group assignment generates audit log');
    const assignResponse = await makeRequest('POST', `/groups/${testGroupId}/clients/${testClientId}`, {});
    
    if (assignResponse.status !== 200) {
      throw new Error(`Failed to assign client to group: ${JSON.stringify(assignResponse.data)}`);
    }
    
    console.log(`  ✓ Client assigned to group`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const assignAuditResponse = await makeRequest('GET', `/audit-logs?action=CLIENT_ADDED_TO_GROUP&limit=10`);
    const assignAuditLogs = assignAuditResponse.data.data;
    const assignLog = assignAuditLogs.find(log => log.client_id === testClientId && log.group_id === testGroupId);
    
    if (!assignLog) {
      throw new Error('CLIENT_ADDED_TO_GROUP audit log not found');
    }
    
    console.log(`  ✓ CLIENT_ADDED_TO_GROUP audit log verified\n`);

    // Test 8: Query audit logs with filters
    console.log('Test 8: Query audit logs with filters');
    
    // Filter by client_id
    const clientFilterResponse = await makeRequest('GET', `/audit-logs?client_id=${testClientId}&limit=50`);
    if (clientFilterResponse.status !== 200) {
      throw new Error(`Failed to query audit logs by client_id`);
    }
    console.log(`  ✓ Filter by client_id: ${clientFilterResponse.data.data.length} logs found`);

    // Filter by action
    const actionFilterResponse = await makeRequest('GET', `/audit-logs?action=POINTS_CREDITED&limit=50`);
    if (actionFilterResponse.status !== 200) {
      throw new Error(`Failed to query audit logs by action`);
    }
    console.log(`  ✓ Filter by action: ${actionFilterResponse.data.data.length} logs found`);

    // Test pagination
    const paginatedResponse = await makeRequest('GET', `/audit-logs?limit=2`);
    if (paginatedResponse.status !== 200) {
      throw new Error(`Failed to paginate audit logs`);
    }
    console.log(`  ✓ Pagination works: next_cursor = ${paginatedResponse.data.paging.next_cursor}\n`);

    // Test 9: Delete client and verify audit log
    console.log('Test 9: Client deletion generates audit log');
    const deleteResponse = await makeRequest('DELETE', `/clients/${testClientId}`);
    
    if (deleteResponse.status !== 202) {
      throw new Error(`Failed to delete client: ${JSON.stringify(deleteResponse.data)}`);
    }
    
    console.log(`  ✓ Client deleted`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify CLIENT_DELETED audit log exists (fetch from general audit logs since client is deleted)
    const deleteAuditResponse = await makeRequest('GET', `/audit-logs?action=CLIENT_DELETED&limit=10`);
    const deleteAuditLogs = deleteAuditResponse.data.data;
    const deleteLog = deleteAuditLogs.find(log => log.resource_id === testClientId);
    
    if (!deleteLog) {
      throw new Error('CLIENT_DELETED audit log not found');
    }
    
    console.log(`  ✓ CLIENT_DELETED audit log verified`);
    console.log(`    - Before state exists: ${!!deleteLog.changes.before}`);
    console.log(`    - After state is null: ${deleteLog.changes.after === null}\n`);

    console.log('✅ All Audit System Integration Tests Passed!\n');
    console.log('Summary:');
    console.log('  - ✓ CLIENT_CREATED audit logged');
    console.log('  - ✓ CLIENT_UPDATED audit logged with before/after');
    console.log('  - ✓ CLIENT_DELETED audit logged');
    console.log('  - ✓ ACCOUNT_CREATED audit logged');
    console.log('  - ✓ POINTS_CREDITED audit logged (atomic)');
    console.log('  - ✓ POINTS_DEBITED audit logged (atomic)');
    console.log('  - ✓ GROUP_CREATED audit logged');
    console.log('  - ✓ CLIENT_ADDED_TO_GROUP audit logged');
    console.log('  - ✓ Audit log queries and filters working');
    console.log('  - ✓ Pagination working\n');

    return true;

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run tests
testAuditSystem()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
