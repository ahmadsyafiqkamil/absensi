# Frontend Implementation Guide: Unified Role System

## 🎯 Overview
This guide documents the implementation of frontend changes to support the new unified Role system that replaces the complex multi-layer permission system.

## 📋 Implementation Status

### ✅ Completed Changes

#### 1. **useSupervisorApprovalLevel Hook** (`/src/lib/hooks.ts`)
- **BEFORE**: Used `/api/admin/role-configurations/` endpoint
- **AFTER**: Uses `/api/employees/me` with new `multi_roles` structure
- **Benefits**:
  - Simplified logic (removed complex role mapping)
  - Backend-calculated approval levels
  - Support for multiple roles per user
  - Primary role identification

```typescript
// NEW: Simplified approval level logic
const multiRoles = result.multi_roles || {}
const activeRoles = multiRoles.active_roles || []
const primaryRoleName = multiRoles.primary_role
const level = result.approval_level || 0  // Backend-calculated
const source = result.approval_source || 'Role-based'
```

#### 2. **New API Endpoints** (`/src/lib/api.ts`)
- Added `adminApi` with comprehensive role management
- **NEW Endpoints**:
  - `getRoles()` - Get all roles with filtering
  - `createRole()`, `updateRole()`, `deleteRole()`
  - `assignEmployeeRole()`, `updateEmployeeRole()`, `removeEmployeeRole()`
  - `setPrimaryRole()`, `toggleRoleActive()`

#### 3. **Backend API Routes** (`/src/app/api/admin/roles/`)
- **NEW Route**: `/api/admin/roles/` - Full CRUD operations
- **NEW Route**: `/api/admin/roles/[id]/` - Individual role operations
- **NEW Route**: `/api/admin/roles/[id]/toggle_active/` - Toggle role status

#### 4. **Updated RoleManagement Component** (`/src/components/RoleManagement.tsx`)
- **BEFORE**: Used `role.group.name` structure
- **AFTER**: Uses `role.role.name` structure
- **NEW Features**:
  - Support for role descriptions
  - Approval level display
  - Primary role management
  - Better error handling

### 🔄 Data Structure Changes

#### User Profile Response (`/api/employees/me`)
```json
{
  "multi_roles": {
    "active_roles": ["admin", "supervisor"],
    "primary_role": "admin",
    "role_names": ["Administrator", "Supervisor"],
    "has_multiple_roles": true
  },
  "approval_level": 2,
  "approval_source": "Role: Administrator (Level 2)"
}
```

#### Role Object Structure
```typescript
interface Role {
  id: number;
  name: string;           // Unique identifier (e.g., "admin")
  display_name: string;   // Display name (e.g., "Administrator")
  description?: string;   // Role description
  approval_level: number; // 0=No Approval, 1=Division, 2=Organization
  is_active: boolean;     // Role status
  sort_order: number;     // Display order
}
```

#### EmployeeRole Object Structure
```typescript
interface EmployeeRole {
  id: number;
  role: Role;             // NEW: Direct role reference (was 'group')
  is_primary: boolean;    // Primary role flag
  is_active: boolean;     // Assignment status
  assigned_at: string;    // Assignment timestamp
  assigned_by: {          // Assignment metadata
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
}
```

## 🚀 Migration Benefits

### **1. Simplified Logic**
```typescript
// BEFORE: Complex role mapping
const dynamicRoleMap: { [key: string]: number } = {}
configs.forEach((config: any) => {
  if (config.is_active) {
    dynamicRoleMap[config.name] = config.approval_level
  }
})

// AFTER: Backend-calculated
const level = result.approval_level || 0
```

### **2. Better Performance**
- **BEFORE**: Multiple API calls (role-configurations + user profile)
- **AFTER**: Single API call with pre-calculated approval levels
- **BEFORE**: Complex client-side role mapping
- **AFTER**: Server-side calculation with caching

### **3. Enhanced Features**
- ✅ Multiple roles per user
- ✅ Primary role identification
- ✅ Role descriptions and metadata
- ✅ Better audit trail (assigned_by, assigned_at)
- ✅ Unified permission system

## 🔧 Configuration & Setup

### **1. Environment Variables**
No additional environment variables required - uses existing backend configuration.

