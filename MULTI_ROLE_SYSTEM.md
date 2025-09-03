# Multi-Role System Documentation

## Overview

Sistem Multi-Role adalah implementasi Django yang memungkinkan satu user/employee memiliki multiple roles (groups) secara bersamaan. Sistem ini dirancang untuk fleksibilitas maksimal dalam manajemen akses dan permission.

## Arsitektur Sistem

### 1. Model EmployeeRole
```python
class EmployeeRole(models.Model):
    employee = models.ForeignKey('Employee')
    group = models.ForeignKey('auth.Group')
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    assigned_by = models.ForeignKey(User)
    assigned_at = models.DateTimeField(auto_now_add=True)
```

### 2. MultiRoleManager
Utility class untuk mengelola operasi multi-role:
- `get_user_active_roles(user)`: Mendapatkan semua role aktif user
- `get_user_primary_role(user)`: Mendapatkan role primary user
- `has_role(user, role_name)`: Mengecek apakah user memiliki role tertentu
- `has_any_role(user, role_names)`: Mengecek apakah user memiliki salah satu role
- `assign_role(employee, group, assigned_by, is_primary)`: Assign role ke employee
- `remove_role(employee, group)`: Remove role dari employee
- `set_primary_role(employee, group)`: Set role sebagai primary

### 3. Permission Classes
Berbagai permission class untuk multi-role system:
- `IsMultiRoleAdmin`: Hanya untuk admin
- `IsMultiRoleSupervisor`: Hanya untuk supervisor
- `IsMultiRoleEmployee`: Hanya untuk employee
- `IsMultiRoleAdminOrSupervisor`: Admin atau supervisor
- `IsMultiRoleOwnerOrAdmin`: Owner data atau admin
- `DynamicRolePermission`: Permission dinamis berdasarkan view attributes

### 4. Middleware & Authentication
- `MultiRoleMiddleware`: Menambahkan informasi role ke request object
- `MultiRoleAuthenticationBackend`: Authentication backend yang support multi-role

## Cara Penggunaan

### 1. Assign Role ke Employee

#### Via API Endpoint:
```bash
POST /admin/multi-role-management/assign-role/
{
    "employee_id": 1,
    "group_name": "supervisor",
    "is_primary": true
}
```

#### Via Python Code:
```python
from api.utils import MultiRoleManager
from api.models import Employee
from django.contrib.auth.models import Group

employee = Employee.objects.get(id=1)
group = Group.objects.get(name='supervisor')

role, created = MultiRoleManager.assign_role(
    employee=employee,
    group=group,
    assigned_by=request.user,
    is_primary=True
)
```

### 2. Mengecek Role User

#### Dalam Views:
```python
from api.utils import MultiRoleManager

def my_view(request):
    if MultiRoleManager.has_role(request.user, 'admin'):
        # User adalah admin
        pass

    if MultiRoleManager.has_any_role(request.user, ['admin', 'supervisor']):
        # User adalah admin atau supervisor
        pass

    # Atau menggunakan helper methods di request
    if request.has_role('admin'):
        # User adalah admin
        pass
```

#### Dalam Templates:
```django
{% if request.user|has_role:'admin' %}
    <!-- Admin content -->
{% endif %}
```

### 3. Permission Classes

#### Basic Usage:
```python
from api.permissions import IsMultiRoleAdmin, IsMultiRoleSupervisor

class AdminOnlyView(APIView):
    permission_classes = [IsMultiRoleAdmin]

class SupervisorView(APIView):
    permission_classes = [IsMultiRoleSupervisor]
```

#### Dynamic Permission:
```python
from api.permissions import DynamicRolePermission

class DynamicView(APIView):
    permission_classes = [DynamicRolePermission]

    # Define allowed roles for this view
    allowed_roles = ['admin', 'supervisor']
    require_all_roles = False  # User needs ANY of the roles
```

### 4. API Endpoints

#### Role Management Endpoints:
```
GET  /admin/multi-role-management/user-roles/           # Get current user roles
POST /admin/multi-role-management/assign-role/          # Assign role to employee
POST /admin/multi-role-management/remove-role/          # Remove role from employee
POST /admin/multi-role-management/set-primary-role/     # Set primary role
GET  /admin/multi-role-management/available-groups/     # Get all available groups
GET  /admin/multi-role-management/role-statistics/      # Get role statistics
POST /admin/multi-role-management/bulk-assign-roles/    # Bulk assign roles
```

#### Employee Role Endpoints:
```
GET    /admin/employee-roles/                            # List all employee roles
POST   /admin/employee-roles/                            # Create employee role
GET    /admin/employee-roles/{id}/                       # Get employee role detail
PUT    /admin/employee-roles/{id}/                       # Update employee role
DELETE /admin/employee-roles/{id}/                       # Delete employee role
POST   /admin/employee-roles/{id}/set_primary/           # Set as primary role
POST   /admin/employee-roles/{id}/toggle_active/         # Toggle active status
GET    /admin/employee-roles/by_employee/                # Get roles by employee
```

## Contoh Implementasi

### 1. View dengan Role-Based Access

```python
from rest_framework import viewsets
from api.permissions import IsMultiRoleAdminOrSupervisor, IsMultiRoleOwnerOrAdmin
from api.utils import MultiRoleManager

class EmployeeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsMultiRoleAdminOrSupervisor]

    def get_queryset(self):
        user = self.request.user

        # Admin dapat melihat semua employee
        if MultiRoleManager.has_role(user, 'admin'):
            return Employee.objects.all()

        # Supervisor dapat melihat employee di divisi mereka
        elif MultiRoleManager.has_role(user, 'supervisor'):
            user_employee = user.employee
            return Employee.objects.filter(division=user_employee.division)

        # Employee biasa hanya dapat melihat dirinya sendiri
        else:
            return Employee.objects.filter(user=user)

    def perform_create(self, serializer):
        # Hanya admin yang dapat membuat employee baru
        if not MultiRoleManager.has_role(self.request.user, 'admin'):
            raise PermissionDenied("Only admin can create employees")
        serializer.save()
```

