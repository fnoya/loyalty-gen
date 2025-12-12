#!/usr/bin/env node

/**
 * Comprehensive test script for Loyalty Accounts API endpoints
 * Tests account CRUD, credit/debit transactions, and balance queries
 *
 * Run from project root: node test-account-api.mjs
 * Prerequisites: Firebase emulators must be running
 */

import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Load firebase-admin from functions directory
const admin = require(
  path.join(__dirname, "../..", "functions", "node_modules", "firebase-admin"),
);

// Test configuration
const CLIENTS_API_BASE =
  "http://127.0.0.1:5001/loyalty-gen/us-central1/api/v1/clients";
const HEALTH_URL = "http://127.0.0.1:5001/loyalty-gen/us-central1/api/health";

// Configure Firebase Admin for emulator
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

admin.initializeApp({
  projectId: "loyalty-gen",
});

// Test state
let authToken = "";
let testClientId = "";
let mainAccountId = "";
let bonusAccountId = "";

/**
 * Make HTTP request to API
 */
async function apiRequest(method, url, authToken = null, body = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: authToken ? `Bearer ${authToken}` : "",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const text = await response.text();

  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = { raw: text };
  }

  return { status: response.status, data };
}

/**
 * Generate auth token using Firebase Auth emulator
 */
async function generateAuthToken() {
  const customToken = await admin
    .auth()
    .createCustomToken("test-user-accounts");

  // Exchange custom token for ID token via Auth emulator REST API
  const response = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );

  const data = await response.json();
  return data.idToken;
}

/**
 * Create a test client
 */
async function createTestClient(authToken) {
  const clientData = {
    name: {
      firstName: "Account",
      firstLastName: "Tester",
    },
    email: `account-test-${Date.now()}@example.com`,
  };

  const { status, data } = await apiRequest(
    "POST",
    CLIENTS_API_BASE,
    authToken,
    clientData,
  );

  if (status !== 201) {
    throw new Error(`Failed to create test client: ${JSON.stringify(data)}`);
  }

  return data.id;
}

/**
 * Test wrapper with error handling
 */
function test(description, fn) {
  return async () => {
    process.stdout.write(`${description}... `);
    try {
      await fn();
      console.log("✅ PASS");
      return true;
    } catch (error) {
      console.log("❌ FAIL");
      console.error(`  Error: ${error.message}`);
      if (error.actual !== undefined) {
        console.error(`  Expected: ${JSON.stringify(error.expected)}`);
        console.error(`  Actual: ${JSON.stringify(error.actual)}`);
      }
      return false;
    }
  };
}

function assertEquals(actual, expected, message = "") {
  if (actual !== expected) {
    const error = new Error(message || `Assertion failed`);
    error.expected = expected;
    error.actual = actual;
    throw error;
  }
}

function assertTrue(value, message = "") {
  if (!value) {
    throw new Error(message || "Assertion failed: expected truthy value");
  }
}

function assertError(data, expectedCode) {
  if (!data || !data.error) {
    throw new Error(`Expected error response, got: ${JSON.stringify(data)}`);
  }
  if (data.error.code !== expectedCode) {
    throw new Error(
      `Expected error code ${expectedCode}, got ${data.error.code}: ${data.error.message}`,
    );
  }
}

// =========================
// TEST SUITE
// =========================

