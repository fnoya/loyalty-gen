#!/usr/bin/env node

/**
 * Test script for on_behalf_of transaction functionality
 * Tests family circle member transactions with holder's account
 *
 * Run from project root: node tests/integration/test-on-behalf-of.mjs
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
let holderAuthToken = "";
let memberAuthToken = "";
let holderClientId = "";
let memberClientId = "";
let holderAccountId = "";

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
  const data = response.headers.get("content-type")?.includes("application/json")
    ? await response.json()
    : await response.text();

  return { status: response.status, data };
}

/**
 * Create Firebase custom token and exchange for ID token
 */
async function getAuthToken(uid) {
  const customToken = await admin.auth().createCustomToken(uid);

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
async function createTestClient(authToken, firstName, email) {
  const clientData = {
    name: {
      firstName,
      firstLastName: "OnBehalfOfTest",
    },
    email,
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
 * Create a test loyalty account
 */
async function createTestAccount(clientId, authToken) {
  const accountData = {
    account_name: "Test Loyalty Points",
  };

  const { status, data } = await apiRequest(
    "POST",
    `${CLIENTS_API_BASE}/${clientId}/accounts`,
    authToken,
    accountData,
  );

  if (status !== 201) {
    throw new Error(`Failed to create test account: ${JSON.stringify(data)}`);
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

function assertNotNull(value, message = "") {
  if (value === null || value === undefined) {
    throw new Error(message || "Expected value to be non-null");
  }
}

// ==================== TEST SUITE ====================

/**
 * Setup: Create test users and clients
 */
async function setupTests() {
  console.log("\n🔧 Setting up test environment...");

  // Wait for emulators
  console.log("Checking emulator health...");
  let healthy = false;
  for (let i = 0; i < 10; i++) {
    try {
      const response = await fetch(HEALTH_URL);
      if (response.ok) {
        healthy = true;
        break;
      }
    } catch (error) {
      // Emulator not ready
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!healthy) {
    throw new Error(
      "Emulator health check failed. Please start Firebase emulators.",
    );
  }
  console.log("✅ Emulators are ready\n");

  // Create auth tokens
  holderAuthToken = await getAuthToken("holder-user-obo-test");
  memberAuthToken = await getAuthToken("member-user-obo-test");

  // Create clients
  holderClientId = await createTestClient(
    holderAuthToken,
    "HolderOBO",
    `holder-obo-test-${Date.now()}@example.com`,
  );
  memberClientId = await createTestClient(
    memberAuthToken,
    "MemberOBO",
    `member-obo-test-${Date.now()}@example.com`,
  );

  // Create loyalty account for holder
  holderAccountId = await createTestAccount(holderClientId, holderAuthToken);

  // Add member to family circle
  const { status: addStatus } = await apiRequest(
    "POST",
    `${CLIENTS_API_BASE}/${holderClientId}/family-circle/members`,
    holderAuthToken,
    {
      memberId: memberClientId,
      relationshipType: "child",
    },
  );

  if (addStatus !== 201) {
    throw new Error("Failed to add member to family circle");
  }

  // Enable member credits
  const { status: configStatus } = await apiRequest(
    "PATCH",
    `${CLIENTS_API_BASE}/${holderClientId}/accounts/${holderAccountId}/family-circle-config`,
    holderAuthToken,
    {
      allowMemberCredits: true,
      allowMemberDebits: true,
    },
  );

  if (configStatus !== 200) {
    throw new Error("Failed to configure family circle permissions");
  }

  // Add initial points to holder's account
  const { status: creditStatus, data: creditData } = await apiRequest(
    "POST",
    `${CLIENTS_API_BASE}/${holderClientId}/accounts/${holderAccountId}/credit`,
    holderAuthToken,
    {
      amount: 1000,
      description: "Initial points",
    },
  );

  if (creditStatus !== 200) {
    console.error("Credit failed with status:", creditStatus);
    console.error("Credit response:", JSON.stringify(creditData, null, 2));
    throw new Error("Failed to add initial points");
  }

  console.log(`✅ Test holder client: ${holderClientId}`);
  console.log(`✅ Test member client: ${memberClientId}`);
  console.log(`✅ Test holder account: ${holderAccountId}`);
  console.log(`✅ Family circle configured and member added\n`);
}

/**
 * Test: Member can credit points on behalf of holder
 */
const testMemberCreditOnBehalfOf = test(
  "POST /credit?on_behalf_of (member credits on behalf of holder)",
  async () => {
    const { status, data } = await apiRequest(
      "POST",
      `${CLIENTS_API_BASE}/${holderClientId}/accounts/${holderAccountId}/credit?on_behalf_of=${memberClientId}`,
      memberAuthToken,
      {
        amount: 500,
        description: "Member credited points",
      },
    );

    assertEquals(status, 200, "Should return 200");
    assertEquals(data.points, 1500, "Points should be 1500 (1000 + 500)");
  },
);

/**
 * Test: Member can debit points on behalf of holder
 */
const testMemberDebitOnBehalfOf = test(
  "POST /debit?on_behalf_of (member debits on behalf of holder)",
  async () => {
    const { status, data } = await apiRequest(
      "POST",
      `${CLIENTS_API_BASE}/${holderClientId}/accounts/${holderAccountId}/debit?on_behalf_of=${memberClientId}`,
      memberAuthToken,
      {
        amount: 200,
        description: "Member debited points",
      },
    );

    assertEquals(status, 200, "Should return 200");
    assertEquals(data.points, 1300, "Points should be 1300 (1500 - 200)");
  },
);

/**
 * Test: Holder can still credit without on_behalf_of
 */
const testHolderCreditDirect = test(
  "POST /credit (holder credits directly)",
  async () => {
    const { status, data } = await apiRequest(
      "POST",
      `${CLIENTS_API_BASE}/${holderClientId}/accounts/${holderAccountId}/credit`,
      holderAuthToken,
      {
        amount: 100,
        description: "Holder direct credit",
      },
    );

    assertEquals(status, 200, "Should return 200");
    assertEquals(data.points, 1400, "Points should be 1400 (1300 + 100)");
  },
);

/**
 * Test: Member cannot credit when permission disabled
 */
const testMemberCreditDenied = test(
  "POST /credit?on_behalf_of (permission denied)",
  async () => {
    // Disable member credits
    await apiRequest(
      "PATCH",
      `${CLIENTS_API_BASE}/${holderClientId}/accounts/${holderAccountId}/family-circle-config`,
      holderAuthToken,
      {
        allowMemberCredits: false,
        allowMemberDebits: true,
      },
    );

    const { status, data } = await apiRequest(
      "POST",
      `${CLIENTS_API_BASE}/${holderClientId}/accounts/${holderAccountId}/credit?on_behalf_of=${memberClientId}`,
      memberAuthToken,
      {
        amount: 100,
        description: "Should fail",
      },
    );

    assertEquals(status, 403, "Should return 403");
    assertNotNull(data.error, "Should have error object");
  },
);

/**
 * Test: Member cannot debit when permission disabled
 */
const testMemberDebitDenied = test(
  "POST /debit?on_behalf_of (permission denied)",
  async () => {
    // Disable member debits
    await apiRequest(
      "PATCH",
      `${CLIENTS_API_BASE}/${holderClientId}/accounts/${holderAccountId}/family-circle-config`,
      holderAuthToken,
      {
        allowMemberCredits: false,
        allowMemberDebits: false,
      },
    );

    const { status, data } = await apiRequest(
      "POST",
      `${CLIENTS_API_BASE}/${holderClientId}/accounts/${holderAccountId}/debit?on_behalf_of=${memberClientId}`,
      memberAuthToken,
      {
        amount: 100,
        description: "Should fail",
      },
    );

    assertEquals(status, 403, "Should return 403");
    assertNotNull(data.error, "Should have error object");
  },
);

/**
 * Test: Non-member cannot use on_behalf_of
 */
const testNonMemberCannotUseOnBehalfOf = test(
  "POST /credit?on_behalf_of (non-member - 404)",
  async () => {
    const nonMemberToken = await getAuthToken("non-member-obo-test");

    const { status, data } = await apiRequest(
      "POST",
      `${CLIENTS_API_BASE}/${holderClientId}/accounts/${holderAccountId}/credit?on_behalf_of=invalid-member-id`,
      nonMemberToken,
      {
        amount: 100,
        description: "Should fail",
      },
    );

    assertEquals(status, 404, "Should return 404");
    assertNotNull(data.error, "Should have error object");
  },
);

/**
 * Cleanup: Remove test data
 */
async function cleanupTests() {
  console.log("\n🧹 Cleaning up test data...");

  const db = admin.firestore();

  const clientIds = [holderClientId, memberClientId];

  for (const clientId of clientIds) {
    if (clientId) {
      try {
        // Delete accounts and transactions
        const accountsSnapshot = await db
          .collection("clients")
          .doc(clientId)
          .collection("loyaltyAccounts")
          .get();
        
        for (const accountDoc of accountsSnapshot.docs) {
          // Delete transactions
          const transactionsSnapshot = await accountDoc.ref
            .collection("pointTransactions")
            .get();
          for (const txDoc of transactionsSnapshot.docs) {
            await txDoc.ref.delete();
          }
          await accountDoc.ref.delete();
        }

        // Delete family circle members
        const membersSnapshot = await db
          .collection("clients")
          .doc(clientId)
          .collection("familyCircleMembers")
          .get();
        for (const doc of membersSnapshot.docs) {
          await doc.ref.delete();
        }

        // Delete client document
        await db.collection("clients").doc(clientId).delete();
      } catch (error) {
        console.error(`Failed to delete client ${clientId}:`, error.message);
      }
    }
  }

  console.log("✅ Cleanup complete\n");
}

/**
 * Main test runner
 */
async function runTests() {
  console.log("========================================");
  console.log("  on_behalf_of Integration Tests");
  console.log("========================================");

  try {
    await setupTests();

    const tests = [
      testMemberCreditOnBehalfOf,
      testMemberDebitOnBehalfOf,
      testHolderCreditDirect,
      testMemberCreditDenied,
      testMemberDebitDenied,
      testNonMemberCannotUseOnBehalfOf,
    ];

    console.log("🧪 Running tests...\n");

    const results = [];
    for (const testFn of tests) {
      const passed = await testFn();
      results.push(passed);
    }

    const passed = results.filter(Boolean).length;
    const total = results.length;
    const failed = total - passed;

    console.log("\n========================================");
    console.log(`  RESULTS: ${passed}/${total} tests passed`);
    if (failed > 0) {
      console.log(`  ⚠️  ${failed} test(s) failed`);
    }
    console.log("========================================\n");

    await cleanupTests();

    process.exit(failed === 0 ? 0 : 1);
  } catch (error) {
    console.error("\n❌ Test suite failed:", error.message);
    console.error(error.stack);
    await cleanupTests();
    process.exit(1);
  }
}

// Run tests
runTests();
