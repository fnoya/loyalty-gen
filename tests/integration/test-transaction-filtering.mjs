#!/usr/bin/env node

/**
 * Integration test for Transaction Filtering
 * Tests the transaction list endpoint with various filter combinations
 *
 * Test case:
 * - Creates 10 transactions with different types (credit/debit) and dates
 * - Tests filtering by:
 *   - Only debit transactions
 *   - Only credit transactions
 *   - Date range (from and to)
 *   - Only from date
 *   - Only to date
 *   - Combination of type and date filters
 *
 * Run from project root: node tests/integration/test-transaction-filtering.mjs
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
let testAccountId = "";

// Test transactions we'll create
const testTransactions = [
  { type: "credit", amount: 100, description: "Signup bonus", daysAgo: 10 },
  { type: "credit", amount: 50, description: "Purchase reward", daysAgo: 8 },
  { type: "debit", amount: 25, description: "Redemption", daysAgo: 7 },
  { type: "credit", amount: 75, description: "Referral bonus", daysAgo: 5 },
  { type: "debit", amount: 15, description: "Expired points", daysAgo: 4 },
  { type: "credit", amount: 200, description: "Anniversary bonus", daysAgo: 3 },
  { type: "debit", amount: 50, description: "Transfer", daysAgo: 2 },
  { type: "credit", amount: 30, description: "Birthday reward", daysAgo: 1 },
  { type: "debit", amount: 10, description: "Administrative debit", daysAgo: 0 },
  { type: "credit", amount: 60, description: "Promotion", daysAgo: 0 },
];

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
    .createCustomToken("test-user-filtering");

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
      firstName: "Filter",
      firstLastName: "Tester",
    },
    email: `filter-test-${Date.now()}@example.com`,
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
 * Create a loyalty account for testing
 */
async function createTestAccount(authToken, clientId) {
  const accountData = {
    account_name: "Filter Test Account",
  };

  const url = `${CLIENTS_API_BASE}/${clientId}/accounts`;
  const { status, data } = await apiRequest(
    "POST",
    url,
    authToken,
    accountData,
  );

  if (status !== 201) {
    throw new Error(`Failed to create test account: ${JSON.stringify(data)}`);
  }

  return data.id;
}

/**
 * Add a transaction to an account
 */
async function addTransaction(
  authToken,
  clientId,
  accountId,
  type,
  amount,
  description,
  timestamp,
) {
  // Use /credit or /debit endpoint based on type
  const endpoint = type === "credit" ? "credit" : "debit";
  const url = `${CLIENTS_API_BASE}/${clientId}/accounts/${accountId}/${endpoint}`;
  const transactionData = {
    amount,
    description,
  };

  const { status, data } = await apiRequest(
    "POST",
    url,
    authToken,
    transactionData,
  );

  if (status !== 200) {
    throw new Error(
      `Failed to add transaction: ${JSON.stringify(data)}`
    );
  }

  return data;
}

/**
 * Calculate date N days ago
 */
function getDateDaysAgo(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(12, 0, 0, 0); // Set to noon UTC
  return date;
}

/**
 * Test wrapper with error handling
 */
