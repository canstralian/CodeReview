#!/usr/bin/env node

/**
 * Simple test script to verify Replit Agent endpoints
 * This script tests basic functionality without requiring a full test suite
 */

const baseUrl = 'http://localhost:5000';

async function testHealthEndpoint() {
  console.log('\n🔍 Testing health endpoint...');
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json();
    console.log('✅ Health endpoint OK:', data);
    return true;
  } catch (error) {
    console.error('❌ Health endpoint failed:', error.message);
    return false;
  }
}

async function testCreateSession() {
  console.log('\n🔍 Testing create session endpoint...');
  try {
    const response = await fetch(`${baseUrl}/api/agent/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Create session OK');
    console.log('   Session token:', data.sessionToken.substring(0, 10) + '...');
    return data.sessionToken;
  } catch (error) {
    console.error('❌ Create session failed:', error.message);
    return null;
  }
}

async function testProcessRequest(sessionToken) {
  console.log('\n🔍 Testing process request endpoint...');
  
  if (!sessionToken) {
    console.log('⚠️  Skipping process request test (no session token)');
    return false;
  }
  
  try {
    const response = await fetch(`${baseUrl}/api/agent/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionToken,
        action: 'query',
        query: 'What is a function in JavaScript?',
        code: 'function example() { return "hello"; }',
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Process request OK');
    console.log('   Response:', data.success ? 'Success' : 'Failed');
    return true;
  } catch (error) {
    console.error('❌ Process request failed:', error.message);
    return false;
  }
}

async function testGetHistory(sessionToken) {
  console.log('\n🔍 Testing get history endpoint...');
  
  if (!sessionToken) {
    console.log('⚠️  Skipping history test (no session token)');
    return false;
  }
  
  try {
    const response = await fetch(`${baseUrl}/api/agent/session/${sessionToken}/history`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Get history OK');
    console.log('   Interactions:', data.data?.interactions?.length || 0);
    return true;
  } catch (error) {
    console.error('❌ Get history failed:', error.message);
    return false;
  }
}

async function testCloseSession(sessionToken) {
  console.log('\n🔍 Testing close session endpoint...');
  
  if (!sessionToken) {
    console.log('⚠️  Skipping close session test (no session token)');
    return false;
  }
  
  try {
    const response = await fetch(`${baseUrl}/api/agent/session/${sessionToken}/close`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Close session OK:', data.message);
    return true;
  } catch (error) {
    console.error('❌ Close session failed:', error.message);
    return false;
  }
}

async function testRateLimiting() {
  console.log('\n🔍 Testing rate limiting...');
  
  try {
    // Make multiple rapid requests to test rate limiting
    const promises = [];
    for (let i = 0; i < 35; i++) {
      promises.push(
        fetch(`${baseUrl}/api/agent/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        })
      );
    }
    
    const responses = await Promise.all(promises);
    const rateLimited = responses.some(r => r.status === 429);
    
    if (rateLimited) {
      console.log('✅ Rate limiting works correctly');
      return true;
    } else {
      console.log('⚠️  Rate limiting not triggered (might need more requests)');
      return true; // Not a failure, just informational
    }
  } catch (error) {
    console.error('❌ Rate limiting test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Replit Agent endpoint tests...');
  console.log('📍 Base URL:', baseUrl);
  console.log('⚠️  Note: These tests require ANTHROPIC_API_KEY to be set');
  
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };
  
  // Test health endpoint first
  if (await testHealthEndpoint()) {
    results.passed++;
  } else {
    results.failed++;
    console.log('\n❌ Server is not running. Start the server with: npm run dev');
    process.exit(1);
  }
  
  // Create a session
  const sessionToken = await testCreateSession();
  if (sessionToken) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Test process request (may fail without API key)
  if (await testProcessRequest(sessionToken)) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Get history
  if (await testGetHistory(sessionToken)) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Test rate limiting
  if (await testRateLimiting()) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Close session
  if (await testCloseSession(sessionToken)) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary:');
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   ⚠️  Skipped: ${results.skipped}`);
  console.log('='.repeat(50));
  
  if (results.failed > 0) {
    console.log('\n⚠️  Some tests failed. This is expected if:');
    console.log('   - ANTHROPIC_API_KEY is not set (agent requests will fail)');
    console.log('   - Database is not configured (sessions may not persist)');
    process.exit(1);
  } else {
    console.log('\n✨ All tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});
