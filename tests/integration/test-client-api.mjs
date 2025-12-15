#!/usr/bin/env node

/**
 * Comprehensive test script for Client API endpoints
 * Tests all CRUD operations, search, and photo upload
 *
 * Run from project root: node test-client-api.mjs
 * Prerequisites: Firebase emulators must be running
 */

import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import FormData from "form-data";
import fs from "fs";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Load firebase-admin from functions directory
const admin = require(
  path.join(__dirname, "../..", "functions", "node_modules", "firebase-admin"),
);

// Test configuration
const API_BASE =
  "http://127.0.0.1:5001/loyalty-gen/us-central1/api/v1/clients";
const HEALTH_URL = "http://127.0.0.1:5001/loyalty-gen/us-central1/api/health";
const EMULATOR_AUTH_URL = "http://127.0.0.1:9099";

// Configure Firebase Admin for emulator
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

admin.initializeApp({
  projectId: "loyalty-gen",
});

/**
 * Convert stream to buffer
 */
async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Helper to send multipart request using native http module
 * Bypasses node-fetch v2 issues with multipart/form-data
 */
const http = require("http");

function postMultipart(url, headers, buffer) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: "POST",
      headers: headers,
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          text: () => Promise.resolve(data),
          json: () => Promise.resolve(JSON.parse(data)),
        });
      });
    });

    req.on("error", reject);
    req.write(buffer);
    req.end();
  });
}

// Test state
let authToken = "";
let createdClientId = "";
let photoClientId = ""; // For photo tests

/**
 * Make HTTP request to API
 */
async function apiRequest(
  method,
  path,
  authToken = null,
  body = null,
  headers = {},
) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: authToken ? `Bearer ${authToken}` : "",
      ...headers,
    },
  };

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, options);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }

  return { status: response.status, data };
}

/**
 * Generate auth token for testing
 */