function test(description, fn) {
  return async () => {
    process.stdout.write(`  ${description}... `);
    try {
      await fn();
      console.log("✅ PASS");
      return true;
    } catch (error) {
      console.log("❌ FAIL");
      console.error(`    Error: ${error.message}`);
      if (error.expected !== undefined) {
        console.error(`    Expected: ${JSON.stringify(error.expected)}`);
        console.error(`    Actual: ${JSON.stringify(error.actual)}`);
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
    throw new Error(message || `Expected true but got ${value}`);
  }
}

function assertArrayIncludes(array, value, message = "") {
  if (!array.includes(value)) {
    const error = new Error(
      message || `Array does not include ${value}`
    );
    error.expected = value;
    error.actual = array;
    throw error;
  }
}

/**
 * Main test suite
 */
const tests = [
  test("Setup: Create test client", async () => {
    authToken = await generateAuthToken();
    testClientId = await createTestClient(authToken);
    assertTrue(testClientId, "Client ID should be created");
  }),

  test("Setup: Create test account", async () => {
    testAccountId = await createTestAccount(authToken, testClientId);
    assertTrue(testAccountId, "Account ID should be created");
  }),

  test("Setup: Create 10 transactions with various types and dates", async () => {
    for (const tx of testTransactions) {
      await addTransaction(
        authToken,
        testClientId,
        testAccountId,
        tx.type,
        tx.amount,
        tx.description,
      );
      // Add small delay to ensure transactions have slightly different timestamps
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    // Verify we can list all transactions
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts/${testAccountId}/transactions?limit=20`;
    const { status, data } = await apiRequest("GET", url, authToken);
    assertEquals(
      status,
      200,
      "Should return 200 for list transactions",
    );
    assertEquals(
      data.data.length,
      10,
      `Should have 10 transactions, got ${data.data.length}`,
    );
  }),

  test("Filter: Get only CREDIT transactions", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts/${testAccountId}/transactions?limit=20&transaction_type=credit`;
    const { status, data } = await apiRequest("GET", url, authToken);
    assertEquals(
      status,
      200,
      "Should return 200 for credit filter",
    );

    const creditTransactions = data.data;
    assertEquals(
      creditTransactions.length,
      6,
      `Should have 6 credit transactions, got ${creditTransactions.length}`,
    );

    // Verify all are credit
    for (const tx of creditTransactions) {
      assertEquals(
        tx.transaction_type,
        "credit",
        `Transaction should be credit, got ${tx.transaction_type}`,
      );
    }
  }),

  test("Filter: Get only DEBIT transactions", async () => {
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts/${testAccountId}/transactions?limit=20&transaction_type=debit`;
    const { status, data } = await apiRequest("GET", url, authToken);
    assertEquals(
      status,
      200,
      "Should return 200 for debit filter",
    );

    const debitTransactions = data.data;
    assertEquals(
      debitTransactions.length,
      4,
      `Should have 4 debit transactions, got ${debitTransactions.length}`,
    );

    // Verify all are debit
    for (const tx of debitTransactions) {
      assertEquals(
        tx.transaction_type,
        "debit",
        `Transaction should be debit, got ${tx.transaction_type}`,
      );
    }
  }),

  test("Filter: Verify CREDIT + DEBIT count equals total", async () => {
    const urlAll = `${CLIENTS_API_BASE}/${testClientId}/accounts/${testAccountId}/transactions?limit=20`;
    const { data: allData } = await apiRequest("GET", urlAll, authToken);
    const totalCount = allData.data.length;

    const urlCredit = `${CLIENTS_API_BASE}/${testClientId}/accounts/${testAccountId}/transactions?limit=20&transaction_type=credit`;
    const { data: creditData } = await apiRequest("GET", urlCredit, authToken);
    const creditCount = creditData.data.length;

    const urlDebit = `${CLIENTS_API_BASE}/${testClientId}/accounts/${testAccountId}/transactions?limit=20&transaction_type=debit`;
    const { data: debitData } = await apiRequest("GET", urlDebit, authToken);
    const debitCount = debitData.data.length;

    assertEquals(
      creditCount + debitCount,
      totalCount,
      `Credit (${creditCount}) + Debit (${debitCount}) should equal total (${totalCount})`,
    );
  }),

  test("Filter: Get transactions from START_DATE (future date, should return 0)", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts/${testAccountId}/transactions?limit=20&start_date=${tomorrow.toISOString()}`;
    const { status, data } = await apiRequest("GET", url, authToken);
    assertEquals(
      status,
      200,
      "Should return 200 for start_date filter",
    );

    const filteredTransactions = data.data;
    assertEquals(
      filteredTransactions.length,
      0,
      `Should have 0 transactions after tomorrow, got ${filteredTransactions.length}`,
    );
  }),

  test("Filter: Get transactions up to END_DATE (far future, should return all)", async () => {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 1);
    
    const urlAll = `${CLIENTS_API_BASE}/${testClientId}/accounts/${testAccountId}/transactions?limit=20`;
    const { data: allData } = await apiRequest("GET", urlAll, authToken);
    const totalCount = allData.data.length;

    const urlFiltered = `${CLIENTS_API_BASE}/${testClientId}/accounts/${testAccountId}/transactions?limit=20&end_date=${farFuture.toISOString()}`;
    const { status, data } = await apiRequest("GET", urlFiltered, authToken);
    assertEquals(
      status,
      200,
      "Should return 200 for end_date filter",
    );

    assertEquals(
      data.data.length,
      totalCount,
      `Should have all ${totalCount} transactions before far future date`,
    );
  }),

  test("Filter: Get transactions in DATE RANGE (past to future, should return all)", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const urlAll = `${CLIENTS_API_BASE}/${testClientId}/accounts/${testAccountId}/transactions?limit=20`;
    const { data: allData } = await apiRequest("GET", urlAll, authToken);
    const totalCount = allData.data.length;

    const urlFiltered = `${CLIENTS_API_BASE}/${testClientId}/accounts/${testAccountId}/transactions?limit=20&start_date=${yesterday.toISOString()}&end_date=${tomorrow.toISOString()}`;
    const { status, data } = await apiRequest("GET", urlFiltered, authToken);
    assertEquals(
      status,
      200,
      "Should return 200 for date range filter",
    );

    assertEquals(
      data.data.length,
      totalCount,
      `Should have all ${totalCount} transactions in yesterday-to-tomorrow range`,
    );
  }),

  test("Filter: CREDIT + END_DATE (far future, should return all credits)", async () => {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 1);

    const urlCredit = `${CLIENTS_API_BASE}/${testClientId}/accounts/${testAccountId}/transactions?limit=20&transaction_type=credit`;
    const { data: creditData } = await apiRequest("GET", urlCredit, authToken);
    const creditCount = creditData.data.length;

    const urlFiltered = `${CLIENTS_API_BASE}/${testClientId}/accounts/${testAccountId}/transactions?limit=20&transaction_type=credit&end_date=${farFuture.toISOString()}`;
    const { status, data } = await apiRequest("GET", urlFiltered, authToken);
    assertEquals(
      status,
      200,
      "Should return 200 for combined filter",
    );

    assertEquals(
      data.data.length,
      creditCount,
      `Should have all ${creditCount} credit transactions before far future date`,
    );

    // Verify all are credit
    for (const tx of data.data) {
      assertEquals(
        tx.transaction_type,
        "credit",
        `Transaction should be credit, got ${tx.transaction_type}`,
      );
    }
  }),

  test("Filter: DEBIT + START_DATE (past, should return all debits)", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const urlDebit = `${CLIENTS_API_BASE}/${testClientId}/accounts/${testAccountId}/transactions?limit=20&transaction_type=debit`;
    const { data: debitData } = await apiRequest("GET", urlDebit, authToken);
    const debitCount = debitData.data.length;

    const urlFiltered = `${CLIENTS_API_BASE}/${testClientId}/accounts/${testAccountId}/transactions?limit=20&transaction_type=debit&start_date=${yesterday.toISOString()}`;
    const { status, data } = await apiRequest("GET", urlFiltered, authToken);
    assertEquals(
      status,
      200,
      "Should return 200 for combined filter",
    );

    assertEquals(
      data.data.length,
      debitCount,
      `Should have all ${debitCount} debit transactions after yesterday`,
    );

    // Verify all are debit
    for (const tx of data.data) {
      assertEquals(
        tx.transaction_type,
        "debit",
        `Transaction should be debit, got ${tx.transaction_type}`,
      );
    }
  }),

  test("Filter: CREDIT + START_DATE (future, should return 0)", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts/${testAccountId}/transactions?limit=20&transaction_type=credit&start_date=${tomorrow.toISOString()}`;
    const { status, data } = await apiRequest("GET", url, authToken);
    assertEquals(
      status,
      200,
      "Should return 200 for combined filter",
    );

    assertEquals(
      data.data.length,
      0,
      `Should have 0 credit transactions after tomorrow, got ${data.data.length}`,
    );
  }),

  test("Filter: Empty result - transactions from far future", async () => {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 1);
    
    const url = `${CLIENTS_API_BASE}/${testClientId}/accounts/${testAccountId}/transactions?limit=20&start_date=${farFuture.toISOString()}`;
    const { status, data } = await apiRequest("GET", url, authToken);
    assertEquals(
      status,
      200,
      "Should return 200 even with no results",
    );

    assertEquals(
      data.data.length,
      0,
      `Should have 0 transactions from far future, got ${data.data.length}`,
    );
  }),
];

// =========================
// RUN TESTS
// =========================

async function runTests() {
  console.log("\n🧪 Transaction Filtering Integration Tests\n");
  console.log("=".repeat(70));

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

  console.log("=".repeat(70));
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
