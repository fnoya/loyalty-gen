#!/bin/bash
# Test runner for LoyaltyGen Phase 4
# Runs unit tests and integration tests

# Track whether we started the emulators
EMULATORS_STARTED_BY_SCRIPT=false

# Cleanup function
cleanup() {
  echo
  echo "🧹 Cleaning up..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [ "$EMULATORS_STARTED_BY_SCRIPT" = true ]; then
    pkill -f "firebase emulators" 2>/dev/null || true
    echo "✅ Emulators stopped"
  else
    echo "✅ Emulators left running (not started by script)"
  fi
}

# Register cleanup to run on exit
trap cleanup EXIT

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          LoyaltyGen Phase 4 - Complete Test Suite             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo

# Check if emulators are already running
echo "🔍 Checking Firebase Emulators status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if curl -s http://127.0.0.1:5001/loyalty-gen/us-central1/api/health > /dev/null 2>&1; then
  echo "✅ Emulators already running, using existing instance"
  EMULATORS_STARTED_BY_SCRIPT=false
else
  echo "🔄 Starting Firebase Emulators..."
  EMULATORS_STARTED_BY_SCRIPT=true

  # Start emulators in background
  echo "🚀 Starting emulators..."
  nohup firebase emulators:start --only functions,firestore,auth,storage > /tmp/firebase-emulator.log 2>&1 &

  # Wait for emulators to be ready
  echo "⏳ Waiting for emulators to be ready..."
  for i in {1..45}; do
    if curl -s http://127.0.0.1:5001/loyalty-gen/us-central1/api/health > /dev/null 2>&1; then
      echo "✅ Emulators ready!"
      echo "⏳ Waiting for functions to fully initialize..."
      sleep 10  # Extra grace period for full initialization
      break
    fi
    if [ $i -eq 45 ]; then
      echo "❌ Emulators failed to start. Check /tmp/firebase-emulator.log"
      tail -50 /tmp/firebase-emulator.log
      exit 1
    fi
    sleep 1
  done
fi
echo

# Rebuild functions
echo "📦 Building functions..."
cd functions
npm run build
cd ..

