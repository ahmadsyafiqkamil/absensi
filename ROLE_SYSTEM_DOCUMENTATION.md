# Role System Documentation

## Overview

The Role System is a unified, simplified permission and approval system that replaces the previous complex multi-layer permission architecture. This system provides a clean, maintainable, and scalable approach to managing user permissions and approval workflows.

## Architecture

### Core Components

#### 1. Role Model (`api.models.Role`)
- **Purpose**: Defines role templates with approval levels
- **Key Fields**:
  - `name`: Unique identifier (e.g., 'admin', 'supervisor', 'pegawai')
  - `display_name`: Human-readable name for UI
  - `description`: Role responsibilities description
  - `approval_level`: Permission level (0=No Approval, 1=Division, 2=Organization)
  - `is_active`: Whether role can be assigned
  - `sort_order`: UI display ordering

#### 2. EmployeeRole Model (`api.models.EmployeeRole`)
- **Purpose**: Links employees to roles with assignment metadata
- **Key Features**:
  - One employee can have multiple roles
  - Primary role designation for each employee
  - Assignment tracking (who, when)
  - Active/inactive status

#### 3. ApprovalChecker (`api.utils.ApprovalChecker`)
- **Purpose**: Centralized approval logic based on roles
- **Key Methods**:
  - `get_user_approval_level(user)`: Get highest approval level from user's roles
  - `can_approve_division_level(user)`: Check division-level approval capability
  - `can_approve_organization_level(user)`: Check organization-level approval capability
  - `can_approve_overtime_org_wide(user)`: Check organization-wide overtime approval

#### 4. MultiRoleManager (`api.utils.MultiRoleManager`)
- **Purpose**: Role assignment and management utilities
- **Key Methods**:
  - `has_role(user, role_name)`: Check if user has specific role
  - `has_any_role(user, role_names)`: Check if user has any of specified roles
  - `assign_role(employee, role, assigned_by)`: Assign role to employee
  - `remove_role(employee, role)`: Remove role from employee
  - `set_primary_role(employee, role)`: Set primary role for employee

### Permission Classes

#### Basic Role Permissions
- `IsAdmin`: Admin-only access
- `IsSupervisor`: Supervisor access (approval level >= 1)
- `IsEmployee`: Employee access

#### Combined Permissions
- `IsAdminOrSupervisor`: Admin full access, supervisor read-only
- `IsAdminOrSupervisorWithApproval`: Admin full access, supervisor with approval actions
- `IsAdminOrSupervisorOvertimeApproval`: Overtime-specific approval permissions

#### Object-Level Permissions
- `IsOwnerOrAdmin`: Owner or admin access to objects
- `IsDivisionMemberOrAdmin`: Division member or admin access
- `IsOvertimeRequestOwnerOrSupervisor`: Overtime request permissions
- `IsOvertimeRequestApprover`: Overtime approval permissions

## Approval Workflow

### Two-Level Approval System

#### Level 1 Approval (Division Level)
- **Performed by**: Supervisors with approval_level >= 1
- **Scope**: Requests from same division
- **Status Change**: `pending` → `level1_approved`

#### Final Approval (Organization Level)
- **Performed by**: Supervisors with approval_level = 2
- **Scope**: Organization-wide or level 1 approved requests
- **Status Change**: `level1_approved` → `approved`

### Approval Logic Flow

```
Request Status: pending
├── Level 1 Approval Required?
│   ├── Yes: Supervisor (level 1) → level1_approved
│   └── No: Admin → approved
└── Final Approval Required?
    ├── Yes: Supervisor (level 2) → approved
    └── No: Auto-approved → approved
```

## Usage Examples

### 1. Basic Role Checking
```python
from api.utils import MultiRoleManager

# Check if user has admin role
if MultiRoleManager.has_role(user, 'admin'):
    # Admin-specific logic
    pass

# Check if user has any supervisor role
if MultiRoleManager.has_any_role(user, ['supervisor', 'manager']):
    # Supervisor logic
    pass
```

### 2. Approval Checking
```python
from api.utils import ApprovalChecker

# Get user's approval level
level = ApprovalChecker.get_user_approval_level(user)

# Check specific approval capabilities
if ApprovalChecker.can_approve_division_level(user):
    # Division-level approval logic
    pass

if ApprovalChecker.can_approve_organization_level(user):
    # Organization-level approval logic
    pass
```