### **2. Dependencies**
All required dependencies are already installed:
- React hooks (useState, useEffect)
- Fetch API for HTTP requests
- Existing UI components (Button, Badge, etc.)

### **3. TypeScript Types**
New types are defined in component files - no global type changes required.

## 🧪 Testing Guide

### **1. Role Assignment Testing**
```typescript
// Test multiple role assignment
const roles = await api.admin.getRoles({ is_active: true });
expect(roles.length).toBeGreaterThan(0);

// Test employee role assignment
const assignment = await api.admin.assignEmployeeRole({
  employee: employeeId,
  role: roleId,
  is_primary: true
});
expect(assignment.is_primary).toBe(true);
```

### **2. Approval Level Testing**
```typescript
// Test approval level calculation
const { approvalLevel, userRoles } = useSupervisorApprovalLevel();
expect(approvalLevel).toBeGreaterThanOrEqual(0);
expect(userRoles).toBeInstanceOf(Array);
```

### **3. Permission Testing**
```typescript
// Test conditional rendering
const { canApprove, isLevel0 } = useSupervisorApprovalLevel();
if (canApprove && !isLevel0) {
  // Show approval UI
}
```

## 📚 API Reference

### **Admin API Methods**

#### **Role Management**
```typescript
// Get roles with filtering
api.admin.getRoles({ is_active: true, approval_level: 2 })

// Create new role
api.admin.createRole({
  name: 'manager',
  display_name: 'Manager',
  description: 'Department Manager',
  approval_level: 1
})

// Update role
api.admin.updateRole(roleId, { description: 'Updated description' })

// Delete role
api.admin.deleteRole(roleId)

// Toggle role active status
api.admin.toggleRoleActive(roleId)
```

#### **Employee Role Management**
```typescript
// Get employee roles
api.admin.getEmployeeRoles({ employee_id: employeeId })

// Assign role to employee
api.admin.assignEmployeeRole({
  employee: employeeId,
  role: roleId,
  is_primary: false
})

// Update employee role
api.admin.updateEmployeeRole(employeeRoleId, {
  is_primary: true,
  is_active: true
})

// Remove employee role
api.admin.removeEmployeeRole(employeeRoleId)

// Set primary role
api.admin.setPrimaryRole(employeeRoleId)
```

## 🔍 Troubleshooting

### **Common Issues**

#### **1. Approval Level Not Updating**
```typescript
// Check user profile structure
const response = await fetch('/api/employees/me')
const data = await response.json()
console.log('User data:', data.multi_roles) // Should have active_roles array
```

#### **2. Role Assignment Failing**
```typescript
// Check role existence
const roles = await api.admin.getRoles({ name: roleName })
if (roles.length === 0) {
  console.error('Role does not exist:', roleName)
}
```

#### **3. Permission Denied Errors**
```typescript
// Check user authentication
const { userRoles, approvalLevel } = useSupervisorApprovalLevel()
console.log('User roles:', userRoles)
console.log('Approval level:', approvalLevel)
```

### **Debugging Steps**

1. **Check Backend Logs**: Look for role-related errors in Django logs
2. **Verify API Responses**: Use browser dev tools to inspect API responses
3. **Test Individual Components**: Isolate and test each component separately
4. **Check Database State**: Verify role assignments in Django admin

## 🎯 Next Steps

### **Recommended Improvements**

#### **1. UI Enhancements**
- Add role selection dropdown with descriptions
- Show approval level indicators in UI
- Add role assignment history view
- Implement bulk role operations

#### **2. Performance Optimizations**
- Add React Query for caching
- Implement optimistic updates
- Add loading states for better UX
- Cache role data locally

#### **3. Additional Features**
- Role-based dashboard customization
- Advanced permission matrix
- Role assignment notifications
- Audit trail for role changes

## 📞 Support

For issues or questions:
1. Check this documentation first
2. Review backend `ROLE_SYSTEM_DOCUMENTATION.md`
3. Test with development environment
4. Check browser console for errors
5. Verify API responses in network tab

---

**🎉 Implementation Complete!**

The frontend now fully supports the new unified Role system with:
- ✅ Simplified approval logic
- ✅ Better performance
- ✅ Enhanced user experience
- ✅ Comprehensive API coverage
- ✅ Backward compatibility maintained