# Run unit tests
echo "🧪 Running Unit Tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd functions
npm test 2>&1 | tee /tmp/unit-test-output.txt || true
UNIT_TESTS_PASSED=$(grep -oE "Tests:.*[0-9]+ passed" /tmp/unit-test-output.txt | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+" || echo "0")
UNIT_TESTS_FAILED=$(grep -oE "Tests:.*[0-9]+ failed" /tmp/unit-test-output.txt | grep -oE "[0-9]+ failed" | grep -oE "[0-9]+" || echo "0")
cd ..
echo

# Run frontend tests
echo "🖥️ Running Frontend Tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd frontend
npm test 2>&1 | tee /tmp/frontend-test-output.txt || true
FRONTEND_TESTS_PASSED=$(grep -oE "Tests:.*[0-9]+ passed" /tmp/frontend-test-output.txt | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+" || echo "0")
FRONTEND_TESTS_FAILED=$(grep -oE "Tests:.*[0-9]+ failed" /tmp/frontend-test-output.txt | grep -oE "[0-9]+ failed" | grep -oE "[0-9]+" || echo "0")
cd ..
echo

# Run integration tests
echo
echo "🌐 Running Integration Tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

echo "👥 Testing Clients API..."
node tests/integration/test-client-api.mjs 2>&1 | tee /tmp/client-test-output.txt || true
CLIENT_TESTS_PASSED=$(grep -oE "Results:.*[0-9]+ passed" /tmp/client-test-output.txt | grep -oE "[0-9]+ passed" | head -1 | grep -oE "[0-9]+" || echo "0")
CLIENT_TESTS_FAILED=$(grep -oE "Results:.*[0-9]+ failed" /tmp/client-test-output.txt | grep -oE "[0-9]+ failed" | head -1 | grep -oE "[0-9]+" || echo "0")
echo

echo "📦 Testing Groups API..."
node tests/integration/test-group-api.mjs 2>&1 | tee /tmp/group-test-output.txt || true
GROUP_TESTS_PASSED=$(grep -oE "Test Results:.*[0-9]+ passed" /tmp/group-test-output.txt | grep -oE "[0-9]+ passed" | head -1 | grep -oE "[0-9]+" || echo "0")
GROUP_TESTS_FAILED=$(grep -oE "Test Results:.*[0-9]+ failed" /tmp/group-test-output.txt | grep -oE "[0-9]+ failed" | head -1 | grep -oE "[0-9]+" || echo "0")
echo

echo "💰 Testing Accounts API..."
node tests/integration/test-account-api.mjs 2>&1 | tee /tmp/account-test-output.txt || true
ACCOUNT_TESTS_PASSED=$(grep -oE "Test Results:.*[0-9]+ passed" /tmp/account-test-output.txt | grep -oE "[0-9]+ passed" | head -1 | grep -oE "[0-9]+" || echo "0")
ACCOUNT_TESTS_FAILED=$(grep -oE "Test Results:.*[0-9]+ failed" /tmp/account-test-output.txt | grep -oE "[0-9]+ failed" | head -1 | grep -oE "[0-9]+" || echo "0")
echo

echo "📋 Testing Audit System..."
node tests/integration/test-audit-api.mjs 2>&1 | tee /tmp/audit-test-output.txt || true
AUDIT_TESTS_PASSED=$(grep -oE "All Audit System Integration Tests Passed" /tmp/audit-test-output.txt | wc -l | tr -d ' ')
if [ "$AUDIT_TESTS_PASSED" -eq 1 ]; then
  AUDIT_TESTS_PASSED=9
  AUDIT_TESTS_FAILED=0
else
  AUDIT_TESTS_PASSED=0
  AUDIT_TESTS_FAILED=9
fi
echo

echo "🔎 Testing Transaction Filtering API..."
node tests/integration/test-transaction-filtering.mjs 2>&1 | tee /tmp/tx-filter-test-output.txt || true
TX_FILTER_TESTS_PASSED=$(grep -oE "Test Results:.*[0-9]+ passed" /tmp/tx-filter-test-output.txt | grep -oE "[0-9]+ passed" | head -1 | grep -oE "[0-9]+" || echo "0")
TX_FILTER_TESTS_FAILED=$(grep -oE "Test Results:.*[0-9]+ failed" /tmp/tx-filter-test-output.txt | grep -oE "[0-9]+ failed" | head -1 | grep -oE "[0-9]+" || echo "0")
echo

echo "👨‍👩‍👧‍👦 Testing Family Circle API..."
node tests/integration/test-family-circle-api.mjs 2>&1 | tee /tmp/family-circle-test-output.txt || true
FAMILY_CIRCLE_TESTS_PASSED=$(grep -oE "RESULTS:.*[0-9]+/[0-9]+ tests passed" /tmp/family-circle-test-output.txt | grep -oE "[0-9]+/" | grep -oE "[0-9]+" || echo "0")
FAMILY_CIRCLE_TESTS_FAILED=$(grep -oE "RESULTS:.*[0-9]+ failed" /tmp/family-circle-test-output.txt | grep -oE "[0-9]+ failed" | grep -oE "[0-9]+" || echo "0")
echo

echo "🤝 Testing On Behalf Of Transactions..."
node tests/integration/test-on-behalf-of.mjs 2>&1 | tee /tmp/on-behalf-of-test-output.txt || true
ON_BEHALF_OF_TESTS_PASSED=$(grep -oE "RESULTS:.*[0-9]+/[0-9]+ tests passed" /tmp/on-behalf-of-test-output.txt | grep -oE "[0-9]+/" | grep -oE "[0-9]+" || echo "0")
ON_BEHALF_OF_TESTS_FAILED=$(grep -oE "RESULTS:.*[0-9]+ failed" /tmp/on-behalf-of-test-output.txt | grep -oE "[0-9]+ failed" | grep -oE "[0-9]+" || echo "0")
echo

# Calculate totals
INTEGRATION_TESTS_PASSED=$((CLIENT_TESTS_PASSED + GROUP_TESTS_PASSED + ACCOUNT_TESTS_PASSED + AUDIT_TESTS_PASSED + TX_FILTER_TESTS_PASSED + FAMILY_CIRCLE_TESTS_PASSED + ON_BEHALF_OF_TESTS_PASSED))
INTEGRATION_TESTS_FAILED=$((CLIENT_TESTS_FAILED + GROUP_TESTS_FAILED + ACCOUNT_TESTS_FAILED + AUDIT_TESTS_FAILED + TX_FILTER_TESTS_FAILED + FAMILY_CIRCLE_TESTS_FAILED + ON_BEHALF_OF_TESTS_FAILED))
INTEGRATION_TESTS_TOTAL=$((INTEGRATION_TESTS_PASSED + INTEGRATION_TESTS_FAILED))
TOTAL_TESTS_PASSED=$((UNIT_TESTS_PASSED + FRONTEND_TESTS_PASSED + INTEGRATION_TESTS_PASSED))
TOTAL_TESTS_FAILED=$((UNIT_TESTS_FAILED + FRONTEND_TESTS_FAILED + INTEGRATION_TESTS_FAILED))
TOTAL_TESTS=$((TOTAL_TESTS_PASSED + TOTAL_TESTS_FAILED))

# Determine status
if [ $TOTAL_TESTS_FAILED -eq 0 ]; then
  STATUS_ICON="✅"
  STATUS_TEXT="ALL TESTS PASSED"
else
  STATUS_ICON="❌"
  STATUS_TEXT="SOME TESTS FAILED"
fi

# Summary
echo "╔════════════════════════════════════════════════════════════════════════════════╗"
printf "║                       %s %-53s ║\n" "$STATUS_ICON" "$STATUS_TEXT"
echo "╠════════════════════════════════════════════════════════════════════════════════╣"
printf "║  %-77s ║\n" "Backend Tests:     $UNIT_TESTS_PASSED passed, $UNIT_TESTS_FAILED failed"
printf "║  %-77s ║\n" "Frontend Tests:    $FRONTEND_TESTS_PASSED passed, $FRONTEND_TESTS_FAILED failed"
printf "║  %-76s ║\n" "Integration Tests: $INTEGRATION_TESTS_PASSED passed, $INTEGRATION_TESTS_FAILED failed"
printf "║  %-77s ║\n" "  ($CLIENT_TESTS_PASSED clients + $GROUP_TESTS_PASSED groups + $ACCOUNT_TESTS_PASSED accounts + $AUDIT_TESTS_PASSED audit + $TX_FILTER_TESTS_PASSED filtering + $FAMILY_CIRCLE_TESTS_PASSED family + $ON_BEHALF_OF_TESTS_PASSED on-behalf)"
printf "║  %-77s ║\n" "Total:            $TOTAL_TESTS_PASSED passed, $TOTAL_TESTS_FAILED failed ($TOTAL_TESTS tests)"
echo "╚════════════════════════════════════════════════════════════════════════════════╝"

# Exit with failure if any tests failed (cleanup will run via trap)
exit $TOTAL_TESTS_FAILED
