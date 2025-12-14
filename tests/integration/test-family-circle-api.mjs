#!/usr/bin/env node

/**
 * Comprehensive test script for Family Circle API endpoints
 * Tests family circle operations, member management, and permission configuration
 *
 * Run from project root: node tests/integration/test-family-circle-api.mjs
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
let nonMemberAuthToken = "";
let holderClientId = "";
let memberClientId = "";
let nonMemberClientId = "";
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
async function createTestClient(authToken, firstName, email) {
  const clientData = {
    name: {
      firstName,
      firstLastName: "FamilyCircle",
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
    account_name: "Main Loyalty Points",
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

function assertIncludesKeys(obj, keys, message = "") {
  const missingKeys = keys.filter((key) => !(key in obj));
  if (missingKeys.length > 0) {
    throw new Error(
      message || `Object missing keys: ${missingKeys.join(", ")}`,
    );
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

  // Create auth tokens for three users
  holderAuthToken = await getAuthToken("holder-user-fc-test");
  memberAuthToken = await getAuthToken("member-user-fc-test");
  nonMemberAuthToken = await getAuthToken("non-member-user-fc-test");

  // Create clients
  holderClientId = await createTestClient(
    holderAuthToken,
    "Holder",
    `holder-fc-test-${Date.now()}@example.com`,
  );
  memberClientId = await createTestClient(
    memberAuthToken,
    "Member",
    `member-fc-test-${Date.now()}@example.com`,
  );
  nonMemberClientId = await createTestClient(
    nonMemberAuthToken,
    "NonMember",
    `non-member-fc-test-${Date.now()}@example.com`,
  );

  // Create loyalty account for holder
  holderAccountId = await createTestAccount(holderClientId, holderAuthToken);

  console.log(`✅ Test holder client: ${holderClientId}`);
  console.log(`✅ Test member client: ${memberClientId}`);
  console.log(`✅ Test non-member client: ${nonMemberClientId}`);
  console.log(`✅ Test holder account: ${holderAccountId}\n`);
}

/**
 * Test: GET family circle info (no circle)
 */
const testGetFamilyCircleInfo_NoCircle = test(
  "GET /family-circle (no circle)",
  async () => {
    const { status, data } = await apiRequest(
      "GET",
      `${CLIENTS_API_BASE}/${nonMemberClientId}/family-circle`,
      nonMemberAuthToken,
    );

    assertEquals(status, 200, "Should return 200");
    assertEquals(data.role, null, "Role should be null");
    assertNotNull(data.message, "Should include message");
  },
);

/**
 * Test: POST add family circle member
 */
const testAddFamilyCircleMember = test(
  "POST /family-circle/members (add member)",
  async () => {
    const requestBody = {
      memberId: memberClientId,
      relationshipType: "child",
    };

    const { status, data } = await apiRequest(
      "POST",
      `${CLIENTS_API_BASE}/${holderClientId}/family-circle/members`,
      holderAuthToken,
      requestBody,
    );

    assertEquals(status, 201, "Should return 201");
    assertNotNull(data.member, "Should return member object");
    assertEquals(data.member.memberId, memberClientId, "Member ID should match");
    assertEquals(
      data.member.relationshipType,
      "child",
      "Relationship type should match",
    );
    assertNotNull(data.member.addedAt, "Should have addedAt timestamp");
  },
);

/**
 * Test: GET family circle info (holder)
 */
const testGetFamilyCircleInfo_Holder = test(
  "GET /family-circle (holder)",
  async () => {
    const { status, data } = await apiRequest(
      "GET",
      `${CLIENTS_API_BASE}/${holderClientId}/family-circle`,
      holderAuthToken,
    );

    assertEquals(status, 200, "Should return 200");
    assertEquals(data.role, "holder", "Role should be holder");
    assertNotNull(data.totalMembers, "Should have totalMembers");
    assertEquals(data.totalMembers, 1, "Should have 1 member");
  },
);

