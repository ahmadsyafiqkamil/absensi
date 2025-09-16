# FRONTEND MIGRATION PLAN: Legacy to V2 API

## 🎯 MIGRATION STRATEGY

### Systematic Module-by-Module Migration
Migrate frontend secara bertahap per modul untuk meminimalisir risiko.

## 📋 MIGRATION SCHEDULE

### Week 1: Authentication & Core
### Week 2: User & Employee Management  
### Week 3: Attendance System
### Week 4: Overtime & Corrections
### Week 5: Testing & Cleanup

---

## 🔧 WEEK 1: AUTHENTICATION & CORE MIGRATION

### 1.1 Update Backend Configuration (lib/backend.ts)
```typescript
// Update API version configuration
export const API_VERSIONS = {
  LEGACY: '/api',
  V2: '/api/v2'  // This stays the same
} as const

// Update default version to V2
export const DEFAULT_API_VERSION: ApiVersion = 'V2'  // Change from 'LEGACY'
```

### 1.2 Authentication Endpoints Migration

#### Files to Update:
- `frontend/src/app/api/auth/login/route.ts`
- `frontend/src/app/api/auth/logout/route.ts` 
- `frontend/src/app/api/auth/me/route.ts`
- `frontend/src/lib/backend.ts`

#### Changes:
```typescript
// OLD (Legacy)
const url = `${backendUrl}/api/auth/login`

// NEW (V2)
const url = `${backendUrl}/api/v2/auth/login/`
```

### 1.3 Update Authentication Functions
```typescript
// In lib/backend.ts
export async function loginRequest(username: string, password: string) {
  const backendUrl = getBackendBaseUrl()
  const url = `${backendUrl}/api/v2/auth/login/`  // Updated to V2
  
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    cache: 'no-store'
  })
  
  // ... rest stays the same
}

export async function meRequest(accessToken: string) {
  const resp = await backendFetch('/auth/me/', {  // Updated path
    headers: { Authorization: `Bearer ${accessToken}` },
  }, 'V2')  // Use V2 version
  const data = await resp.json().catch(() => ({}))
  return { resp, data }
}
```

### 1.4 Testing Week 1
```bash
# Test authentication flow
npm run test:auth
# Manual testing
curl -X POST http://localhost:3000/api/auth/login
```

---

## 🔧 WEEK 2: USER & EMPLOYEE MANAGEMENT

### 2.1 User Management Migration

#### Files to Update:
- `frontend/src/app/api/admin/users/provision/route.ts`
- `frontend/src/app/admin/add-user/page.tsx`
- `frontend/src/components/Header.tsx`

#### API Endpoint Changes:
```typescript
// OLD
fetch(`${getBackendUrl()}/api/users/provision`)

// NEW  
fetch(`${getBackendUrl()}/api/v2/users/users/provision/`)
```

### 2.2 Employee Management Migration

#### Files to Update:
- `frontend/src/app/api/admin/employees/route.ts`
- `frontend/src/app/api/admin/employees/[id]/route.ts`
- `frontend/src/app/api/admin/divisions/route.ts`
- `frontend/src/app/api/admin/positions/route.ts`
- `frontend/src/components/tables/EmployeesTable.tsx`

#### API Endpoint Changes:
```typescript
// OLD
fetch(`${backendBase}/api/admin/employees/`)
fetch(`${backendBase}/api/admin/divisions/`)
fetch(`${backendBase}/api/admin/positions/`)

// NEW
fetch(`${backendBase}/api/v2/employees/admin/employees/`)
fetch(`${backendBase}/api/v2/employees/admin/divisions/`)
fetch(`${backendBase}/api/v2/employees/admin/positions/`)
```

### 2.3 Employee Info Components
```typescript
// In components/Header.tsx
async function loadFullname() {
  try {
    // OLD
    const legacyResp = await fetch('/api/employee/employees', { cache: 'no-store' });
    
    // NEW
    const v2Resp = await fetch('/api/v2/employees/employees/', { cache: 'no-store' });
    
    // ... update logic
  }
}
```

### 2.4 Testing Week 2
```bash
# Test employee management
npm run test:employees
# Test user provisioning
npm run test:users
```

---

