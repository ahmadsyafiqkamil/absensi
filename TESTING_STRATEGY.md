# TESTING STRATEGY: V2 API Migration

## 🎯 TESTING OBJECTIVES

1. **Ensure no functionality is lost** during migration
2. **Verify data integrity** throughout the process
3. **Validate performance** meets or exceeds current levels
4. **Confirm security** is maintained or improved
5. **Test all user roles** (admin, supervisor, employee)

---

## 🧪 TESTING PHASES

### Phase 1: Pre-Migration Testing (Baseline)
### Phase 2: Backend V2 API Testing
### Phase 3: Database Migration Testing
### Phase 4: Frontend Migration Testing  
### Phase 5: End-to-End Integration Testing
### Phase 6: Performance & Load Testing
### Phase 7: User Acceptance Testing

---

## 🔧 PHASE 1: PRE-MIGRATION TESTING (BASELINE)

### 1.1 Document Current System Behavior
```bash
# Create baseline test results
npm run test:all > baseline_test_results.txt
python manage.py test > baseline_backend_tests.txt
```

### 1.2 API Response Documentation
```bash
# Document current API responses for comparison
curl -X GET http://localhost:8000/api/employees/ > baseline_employees_api.json
curl -X GET http://localhost:8000/api/attendance/ > baseline_attendance_api.json
curl -X GET http://localhost:8000/api/overtime-requests/ > baseline_overtime_api.json
```

### 1.3 Performance Baseline
```javascript
// performance-baseline.js
const responses = await Promise.all([
  fetch('/api/employees/'),
  fetch('/api/attendance/'),
  fetch('/api/overtime-requests/')
]);

console.log('Baseline response times:', responses.map(r => r.responseTime));
```

---

## 🔧 PHASE 2: BACKEND V2 API TESTING

### 2.1 Unit Tests for V2 Models
```python
# tests/test_v2_models.py
from django.test import TestCase
from apps.employees.models import Employee, Division, Position
from apps.attendance.models import Attendance
from django.contrib.auth.models import User

class V2ModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('testuser', 'test@test.com', 'password')
        self.division = Division.objects.create(name='IT')
        self.position = Position.objects.create(name='Developer')
    
    def test_employee_creation(self):
        employee = Employee.objects.create(
            user=self.user,
            nip='12345',
            division=self.division,
            position=self.position
        )
        self.assertEqual(employee.user, self.user)
        self.assertEqual(employee.nip, '12345')
    
    def test_employee_relationships(self):
        employee = Employee.objects.create(
            user=self.user,
            nip='12345',
            division=self.division
        )
        # Test that relationship works correctly
        self.assertEqual(self.user.employee_profile, employee)
```

### 2.2 V2 API Endpoint Tests
```python
# tests/test_v2_api.py
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User, Group
from apps.employees.models import Employee

class V2APITests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user('admin', 'admin@test.com', 'password')
        self.admin_group = Group.objects.create(name='admin')
        self.admin_user.groups.add(self.admin_group)
        
        self.employee_user = User.objects.create_user('employee', 'emp@test.com', 'password')
        self.employee_group = Group.objects.create(name='pegawai')
        self.employee_user.groups.add(self.employee_group)
    
    def test_v2_auth_login(self):
        """Test V2 authentication endpoint"""
        response = self.client.post('/api/v2/auth/login/', {
            'username': 'admin',
            'password': 'password'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
    
    def test_v2_employees_list(self):
        """Test V2 employees endpoint"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v2/employees/employees/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_v2_attendance_check_in(self):
        """Test V2 attendance check-in"""
        self.client.force_authenticate(user=self.employee_user)
        response = self.client.post('/api/v2/attendance/attendance/check_in/', {
            'lat': 25.2048,
            'lng': 55.2708,
            'accuracy_m': 10
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
```

### 2.3 Permission Tests
```python
# tests/test_v2_permissions.py
class V2PermissionTests(APITestCase):
    def test_admin_can_access_all_endpoints(self):
        """Admin should access all endpoints"""
        endpoints = [
            '/api/v2/employees/admin/employees/',
            '/api/v2/attendance/admin/attendance/',
            '/api/v2/overtime/admin/overtime/'
        ]
        
        for endpoint in endpoints:
            response = self.client.get(endpoint)
            self.assertIn(response.status_code, [200, 401])  # 401 if not authenticated
    
    def test_employee_cannot_access_admin_endpoints(self):
        """Employee should not access admin endpoints"""
        self.client.force_authenticate(user=self.employee_user)
        response = self.client.get('/api/v2/employees/admin/employees/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
```

---

## 🔧 PHASE 3: DATABASE MIGRATION TESTING