/**
 * Test: GET family circle info (member)
 */
const testGetFamilyCircleInfo_Member = test(
  "GET /family-circle (member)",
  async () => {
    const { status, data } = await apiRequest(
      "GET",
      `${CLIENTS_API_BASE}/${memberClientId}/family-circle`,
      memberAuthToken,
    );

    assertEquals(status, 200, "Should return 200");
    assertEquals(data.role, "member", "Role should be member");
    assertEquals(data.holderId, holderClientId, "Should have holder ID");
    assertEquals(
      data.relationshipType,
      "child",
      "Should have relationship type",
    );
    assertNotNull(data.joinedAt, "Should have joinedAt timestamp");
  },
);

/**
 * Test: GET client details includes family circle info (holder)
 */
const testGetClientFamilyCircle_Holder = test(
  "GET /clients/:id returns familyCircle role for holder",
  async () => {
    const { status, data } = await apiRequest(
      "GET",
      `${CLIENTS_API_BASE}/${holderClientId}`,
      holderAuthToken,
    );

    assertEquals(status, 200, "Should return 200");
    assertNotNull(data.familyCircle, "Should include familyCircle field");
    assertEquals(
      data.familyCircle.role,
      "holder",
      "Role should be holder in client payload",
    );
  },
);

/**
 * Test: GET client details includes family circle info (member)
 */
const testGetClientFamilyCircle_Member = test(
  "GET /clients/:id returns familyCircle role for member",
  async () => {
    const { status, data } = await apiRequest(
      "GET",
      `${CLIENTS_API_BASE}/${memberClientId}`,
      memberAuthToken,
    );

    assertEquals(status, 200, "Should return 200");
    assertNotNull(data.familyCircle, "Should include familyCircle field");
    assertEquals(data.familyCircle.role, "member", "Role should be member");
    assertEquals(
      data.familyCircle.holderId,
      holderClientId,
      "Holder ID should match in client payload",
    );
  },
);

/**
 * Test: GET family circle members (holder)
 */
const testGetFamilyCircleMembers = test(
  "GET /family-circle/members (list)",
  async () => {
    const { status, data } = await apiRequest(
      "GET",
      `${CLIENTS_API_BASE}/${holderClientId}/family-circle/members`,
      holderAuthToken,
    );

    assertEquals(status, 200, "Should return 200");
    assertNotNull(data.data, "Should have data array");
    assertEquals(data.data.length, 1, "Should have 1 member");
    assertEquals(
      data.data[0].memberId,
      memberClientId,
      "Member ID should match",
    );
    assertEquals(data.metadata.totalMembers, 1, "Total members should be 1");
  },
);

/**
 * Test: GET family circle members (authenticated access)
 */
const testGetFamilyCircleMembers_Authenticated = test(
  "GET /family-circle/members (authenticated access - 200)",
  async () => {
    const { status, data } = await apiRequest(
      "GET",
      `${CLIENTS_API_BASE}/${holderClientId}/family-circle/members`,
      memberAuthToken, // Any authenticated user can access
    );

    assertEquals(status, 200, "Should return 200");
    assertNotNull(data.data, "Should have data array");
  },
);

/**
 * Test: POST add duplicate member (should fail)
 */
const testAddFamilyCircleMember_Duplicate = test(
  "POST /family-circle/members (duplicate - 409)",
  async () => {
    const requestBody = {
      memberId: memberClientId,
      relationshipType: "spouse",
    };

    const { status, data } = await apiRequest(
      "POST",
      `${CLIENTS_API_BASE}/${holderClientId}/family-circle/members`,
      holderAuthToken,
      requestBody,
    );

    assertEquals(status, 409, "Should return 409 conflict");
    assertNotNull(data.error, "Should have error object");
  },
);

/**
 * Test: POST add non-existent member (should fail)
 */
