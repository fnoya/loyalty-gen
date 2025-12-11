#!/usr/bin/env node

/**
 * Comprehensive test script for Groups API endpoints
 * Tests group CRUD operations and client assignments
 *
 * Run from project root: node test-group-api.mjs
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
const GROUPS_API_BASE =
  "http://127.0.0.1:5001/loyalty-gen/us-central1/api/v1/groups";
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
let createdGroupId = "";
let testClientId = "";

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
  const customToken = await admin.auth().createCustomToken("test-user-groups");

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
 * Create a test client to use in group operations
 */
async function createTestClient(authToken) {
  const clientData = {
    name: {
      firstName: "Test",
      firstLastName: "Client",
    },
    email: `test-client-${Date.now()}@example.com`,
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

  test("4. List Groups (Initially Empty)", async () => {
    const { status, data } = await apiRequest(
      "GET",
      GROUPS_API_BASE,
      authToken,
    );
    assertEquals(status, 200, "Should return 200");
    assertTrue(Array.isArray(data), "Should return array");
  }),

  test("5. Create Group", async () => {
    const groupData = {
      name: "Premium Members",
      description: "Premium tier customers",
    };

    const { status, data } = await apiRequest(
      "POST",
      GROUPS_API_BASE,
      authToken,
      groupData,
    );
    assertEquals(status, 201, "Should return 201");
    assertTrue(data.id, "Should have group ID");
    assertEquals(data.name, groupData.name, "Name should match");
    assertEquals(
      data.description,
      groupData.description,
      "Description should match",
    );
    assertTrue(data.created_at, "Should have created_at timestamp");

    createdGroupId = data.id;
  }),

  test("6. Create Group with Default Description", async () => {
    const groupData = {
      name: "VIP Members",
    };

    const { status, data } = await apiRequest(
      "POST",
      GROUPS_API_BASE,
      authToken,
      groupData,
    );
    assertEquals(status, 201, "Should return 201");
    assertEquals(
      data.description,
      "",
      "Description should default to empty string",
    );
  }),

  test("7. Create Group - Validation Error (Name Too Long)", async () => {
    const groupData = {
      name: "x".repeat(101),
      description: "Test",
    };

    const { status, data } = await apiRequest(
      "POST",
      GROUPS_API_BASE,
      authToken,
      groupData,
    );
    assertEquals(status, 400, "Should return 400");
    assertError(data, "VALIDATION_FAILED");
  }),

  test("8. Create Group - Validation Error (Missing Name)", async () => {
    const groupData = {
      description: "Test",
    };

    const { status, data } = await apiRequest(
      "POST",
      GROUPS_API_BASE,
      authToken,
      groupData,
    );
    assertEquals(status, 400, "Should return 400");
    assertError(data, "VALIDATION_FAILED");
  }),

  test("9. List Groups", async () => {
    const { status, data } = await apiRequest(
      "GET",
      GROUPS_API_BASE,
      authToken,
    );
    assertEquals(status, 200, "Should return 200");
    assertTrue(Array.isArray(data), "Should return array");
    assertTrue(data.length >= 2, "Should have at least 2 groups");

    const premiumGroup = data.find((g) => g.id === createdGroupId);
    assertTrue(premiumGroup, "Should find created group");
    assertEquals(premiumGroup.name, "Premium Members", "Name should match");
  }),

  test("10. Assign Client to Group", async () => {
    const url = `${GROUPS_API_BASE}/${createdGroupId}/clients/${testClientId}`;
    const { status, data } = await apiRequest("POST", url, authToken);
    assertEquals(status, 200, "Should return 200");
    assertTrue(data.message, "Should have success message");
    assertTrue(
      data.message.includes("assigned"),
      "Message should mention assignment",
    );
  }),

  test("11. Assign Client to Group - Already Assigned", async () => {
    const url = `${GROUPS_API_BASE}/${createdGroupId}/clients/${testClientId}`;
    const { status, data } = await apiRequest("POST", url, authToken);
    assertEquals(status, 400, "Should return 400");
    assertError(data, "VALIDATION_FAILED");
    assertTrue(
      data.error.message.includes("already"),
      "Should mention already assigned",
    );
  }),

  test("12. Assign Client to Group - Group Not Found", async () => {
    const url = `${GROUPS_API_BASE}/invalid-group-id/clients/${testClientId}`;
    const { status, data } = await apiRequest("POST", url, authToken);
    assertEquals(status, 404, "Should return 404");
    assertError(data, "RESOURCE_NOT_FOUND");
  }),

  test("13. Assign Client to Group - Client Not Found", async () => {
    const url = `${GROUPS_API_BASE}/${createdGroupId}/clients/invalid-client-id`;
    const { status, data } = await apiRequest("POST", url, authToken);
    assertEquals(status, 404, "Should return 404");
    assertError(data, "RESOURCE_NOT_FOUND");
  }),

  test("14. Verify Client Has Group Assignment", async () => {
    const { status, data } = await apiRequest(
      "GET",
      `${CLIENTS_API_BASE}/${testClientId}`,
      authToken,
    );
    assertEquals(status, 200, "Should return 200");
    assertTrue(
      Array.isArray(data.affinityGroupIds),
      "Should have affinityGroupIds array",
    );
    assertTrue(
      data.affinityGroupIds.includes(createdGroupId),
      "Should include assigned group",
    );
  }),

  test("15. Remove Client from Group", async () => {
    const url = `${GROUPS_API_BASE}/${createdGroupId}/clients/${testClientId}`;
    const { status, data } = await apiRequest("DELETE", url, authToken);
    assertEquals(status, 200, "Should return 200");
    assertTrue(data.message, "Should have success message");
    assertTrue(
      data.message.includes("removed"),
      "Message should mention removal",
    );
  }),

  test("16. Remove Client from Group - Not in Group", async () => {
    const url = `${GROUPS_API_BASE}/${createdGroupId}/clients/${testClientId}`;
    const { status, data } = await apiRequest("DELETE", url, authToken);
    assertEquals(status, 400, "Should return 400");
    assertError(data, "VALIDATION_FAILED");
    assertTrue(
      data.error.message.includes("not in group"),
      "Should mention not in group",
    );
  }),

  test("17. Remove Client from Group - Group Not Found", async () => {
    const url = `${GROUPS_API_BASE}/invalid-group-id/clients/${testClientId}`;
    const { status, data } = await apiRequest("DELETE", url, authToken);
    assertEquals(status, 404, "Should return 404");
    assertError(data, "RESOURCE_NOT_FOUND");
  }),

  test("18. Verify Client Group Removed", async () => {
    const { status, data } = await apiRequest(
      "GET",
      `${CLIENTS_API_BASE}/${testClientId}`,
      authToken,
    );
    assertEquals(status, 200, "Should return 200");
    assertTrue(
      Array.isArray(data.affinityGroupIds),
      "Should have affinityGroupIds array",
    );
    assertTrue(
      !data.affinityGroupIds.includes(createdGroupId),
      "Should not include removed group",
    );
  }),

  test("19. Unauthorized Access - No Token", async () => {
    const { status, data } = await apiRequest("GET", GROUPS_API_BASE, null);
    assertEquals(status, 401, "Should return 401");
    assertTrue(data.error, "Should have error");
  }),
];

// =========================
// RUN TESTS
// =========================

async function runTests() {
  console.log("\n🧪 Starting Groups API Integration Tests\n");
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