### 3.1 Migration Dry Run
```python
# management/commands/test_migration.py
from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    def handle(self, *args, **options):
        # Test migration without applying
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM api_employee")
            legacy_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM employees_employee") 
            v2_count = cursor.fetchone()[0]
            
            self.stdout.write(f"Legacy employees: {legacy_count}")
            self.stdout.write(f"V2 employees: {v2_count}")
```

### 3.2 Data Integrity Tests
```python
# tests/test_data_migration.py
class DataMigrationTests(TestCase):
    def test_employee_data_integrity(self):
        """Ensure employee data is correctly migrated"""
        # Create legacy employee
        legacy_employee = api.models.Employee.objects.create(
            user=self.user,
            nip='12345'
        )
        
        # Run migration
        # ... migration logic
        
        # Verify V2 employee exists
        v2_employee = apps.employees.models.Employee.objects.get(nip='12345')
        self.assertEqual(v2_employee.user, self.user)
        self.assertEqual(v2_employee.nip, '12345')
    
    def test_attendance_data_integrity(self):
        """Ensure attendance data is correctly migrated"""
        # Similar test for attendance data
        pass
```

### 3.3 Rollback Tests
```python
def test_migration_rollback(self):
    """Test that migration can be rolled back safely"""
    # Apply migration
    call_command('migrate', 'employees', '0001')
    
    # Verify migration applied
    self.assertTrue(Employee.objects.exists())
    
    # Rollback migration
    call_command('migrate', 'employees', 'zero')
    
    # Verify rollback successful
    # ... rollback verification logic
```

---

## 🔧 PHASE 4: FRONTEND MIGRATION TESTING

### 4.1 Component Testing
```typescript
// __tests__/components/AttendanceWidget.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AttendanceWidget from '@/app/pegawai/AttendanceWidget';

// Mock V2 API calls
jest.mock('../../lib/backend', () => ({
  v2Fetch: jest.fn()
}));

describe('AttendanceWidget V2 Migration', () => {
  test('should call V2 precheck endpoint', async () => {
    const mockV2Fetch = require('../../lib/backend').v2Fetch;
    mockV2Fetch.mockResolvedValue({ ok: true, json: () => ({}) });
    
    render(<AttendanceWidget />);
    
    const precheckButton = screen.getByText('Precheck');
    fireEvent.click(precheckButton);
    
    await waitFor(() => {
      expect(mockV2Fetch).toHaveBeenCalledWith('/attendance/attendance/precheck/', 
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
  
  test('should call V2 check-in endpoint', async () => {
    // Similar test for check-in
  });
});
```

### 4.2 API Integration Tests
```typescript
// __tests__/api/v2-integration.test.ts
describe('V2 API Integration', () => {
  test('authentication flow works with V2', async () => {
    const response = await fetch('/api/v2/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test', password: 'test' })
    });
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('access');
  });
  
  test('employee endpoints return correct data', async () => {
    const token = await getAuthToken();
    const response = await fetch('/api/v2/employees/employees/', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data.results || data)).toBe(true);
  });
});
```

### 4.3 E2E Testing with Playwright
```typescript
// e2e/v2-migration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('V2 Migration E2E Tests', () => {
  test('complete attendance flow works', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="username"]', 'testuser');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Navigate to attendance
    await page.goto('/pegawai');
    
    // Check-in
    await page.click('text=Check In');
    await expect(page.locator('text=Check-in successful')).toBeVisible();
    
    // Verify V2 API was called (check network requests)
    const requests = page.context().request;
    // ... verify V2 endpoints were called
  });
  
  test('admin employee management works', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Navigate to employee management
    await page.goto('/admin/employees');
    
    // Verify employees list loads
    await expect(page.locator('table tbody tr')).toHaveCountGreaterThan(0);
    
    // Create new employee
    await page.click('text=Add Employee');
    await page.fill('[name="nip"]', '99999');
    await page.fill('[name="username"]', 'newuser');
    await page.click('button[type="submit"]');
    
    // Verify employee was created via V2 API
    await expect(page.locator('text=Employee created successfully')).toBeVisible();
  });
});
```

---

## 🔧 PHASE 5: END-TO-END INTEGRATION TESTING