const testAddFamilyCircleMember_NotFound = test(
  "POST /family-circle/members (non-existent - 404)",
  async () => {
    const requestBody = {
      memberId: "non-existent-client-id",
      relationshipType: "parent",
    };

    const { status, data } = await apiRequest(
      "POST",
      `${CLIENTS_API_BASE}/${holderClientId}/family-circle/members`,
      holderAuthToken,
      requestBody,
    );

    assertEquals(status, 404, "Should return 404");
    assertNotNull(data.error, "Should have error object");
  },
);

/**
 * Test: GET family circle config (default)
 */
const testGetFamilyCircleConfig_Default = test(
  "GET /family-circle-config (default)",
  async () => {
    const { status, data } = await apiRequest(
      "GET",
      `${CLIENTS_API_BASE}/${holderClientId}/accounts/${holderAccountId}/family-circle-config`,
      holderAuthToken,
    );

    assertEquals(status, 200, "Should return 200");
    assertEquals(
      data.allowMemberCredits,
      false,
      "Default allowMemberCredits should be false",
    );
    assertEquals(
      data.allowMemberDebits,
      false,
      "Default allowMemberDebits should be false",
    );
  },
);

/**
 * Test: PATCH update family circle config
 */
const testUpdateFamilyCircleConfig = test(
  "PATCH /family-circle-config (update)",
  async () => {
    const requestBody = {
      allowMemberCredits: true,
      allowMemberDebits: false,
    };

    const { status, data } = await apiRequest(
      "PATCH",
      `${CLIENTS_API_BASE}/${holderClientId}/accounts/${holderAccountId}/family-circle-config`,
      holderAuthToken,
      requestBody,
    );

    assertEquals(status, 200, "Should return 200");
    assertNotNull(data.config, "Should return config object");
    assertEquals(
      data.config.allowMemberCredits,
      true,
      "allowMemberCredits should be updated",
    );
    assertEquals(
      data.config.allowMemberDebits,
      false,
      "allowMemberDebits should remain false",
    );
  },
);

/**
 * Test: GET family circle config (updated)
 */
const testGetFamilyCircleConfig_Updated = test(
  "GET /family-circle-config (verify update)",
  async () => {
    const { status, data } = await apiRequest(
      "GET",
      `${CLIENTS_API_BASE}/${holderClientId}/accounts/${holderAccountId}/family-circle-config`,
      holderAuthToken,
    );

    assertEquals(status, 200, "Should return 200");
    assertEquals(
      data.allowMemberCredits,
      true,
      "allowMemberCredits should be true",
    );
    assertEquals(
      data.allowMemberDebits,
      false,
      "allowMemberDebits should be false",
    );
  },
);

/**
 * Test: PATCH family circle config (authenticated access)
 */
const testUpdateFamilyCircleConfig_Authenticated = test(
  "PATCH /family-circle-config (authenticated access - 200)",
  async () => {
    const requestBody = {
      allowMemberCredits: true,
      allowMemberDebits: true,
    };

    const { status, data } = await apiRequest(
      "PATCH",
      `${CLIENTS_API_BASE}/${holderClientId}/accounts/${holderAccountId}/family-circle-config`,
      memberAuthToken, // Any authenticated user can update
      requestBody,
    );

    assertEquals(status, 200, "Should return 200");
    assertNotNull(data.config, "Should return config object");
  },
);

/**
 * Test: DELETE family circle member
 */
const testRemoveFamilyCircleMember = test(
  "DELETE /family-circle/members/:memberId",
  async () => {
    const { status, data } = await apiRequest(
      "DELETE",
      `${CLIENTS_API_BASE}/${holderClientId}/family-circle/members/${memberClientId}`,
      holderAuthToken,
    );

    assertEquals(status, 200, "Should return 200");
    assertNotNull(data.message, "Should return success message");
  },
);

/**
 * Test: GET family circle info (member after removal)
 */
