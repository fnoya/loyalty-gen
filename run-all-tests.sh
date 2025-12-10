#!/bin/bash
# Test runner for LoyaltyGen Phase 4
# Runs unit tests and integration tests

# Cleanup function
cleanup() {
  echo
  echo "🧹 Cleaning up..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  pkill -f "firebase emulators" 2>/dev/null || true
  echo "✅ Emulators stopped"
}

# Register cleanup to run on exit
trap cleanup EXIT

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          LoyaltyGen Phase 4 - Complete Test Suite             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo

# Restart Firebase emulators
echo "🔄 Restarting Firebase Emulators..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Kill existing emulator processes
pkill -f "firebase emulators" 2>/dev/null || true
sleep 2

# Rebuild functions
echo "📦 Building functions..."
cd functions
npm run build
cd ..

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
echo

# Run unit tests
echo "🧪 Running Unit Tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd functions
npm test 2>&1 | tee /tmp/unit-test-output.txt || true
UNIT_TESTS_PASSED=$(grep -oE "Tests:.*[0-9]+ passed" /tmp/unit-test-output.txt | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+" || echo "0")
UNIT_TESTS_FAILED=$(grep -oE "Tests:.*[0-9]+ failed" /tmp/unit-test-output.txt | grep -oE "[0-9]+ failed" | grep -oE "[0-9]+" || echo "0")
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

# Calculate totals
INTEGRATION_TESTS_PASSED=$((CLIENT_TESTS_PASSED + GROUP_TESTS_PASSED + ACCOUNT_TESTS_PASSED + AUDIT_TESTS_PASSED))
INTEGRATION_TESTS_FAILED=$((CLIENT_TESTS_FAILED + GROUP_TESTS_FAILED + ACCOUNT_TESTS_FAILED + AUDIT_TESTS_FAILED))
INTEGRATION_TESTS_TOTAL=$((INTEGRATION_TESTS_PASSED + INTEGRATION_TESTS_FAILED))
TOTAL_TESTS_PASSED=$((UNIT_TESTS_PASSED + INTEGRATION_TESTS_PASSED))
TOTAL_TESTS_FAILED=$((UNIT_TESTS_FAILED + INTEGRATION_TESTS_FAILED))
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
printf "║  %-77s ║\n" "Unit Tests:        $UNIT_TESTS_PASSED passed, $UNIT_TESTS_FAILED failed"
printf "║  %-76s ║\n" "Integration Tests: $INTEGRATION_TESTS_PASSED passed, $INTEGRATION_TESTS_FAILED failed ($CLIENT_TESTS_PASSED clients + $GROUP_TESTS_PASSED groups + $ACCOUNT_TESTS_PASSED accounts + $AUDIT_TESTS_PASSED audit)"
printf "║  %-77s ║\n" "Total:            $TOTAL_TESTS_PASSED passed, $TOTAL_TESTS_FAILED failed ($TOTAL_TESTS tests)"
echo "╚════════════════════════════════════════════════════════════════════════════════╝"

# Exit with failure if any tests failed (cleanup will run via trap)
exit $TOTAL_TESTS_FAILED