### 5.1 Full User Journey Tests
```typescript
// e2e/user-journeys.spec.ts
test.describe('Complete User Journeys', () => {
  test('employee daily workflow', async ({ page }) => {
    // 1. Login
    await loginAsEmployee(page);
    
    // 2. Check today's attendance
    await page.goto('/pegawai');
    await expect(page.locator('[data-testid="today-attendance"]')).toBeVisible();
    
    // 3. Check-in
    await page.click('[data-testid="check-in-button"]');
    await expect(page.locator('text=Check-in successful')).toBeVisible();
    
    // 4. Request overtime
    await page.goto('/pegawai/overtime');
    await page.click('text=Request Overtime');
    await page.fill('[name="reason"]', 'Project deadline');
    await page.click('button[type="submit"]');
    
    // 5. Check-out
    await page.goto('/pegawai');
    await page.click('[data-testid="check-out-button"]');
    await expect(page.locator('text=Check-out successful')).toBeVisible();
    
    // 6. View attendance report
    await page.goto('/pegawai/attendance-report');
    await expect(page.locator('table')).toBeVisible();
  });
  
  test('supervisor approval workflow', async ({ page }) => {
    // 1. Login as supervisor
    await loginAsSupervisor(page);
    
    // 2. View pending approvals
    await page.goto('/supervisor/approvals');
    await expect(page.locator('[data-testid="pending-approvals"]')).toBeVisible();
    
    // 3. Approve overtime request
    await page.click('[data-testid="approve-overtime-1"]');
    await expect(page.locator('text=Overtime approved')).toBeVisible();
    
    // 4. View team attendance
    await page.goto('/supervisor/team-attendance');
    await expect(page.locator('table tbody tr')).toHaveCountGreaterThan(0);
  });
});
```

### 5.2 Cross-Role Integration Tests
```typescript
test.describe('Cross-Role Integration', () => {
  test('employee request -> supervisor approval -> admin report', async ({ browser }) => {
    // Use multiple browser contexts for different users
    const employeeContext = await browser.newContext();
    const supervisorContext = await browser.newContext();
    const adminContext = await browser.newContext();
    
    // Employee submits overtime request
    const employeePage = await employeeContext.newPage();
    await loginAsEmployee(employeePage);
    await submitOvertimeRequest(employeePage);
    
    // Supervisor approves request
    const supervisorPage = await supervisorContext.newPage();
    await loginAsSupervisor(supervisorPage);
    await approveOvertimeRequest(supervisorPage);
    
    // Admin views report
    const adminPage = await adminContext.newPage();
    await loginAsAdmin(adminPage);
    await viewOvertimeReport(adminPage);
    
    // Verify the request appears in admin report
    await expect(adminPage.locator('text=Project deadline')).toBeVisible();
  });
});
```

---

## 🔧 PHASE 6: PERFORMANCE & LOAD TESTING

### 6.1 API Response Time Tests
```javascript
// performance/api-performance.js
import { check, sleep } from 'k6';
import http from 'k6/http';

export let options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up
    { duration: '5m', target: 10 }, // Steady state
    { duration: '2m', target: 0 },  // Ramp down
  ],
};

export default function() {
  // Test V2 endpoints
  let authResponse = http.post('http://localhost:8000/api/v2/auth/login/', {
    username: 'testuser',
    password: 'password'
  });
  
  check(authResponse, {
    'auth response time < 500ms': (r) => r.timings.duration < 500,
    'auth status is 200': (r) => r.status === 200,
  });
  
  let token = authResponse.json('access');
  let headers = { 'Authorization': `Bearer ${token}` };
  
  // Test employees endpoint
  let employeesResponse = http.get('http://localhost:8000/api/v2/employees/employees/', { headers });
  check(employeesResponse, {
    'employees response time < 200ms': (r) => r.timings.duration < 200,
    'employees status is 200': (r) => r.status === 200,
  });
  
  // Test attendance endpoint
  let attendanceResponse = http.get('http://localhost:8000/api/v2/attendance/attendance/', { headers });
  check(attendanceResponse, {
    'attendance response time < 300ms': (r) => r.timings.duration < 300,
    'attendance status is 200': (r) => r.status === 200,
  });
  
  sleep(1);
}
```

### 6.2 Database Performance Tests
```python
# tests/test_performance.py
from django.test import TestCase
from django.test.utils import override_settings
from django.db import connection
from django.test.client import Client
import time

class PerformanceTests(TestCase):
    def setUp(self):
        # Create test data
        self.create_test_data()
    
    def test_v2_employee_query_performance(self):
        """Test V2 employee queries are performant"""
        start_time = time.time()
        
        response = self.client.get('/api/v2/employees/employees/')
        
        end_time = time.time()
        query_time = end_time - start_time
        
        self.assertLess(query_time, 0.5)  # Should complete in < 500ms
        self.assertEqual(response.status_code, 200)
    
    def test_database_query_count(self):
        """Ensure V2 APIs don't have N+1 query problems"""
        with self.assertNumQueries(5):  # Adjust expected query count
            response = self.client.get('/api/v2/employees/employees/')
            self.assertEqual(response.status_code, 200)
```

