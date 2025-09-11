#!/usr/bin/env node

/**
 * Simple test script untuk v2 API client
 * Usage: node test_v2_client.js
 */

// Since this is a Node.js script, we'll simulate the v2Api functions
const BASE_URL = 'http://localhost:8000/api/v2';

async function fetch(url, options = {}) {
  const { default: nodeFetch } = await import('node-fetch');
  return nodeFetch(url, options);
}

// Simulate v2Api structure
const v2Api = {
  core: {
    health: async () => {
      const response = await fetch(`${BASE_URL}/core/health`);
      return await response.json();
    }
  },

  users: {
    login: async (credentials) => {
      const response = await fetch(`${BASE_URL}/users/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      return await response.json();
    },

    me: async (token) => {
      const response = await fetch(`${BASE_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await response.json();
    },

    getCsrfToken: async () => {
      const response = await fetch(`${BASE_URL}/users/csrf-token`);
      return await response.json();
    }
  },

  employees: {
    getEmployees: async (token) => {
      const response = await fetch(`${BASE_URL}/employees/employees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await response.json();
    },

    getDivisions: async (token) => {
      const response = await fetch(`${BASE_URL}/employees/divisions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await response.json();
    }
  },

  attendance: {
    getSupervisorTeamAttendance: async (token) => {
      const response = await fetch(`${BASE_URL}/attendance/supervisor/team-attendance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await response.json();
    }
  },

  overtime: {
    getOvertimeRequests: async (token) => {
      const response = await fetch(`${BASE_URL}/overtime/overtime`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await response.json();
    }
  }
};

async function testV2Client() {
  console.log('🚀 Testing v2 API Client Functions');
  console.log('=' * 50);

  let accessToken = null;

  try {
    // Test 1: Health Check
    console.log('\n📋 Testing Core API:');
    const health = await v2Api.core.health();
    console.log('✓ Health check:', health);

    // Test 2: CSRF Token
    console.log('\n🔐 Testing Authentication:');
    const csrf = await v2Api.users.getCsrfToken();
    console.log('✓ CSRF token:', csrf);

    // Test 3: Login
    const loginResult = await v2Api.users.login({
      username: 'admin',
      password: 'admin123'
    });
    console.log('✓ Login result:', loginResult);

    if (loginResult.access) {
      accessToken = loginResult.access;
      console.log('✓ Access token obtained:', accessToken.substring(0, 20) + '...');

      // Test 4: Get current user
      const me = await v2Api.users.me(accessToken);
      console.log('✓ Current user:', me);

      // Test 5: Get employees
      console.log('\n👥 Testing Employee API:');
      const employees = await v2Api.employees.getEmployees(accessToken);
      console.log('✓ Employees count:', employees?.results?.length || 0);

      const divisions = await v2Api.employees.getDivisions(accessToken);
      console.log('✓ Divisions count:', divisions?.results?.length || 0);

      // Test 6: Supervisor attendance
      console.log('\n📅 Testing Attendance API:');
      const teamAttendance = await v2Api.attendance.getSupervisorTeamAttendance(accessToken);
      console.log('✓ Team attendance:', teamAttendance);

      // Test 7: Overtime requests
      console.log('\n⏰ Testing Overtime API:');
      const overtime = await v2Api.overtime.getOvertimeRequests(accessToken);
      console.log('✓ Overtime requests count:', overtime?.results?.length || 0);

    } else {
      console.log('❌ Login failed, cannot test protected endpoints');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n✅ v2 API Client testing completed!');
}

// Run tests
testV2Client().catch(console.error);
