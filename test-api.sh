#!/bin/bash

# Test script for LoyaltyGen API
BASE_URL="http://127.0.0.1:5001/demo-project/us-central1/api"

echo "=== Testing LoyaltyGen API ==="
echo ""

# Test 1: Health Check
echo "1. Testing Health Check (GET /health)"
curl -s "$BASE_URL/health" | python3 -m json.tool
echo ""
echo ""

# Test 2: Try to access protected endpoint without auth (should get 401)
echo "2. Testing Protected Endpoint Without Auth (GET /api/v1/clients)"
echo "Expected: 401 Unauthorized"
curl -s -w "\nHTTP Status: %{http_code}\n" "$BASE_URL/api/v1/clients"
echo ""
echo ""

# Test 3: Create a client without auth (should get 401)
echo "3. Testing Create Client Without Auth (POST /api/v1/clients)"
echo "Expected: 401 Unauthorized"
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": {
      "firstName": "Juan",
      "firstLastName": "Pérez"
    },
    "email": "juan.perez@example.com"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  "$BASE_URL/api/v1/clients"
echo ""
echo ""

# Test 4: Invalid route (should get 404)
echo "4. Testing Invalid Route (GET /api/v1/nonexistent)"
echo "Expected: 404 Not Found"
curl -s -w "\nHTTP Status: %{http_code}\n" "$BASE_URL/api/v1/nonexistent"
echo ""
echo ""

echo "=== Tests Complete ==="
echo ""
echo "Note: Full CRUD tests require Firebase Authentication token."
echo "To test with auth, generate a token using Firebase Admin SDK or Auth emulator."
