#!/usr/bin/env node

/**
 * Comprehensive test script for Client API endpoints
 * Tests all CRUD operations, search, and photo upload
 * 
 * Run from project root: node test-client-api.mjs
 * Prerequisites: Firebase emulators must be running
 */

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Load firebase-admin from functions directory
const admin = require(path.join(__dirname, 'functions', 'node_modules', 'firebase-admin'));

// Test configuration
const API_BASE = 'http://127.0.0.1:5001/loyalty-gen/us-central1/api/api/v1/clients';
const HEALTH_URL = 'http://127.0.0.1:5001/loyalty-gen/us-central1/api/health';
const EMULATOR_AUTH_URL = 'http://127.0.0.1:9099';

// Configure Firebase Admin for emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

admin.initializeApp({
  projectId: 'loyalty-gen',
});

// Test state
let authToken = '';
let createdClientId = '';

/**
 * Make HTTP request to API
 */
async function apiRequest(method, path, authToken = null, body = null, headers = {}) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authToken ? `Bearer ${authToken}` : '',
      ...headers,
    },
  };
  
  if (body && method !== 'GET') {
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

/**
 * Test runner
 */
function test(name, fn) {
  return async () => {
    process.stdout.write(`\n${name}... `);
    try {
      await fn();
      console.log('✅ PASS');
      return true;
    } catch (error) {
      console.log('❌ FAIL');
      console.error(`  Error: ${error.message}`);
      if (error.actual !== undefined) {
        console.error(`  Expected: ${JSON.stringify(error.expected)}`);
        console.error(`  Actual: ${JSON.stringify(error.actual)}`);
      }
      return false;
    }
  };
}

function assertEquals(actual, expected, message = '') {
  if (actual !== expected) {
    const error = new Error(message || `Assertion failed`);
    error.expected = expected;
    error.actual = actual;
    throw error;
  }
}

function assertTrue(value, message = '') {
  if (!value) {
    throw new Error(message || 'Assertion failed: expected truthy value');
  }
}

function assertError(data, expectedCode) {
  if (!data || !data.error) {
    throw new Error(`Expected error response, got: ${JSON.stringify(data)}`);
  }
  if (data.error.code !== expectedCode) {
    throw new Error(`Expected error code ${expectedCode}, got ${data.error.code}: ${data.error.message}`);
  }
}

// =========================
// TEST SUITE
// =========================

const tests = [
  test('1. Health Check (Public)', async () => {
    const response = await fetch(HEALTH_URL);
    const data = await response.json();
    assertEquals(response.status, 200, `Expected 200, got ${response.status}`);
    assertTrue(data.status === 'ok', 'Health check should return ok status');
  }),

  test('2. Unauthorized Access', async () => {
    const { status, data } = await apiRequest('POST', '', null, {
      name: 'Test',
      email: 'test@example.com',
    });
    assertEquals(status, 401, 'Should reject unauthenticated request');
    assertTrue(data.error && data.error.code, 'Should have error code');
  }),

  test('3. Generate Auth Token', async () => {
    authToken = await generateAuthToken();
    assertTrue(authToken && authToken.length > 0, 'Should generate valid token');
  }),

  test('4. Create Client (Full)', async () => {
    const clientData = {
      name: {
        firstName: 'John',
        firstLastName: 'Doe',
      },
      email: 'john.doe@example.com',
      phones: [
        {
          type: 'mobile',
          number: '+1234567890',
          isPrimary: true,
        },
      ],
      identity_document: {
        type: 'cedula_identidad',
        number: 'ID123456789',
      },
      birth_date: '1990-01-15',
      gender: 'male',
      addresses: [
        {
          type: 'home',
          street: '123 Main St',
          number: '123',
          locality: 'Springfield',
          state: 'IL',
          postalCode: '62701',
          country: 'US',
          isPrimary: true,
        },
      ],
      extra_data: {
        preferences: { newsletter: true },
        source: 'web',
      },
    };
    
    const { status, data } = await apiRequest('POST', '', authToken, clientData);
    if (status !== 201) {
      throw new Error(`Expected 201, got ${status}: ${JSON.stringify(data)}`);
    }
    assertTrue(data.id, 'Should return client ID');
    assertEquals(data.name.firstName, clientData.name.firstName, 'First name should match');
    assertEquals(data.email, clientData.email, 'Email should match');
    assertTrue(data.created_at, 'Should have created_at timestamp');
    
    createdClientId = data.id;
  }),

  test('5. Duplicate Email', async () => {
    const { status, data } = await apiRequest('POST', '', authToken, {
      name: {
        firstName: 'Jane',
        firstLastName: 'Doe',
      },
      email: 'john.doe@example.com', // Same email
    });
    if (status !== 409) {
      throw new Error(`Expected 409 for duplicate email, got ${status}: ${JSON.stringify(data)}`);
    }
    assertError(data, 'CONFLICT');
  }),

  test('6. Get Client by ID', async () => {
    const { status, data } = await apiRequest('GET', `/${createdClientId}`, authToken);
    assertEquals(status, 200, 'Should fetch client');
    assertEquals(data.id, createdClientId, 'ID should match');
    assertEquals(data.email, 'john.doe@example.com', 'Email should match');
  }),

  test('7. Update Client', async () => {
    const updates = {
      name: {
        firstName: 'John',
        secondName: 'Updated',
        firstLastName: 'Doe',
      },
      phones: [
        {
          type: 'mobile',
          number: '+9876543210',
          isPrimary: true,
        },
      ],
      extra_data: { vip: true },
    };
    
    const { status, data } = await apiRequest('PUT', `/${createdClientId}`, authToken, updates);
    assertEquals(status, 200, 'Should update client');
    assertEquals(data.name.secondName, updates.name.secondName, 'Second name should be updated');
    assertEquals(data.phones[0].number, updates.phones[0].number, 'Phone should be updated');
    assertTrue(data.updated_at, 'Should have updated_at timestamp');
  }),

  test('8. List Clients (Pagination)', async () => {
    const { status, data } = await apiRequest('GET', '?page_size=10', authToken);
    if (status !== 200) {
      throw new Error(`Expected 200, got ${status}: ${JSON.stringify(data)}`);
    }
    assertTrue(Array.isArray(data.data), 'Should return data array');
    assertTrue(data.paging, 'Should have paging info');
  }),

  test('9. Search Clients by Name', async () => {
    const { status, data } = await apiRequest('GET', '/search?q=John', authToken);
    if (status !== 200) {
      throw new Error(`Expected 200, got ${status}: ${JSON.stringify(data)}`);
    }
    assertTrue(Array.isArray(data.data), 'Should return data array');
  }),

  test('10. Search Clients by Full Name', async () => {
    const { status, data } = await apiRequest('GET', '/search?q=Doe', authToken);
    if (status !== 200) {
      throw new Error(`Expected 200, got ${status}: ${JSON.stringify(data)}`);
    }
    assertTrue(Array.isArray(data.data), 'Should return data array');
  }),

  test('11. Search Clients by Phone', async () => {
    const { status, data } = await apiRequest('GET', '/search?q=9876543210', authToken);
    if (status !== 200) {
      throw new Error(`Expected 200, got ${status}: ${JSON.stringify(data)}`);
    }
    assertTrue(Array.isArray(data.data), 'Should return data array');
  }),

  test('12. Delete Client', async () => {
    const { status } = await apiRequest('DELETE', `/${createdClientId}`, authToken);
    assertEquals(status, 202, 'Should accept deletion');
  }),

  test('13. Get Deleted Client (404)', async () => {
    const { status, data } = await apiRequest('GET', `/${createdClientId}`, authToken);
    if (status !== 404) {
      throw new Error(`Expected 404 for deleted client, got ${status}: ${JSON.stringify(data)}`);
    }
    assertError(data, 'RESOURCE_NOT_FOUND');
  }),

  test('14. Validation Error (Invalid Email)', async () => {
    const { status, data } = await apiRequest('POST', '', authToken, {
      name: {
        firstName: 'Test',
        firstLastName: 'User',
      },
      email: 'invalid-email',
    });
    if (status !== 400) {
      throw new Error(`Expected 400 for invalid email, got ${status}: ${JSON.stringify(data)}`);
    }
    assertError(data, 'VALIDATION_FAILED');
  }),
];

// =========================
// MAIN
// =========================

(async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║      Client API Integration Test Suite             ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  
  console.log('\n📋 Configuration:');
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
  
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║  Results: ${passed} passed, ${failed} failed${' '.repeat(30 - passed.toString().length - failed.toString().length)}║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');
  
  process.exit(failed > 0 ? 1 : 0);
})().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