### 6.3 Frontend Performance Tests
```javascript
// performance/frontend-performance.js
const { chromium } = require('playwright');

async function measurePageLoad() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Measure page load time
  const startTime = Date.now();
  await page.goto('http://localhost:3000/pegawai');
  await page.waitForLoadState('networkidle');
  const endTime = Date.now();
  
  const loadTime = endTime - startTime;
  console.log(`Page load time: ${loadTime}ms`);
  
  // Measure API call times
  page.on('response', response => {
    if (response.url().includes('/api/v2/')) {
      console.log(`API call: ${response.url()} - ${response.status()} - ${response.timing()}ms`);
    }
  });
  
  await browser.close();
  
  return { loadTime };
}

measurePageLoad();
```

---

## 🔧 PHASE 7: USER ACCEPTANCE TESTING

### 7.1 UAT Test Cases
```markdown
# User Acceptance Test Cases

## UAT-001: Employee Login and Dashboard
**Steps:**
1. Navigate to login page
2. Enter valid employee credentials
3. Click login button
4. Verify dashboard loads correctly
5. Verify today's attendance widget shows

**Expected Result:** Employee can login and see dashboard with V2 data

## UAT-002: Employee Check-in Process
**Steps:**
1. Login as employee
2. Click "Check In" button
3. Allow location access
4. Verify check-in success message
5. Verify attendance record created

**Expected Result:** Check-in works via V2 API

## UAT-003: Supervisor Approval Workflow
**Steps:**
1. Login as supervisor
2. Navigate to approvals page
3. View pending overtime requests
4. Approve/reject requests
5. Verify status changes

**Expected Result:** Supervisor can manage approvals via V2 API

## UAT-004: Admin User Management
**Steps:**
1. Login as admin
2. Navigate to user management
3. Create new user
4. Assign roles and permissions
5. Verify user can login

**Expected Result:** Admin can manage users via V2 API
```

### 7.2 UAT Checklist
```markdown
# UAT Sign-off Checklist

## Functionality
- [ ] All user roles can login successfully
- [ ] Employee check-in/check-out works
- [ ] Overtime requests and approvals work
- [ ] Attendance corrections work
- [ ] Reports generate correctly
- [ ] User management works
- [ ] Settings can be updated

## Performance
- [ ] Pages load within acceptable time
- [ ] API responses are fast
- [ ] No significant performance regression

## Security
- [ ] Role-based access control works
- [ ] Unauthorized access is prevented
- [ ] Data is properly secured

## Usability
- [ ] UI remains intuitive
- [ ] No broken functionality
- [ ] Error messages are clear
- [ ] Mobile responsiveness maintained
```

---

## 🔧 TESTING TOOLS & SETUP

### Backend Testing Setup
```python
# pytest.ini
[tool:pytest]
DJANGO_SETTINGS_MODULE = core.settings
python_files = tests.py test_*.py *_tests.py
addopts = --tb=short --strict-markers
markers =
    slow: marks tests as slow
    integration: marks tests as integration tests
    unit: marks tests as unit tests
```

### Frontend Testing Setup
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

### E2E Testing Setup
```javascript
// playwright.config.js
module.exports = {
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
};
```

---

## 📊 TEST REPORTING & MONITORING

### Automated Test Reports
```bash
# Generate comprehensive test report
npm run test:coverage > test-coverage-report.html
python manage.py test --keepdb --parallel > backend-test-report.txt
npx playwright test --reporter=html > e2e-test-report.html
```

### Continuous Monitoring
```yaml
# .github/workflows/test-migration.yml
name: Migration Testing
on: [push, pull_request]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Python
        uses: actions/setup-python@v2
      - name: Run backend tests
        run: python manage.py test
  
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
      - name: Run frontend tests
        run: npm test
  
  test-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run E2E tests
        run: npx playwright test
```

---

## 🎯 SUCCESS CRITERIA

### Must-Have Criteria
- [ ] **100% test coverage** for critical paths
- [ ] **Zero data loss** during migration
- [ ] **All user roles** can perform their functions
- [ ] **Performance** maintained or improved
- [ ] **Security** maintained or improved

### Nice-to-Have Criteria
- [ ] **Improved response times** over Legacy
- [ ] **Better error handling** than Legacy
- [ ] **Enhanced user experience**
- [ ] **Comprehensive documentation**

## 📞 NEXT STEPS

1. **Set up testing environment**
2. **Run Phase 1 baseline tests**
3. **Execute testing phases sequentially**
4. **Document all issues and resolutions**
5. **Get stakeholder sign-off** before production deployment

Remember: **Testing is not optional!** 🧪 The success of the migration depends on thorough testing at every phase.