## 🔧 WEEK 3: ATTENDANCE SYSTEM

### 3.1 Attendance Core Migration

#### Files to Update:
- `frontend/src/app/api/attendance/check-in/route.ts`
- `frontend/src/app/api/attendance/check-out/route.ts`
- `frontend/src/app/api/attendance/precheck/route.ts`
- `frontend/src/app/api/attendance/me/route.ts`
- `frontend/src/app/pegawai/AttendanceWidget.tsx`

#### API Changes:
```typescript
// OLD
fetch(`${backend}/api/attendance/check-in`)
fetch(`${backend}/api/attendance/precheck`)

// NEW
fetch(`${backend}/api/v2/attendance/attendance/check_in/`)
fetch(`${backend}/api/v2/attendance/attendance/precheck/`)
```

### 3.2 Attendance Reports Migration

#### Files to Update:
- `frontend/src/app/pegawai/TodayAttendance.tsx`
- `frontend/src/app/pegawai/attendance-report/page.tsx`
- `frontend/src/app/supervisor/team-attendance/route.ts`

#### API Changes:
```typescript
// OLD
fetch(`/api/attendance/me${q}&page=1&page_size=1`)
fetch('/api/employee/settings/work')

// NEW  
fetch(`/api/v2/attendance/attendance/${q}&page=1&page_size=1`)
fetch('/api/v2/settings/work/')
```

### 3.3 Supervisor Attendance Features
```typescript
// In supervisor components
// OLD
fetch('/api/supervisor/team-attendance')

// NEW
fetch('/api/v2/attendance/supervisor/attendance/')
```

### 3.4 Testing Week 3
```bash
# Test attendance check-in/out
npm run test:attendance
# Test supervisor features
npm run test:supervisor
```

---

## 🔧 WEEK 4: OVERTIME & CORRECTIONS

### 4.1 Overtime Management Migration

#### Files to Update:
- `frontend/src/app/api/overtime-requests/route.ts`
- `frontend/src/app/api/overtime/report/route.ts`
- `frontend/src/app/pegawai/OvertimeRequestsManager.tsx`
- `frontend/src/app/supervisor/overtime-requests/OvertimeRequestsTable.tsx`

#### API Changes:
```typescript
// OLD
fetch(`${BACKEND_URL}/api/overtime-requests/`)
fetch(`${backend}/api/overtime/report`)

// NEW
fetch(`${BACKEND_URL}/api/v2/overtime/overtime/`)
fetch(`${backend}/api/v2/overtime/my-overtime/`)
```

### 4.2 Corrections Migration

#### Files to Update:
- `frontend/src/app/api/attendance-corrections/route.ts`
- `frontend/src/app/pegawai/corrections/page.tsx`
- `frontend/src/app/supervisor/approvals/page.tsx`

#### API Changes:
```typescript
// OLD
fetch('/api/attendance-corrections?status=pending')
fetch('/api/attendance/corrections/request')

// NEW
fetch('/api/v2/corrections/pending/')
fetch('/api/v2/corrections/corrections/')
```

### 4.3 Monthly Summary Migration

#### Files to Update:
- `frontend/src/app/api/employee/monthly-summary-requests/route.ts`
- `frontend/src/app/api/supervisor/monthly-summary-requests/route.ts`

#### API Changes:
```typescript
// OLD
fetch(`${BACKEND_URL}/api/employee/monthly-summary-requests/`)

// NEW
fetch(`${BACKEND_URL}/api/v2/overtime/monthly-summary/`)
```

### 4.4 Testing Week 4
```bash
# Test overtime system
npm run test:overtime
# Test corrections system  
npm run test:corrections
```

---

## 🔧 WEEK 5: TESTING & CLEANUP

### 5.1 Settings & Configuration Migration

#### Files to Update:
- `frontend/src/app/api/admin/settings/work/route.ts`
- `frontend/src/app/api/admin/settings/holidays/route.ts`
- `frontend/src/app/admin/settings/settingsClient.tsx`

#### API Changes:
```typescript
// OLD
fetch(`${chk.backendBase}/api/admin/settings/work/`)
fetch(`${chk.backendBase}/api/settings/holidays/`)

// NEW
fetch(`${chk.backendBase}/api/v2/settings/admin/work/`)
fetch(`${chk.backendBase}/api/v2/settings/admin/holidays/`)
```