### 3. Role Assignment
```python
from api.utils import MultiRoleManager
from api.models import Role, Employee

# Get role and employee
role = Role.objects.get(name='supervisor')
employee = Employee.objects.get(user=user)

# Assign role
assignment, created = MultiRoleManager.assign_role(
    employee=employee,
    role=role,
    assigned_by=request.user
)

# Set as primary role
MultiRoleManager.set_primary_role(employee, role)
```

## API Endpoints

### Role Management
- `GET /api/admin/roles/`: List all roles
- `POST /api/admin/roles/`: Create new role
- `GET /api/admin/roles/{id}/`: Get role details
- `PUT /api/admin/roles/{id}/`: Update role
- `DELETE /api/admin/roles/{id}/`: Delete role

### Employee Role Management
- `GET /api/admin/employee-roles/`: List employee role assignments
- `POST /api/admin/employee-roles/`: Assign role to employee
- `PUT /api/admin/employee-roles/{id}/`: Update role assignment
- `DELETE /api/admin/employee-roles/{id}/`: Remove role assignment

### User Profile
- `GET /api/auth/me/`: Get current user info with roles
- Returns: user details, roles, approval capabilities

## Migration from Old System

### What Changed

#### Before (Complex Multi-Layer System):
1. **Django Groups**: Basic role identification
2. **Position.approval_level**: Approval permissions from position
3. **Position.can_approve_overtime_org_wide**: Organization-wide permissions
4. **RoleConfiguration**: Additional role metadata
5. **EmployeeRole**: Role assignments to employees

#### After (Unified Role System):
1. **Role Model**: Single source of truth for roles and permissions
2. **EmployeeRole**: Simplified role assignments
3. **ApprovalChecker**: Centralized approval logic
4. **MultiRoleManager**: Role management utilities

### Data Migration
- **RoleConfiguration** → **Role**: All role definitions migrated
- **EmployeeRole.group** → **EmployeeRole.role**: Updated foreign key references
- **Position fields**: Marked as deprecated but kept for backward compatibility

### Backward Compatibility
- Old position-based logic still works but marked as deprecated
- Existing API endpoints maintain functionality
- Graceful fallback to old system if needed

## Best Practices

### 1. Role Assignment
- Always use `MultiRoleManager` for role operations
- Set primary roles appropriately
- Deactivate unused role assignments instead of deleting

### 2. Permission Checking
- Use `ApprovalChecker` for approval-related permissions
- Use `MultiRoleManager` for basic role checking
- Prefer object-level permissions over global permissions

### 3. Performance
- Use `select_related()` and `prefetch_related()` in queries
- Cache frequently accessed role data
- Minimize database queries in permission checks

### 4. Security
- Always validate user permissions before actions
- Use atomic transactions for role assignments
- Log all role changes for audit trails

## Troubleshooting

### Common Issues

#### 1. Permission Denied
```python
# Check user's roles
roles = MultiRoleManager.get_user_active_roles(user)
print(f"User roles: {[r.role.name for r in roles]}")

# Check approval level
level = ApprovalChecker.get_user_approval_level(user)
print(f"Approval level: {level}")
```

#### 2. Role Assignment Issues
```python
# Check if role exists
role = Role.objects.filter(name='supervisor', is_active=True).first()
if not role:
    print("Role does not exist or is inactive")

# Check unique constraint
existing = EmployeeRole.objects.filter(employee=employee, role=role).first()
if existing:
    print("Role already assigned to employee")
```

#### 3. Approval Workflow Issues
```python
# Check approval capabilities
capabilities = ApprovalChecker.get_approval_capabilities(user)
print(f"Capabilities: {capabilities}")

# Check specific request approval
if not request.can_be_approved_by(user):
    print("User cannot approve this request")
```

## Future Enhancements

### Planned Features
1. **Role Templates**: Pre-defined role combinations
2. **Dynamic Permissions**: Runtime permission assignment
3. **Role Inheritance**: Parent-child role relationships
4. **Audit Logging**: Comprehensive role change tracking
5. **UI Components**: Role management interface

### Performance Optimizations
1. **Database Indexes**: Optimized for common queries
2. **Caching**: Role data caching for performance
3. **Batch Operations**: Bulk role assignment operations
4. **Lazy Loading**: On-demand role data loading

---

## Support

For questions or issues with the Role System:
- Check this documentation first
- Review the code in `api/models.py`, `api/utils.py`, and `api/permissions.py`
- Test with the provided examples
- Create issues for bugs or feature requests

---

**Last Updated**: September 2025
**Version**: 1.0.0
