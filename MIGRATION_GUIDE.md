# API MIGRATION GUIDE: Legacy to V2

## 🎯 MIGRATION MAPPING TABLE

### 🔐 Authentication & User Management
| Legacy Endpoint | V2 Endpoint | Status | Notes |
|---|---|---|---|
| `/api/auth/login` | `/api/v2/auth/login/` | ✅ Ready | JWT-based |
| `/api/auth/refresh` | `/api/v2/auth/refresh/` | ✅ Ready | JWT refresh |
| `/api/auth/me` | `/api/v2/auth/me/` | ✅ Ready | User info |
| `/api/auth/logout` | `/api/v2/auth/logout/` | ✅ Ready | Logout |
| `/api/users` | `/api/v2/users/users/` | ✅ Ready | User management |
| `/api/users/provision` | `/api/v2/users/users/provision/` | ✅ Ready | User provisioning |
| `/api/employees/me` | `/api/v2/auth/employee/me/` | ✅ Ready | Employee info |

### 👥 Employee Management
| Legacy Endpoint | V2 Endpoint | Status | Notes |
|---|---|---|---|
| `/api/divisions/` | `/api/v2/employees/divisions/` | ✅ Ready | |
| `/api/positions/` | `/api/v2/employees/positions/` | ✅ Ready | |
| `/api/employees/` | `/api/v2/employees/employees/` | ✅ Ready | |
| `/api/admin/divisions/` | `/api/v2/employees/admin/divisions/` | ✅ Ready | |
| `/api/admin/positions/` | `/api/v2/employees/admin/positions/` | ✅ Ready | |
| `/api/admin/employees/` | `/api/v2/employees/admin/employees/` | ✅ Ready | |
| `/api/supervisor/divisions/` | `/api/v2/employees/supervisor/divisions/` | ✅ Ready | |
| `/api/supervisor/employees/` | `/api/v2/employees/supervisor/employees/` | ✅ Ready | |
| `/api/employee/employees/` | `/api/v2/employees/employee/employees/` | ✅ Ready | |

### ⏰ Attendance Management
| Legacy Endpoint | V2 Endpoint | Status | Notes |
|---|---|---|---|
| `/api/attendance/` | `/api/v2/attendance/attendance/` | ✅ Ready | |
| `/api/attendance/precheck` | `/api/v2/attendance/precheck/` | 🔧 Needs Implementation | Function-based |
| `/api/attendance/check-in` | `/api/v2/attendance/check-in/` | 🔧 Needs Implementation | Function-based |
| `/api/attendance/check-out` | `/api/v2/attendance/check-out/` | 🔧 Needs Implementation | Function-based |
| `/api/attendance/report` | `/api/v2/attendance/summary/` | ✅ Ready | |
| `/api/attendance/report/pdf` | `/api/v2/reporting/reports/` | ✅ Ready | Via reporting |

### 📝 Corrections Management
| Legacy Endpoint | V2 Endpoint | Status | Notes |
|---|---|---|---|
| `/api/attendance-corrections/` | `/api/v2/corrections/corrections/` | ✅ Ready | |
| `/api/attendance-corrections/{id}/approve` | `/api/v2/corrections/corrections/{id}/approve/` | ✅ Ready | |
| `/api/attendance-corrections/{id}/reject` | `/api/v2/corrections/corrections/{id}/reject/` | ✅ Ready | |

### ⏳ Overtime Management
| Legacy Endpoint | V2 Endpoint | Status | Notes |
|---|---|---|---|
| `/api/overtime-requests/` | `/api/v2/overtime/overtime/` | ✅ Ready | |
| `/api/overtime-requests/{id}/approve` | `/api/v2/overtime/overtime/{id}/approve/` | ✅ Ready | |
| `/api/overtime-requests/summary/` | `/api/v2/overtime/my-summaries/` | ✅ Ready | |
| `/api/overtime/report` | `/api/v2/overtime/my-overtime/` | ✅ Ready | |
| `/api/monthly-summary-requests/` | `/api/v2/overtime/monthly-summary/` | ✅ Ready | |

### ⚙️ Settings Management
| Legacy Endpoint | V2 Endpoint | Status | Notes |
|---|---|---|---|
| `/api/settings/work/` | `/api/v2/settings/work/` | ✅ Ready | |
| `/api/settings/holidays/` | `/api/v2/settings/holidays/` | ✅ Ready | |
| `/api/admin/settings/work/` | `/api/v2/settings/admin/work/` | ✅ Ready | |
| `/api/admin/settings/holidays/` | `/api/v2/settings/admin/holidays/` | ✅ Ready | |

### 👨‍💼 Supervisor Features
| Legacy Endpoint | V2 Endpoint | Status | Notes |
|---|---|---|---|
| `/api/supervisor/team-attendance` | `/api/v2/attendance/supervisor/attendance/` | ✅ Ready | |
| `/api/supervisor/approvals/summary` | `/api/v2/overtime/pending/` | ✅ Ready | |
| `/api/supervisor/attendance-detail/{id}` | `/api/v2/attendance/supervisor/attendance/{id}/` | ✅ Ready | |

### 📊 Reporting
| Legacy Endpoint | V2 Endpoint | Status | Notes |
|---|---|---|---|
| `/api/attendance/report/pdf` | `/api/v2/reporting/reports/` | ✅ Ready | |
| `/api/overtime-requests/export-monthly-docx` | `/api/v2/reporting/reports/` | ✅ Ready | |

### 🔧 Utility & System
| Legacy Endpoint | V2 Endpoint | Status | Notes |
|---|---|---|---|
| `/api/health` | `/api/v2/auth/health/` | ✅ Ready | |
| `/api/csrf-token/` | N/A | ❌ Remove | Not needed for JWT |

## 🔧 MISSING IMPLEMENTATIONS TO CREATE

### 1. Function-based Views to Add in V2
```python
# In apps/attendance/views.py - Add these actions:
@action(detail=False, methods=['post'])
def precheck(self, request):
    # Implementation

@action(detail=False, methods=['post']) 
def check_in(self, request):
    # Implementation

@action(detail=False, methods=['post'])
def check_out(self, request):
    # Implementation
```

### 2. Custom Endpoints to Add
- Today's attendance summary
- Employee-specific attendance views
- Supervisor team reports

## 📋 MIGRATION CHECKLIST

### Phase 1: Backend Completion (Week 1-2)
- [ ] Add missing function-based endpoints to V2
- [ ] Test all V2 endpoints
- [ ] Ensure permission consistency
- [ ] Add comprehensive tests

### Phase 2: Frontend Migration (Week 3-5)
- [ ] Update authentication calls
- [ ] Migrate user management
- [ ] Migrate employee management  
- [ ] Migrate attendance system
- [ ] Migrate overtime system
- [ ] Migrate reporting

### Phase 3: Testing & Cleanup (Week 6)
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Remove Legacy code
- [ ] Update documentation

## 🚨 CRITICAL CONSIDERATIONS

### Database Migration
- **IMPORTANT**: V2 models use different `related_name` attributes
- Need to create migration to unify model relationships
- Test data migration thoroughly

### Permission System
- V2 uses cleaner permission classes
- Ensure all role-based access works correctly
- Test admin, supervisor, and employee access levels

### Frontend Breaking Changes
- URL patterns change completely
- Response formats might be slightly different
- Authentication flow changes from session to JWT

## 📞 NEXT STEPS

1. **Complete missing V2 endpoints** (Priority 1)
2. **Create database migration plan** (Priority 1)  
3. **Start systematic frontend migration** (Priority 2)
4. **Comprehensive testing** (Priority 2)
5. **Legacy cleanup** (Priority 3)
