#!/bin/bash
# Monitoring Endpoints Demonstration Script
# This script tests all the monitoring endpoints to verify functionality

BASE_URL="${BASE_URL:-http://localhost:5000}"

echo "========================================"
echo "CodeReview Monitoring Endpoints Demo"
echo "========================================"
echo ""
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Health Check
echo "1. Testing Health Check Endpoint..."
echo "   GET $BASE_URL/health"
echo ""
curl -s "$BASE_URL/health" | jq '.' || curl -s "$BASE_URL/health"
echo ""
echo ""

# Test 2: Readiness Check
echo "2. Testing Readiness Check (Kubernetes)..."
echo "   GET $BASE_URL/health/ready"
echo ""
curl -s "$BASE_URL/health/ready" | jq '.' || curl -s "$BASE_URL/health/ready"
echo ""
echo ""

# Test 3: Liveness Check
echo "3. Testing Liveness Check (Kubernetes)..."
echo "   GET $BASE_URL/health/live"
echo ""
curl -s "$BASE_URL/health/live" | jq '.' || curl -s "$BASE_URL/health/live"
echo ""
echo ""

# Test 4: Database Metrics
echo "4. Testing Database Metrics Endpoint..."
echo "   GET $BASE_URL/api/database-metrics"
echo ""
curl -s "$BASE_URL/api/database-metrics" | jq '.' || curl -s "$BASE_URL/api/database-metrics"
echo ""
echo ""

# Test 5: Database Stress Test
echo "5. Testing Database Stress Test Endpoint..."
echo "   POST $BASE_URL/api/database-stress-test"
echo "   Parameters: {concurrentQueries: 5, duration: 3000, queryDelay: 50}"
echo ""
curl -s -X POST "$BASE_URL/api/database-stress-test" \
  -H "Content-Type: application/json" \
  -d '{"concurrentQueries": 5, "duration": 3000, "queryDelay": 50}' | jq '.' || \
curl -s -X POST "$BASE_URL/api/database-stress-test" \
  -H "Content-Type: application/json" \
  -d '{"concurrentQueries": 5, "duration": 3000, "queryDelay": 50}'
echo ""
echo ""

# Test 6: Legacy Health Check
echo "6. Testing Legacy Health Check Endpoint..."
echo "   GET $BASE_URL/api/health"
echo ""
curl -s "$BASE_URL/api/health" | jq '.' || curl -s "$BASE_URL/api/health"
echo ""
echo ""

# Test 7: Database Health Check
echo "7. Testing Database Health Check Endpoint..."
echo "   GET $BASE_URL/api/db-health"
echo ""
curl -s "$BASE_URL/api/db-health" | jq '.' || curl -s "$BASE_URL/api/db-health"
echo ""
echo ""

echo "========================================"
echo "All tests completed!"
echo "========================================"