### 5.2 Reporting Migration

#### Files to Update:
- `frontend/src/app/api/attendance/report/pdf/route.ts`
- `frontend/src/components/ApiStatusCheck.tsx`

#### API Changes:
```typescript
// Update API status check endpoints
const endpoints = [
  { name: 'Employees API', url: '/api/v2/employees/employees/', status: 'checking' },
  { name: 'Settings API', url: '/api/v2/settings/work/', status: 'checking' },
  { name: 'Attendance API', url: '/api/v2/attendance/attendance/', status: 'checking' },
  { name: 'Corrections API', url: '/api/v2/corrections/corrections/', status: 'checking' },
  { name: 'Overtime API', url: '/api/v2/overtime/overtime/', status: 'checking' },
  { name: 'Reporting API', url: '/api/v2/reporting/reports/', status: 'checking' },
]
```

### 5.3 Comprehensive Testing
```bash
# Run full test suite
npm run test:all

# E2E testing
npm run test:e2e

# Performance testing
npm run test:performance

# Manual testing checklist
npm run test:manual
```

### 5.4 Legacy Code Removal
```bash
# Remove unused legacy API calls
grep -r "/api/" frontend/src --exclude-dir=node_modules
# Should only show V2 endpoints

# Remove unused imports
npm run lint:fix
```

---

## 🔧 IMPLEMENTATION TOOLS & SCRIPTS

### Migration Helper Script
```bash
#!/bin/bash
# migrate-endpoints.sh

# Find and replace Legacy endpoints with V2
find frontend/src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|/api/auth/login|/api/v2/auth/login/|g'
find frontend/src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|/api/auth/me|/api/v2/auth/me/|g'
find frontend/src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|/api/employees/|/api/v2/employees/employees/|g'
# ... add more replacements

echo "✅ Endpoint migration completed"
```

### Testing Script
```bash
#!/bin/bash
# test-migration.sh

echo "🧪 Testing V2 API endpoints..."

# Test authentication
curl -X POST http://localhost:8000/api/v2/auth/login/ -d '{"username":"test","password":"test"}'

# Test employees
curl -X GET http://localhost:8000/api/v2/employees/employees/

# Test attendance  
curl -X GET http://localhost:8000/api/v2/attendance/attendance/

echo "✅ All endpoints tested"
```

### Validation Script
```typescript
// validate-migration.ts
import { execSync } from 'child_process';

const legacyEndpoints = [
  '/api/auth/login',
  '/api/employees/',
  '/api/attendance/',
];

const checkForLegacyEndpoints = () => {
  legacyEndpoints.forEach(endpoint => {
    try {
      const result = execSync(`grep -r "${endpoint}" frontend/src --exclude-dir=node_modules`);
      if (result.toString()) {
        console.error(`❌ Found legacy endpoint: ${endpoint}`);
        process.exit(1);
      }
    } catch (e) {
      // No matches found - good!
    }
  });
  
  console.log('✅ No legacy endpoints found');
};

checkForLegacyEndpoints();
```

## 📊 PROGRESS TRACKING

### Migration Checklist
- [ ] Week 1: Authentication & Core ✅
- [ ] Week 2: User & Employee Management 
- [ ] Week 3: Attendance System
- [ ] Week 4: Overtime & Corrections
- [ ] Week 5: Testing & Cleanup

### Success Metrics
- [ ] All tests passing
- [ ] No legacy API calls remaining
- [ ] Performance maintained/improved
- [ ] All features working correctly
- [ ] Documentation updated

## 🚨 ROLLBACK PLAN

If migration fails at any point:
1. **Stop migration immediately**
2. **Revert to git backup**: `git checkout migration-backup-branch`
3. **Restore database**: `python manage.py loaddata backup.json`
4. **Restart services**: `docker-compose restart`
5. **Investigate issues** before retry

## 📞 NEXT STEPS

1. **Start with Week 1** (Authentication)
2. **Test thoroughly** after each week
3. **Document any issues** encountered
4. **Adjust timeline** if needed
5. **Celebrate success** when complete! 🎉