const testGetFamilyCircleInfo_AfterRemoval = test(
  "GET /family-circle (member after removal)",
  async () => {
    const { status, data } = await apiRequest(
      "GET",
      `${CLIENTS_API_BASE}/${memberClientId}/family-circle`,
      memberAuthToken,
    );

    assertEquals(status, 200, "Should return 200");
    assertEquals(data.role, null, "Role should be null after removal");
  },
);

/**
 * Test: GET family circle members (empty after removal)
 */
const testGetFamilyCircleMembers_Empty = test(
  "GET /family-circle/members (empty)",
  async () => {
    const { status, data } = await apiRequest(
      "GET",
      `${CLIENTS_API_BASE}/${holderClientId}/family-circle/members`,
      holderAuthToken,
    );

    assertEquals(status, 200, "Should return 200");
    assertEquals(data.data.length, 0, "Should have 0 members");
    assertEquals(data.metadata.totalMembers, 0, "Total members should be 0");
  },
);

/**
 * Test: DELETE non-existent member (should fail)
 */
const testRemoveFamilyCircleMember_NotFound = test(
  "DELETE /family-circle/members/:memberId (non-existent - 404)",
  async () => {
    const { status, data } = await apiRequest(
      "DELETE",
      `${CLIENTS_API_BASE}/${holderClientId}/family-circle/members/non-existent-id`,
      holderAuthToken,
    );

    assertEquals(status, 404, "Should return 404");
    assertNotNull(data.error, "Should have error object");
  },
);

/**
 * Test: POST invalid relationship type (should fail)
 */
const testAddFamilyCircleMember_InvalidRelationship = test(
  "POST /family-circle/members (invalid relationship - 400)",
  async () => {
    const requestBody = {
      memberId: memberClientId,
      relationshipType: "invalid_type",
    };

    const { status, data } = await apiRequest(
      "POST",
      `${CLIENTS_API_BASE}/${holderClientId}/family-circle/members`,
      holderAuthToken,
      requestBody,
    );

    assertEquals(status, 400, "Should return 400");
    assertNotNull(data.error, "Should have error object");
  },
);

/**
 * Cleanup: Remove test data
 */
async function cleanupTests() {
  console.log("\n🧹 Cleaning up test data...");

  const db = admin.firestore();

  // Delete test clients (cascade deletes subcollections)
  const clientIds = [holderClientId, memberClientId, nonMemberClientId];

  for (const clientId of clientIds) {
    if (clientId) {
      try {
        // Delete accounts subcollection
        const accountsSnapshot = await db
          .collection("clients")
          .doc(clientId)
          .collection("loyaltyAccounts")
          .get();
        for (const doc of accountsSnapshot.docs) {
          await doc.ref.delete();
        }

        // Delete family circle members subcollection
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
  console.log("  Family Circle API Integration Tests");
  console.log("========================================");

  try {
    await setupTests();

    const tests = [
      // Basic info retrieval
      testGetFamilyCircleInfo_NoCircle,

      // Add member
      testAddFamilyCircleMember,

      // Get info after adding
      testGetFamilyCircleInfo_Holder,
      testGetFamilyCircleInfo_Member,
      testGetClientFamilyCircle_Holder,
      testGetClientFamilyCircle_Member,

      // List members
      testGetFamilyCircleMembers,
      testGetFamilyCircleMembers_Authenticated,

      // Add member error cases
      testAddFamilyCircleMember_Duplicate,
      testAddFamilyCircleMember_NotFound,
      testAddFamilyCircleMember_InvalidRelationship,

      // Config operations
      testGetFamilyCircleConfig_Default,
      testUpdateFamilyCircleConfig,
      testGetFamilyCircleConfig_Updated,
      testUpdateFamilyCircleConfig_Authenticated,

      // Remove member
      testRemoveFamilyCircleMember,
      testGetFamilyCircleInfo_AfterRemoval,
      testGetFamilyCircleMembers_Empty,
      testRemoveFamilyCircleMember_NotFound,
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

    // Exit with appropriate code
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
