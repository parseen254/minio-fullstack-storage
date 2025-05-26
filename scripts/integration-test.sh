#!/bin/bash

# MinIO Storage System Integration Test Script
set -e

echo "MinIO Storage System - Integration Tests"
echo "========================================"

API_BASE="http://localhost:8080"
FRONTEND_BASE="http://localhost:3000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test result tracking
TESTS_PASSED=0
TESTS_FAILED=0

# Function to log test results
log_test() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓ PASS${NC} $test_name: $message"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} $test_name: $message"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Function to test HTTP endpoint
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local expected_status="$4"
    local data="$5"
    local headers="$6"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "%{http_code}" -X "$method" "$url" \
            -H "Content-Type: application/json" \
            ${headers:+-H "$headers"} \
            -d "$data")
    else
        response=$(curl -s -w "%{http_code}" -X "$method" "$url" \
            ${headers:+-H "$headers"})
    fi
    
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "$expected_status" ]; then
        log_test "$name" "PASS" "HTTP $http_code"
        echo "$body"
    else
        log_test "$name" "FAIL" "Expected HTTP $expected_status, got $http_code"
        echo "Response: $body"
    fi
}

echo "Starting integration tests..."
echo ""

# Test 1: Health Check
echo "1. Testing Health Endpoint"
test_endpoint "Health Check" "GET" "$API_BASE/health" "200"
echo ""

# Test 2: Frontend Availability
echo "2. Testing Frontend Availability"
if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_BASE" | grep -q "200"; then
    log_test "Frontend Access" "PASS" "Frontend is accessible"
else
    log_test "Frontend Access" "FAIL" "Frontend is not accessible"
fi
echo ""

# Test 3: User Registration
echo "3. Testing User Registration"
USER_DATA='{
    "username": "integrationtest",
    "email": "integration@test.com",
    "password": "password123",
    "firstName": "Integration",
    "lastName": "Test"
}'

REGISTER_RESPONSE=$(test_endpoint "User Registration" "POST" "$API_BASE/api/v1/auth/register" "201" "$USER_DATA")
echo ""

# Test 4: User Login (if registration was successful)
echo "4. Testing User Login"
LOGIN_DATA='{
    "username": "integrationtest",
    "password": "password123"
}'

LOGIN_RESPONSE=$(test_endpoint "User Login" "POST" "$API_BASE/api/v1/auth/login" "200" "$LOGIN_DATA")
echo ""

# Test 5: Invalid Login
echo "5. Testing Invalid Login"
INVALID_LOGIN_DATA='{
    "username": "nonexistentuser",
    "password": "wrongpassword"
}'

test_endpoint "Invalid Login" "POST" "$API_BASE/api/v1/auth/login" "401" "$INVALID_LOGIN_DATA"
echo ""

# Test 6: Protected Endpoint (Profile) - Extract token from login response
echo "6. Testing Protected Endpoint"
if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    test_endpoint "Get Profile" "GET" "$API_BASE/api/v1/profile" "200" "" "Authorization: Bearer $TOKEN"
else
    log_test "Get Profile" "FAIL" "No token available from login"
fi
echo ""

# Test 7: API Documentation/Routes
echo "7. Testing API Routes Availability"
test_endpoint "Posts Endpoint" "GET" "$API_BASE/api/v1/posts/" "401"  # Should be unauthorized without token
test_endpoint "Users Endpoint" "GET" "$API_BASE/api/v1/users/" "401"  # Should be unauthorized without token
echo ""

# Test 8: CORS Headers
echo "8. Testing CORS Configuration"
CORS_RESPONSE=$(curl -s -I -X OPTIONS "$API_BASE/api/v1/auth/login" \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type")

if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    log_test "CORS Headers" "PASS" "CORS headers present"
else
    log_test "CORS Headers" "FAIL" "CORS headers missing"
fi
echo ""

# Test 9: Infrastructure Services
echo "9. Testing Infrastructure Services"

# MinIO
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:9001" | grep -q "200"; then
    log_test "MinIO Console" "PASS" "MinIO console accessible"
else
    log_test "MinIO Console" "FAIL" "MinIO console not accessible"
fi

# Redis (simple connection test)
if command -v redis-cli >/dev/null 2>&1; then
    if redis-cli -h localhost -p 6379 ping | grep -q "PONG"; then
        log_test "Redis Connection" "PASS" "Redis is responding"
    else
        log_test "Redis Connection" "FAIL" "Redis is not responding"
    fi
else
    log_test "Redis Connection" "SKIP" "redis-cli not available"
fi

# NATS (check if port is open)
if nc -z localhost 4222 2>/dev/null; then
    log_test "NATS Connection" "PASS" "NATS port is open"
else
    log_test "NATS Connection" "FAIL" "NATS port is not accessible"
fi
echo ""

# Test 10: Performance Test (Simple)
echo "10. Basic Performance Test"
start_time=$(date +%s%N)
for i in {1..5}; do
    curl -s "$API_BASE/health" > /dev/null
done
end_time=$(date +%s%N)
duration=$((($end_time - $start_time) / 1000000))  # Convert to milliseconds

if [ $duration -lt 1000 ]; then  # Less than 1 second for 5 requests
    log_test "Performance Test" "PASS" "5 health checks completed in ${duration}ms"
else
    log_test "Performance Test" "FAIL" "5 health checks took ${duration}ms (>1000ms)"
fi
echo ""

# Summary
echo "Integration Test Summary"
echo "======================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total Tests: $(($TESTS_PASSED + $TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! 🎉${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please check the output above.${NC}"
    exit 1
fi
