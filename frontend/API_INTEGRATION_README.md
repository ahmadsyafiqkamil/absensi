# 🚀 **Frontend API Integration - Modular V2 Endpoints**

## 📋 **Overview**

Frontend telah diupdate untuk menggunakan API baru yang modular (`/api/v2/`) dengan backward compatibility untuk legacy endpoints (`/api/`). Sistem ini memberikan:

- ✅ **Modular Architecture** - Separate apps untuk setiap fitur
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Custom Hooks** - Easy-to-use React hooks
- ✅ **Error Handling** - Comprehensive error management
- ✅ **Backward Compatibility** - Legacy endpoints tetap berfungsi

---

## 🏗️ **Architecture**

### **API Versioning**
```
/api/          - Legacy endpoints (backward compatibility)
/api/v2/       - New modular endpoints
```

### **Modular Apps Structure**
```
/api/v2/
├── employees/     - Employee management
├── settings/      - System settings & holidays
├── attendance/    - Attendance tracking
├── corrections/   - Attendance corrections
├── overtime/      - Overtime management
└── reporting/     - Report generation
```

---

## 📚 **Core Files**

### **1. Type Definitions (`src/lib/types.ts`)**
- Complete TypeScript interfaces untuk semua models
- Form types, filter types, dan response types
- Status enums dan utility types

### **2. API Services (`src/lib/api.ts`)**
- Modular API functions untuk setiap app
- Error handling dan response processing
- Filter support dan pagination

### **3. Custom Hooks (`src/lib/hooks.ts`)**
- Data fetching hooks untuk setiap endpoint
- Mutation hooks untuk create/update/delete
- Loading states dan error handling

### **4. Backend Configuration (`src/lib/backend.ts`)**
- API version management
- URL construction helpers
- Legacy compatibility functions

---

## 🔧 **Usage Examples**

### **Basic Data Fetching**
```typescript
import { useDivisions, useEmployees } from '@/lib/hooks';

function MyComponent() {
  const { data: divisions, loading, error } = useDivisions();
  const { data: employees } = useEmployees({ division_id: 1 });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.detail}</div>;

  return (
    <div>
      {divisions?.results.map(division => (
        <div key={division.id}>{division.name}</div>
      ))}
    </div>
  );
}
```

### **Data Mutations**
```typescript
import { useCreateHoliday, useUpdateWorkSettings } from '@/lib/hooks';

function SettingsForm() {
  const createHoliday = useCreateHoliday();
  const updateSettings = useUpdateWorkSettings();

  const handleSubmit = async (data: any) => {
    try {
      await createHoliday.mutate(data);
      // Success handling
    } catch (error) {
      // Error handling
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### **Direct API Calls**
```typescript
import { api } from '@/lib/api';

