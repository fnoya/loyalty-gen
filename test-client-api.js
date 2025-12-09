#!/usr/bin/env node

/**
 * Comprehensive test script for Client API endpoints
 * Tests all CRUD operations, search, and photo upload
 * 
 * Run from project root: node test-client-api.js
 */

const path = require('path');

// Load firebase-admin from functions directory
const admin = require(path.join(__dirname, 'functions', 'node_modules', 'firebase-admin'));
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');
const os = require('os');

// Initialize Firebase Admin with emulator settings
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

admin.initializeApp({ projectId: 'demo-project' });

const API_BASE = 'http://127.0.0.1:5001/demo-project/us-central1/api';
let authToken = '';
let testClientId = '';

// Helper function to make API calls
async function apiCall(method, path, body = null, headers = {}) {
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

// Test functions
async function test1_HealthCheck() {
  console.log('\n📍 Test 1: Health Check (Public endpoint)');
  const { status, data } = await apiCall('GET', '/health');
  
  if (status === 200 && data.status === 'ok') {
    console.log('✅ PASS: Health endpoint works');
    console.log('   Response:', JSON.stringify(data, null, 2));
  } else {
    console.log('❌ FAIL: Health check failed');
    console.log('   Status:', status);
    console.log('   Data:', data);
  }
}

async function test2_UnauthorizedAccess() {
  console.log('\n📍 Test 2: Unauthorized Access (No token)');
  authToken = ''; // Clear token
  const { status, data } = await apiCall('GET', '/api/v1/clients');
  
  if (status === 401 && data.error) {
    console.log('✅ PASS: Properly returns 401 without token');
    console.log('   Error:', JSON.stringify(data.error, null, 2));
  } else {
    console.log('❌ FAIL: Should return 401 without token');
    console.log('   Status:', status);
  }
}

async function test3_GenerateAuthToken() {
  console.log('\n📍 Test 3: Generate Auth Token');
  try {
    // Create a test user in Auth emulator
    const userRecord = await admin.auth().createUser({
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    });
    
    // Generate custom token
    const customToken = await admin.auth().createCustomToken('test-user-123');
    
    // Exchange for ID token (in real scenario, client would do this)
    // For emulator, we can create token directly
    authToken = await admin.auth().createCustomToken('test-user-123');
    
    console.log('✅ PASS: Auth token generated');
    console.log('   User ID:', userRecord.uid);
    console.log('   Token (first 50 chars):', authToken.substring(0, 50) + '...');
  } catch (error) {
    console.log('❌ FAIL: Could not generate auth token');
    console.log('   Error:', error.message);
    throw error;
  }
}

async function test4_CreateClient() {
  console.log('\n📍 Test 4: Create Client (POST /api/v1/clients)');
  
  const clientData = {
    name: {
      firstName: 'Francisco',
      secondName: 'José',
      firstLastName: 'Noya',
      secondLastName: 'González',
    },
    email: 'francisco.noya@example.com',
    phones: [
      {
        type: 'mobile',
        number: '+59899123456',
        isPrimary: true,
      },
    ],
    addresses: [
      {
        type: 'home',
        street: 'Av. Principal',
        number: '1234',
        locality: 'Montevideo',
        state: 'Montevideo',
        country: 'Uruguay',
        postalCode: '11200',
        isPrimary: true,
      },
    ],
    extra_data: {
      notes: 'VIP customer',
    },
  };
  
  const { status, data } = await apiCall('POST', '/api/v1/clients', clientData);
  
  if (status === 201 && data.id) {
    testClientId = data.id;
    console.log('✅ PASS: Client created successfully');
    console.log('   Client ID:', testClientId);
    console.log('   Name:', `${data.name.firstName} ${data.name.firstLastName}`);
    console.log('   Email:', data.email);
  } else {
    console.log('❌ FAIL: Could not create client');
    console.log('   Status:', status);
    console.log('   Data:', JSON.stringify(data, null, 2));
  }
}

async function test5_DuplicateEmail() {
  console.log('\n📍 Test 5: Duplicate Email (Should fail with 409)');
  
  const clientData = {
    name: {
      firstName: 'Another',
      firstLastName: 'Person',
    },
    email: 'francisco.noya@example.com', // Same email
  };
  
  const { status, data } = await apiCall('POST', '/api/v1/clients', clientData);
  
  if (status === 409 && data.error) {
    console.log('✅ PASS: Properly rejects duplicate email');
    console.log('   Error:', data.error.message);
  } else {
    console.log('❌ FAIL: Should return 409 for duplicate email');
    console.log('   Status:', status);
  }
}

async function test6_GetClient() {
  console.log('\n📍 Test 6: Get Client by ID (GET /api/v1/clients/:id)');
  
  const { status, data } = await apiCall('GET', `/api/v1/clients/${testClientId}`);
  
  if (status === 200 && data.id === testClientId) {
    console.log('✅ PASS: Retrieved client successfully');
    console.log('   Name:', `${data.name.firstName} ${data.name.firstLastName}`);
    console.log('   Email:', data.email);
    console.log('   Phones:', data.phones.length);
  } else {
    console.log('❌ FAIL: Could not retrieve client');
    console.log('   Status:', status);
  }
}

async function test7_UpdateClient() {
  console.log('\n📍 Test 7: Update Client (PUT /api/v1/clients/:id)');
  
  const updateData = {
    phones: [
      {
        type: 'mobile',
        number: '+59899123456',
        isPrimary: true,
      },
      {
        type: 'work',
        number: '+59822334455',
        isPrimary: false,
      },
    ],
  };
  
  const { status, data } = await apiCall('PUT', `/api/v1/clients/${testClientId}`, updateData);
  
  if (status === 200 && data.phones.length === 2) {
    console.log('✅ PASS: Updated client successfully');
    console.log('   Phones:', data.phones.length);
  } else {
    console.log('❌ FAIL: Could not update client');
    console.log('   Status:', status);
  }
}

async function test8_ListClients() {
  console.log('\n📍 Test 8: List Clients (GET /api/v1/clients)');
  
  const { status, data } = await apiCall('GET', '/api/v1/clients?limit=10');
  
  if (status === 200 && Array.isArray(data.data)) {
    console.log('✅ PASS: Retrieved client list');
    console.log('   Total clients:', data.data.length);
    console.log('   Has pagination:', data.paging ? 'Yes' : 'No');
  } else {
    console.log('❌ FAIL: Could not list clients');
    console.log('   Status:', status);
  }
}

async function test9_SearchByName() {
  console.log('\n📍 Test 9: Search by Name (GET /api/v1/clients/search?q=Francisco)');
  
  const { status, data } = await apiCall('GET', '/api/v1/clients/search?q=Francisco');
  
  if (status === 200 && Array.isArray(data.data)) {
    const found = data.data.some(c => c.name.firstName.toLowerCase().includes('francisco'));
    if (found) {
      console.log('✅ PASS: Search by name works');
      console.log('   Results:', data.data.length);
      console.log('   Search type:', data.metadata.search_type);
    } else {
      console.log('⚠️  WARN: Search returned results but client not found');
    }
  } else {
    console.log('❌ FAIL: Search failed');
    console.log('   Status:', status);
  }
}

async function test10_SearchByFullName() {
  console.log('\n📍 Test 10: Search by Full Name (GET /api/v1/clients/search?q=Francisco Noya)');
  
  const { status, data } = await apiCall('GET', '/api/v1/clients/search?q=Francisco%20Noya');
  
  if (status === 200 && Array.isArray(data.data)) {
    console.log('✅ PASS: Search by full name works');
    console.log('   Results:', data.data.length);
    console.log('   Search type:', data.metadata.search_type);
  } else {
    console.log('❌ FAIL: Full name search failed');
    console.log('   Status:', status);
  }
}

async function test11_SearchByPhone() {
  console.log('\n📍 Test 11: Search by Phone (GET /api/v1/clients/search?q=99123)');
  
  const { status, data } = await apiCall('GET', '/api/v1/clients/search?q=99123');
  
  if (status === 200 && Array.isArray(data.data)) {
    console.log('✅ PASS: Search by phone works');
    console.log('   Results:', data.data.length);
    console.log('   Search type:', data.metadata.search_type);
  } else {
    console.log('❌ FAIL: Phone search failed');
    console.log('   Status:', status);
  }
}

async function test12_DeleteClient() {
  console.log('\n📍 Test 12: Delete Client (DELETE /api/v1/clients/:id)');
  
  const { status, data } = await apiCall('DELETE', `/api/v1/clients/${testClientId}`);
  
  if (status === 202 && data.message) {
    console.log('✅ PASS: Delete request accepted');
    console.log('   Message:', data.message);
    
    // Verify deletion
    const { status: getStatus } = await apiCall('GET', `/api/v1/clients/${testClientId}`);
    if (getStatus === 404) {
      console.log('✅ PASS: Client was deleted successfully');
    } else {
      console.log('⚠️  WARN: Client still exists after deletion');
    }
  } else {
    console.log('❌ FAIL: Could not delete client');
    console.log('   Status:', status);
  }
}

async function test13_NotFoundError() {
  console.log('\n📍 Test 13: Not Found Error (GET /api/v1/clients/nonexistent)');
  
  const { status, data } = await apiCall('GET', '/api/v1/clients/nonexistent123');
  
  if (status === 404 && data.error) {
    console.log('✅ PASS: Returns 404 for non-existent client');
    console.log('   Error:', data.error.message);
  } else {
    console.log('❌ FAIL: Should return 404');
    console.log('   Status:', status);
  }
}

async function test14_ValidationError() {
  console.log('\n📍 Test 14: Validation Error (Missing required fields)');
  
  const invalidData = {
    name: {
      firstName: 'John',
      // Missing firstLastName
    },
    // Missing email AND identity_document
  };
  
  const { status, data } = await apiCall('POST', '/api/v1/clients', invalidData);
  
  if (status === 400 && data.error) {
    console.log('✅ PASS: Returns 400 for validation errors');
    console.log('   Error:', data.error.message);
  } else {
    console.log('❌ FAIL: Should return 400 for validation errors');
    console.log('   Status:', status);
  }
}

// Main test runner
async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   LoyaltyGen API - Phase 3 Comprehensive Tests      ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  
  try {
    await test1_HealthCheck();
    await test2_UnauthorizedAccess();
    await test3_GenerateAuthToken();
    await test4_CreateClient();
    await test5_DuplicateEmail();
    await test6_GetClient();
    await test7_UpdateClient();
    await test8_ListClients();
    await test9_SearchByName();
    await test10_SearchByFullName();
    await test11_SearchByPhone();
    await test12_DeleteClient();
    await test13_NotFoundError();
    await test14_ValidationError();
    
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║              All Tests Completed!                     ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error during tests:', error);
    process.exit(1);
  }
}

// Wait for emulators to be ready
setTimeout(() => {
  runTests();
}, 3000);