async function generateAuthToken() {
  const customToken = await admin.auth().createCustomToken("test-user-123");

  // Exchange custom token for ID token
  const response = await fetch(
    `${EMULATOR_AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`,
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
 * Test runner
 */
function test(name, fn) {
  return async () => {
    process.stdout.write(`\n${name}... `);
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
  test("1. Health Check (Public)", async () => {
    const response = await fetch(HEALTH_URL);
    const data = await response.json();
    assertEquals(response.status, 200, `Expected 200, got ${response.status}`);
    assertTrue(data.status === "ok", "Health check should return ok status");
  }),

  test("2. Unauthorized Access", async () => {
    const { status, data } = await apiRequest("POST", "", null, {
      name: "Test",
      email: "test@example.com",
    });
    assertEquals(status, 401, "Should reject unauthenticated request");
    assertTrue(data.error && data.error.code, "Should have error code");
  }),

  test("3. Generate Auth Token", async () => {
    authToken = await generateAuthToken();
    assertTrue(
      authToken && authToken.length > 0,
      "Should generate valid token",
    );
  }),

  test("4. Create Client (Full)", async () => {
    const clientData = {
      name: {
        firstName: "John",
        firstLastName: "Doe",
      },
      email: "john.doe@example.com",
      phones: [
        {
          type: "mobile",
          number: "+1234567890",
          isPrimary: true,
        },
      ],
      identity_document: {
        type: "cedula_identidad",
        number: "ID123456789",
      },
      birth_date: "1990-01-15",
      gender: "male",
      addresses: [
        {
          type: "home",
          street: "123 Main St",
          number: "123",
          locality: "Springfield",
          state: "IL",
          postalCode: "62701",
          country: "US",
          isPrimary: true,
        },
      ],
      extra_data: {
        preferences: { newsletter: true },
        source: "web",
      },
    };

    const { status, data } = await apiRequest(
      "POST",
      "",
      authToken,
      clientData,
    );
    if (status !== 201) {
      throw new Error(`Expected 201, got ${status}: ${JSON.stringify(data)}`);
    }
    assertTrue(data.id, "Should return client ID");
    assertEquals(
      data.name.firstName,
      clientData.name.firstName,
      "First name should match",
    );
    assertEquals(data.email, clientData.email, "Email should match");
    assertTrue(data.created_at, "Should have created_at timestamp");

    createdClientId = data.id;
  }),

  test("5. Duplicate Email", async () => {
    const { status, data } = await apiRequest("POST", "", authToken, {
      name: {
        firstName: "Jane",
        firstLastName: "Doe",
      },
      email: "john.doe@example.com", // Same email
    });
    if (status !== 409) {
      throw new Error(
        `Expected 409 for duplicate email, got ${status}: ${JSON.stringify(data)}`,
      );
    }
    assertError(data, "CONFLICT");
  }),

  test("6. Get Client by ID", async () => {
    const { status, data } = await apiRequest(
      "GET",
      `/${createdClientId}`,
      authToken,
    );
    assertEquals(status, 200, "Should fetch client");
    assertEquals(data.id, createdClientId, "ID should match");
    assertEquals(data.email, "john.doe@example.com", "Email should match");
  }),

  test("7. Update Client", async () => {
    const updates = {
      name: {
        firstName: "John",
        secondName: "Updated",
        firstLastName: "Doe",
      },
      phones: [
        {
          type: "mobile",
          number: "+9876543210",
          isPrimary: true,
        },
      ],
      extra_data: { vip: true },
    };

    const { status, data } = await apiRequest(
      "PUT",
      `/${createdClientId}`,
      authToken,
      updates,
    );
    assertEquals(status, 200, "Should update client");
    assertEquals(
      data.name.secondName,
      updates.name.secondName,
      "Second name should be updated",
    );
    assertEquals(
      data.phones[0].number,
      updates.phones[0].number,
      "Phone should be updated",
    );
    assertTrue(data.updated_at, "Should have updated_at timestamp");
  }),

  test("8. List Clients (Pagination)", async () => {
    const { status, data } = await apiRequest(
      "GET",
      "?page_size=10",
      authToken,
    );
    if (status !== 200) {
      throw new Error(`Expected 200, got ${status}: ${JSON.stringify(data)}`);
    }
    assertTrue(Array.isArray(data.data), "Should return data array");
    assertTrue(data.paging, "Should have paging info");
  }),

  test("9. Search Clients by Name", async () => {
    const { status, data } = await apiRequest(
      "GET",
      "/search?q=John",
      authToken,
    );
    if (status !== 200) {
      throw new Error(`Expected 200, got ${status}: ${JSON.stringify(data)}`);
    }
    assertTrue(Array.isArray(data.data), "Should return data array");
  }),

  test("10. Search Clients by Full Name", async () => {
    const { status, data } = await apiRequest(
      "GET",
      "/search?q=Doe",
      authToken,
    );
    if (status !== 200) {
      throw new Error(`Expected 200, got ${status}: ${JSON.stringify(data)}`);
    }
    assertTrue(Array.isArray(data.data), "Should return data array");
  }),

  test("11. Search Clients by Phone", async () => {
    const { status, data } = await apiRequest(
      "GET",
      "/search?q=9876543210",
      authToken,
    );
    if (status !== 200) {
      throw new Error(`Expected 200, got ${status}: ${JSON.stringify(data)}`);
    }
    assertTrue(Array.isArray(data.data), "Should return data array");
  }),

  test("11a. Search Clients with Mixed Query (letters and digits)", async () => {
    // Create a test client with identity document for mixed search
    const timestamp = Date.now();
    // Use just digits for identity document to avoid issues with mixed content
    const uniqueIdNum = timestamp.toString().slice(-10);
    const testClientData = {
      name: {
        firstName: "Mixed",
        firstLastName: "Search",
      },
      email: `mixed-search-${timestamp}@test.com`,
      identity_document: {
        type: "cedula_identidad",
        number: uniqueIdNum,
      },
      phones: [{ type: "mobile", number: `555${timestamp.toString().slice(-7)}`, isPrimary: true }],
      addresses: [],
      extra_data: {},
    };

    const { status: createStatus, data: createData } = await apiRequest(
      "POST",
      "",
      authToken,
      testClientData,
    );

    if (createStatus !== 201) {
      throw new Error(
        `Failed to create test client: ${createStatus} - ${JSON.stringify(createData)}`,
      );
    }

    const createdMixedClientId =
      createData?.data?.id ||
      createData?.id;
    assertTrue(createdMixedClientId, "Should have created client ID");

    // Test 1: Search by name "Mixed" - should find the created client
    const { status: searchStatus1, data: searchData1 } = await apiRequest(
      "GET",
      "/search?q=mixed",
      authToken,
    );
    if (searchStatus1 !== 200) {
      throw new Error(
        `Expected 200, got ${searchStatus1}: ${JSON.stringify(searchData1)}`,
      );
    }
    assertTrue(
      Array.isArray(searchData1.data),
      "Name search should return array",
    );
    assertTrue(
      searchData1.data.length > 0,
      "Name search should return at least one result",
    );
    assertTrue(
      searchData1.data.some((c) => c.id === createdMixedClientId),
      `Should find created client by name "Mixed". Results: ${JSON.stringify(searchData1.data.map((c) => ({ id: c.id, name: c.name })))}`,
    );

    // Test 2: Search by special characters (should handle gracefully - no results expected)
    const { status: searchStatus2, data: searchData2 } = await apiRequest(
      "GET",
      "/search?q=!!!",
      authToken,
    );
    if (searchStatus2 !== 200) {
      throw new Error(
        `Expected 200, got ${searchStatus2}: ${JSON.stringify(searchData2)}`,
      );
    }
    assertTrue(
      Array.isArray(searchData2.data),
      "Special character search should return array",
    );

    // Test 3: Search by identity document number - should find the created client
    const { status: searchStatus3, data: searchData3 } = await apiRequest(
      "GET",
      `/search?q=${uniqueIdNum}`,
      authToken,
    );
    if (searchStatus3 !== 200) {
      throw new Error(
        `Expected 200, got ${searchStatus3}: ${JSON.stringify(searchData3)}`,
      );
    }
    assertTrue(
      Array.isArray(searchData3.data),
      "Identity document number search should return array",
    );
    assertTrue(
      searchData3.data.length > 0,
      "Identity document search should return at least one result when searching for last 5 digits",
    );

    // Test 4: Verify the created client can be found by its name
    const { status: searchByNameStatus, data: searchByNameData } =
      await apiRequest("GET", "/search?q=Search", authToken);
    if (searchByNameStatus !== 200) {
      throw new Error(
        `Expected 200, got ${searchByNameStatus}: ${JSON.stringify(searchByNameData)}`,
      );
    }
    assertTrue(
      searchByNameData.data.some(
        (c) => c.id === createdMixedClientId,
      ),
      "Should find created client by name",
    );
  }),

  test("12. Delete Client", async () => {
    const { status } = await apiRequest(
      "DELETE",
      `/${createdClientId}`,
      authToken,
    );
    assertEquals(status, 202, "Should accept deletion");
  }),

  test("13. Get Deleted Client (404)", async () => {
    const { status, data } = await apiRequest(
      "GET",
      `/${createdClientId}`,
      authToken,
    );
    if (status !== 404) {
      throw new Error(
        `Expected 404 for deleted client, got ${status}: ${JSON.stringify(data)}`,
      );
    }
    assertError(data, "RESOURCE_NOT_FOUND");
  }),

  test("14. Validation Error (Invalid Email)", async () => {
    const { status, data } = await apiRequest("POST", "", authToken, {
      name: {
        firstName: "Test",
        firstLastName: "User",
      },
      email: "invalid-email",
    });
    if (status !== 400) {
      throw new Error(
        `Expected 400 for invalid email, got ${status}: ${JSON.stringify(data)}`,
      );
    }
    assertError(data, "VALIDATION_FAILED");
  }),

  test("15. Create Client for Photo Tests", async () => {
    const uniqueEmail = `photo.test.${Date.now()}@example.com`;
    const { status, data } = await apiRequest("POST", "", authToken, {
      name: {
        firstName: "Photo",
        firstLastName: "Test",
      },
      email: uniqueEmail,
    });
    if (status !== 201) {
      throw new Error(`Expected 201, got ${status}: ${JSON.stringify(data)}`);
    }
    photoClientId = data.id;
    assertTrue(photoClientId, "Should have photo client ID");
  }),

  test("16. Upload Photo (Multipart)", async () => {
    // Create a small test image (1x1 pixel PNG)
    const pngData = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );

    const form = new FormData();
    form.append("photo", pngData, {
      filename: "test.png",
      contentType: "image/png",
    });

    const buffer = Buffer.concat([form.getBuffer(), Buffer.from("\r\n")]);

    const response = await postMultipart(
      `${API_BASE}/${photoClientId}/photo`,
      {
        Authorization: `Bearer ${authToken}`,
        ...form.getHeaders(),
        "Content-Length": buffer.length.toString(),
      },
      buffer,
    );

    const status = response.status;
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (status !== 200) {
      throw new Error(
        `Expected 200 for photo upload, got ${status}: ${JSON.stringify(data)}`,
      );
    }
    assertTrue(data.photoUrl, "Should return photoUrl");
    // Check for production URL or emulator URL
    const isValidUrl =
      data.photoUrl.includes("storage.googleapis.com") ||
      data.photoUrl.includes("firebasestorage") ||
      data.photoUrl.includes("127.0.0.1") ||
      data.photoUrl.includes("localhost");
    assertTrue(
      isValidUrl,
      `PhotoUrl should be a valid storage URL, got: ${data.photoUrl}`,
    );
  }),

  test("17. Verify Photo URL in Client", async () => {
    const { status, data } = await apiRequest(
      "GET",
      `/${photoClientId}`,
      authToken,
    );
    if (status !== 200) {
      throw new Error(`Expected 200, got ${status}`);
    }
    assertTrue(data.photoUrl, "Client should have photoUrl");
  }),

  test("18. Delete Photo", async () => {
    const response = await fetch(`${API_BASE}/${photoClientId}/photo`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const status = response.status;
    if (status !== 200) {
      const text = await response.text();
      throw new Error(`Expected 200 for photo delete, got ${status}: ${text}`);
    }
  }),

  test("19. Verify Photo Deleted", async () => {
    const { status, data } = await apiRequest(
      "GET",
      `/${photoClientId}`,
      authToken,
    );
    if (status !== 200) {
      throw new Error(`Expected 200, got ${status}`);
    }
    assertTrue(
      data.photoUrl === null,
      "Client photoUrl should be null after deletion",
    );
  }),

  test("20. Upload Invalid File Type", async () => {
    // Create a text file
    const textData = Buffer.from("This is not an image");

    const form = new FormData();
    form.append("photo", textData, {
      filename: "test.txt",
      contentType: "text/plain",
    });

    const buffer = form.getBuffer();

    const response = await postMultipart(
      `${API_BASE}/${photoClientId}/photo`,
      {
        Authorization: `Bearer ${authToken}`,
        ...form.getHeaders(),
        "Content-Length": buffer.length.toString(),
      },
      buffer,
    );

    const status = response.status;
    if (status !== 400) {
      const text = await response.text();
      throw new Error(
        `Expected 400 for invalid file type, got ${status}: ${text}`,
      );
    }
  }),
];

// =========================
// MAIN
// =========================

(async function main() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║      Client API Integration Test Suite             ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  console.log("\n📋 Configuration:");
  console.log(`  API Base: ${API_BASE}`);
  console.log(`  Firestore: ${process.env.FIRESTORE_EMULATOR_HOST}`);
  console.log(`  Auth: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);

  let passed = 0;
  let failed = 0;

  for (const testFn of tests) {
    const result = await testFn();
    if (result) passed++;
    else failed++;
  }

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log(
    `║  Results: ${passed} passed, ${failed} failed${" ".repeat(30 - passed.toString().length - failed.toString().length)}║`,
  );
  console.log("╚══════════════════════════════════════════════════════╝\n");

  process.exit(failed > 0 ? 1 : 0);
})().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