// Direct API usage
const divisions = await api.employees.getDivisions();
const settings = await api.settings.getWorkSettings();
const attendance = await api.attendance.getTodayAttendance();
```

---

## 🎯 **Available Hooks**

### **Data Fetching Hooks**
- `useDivisions()` - Get all divisions
- `usePositions()` - Get all positions
- `useEmployees(filters)` - Get employees with filters
- `useMyProfile()` - Get current user profile
- `useWorkSettings()` - Get work settings
- `useHolidays()` - Get holidays list
- `useAttendances(filters)` - Get attendance records
- `useTodayAttendance()` - Get today's attendance
- `useCorrections(filters)` - Get correction requests
- `useOvertimeRequests(filters)` - Get overtime requests
- `useMonthlySummaryRequests(filters)` - Get monthly summaries
- `useReportTemplates()` - Get report templates

### **Mutation Hooks**
- `useUpdateWorkSettings()` - Update work settings
- `useCreateHoliday()` - Create new holiday
- `useUpdateHoliday()` - Update holiday
- `useDeleteHoliday()` - Delete holiday
- `useCheckIn()` - Check in attendance
- `useCheckOut()` - Check out attendance
- `useCreateCorrection()` - Create correction request
- `useApproveCorrection()` - Approve/reject correction
- `useCreateOvertimeRequest()` - Create overtime request
- `useApproveOvertime()` - Approve/reject overtime
- `useCreateMonthlySummaryRequest()` - Create monthly summary
- `useGenerateAttendanceReport()` - Generate attendance report
- `useGenerateOvertimeReport()` - Generate overtime report

---

## 🔌 **API Endpoints Reference**

### **Employees API**
```
GET    /api/v2/employees/divisions/          - List divisions
GET    /api/v2/employees/positions/          - List positions
GET    /api/v2/employees/employees/          - List employees
GET    /api/v2/employees/employees/{id}/     - Get employee
GET    /api/v2/employees/me/                 - Get my profile
```

### **Settings API**
```
GET    /api/v2/settings/work/                - Get work settings
PATCH  /api/v2/settings/work/                - Update work settings
GET    /api/v2/settings/holidays/            - List holidays
POST   /api/v2/settings/holidays/            - Create holiday
GET    /api/v2/settings/holidays/{id}/       - Get holiday
PATCH  /api/v2/settings/holidays/{id}/       - Update holiday
DELETE /api/v2/settings/holidays/{id}/       - Delete holiday
```

### **Attendance API**
```
GET    /api/v2/attendance/attendance/        - List attendances
GET    /api/v2/attendance/attendance/{id}/   - Get attendance
POST   /api/v2/attendance/check-in/          - Check in
POST   /api/v2/attendance/check-out/         - Check out
GET    /api/v2/attendance/precheck/          - Precheck attendance
GET    /api/v2/attendance/today/             - Today's attendance
GET    /api/v2/attendance/summary/           - Attendance summary
```

### **Corrections API**
```
GET    /api/v2/corrections/corrections/      - List corrections
POST   /api/v2/corrections/corrections/      - Create correction
GET    /api/v2/corrections/corrections/{id}/ - Get correction
POST   /api/v2/corrections/corrections/{id}/approve/ - Approve/reject
GET    /api/v2/corrections/my-corrections/   - My corrections
GET    /api/v2/corrections/pending/          - Pending corrections
```

### **Overtime API**
```
GET    /api/v2/overtime/overtime/            - List overtime requests
POST   /api/v2/overtime/overtime/            - Create overtime request
GET    /api/v2/overtime/overtime/{id}/       - Get overtime request
POST   /api/v2/overtime/overtime/{id}/approve/ - Approve/reject
GET    /api/v2/overtime/my-overtime/         - My overtime requests
GET    /api/v2/overtime/pending/             - Pending overtime
GET    /api/v2/overtime/monthly-summary/     - List monthly summaries
POST   /api/v2/overtime/monthly-summary/     - Create monthly summary
GET    /api/v2/overtime/monthly-summary/{id}/ - Get monthly summary
POST   /api/v2/overtime/monthly-summary/{id}/approve/ - Approve/reject
```

### **Reporting API**
```
GET    /api/v2/reporting/templates/          - List report templates
GET    /api/v2/reporting/templates/{id}/     - Get report template
GET    /api/v2/reporting/reports/            - List generated reports
GET    /api/v2/reporting/reports/{id}/       - Get generated report
POST   /api/v2/reporting/generate/attendance/ - Generate attendance report
POST   /api/v2/reporting/generate/overtime/  - Generate overtime report
POST   /api/v2/reporting/generate/summary/   - Generate summary report
GET    /api/v2/reporting/reports/{id}/download/ - Download report
GET    /api/v2/reporting/schedules/          - List report schedules
POST   /api/v2/reporting/schedules/          - Create report schedule
GET    /api/v2/reporting/schedules/{id}/     - Get report schedule
PATCH  /api/v2/reporting/schedules/{id}/     - Update report schedule
DELETE /api/v2/reporting/schedules/{id}/     - Delete report schedule
```

---

## 🚨 **Error Handling**

### **API Error Structure**
```typescript
interface ApiError {
  detail: string;
  code?: string;
  field?: string;
}
```

### **Error Handling in Components**
```typescript
function MyComponent() {
  const { data, loading, error } = useDivisions();

  if (error) {
    return (
      <div className="text-red-600">
        Error: {error.detail}
        {error.field && ` (Field: ${error.field})`}
      </div>
    );
  }

  // Component content
}
```

---

## 🔄 **Migration Guide**

### **From Legacy to V2**
```typescript
// OLD (Legacy)
const response = await fetch('/api/employee/employees');
const data = await response.json();

// NEW (V2)
const { data, loading, error } = useEmployees();
// OR
const data = await api.employees.getEmployees();
```

### **Backward Compatibility**
- Legacy endpoints tetap berfungsi
- Frontend secara otomatis fallback ke legacy jika V2 tidak tersedia
- Gradual migration dapat dilakukan per component

---

## 🧪 **Testing**

### **API Status Check Component**
- Component `ApiStatusCheck` tersedia untuk monitoring
- Real-time status checking untuk semua endpoints
- Response time measurement
- Overall system health indicator

### **Testing New Endpoints**
```typescript
// Test endpoint availability
const response = await fetch('/api/v2/employees/divisions/');
if (response.ok) {
  console.log('V2 API available');
} else {
  console.log('Fallback to legacy API');
}
```

---

## 📝 **Best Practices**

### **1. Use Custom Hooks**
- Prefer custom hooks over direct API calls
- Hooks provide loading states dan error handling
- Consistent data management across components

### **2. Handle Errors Gracefully**
- Always check for errors in API responses
- Provide user-friendly error messages
- Implement fallback mechanisms

### **3. Implement Loading States**
- Show loading indicators during API calls
- Prevent multiple simultaneous requests
- Cache data when appropriate

### **4. Use Type Safety**
- Leverage TypeScript interfaces
- Validate API responses
- Type your component props

---

## 🔮 **Future Enhancements**

### **Planned Features**
- [ ] Real-time updates dengan WebSocket
- [ ] Advanced caching strategies
- [ ] Offline support
- [ ] API rate limiting
- [ ] Performance monitoring
- [ ] Automated testing

### **Performance Optimizations**
- [ ] Request deduplication
- [ ] Background data prefetching
- [ ] Optimistic updates
- [ ] Smart error retry logic

---

## 📞 **Support**

### **Troubleshooting**
1. **Check API Status** - Use `ApiStatusCheck` component
2. **Verify Backend** - Ensure backend services are running
3. **Check Network** - Verify frontend-backend connectivity
4. **Review Logs** - Check browser console dan backend logs

### **Common Issues**
- **CORS Errors** - Check backend CORS configuration
- **Authentication Errors** - Verify JWT token validity
- **Network Errors** - Check Docker network configuration
- **Type Errors** - Ensure TypeScript interfaces match backend

---

**🎉 Frontend sekarang fully integrated dengan API modular baru! Semua fitur tersedia dengan type safety, error handling, dan backward compatibility.**
