# Frontend v2 API Migration Plan

## Current Architecture
- Frontend menggunakan Next.js 14 dengan App Router
- API client layer di `frontend/src/lib/api-legacy.ts` dan `frontend/src/lib/backend.ts`
- Komponen menggunakan API melalui Next.js API routes (`/api/*`) yang proxy ke backend
- Backend sudah memiliki v2 endpoints yang siap digunakan

## Migration Strategy

### Phase 1: Update API Client Layer ✅ (In Progress)
1. **Create v2 API client functions** - Update `backend.ts` dengan v2 functions
2. **Update legacy API functions** - Migrate `api-legacy.ts` ke v2 endpoints
3. **Maintain backward compatibility** - Ensure existing components still work

### Phase 2: Update Next.js API Routes
4. **Update proxy routes** - Change `/api/*` routes to use v2 backend endpoints
5. **Test API route functionality** - Ensure all routes work with v2

### Phase 3: Update Frontend Components  
6. **Update component API calls** - Change components to use v2 API functions
7. **Test component functionality** - Ensure UI works correctly

## API Endpoints Mapping

### ✅ **Core & Users** (v2 Available)
- `/api/v2/core/health` - Health check
- `/api/v2/users/me` - Get current user
- `/api/v2/users/auth/login` - JWT login
- `/api/v2/users/auth/refresh` - JWT refresh
- `/api/v2/users/logout` - Logout
- `/api/v2/users/groups` - User groups

### ✅ **Employees** (v2 Available)  
- `/api/v2/employees/employees` - Employee list
- `/api/v2/employees/divisions` - Division list
- `/api/v2/employees/positions` - Position list

### ✅ **Attendance** (v2 Available)
- `/api/v2/attendance/attendance` - Attendance records
- `/api/v2/attendance/supervisor/team-attendance` - Supervisor team attendance
- `/api/v2/attendance/supervisor/team-attendance/pdf` - PDF export

### ✅ **Overtime** (v2 Available)
- `/api/v2/overtime/overtime` - Overtime requests
- `/api/v2/overtime/monthly-summary` - Monthly summary requests
- `/api/v2/overtime/overtime/export_monthly_pdf` - Monthly PDF export
- `/api/v2/overtime/overtime/export_list_pdf` - List PDF export

### ✅ **Settings** (v2 Available)
- `/api/v2/settings/holidays` - Holiday management
- `/api/v2/settings/work-settings` - Work settings (needs fixing)

### ✅ **Corrections & Reports** (v2 Available)
- `/api/v2/corrections/corrections` - Attendance corrections
- `/api/v2/reporting/reports` - Reports

## Priority Components to Update

### High Priority (Daily Use)
1. **TodayAttendance.tsx** - Uses multiple attendance APIs
2. **AttendanceWidget.tsx** - Check-in/out functionality  
3. **Login page** - Authentication
4. **Employee dashboard** - User profile and data

### Medium Priority (Admin/Supervisor)
5. **Supervisor attendance pages** - Team management
6. **Admin user management** - User administration
7. **Overtime management** - Request handling
8. **Reports generation** - PDF exports

### Low Priority (Settings/Config)
9. **Settings pages** - Configuration
10. **Holiday management** - Calendar setup

## Implementation Steps

### Step 1: Create v2 API Client ✅ (Next)
```typescript
// In backend.ts - Add v2 specific functions
export const v2Api = {
  // Core
  health: () => v2Fetch('/core/health'),
  
  // Users  
  me: () => v2Fetch('/users/me'),
  login: (credentials) => v2Fetch('/users/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  
  // Employees
  getEmployees: (filters) => v2Fetch(`/employees/employees?${new URLSearchParams(filters)}`),
  getDivisions: () => v2Fetch('/employees/divisions'),
  getPositions: () => v2Fetch('/employees/positions'),
  
  // Attendance
  getAttendance: (filters) => v2Fetch(`/attendance/attendance?${new URLSearchParams(filters)}`),
  getSupervisorTeamAttendance: () => v2Fetch('/attendance/supervisor/team-attendance'),
  
  // Overtime
  getOvertimeRequests: (filters) => v2Fetch(`/overtime/overtime?${new URLSearchParams(filters)}`),
  getMonthlySummaryRequests: (filters) => v2Fetch(`/overtime/monthly-summary?${new URLSearchParams(filters)}`),
  
  // Settings
  getHolidays: () => v2Fetch('/settings/holidays'),
  getWorkSettings: () => v2Fetch('/settings/work-settings'),
  
  // Corrections & Reports
  getCorrections: (filters) => v2Fetch(`/corrections/corrections?${new URLSearchParams(filters)}`),
  getReports: (filters) => v2Fetch(`/reporting/reports?${new URLSearchParams(filters)}`)
}
```

### Step 2: Update API Routes to use v2
Update Next.js API routes di `frontend/src/app/api/*` untuk menggunakan v2 endpoints

### Step 3: Update Components Gradually  
Mulai dari komponen yang paling sering digunakan seperti TodayAttendance

## Testing Plan
1. **API Client Testing** - Test semua v2 functions
2. **Integration Testing** - Test API routes dengan v2 backend  
3. **Component Testing** - Test UI components dengan v2 data
4. **End-to-End Testing** - Test complete user workflows

## Rollback Plan
- Keep legacy API functions as fallback
- Use feature flags untuk switch antara v1/v2
- Monitor errors dan performance

## Success Criteria
- ✅ All v2 endpoints working correctly
- ✅ No breaking changes for existing functionality  
- ✅ Improved performance and maintainability
- ✅ Complete test coverage