const tests = [
  test("1. Health Check", async () => {
    const response = await fetch(HEALTH_URL);
    const data = await response.json();
    assertEquals(response.status, 200, `Expected 200, got ${response.status}`);
    assertTrue(data.status === "ok", "Health check should return ok status");
  }),

  test("2. Generate Auth Token", async () => {
    authToken = await generateAuthToken();
    assertTrue(
      authToken && authToken.length > 0,
      "Should generate valid token",
    );
  }),

  test("3. Create Test Client", async () => {
    testClientId = await createTestClient(authToken);
    assertTrue(
      testClientId && testClientId.length > 0,
      "Should create test client",
    );
  }),

  test("4. List Accounts (Initially Empty)", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts`;
    const { status, data } = await apiRequest("GET", url, authToken);
    assertEquals(status, 200, "Should return 200");
    assertTrue(Array.isArray(data), "Should return array");
    assertEquals(data.length, 0, "Should be empty initially");
  }),

  test("5. Create Main Account", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts`;
    const accountData = {
      account_name: "Main Rewards",
    };

    const { status, data } = await apiRequest(
      "POST",
      url,
      authToken,
      accountData,
    );
    assertEquals(status, 201, "Should return 201");
    assertTrue(data.id, "Should have account ID");
    assertEquals(
      data.account_name,
      accountData.account_name,
      "Name should match",
    );
    assertEquals(data.points, 0, "Initial points should be 0");
    assertTrue(data.created_at, "Should have created_at timestamp");
    assertTrue(data.updated_at, "Should have updated_at timestamp");

    mainAccountId = data.id;
  }),

  test("6. Create Bonus Account", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts`;
    const accountData = {
      account_name: "Bonus Points",
    };

    const { status, data } = await apiRequest(
      "POST",
      url,
      authToken,
      accountData,
    );
    assertEquals(status, 201, "Should return 201");
    assertTrue(data.id, "Should have account ID");

    bonusAccountId = data.id;
  }),

  test("7. Create Account - Validation Error (Missing Name)", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts`;
    const { status, data } = await apiRequest("POST", url, authToken, {});
    assertEquals(status, 400, "Should return 400");
    assertError(data, "VALIDATION_FAILED");
  }),

  test("8. Create Account - Client Not Found", async () => {
    const url = `${CLIENTS_API_BASE}/invalid-client-id/accounts`;
    const accountData = { account_name: "Test" };
    const { status, data } = await apiRequest(
      "POST",
      url,
      authToken,
      accountData,
    );
    assertEquals(status, 404, "Should return 404");
    assertError(data, "RESOURCE_NOT_FOUND");
  }),

  test("9. List Accounts", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts`;
    const { status, data } = await apiRequest("GET", url, authToken);
    assertEquals(status, 200, "Should return 200");
    assertTrue(Array.isArray(data), "Should return array");
    assertEquals(data.length, 2, "Should have 2 accounts");

    const mainAccount = data.find((a) => a.id === mainAccountId);
    assertTrue(mainAccount, "Should find main account");
    assertEquals(mainAccount.account_name, "Main Rewards", "Name should match");
  }),

  test("10. Credit Points to Main Account", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts/${mainAccountId}/credit`;
    const creditData = {
      amount: 100,
      description: "Welcome bonus",
    };

    const { status, data } = await apiRequest(
      "POST",
      url,
      authToken,
      creditData,
    );
    assertEquals(status, 200, "Should return 200");
    assertEquals(data.points, 100, "Points should be 100");
    assertTrue(data.updated_at, "Should have updated timestamp");
  }),

  test("11. Credit More Points", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts/${mainAccountId}/credit`;
    const creditData = {
      amount: 50,
      description: "Purchase reward",
    };

    const { status, data } = await apiRequest(
      "POST",
      url,
      authToken,
      creditData,
    );
    assertEquals(status, 200, "Should return 200");
    assertEquals(data.points, 150, "Points should be 150");
  }),

  test("12. Credit Points - Validation Error (Negative Amount)", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts/${mainAccountId}/credit`;
    const creditData = { amount: -10 };
    const { status, data } = await apiRequest(
      "POST",
      url,
      authToken,
      creditData,
    );
    assertEquals(status, 400, "Should return 400");
    assertError(data, "VALIDATION_FAILED");
  }),

  test("13. Credit Points - Account Not Found", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts/invalid-account-id/credit`;
    const creditData = { amount: 10 };
    const { status, data } = await apiRequest(
      "POST",
      url,
      authToken,
      creditData,
    );
    assertEquals(status, 404, "Should return 404");
    assertError(data, "RESOURCE_NOT_FOUND");
  }),

  test("14. Debit Points from Account", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts/${mainAccountId}/debit`;
    const debitData = {
      amount: 30,
      description: "Redemption",
    };

    const { status, data } = await apiRequest(
      "POST",
      url,
      authToken,
      debitData,
    );
    assertEquals(status, 200, "Should return 200");
    assertEquals(data.points, 120, "Points should be 120 (150 - 30)");
  }),

  test("15. Debit Points - Insufficient Balance", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts/${mainAccountId}/debit`;
    const debitData = {
      amount: 200,
      description: "Trying to overdraw",
    };

    const { status, data } = await apiRequest(
      "POST",
      url,
      authToken,
      debitData,
    );
    assertEquals(status, 400, "Should return 400");
    assertError(data, "INSUFFICIENT_BALANCE");
  }),

  test("16. Debit Points - Validation Error (Zero Amount)", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts/${mainAccountId}/debit`;
    const debitData = { amount: 0 };
    const { status, data } = await apiRequest(
      "POST",
      url,
      authToken,
      debitData,
    );
    assertEquals(status, 400, "Should return 400");
    assertError(data, "VALIDATION_FAILED");
  }),

  test("17. Get Account Balance", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts/${mainAccountId}/balance`;
    const { status, data } = await apiRequest("GET", url, authToken);
    assertEquals(status, 200, "Should return 200");
    assertEquals(data.points, 120, "Balance should be 120");
  }),

  test("18. Get All Balances", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/balance`;
    const { status, data } = await apiRequest("GET", url, authToken);
    assertEquals(status, 200, "Should return 200");
    assertTrue(
      data[mainAccountId] !== undefined,
      "Should have main account balance",
    );
    assertEquals(
      data[mainAccountId],
      120,
      "Main account balance should be 120",
    );
    assertEquals(data[bonusAccountId], 0, "Bonus account balance should be 0");
  }),

  test("19. List Transactions", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts/${mainAccountId}/transactions`;
    const { status, data } = await apiRequest("GET", url, authToken);
    assertEquals(status, 200, "Should return 200");
    assertTrue(data.data, "Should have data property");
    assertTrue(Array.isArray(data.data), "Data should be array");
    assertTrue(data.data.length >= 3, "Should have at least 3 transactions");

    // Verify transactions
    const creditTxs = data.data.filter((t) => t.transaction_type === "credit");
    const debitTxs = data.data.filter((t) => t.transaction_type === "debit");
    assertEquals(creditTxs.length, 2, "Should have 2 credit transactions");
    assertEquals(debitTxs.length, 1, "Should have 1 debit transaction");

    // Check transaction structure
    const tx = data.data[0];
    assertTrue(tx.id, "Transaction should have ID");
    assertTrue(tx.transaction_type, "Transaction should have type");
    assertTrue(tx.amount > 0, "Transaction should have positive amount");
    assertTrue(tx.timestamp, "Transaction should have timestamp");
  }),

  test("20. List Transactions with Limit", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts/${mainAccountId}/transactions?limit=2`;
    const { status, data } = await apiRequest("GET", url, authToken);
    assertEquals(status, 200, "Should return 200");
    assertTrue(data.data.length <= 2, "Should return at most 2 transactions");
  }),

  test("21. List Transactions - Invalid Limit (Too Small)", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts/${mainAccountId}/transactions?limit=0`;
    const { status, data } = await apiRequest("GET", url, authToken);
    assertEquals(status, 400, "Should return 400");
    assertError(data, "VALIDATION_FAILED");
  }),

  test("22. List Transactions - Invalid Limit (Too Large)", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts/${mainAccountId}/transactions?limit=101`;
    const { status, data } = await apiRequest("GET", url, authToken);
    assertEquals(status, 400, "Should return 400");
    assertError(data, "VALIDATION_FAILED");
  }),

  test("23. Verify Denormalized Balances in Client Document", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}`;
    const { status, data } = await apiRequest("GET", url, authToken);
    assertEquals(status, 200, "Should return 200");
    assertTrue(data.account_balances, "Should have account_balances");
    assertEquals(
      data.account_balances[mainAccountId],
      120,
      "Denormalized balance should match",
    );
    assertEquals(
      data.account_balances[bonusAccountId],
      0,
      "Bonus account balance should be 0",
    );
  }),

  test("24. Credit to Bonus Account", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts/${bonusAccountId}/credit`;
    const creditData = { amount: 25 };
    const { status, data } = await apiRequest(
      "POST",
      url,
      authToken,
      creditData,
    );
    assertEquals(status, 200, "Should return 200");
    assertEquals(data.points, 25, "Bonus account should have 25 points");
  }),

  test("25. Verify Multiple Account Balances", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/balance`;
    const { status, data } = await apiRequest("GET", url, authToken);
    assertEquals(status, 200, "Should return 200");
    assertEquals(data[mainAccountId], 120, "Main account balance correct");
    assertEquals(data[bonusAccountId], 25, "Bonus account balance correct");
  }),

  test("26. Credit Points - Verify Denormalized Balance Updated Atomically", async () => {
    const creditUrl = `${CLIENTS_API_BASE}/${testClientId}/accounts/${bonusAccountId}/credit`;
    const creditData = { amount: 75, description: "Bulk rewards" };
    
    // Credit points
    const creditResponse = await apiRequest(
      "POST",
      creditUrl,
      authToken,
      creditData,
    );
    assertEquals(creditResponse.status, 200, "Credit should succeed");
    assertEquals(creditResponse.data.points, 100, "Account should have 100 points");

    // Immediately verify denormalized balance in client document
    const clientUrl = `${CLIENTS_API_BASE}/${testClientId}`;
    const { status, data } = await apiRequest("GET", clientUrl, authToken);
    assertEquals(status, 200, "Should return 200");
    assertEquals(
      data.account_balances[bonusAccountId],
      100,
      "Denormalized balance should be updated to 100",
    );
  }),

  test("27. Debit Points - Verify Denormalized Balance Updated Atomically", async () => {
    const debitUrl = `${CLIENTS_API_BASE}/${testClientId}/accounts/${mainAccountId}/debit`;
    const debitData = { amount: 50, description: "Member redemption" };
    
    // Debit points (should go from 120 to 70)
    const debitResponse = await apiRequest(
      "POST",
      debitUrl,
      authToken,
      debitData,
    );
    assertEquals(debitResponse.status, 200, "Debit should succeed");
    assertEquals(debitResponse.data.points, 70, "Account should have 70 points");

    // Immediately verify denormalized balance in client document
    const clientUrl = `${CLIENTS_API_BASE}/${testClientId}`;
    const { status, data } = await apiRequest("GET", clientUrl, authToken);
    assertEquals(status, 200, "Should return 200");
    assertEquals(
      data.account_balances[mainAccountId],
      70,
      "Denormalized balance should be updated to 70",
    );
  }),

  test("28. Verify All Denormalized Balances After Multiple Operations", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}`;
    const { status, data } = await apiRequest("GET", url, authToken);
    assertEquals(status, 200, "Should return 200");
    
    // Verify all balances match current state
    assertEquals(data.account_balances[mainAccountId], 70, "Main account: 70");
    assertEquals(data.account_balances[bonusAccountId], 100, "Bonus account: 100");
    
    // Verify both accounts match via balance endpoint
    const balanceUrl = `${CLIENTS_API_BASE}/${testClientId}/balance`;
    const balanceResponse = await apiRequest("GET", balanceUrl, authToken);
    assertEquals(balanceResponse.status, 200, "Should return 200");
    assertEquals(
      balanceResponse.data[mainAccountId],
      data.account_balances[mainAccountId],
      "Balance endpoint should match denormalized main account",
    );
    assertEquals(
      balanceResponse.data[bonusAccountId],
      data.account_balances[bonusAccountId],
      "Balance endpoint should match denormalized bonus account",
    );
  }),

  test("29. Unauthorized Access - No Token", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts`;
    const { status, data } = await apiRequest("GET", url, null);
    assertEquals(status, 401, "Should return 401");
    assertTrue(data.error, "Should have error");
  }),
];

// =========================
// RUN TESTS
// =========================

async function runTests() {
  console.log("\n🧪 Starting Loyalty Accounts API Integration Tests\n");
  console.log("=".repeat(60));

  let passed = 0;
  let failed = 0;

  for (const testFn of tests) {
    const result = await testFn();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log("=".repeat(60));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

  // Cleanup
  try {
    await admin.app().delete();
  } catch (e) {
    // Ignore cleanup errors
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((error) => {
  console.error("❌ Test suite failed:", error);
  process.exit(1);
});