### 2. Serializer dengan Role Information

```python
from rest_framework import serializers
from api.utils import MultiRoleManager

class EmployeeWithRolesSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    primary_role = serializers.SerializerMethodField()
    has_admin_role = serializers.SerializerMethodField()
    has_supervisor_role = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = ['id', 'user', 'nip', 'fullname', 'roles', 'primary_role',
                 'has_admin_role', 'has_supervisor_role']

    def get_roles(self, obj):
        roles = MultiRoleManager.get_user_active_roles(obj.user)
        return EmployeeRoleSerializer(roles, many=True).data

    def get_primary_role(self, obj):
        primary_role = MultiRoleManager.get_user_primary_role(obj.user)
        return EmployeeRoleSerializer(primary_role).data if primary_role else None

    def get_has_admin_role(self, obj):
        return MultiRoleManager.has_role(obj.user, 'admin')

    def get_has_supervisor_role(self, obj):
):
        return MultiRoleManager.has_role(obj.user, 'supervisor')
```

### 3. Template Tags untuk Django Templates

```python
# template_tags/role_tags.py
from django import template
from api.utils import MultiRoleManager

register = template.Library()

@register.filter
def has_role(user, role_name):
    return MultiRoleManager.has_role(user, role_name)

@register.filter
def has_any_role(user, role_names):
    if isinstance(role_names, str):
        role_names = [role_names]
    return MultiRoleManager.has_any_role(user, role_names)

@register.simple_tag
def get_user_roles(user):
    return MultiRoleManager.get_user_role_names(user)

@register.simple_tag
def get_primary_role(user):
    primary_role = MultiRoleManager.get_user_primary_role(user)
    return primary_role.group.name if primary_role else None
```

### 4. Frontend Integration

```javascript
// Get user roles
const response = await fetch('/admin/multi-role-management/user-roles/', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});

const data = await response.json();
console.log('User roles:', data.role_names);
console.log('Primary role:', data.primary_role?.group_name);
console.log('Has admin:', data.has_admin);

// Assign role
await fetch('/admin/multi-role-management/assign-role/', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        employee_id: 1,
        group_name: 'supervisor',
        is_primary: true
    })
});
```

## Database Schema

### EmployeeRole Table
```sql
CREATE TABLE api_employeerole (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    group_id INT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    assigned_by_id INT,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES api_employee(id),
    FOREIGN KEY (group_id) REFERENCES auth_group(id),
    FOREIGN KEY (assigned_by_id) REFERENCES auth_user(id),
    UNIQUE KEY unique_employee_group (employee_id, group_id)
);
```

## Best Practices

### 1. Role Assignment
- Selalu assign role melalui `MultiRoleManager.assign_role()` untuk konsistensi
- Pastikan hanya satu primary role per employee
- Track siapa yang assign role dan kapan

### 2. Permission Checking
- Gunakan `MultiRoleManager` untuk checking role di business logic
- Gunakan permission classes untuk API access control
- Hindari hard-coded role names, gunakan constants

### 3. Error Handling
- Handle case ketika role tidak ditemukan
- Handle case ketika employee tidak memiliki primary role
- Log semua perubahan role untuk audit trail

### 4. Performance
- Gunakan `select_related()` dan `prefetch_related()` untuk query optimization
- Cache role information jika diperlukan untuk performance tinggi
- Gunakan database indexes pada field yang sering di-query

## Migration

Untuk mengimplementasikan sistem ini di project baru:

1. Copy model `EmployeeRole` ke models.py
2. Copy `MultiRoleManager` dan utility classes ke utils.py
3. Copy permission classes ke permissions.py
4. Update settings.py dengan middleware dan authentication backend
5. Update URLs untuk menambahkan role management endpoints
6. Run migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

## Troubleshooting

### Common Issues:

1. **Role tidak tersimpan**: Pastikan `assigned_by` user valid
2. **Multiple primary roles**: Model akan otomatis handle ini
3. **Permission denied**: Check role assignment dan permission classes
4. **Performance issues**: Add database indexes dan optimize queries

### Debug Commands:

```python
# Check user roles
from api.utils import MultiRoleManager
user = User.objects.get(username='john')
roles = MultiRoleManager.get_user_active_roles(user)
print([role.group.name for role in roles])

# Check permissions
permissions = MultiRoleManager.get_user_permissions(user)
print(permissions)
```

## Security Considerations

1. **Role Escalation**: Hanya admin yang dapat assign/remove roles
2. **Audit Trail**: Semua perubahan role dicatat dengan `assigned_by` dan `assigned_at`
3. **Permission Validation**: Selalu validate permissions di business logic
4. **Session Management**: Clear session cache setelah role changes

## Future Enhancements

1. **Role Templates**: Template untuk kombinasi roles yang sering digunakan
2. **Role Inheritance**: Sistem inheritance untuk roles (parent-child relationship)
3. **Time-based Roles**: Roles yang aktif dalam periode tertentu
4. **Role Approval Workflow**: Approval process untuk role assignment
5. **Role Analytics**: Dashboard untuk monitoring role usage

---

**Catatan**: Sistem ini dirancang untuk fleksibilitas maksimal sambil mempertahankan keamanan dan performa. Pastikan untuk test thoroughly sebelum deploy ke production.

