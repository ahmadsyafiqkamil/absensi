# Role-Based Access Control (RBAC) - Permission System

## Overview

Sistem permission yang baru dibuat untuk mengontrol akses berdasarkan role user (admin, supervisor, employee/pegawai) dengan lebih granular dan terorganisir.

## Struktur File

- `permissions.py` - Berisi semua permission classes
- `views.py` - Menggunakan permission classes untuk ViewSet dan views
- `README_PERMISSIONS.md` - Dokumentasi lengkap (file ini)

## Permission Classes

### 1. Basic Role Permissions

#### `IsAdmin`
- **Access**: Admin only (full CRUD)
- **Use Case**: Employee management, system settings, user provisioning
- **Example**:
```python
class EmployeeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
```

#### `IsSupervisor`
- **Access**: Supervisor only (read-only)
- **Use Case**: View team attendance, division data, employee info
- **Example**:
```python
class SupervisorDashboardView(APIView):
    permission_classes = [IsSupervisor]
```

#### `IsEmployee`
- **Access**: Employee only (read-only)
- **Use Case**: View own attendance, own employee data, submit corrections
- **Example**:
```python
class PersonalAttendanceView(APIView):
    permission_classes = [IsEmployee]
```

### 2. Combined Role Permissions

#### `IsAdminOrSupervisor`
- **Access**: Admin (CRUD), Supervisor (read-only)
- **Use Case**: Work settings, division data, team monitoring
- **Example**:
```python
class WorkSettingsViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrSupervisor]
```

#### `IsAdminOrSupervisorReadOnly`
- **Access**: Admin (CRUD), Supervisor (read-only)
- **Use Case**: System configuration, master data
- **Example**:
```python
class SystemConfigViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrSupervisorReadOnly]
```

#### `IsAdminOrReadOnly`
- **Access**: Admin (CRUD), All authenticated users (read-only)
- **Use Case**: Public data, reference data
- **Example**:
```python
class DivisionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
```

### 3. Object-Level Permissions

#### `IsOwnerOrAdmin`
- **Access**: Admin (all data), User (own data only)
- **Use Case**: Personal attendance records, user profile, personal settings
- **Example**:
```python
class AttendanceViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsOwnerOrAdmin]
```

#### `IsDivisionMemberOrAdmin`
- **Access**: Admin (all data), Supervisor (same division), Employee (own data)
- **Use Case**: Team attendance, division reports, employee data
- **Example**:
```python
class TeamAttendanceViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsDivisionMemberOrAdmin]
```

## Permission Matrix

| Permission | Admin | Supervisor | Employee | Anonymous |
|------------|-------|------------|----------|-----------|
| `IsAdmin` | CRUD | None | None | None |
| `IsSupervisor` | None | Read | None | None |
| `IsEmployee` | None | None | Read | None |
| `IsAdminOrSupervisor` | CRUD | Read | None | None |
| `IsAdminOrSupervisorReadOnly` | CRUD | Read | None | None |
| `IsAdminOrReadOnly` | CRUD | Read | Read | None |
| `IsOwnerOrAdmin` | All | Own | Own | None |
| `IsDivisionMemberOrAdmin` | All | Division | Own | None |

**Legend:**
- CRUD = Create, Read, Update, Delete
- Read = Read only
- Own = Own data only
- Division = Data within same division
- All = All data
- None = No access

## Implementasi di ViewSet

### Contoh 1: Employee Management (Admin Only)
```python
class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related('user', 'division', 'position').all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsAdmin]  # Hanya admin yang bisa CRUD
    pagination_class = DefaultPagination
```

### Contoh 2: Work Settings (Admin Edit, Supervisor View)
```python
class WorkSettingsViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrSupervisorReadOnly]  # Admin CRUD, Supervisor read
    
    def list(self, request):
        # Supervisor bisa lihat, Admin bisa lihat dan edit
        obj, _ = WorkSettings.objects.get_or_create()
        return JsonResponse(WorkSettingsSerializer(obj).data, safe=False)
    
    def update(self, request, pk=None):
        # Hanya Admin yang bisa update
        # Permission class sudah handle ini
        pass
```

### Contoh 3: Public Data (Admin Edit, All Users View)
```python
class DivisionViewSet(viewsets.ModelViewSet):
    queryset = Division.objects.all()
    serializer_class = DivisionSerializer
    permission_classes = [IsAdminOrReadOnly]  # Admin CRUD, semua user read
    pagination_class = DefaultPagination
```

### Contoh 4: Personal Data (Admin All, User Own Only)
```python
class AttendanceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [IsOwnerOrAdmin]  # Admin semua, user milik sendiri
    pagination_class = DefaultPagination
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.groups.filter(name='admin').exists():
            return Attendance.objects.select_related('employee').all()
        return Attendance.objects.select_related('employee').filter(user=user)
```

### Contoh 5: Team Data (Admin All, Supervisor Division, Employee Own)
```python
class TeamAttendanceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [IsDivisionMemberOrAdmin]  # Complex object-level permission
    pagination_class = DefaultPagination
    
    def get_queryset(self):
        user = self.request.user
        qs = Attendance.objects.select_related('employee')
        
        if user.is_superuser or user.groups.filter(name='admin').exists():
            return qs.all()
        elif user.groups.filter(name='supervisor').exists():
            try:
                division_id = user.employee.division_id
                return qs.filter(user__employee__division_id=division_id)
            except Exception:
                return qs.none()
        else:
            return qs.filter(user=user)
```

## Best Practices

### 1. **Gunakan Permission Class yang Paling Spesifik**
```python
# ❌ Jangan gunakan permission yang terlalu broad
permission_classes = [IsAuthenticated]  # Semua user authenticated

# ✅ Gunakan permission yang spesifik
permission_classes = [IsAdmin]  # Hanya admin
```

### 2. **Kombinasikan dengan Object-Level Permission**
```python
# ✅ Gunakan object-level permission untuk data personal
permission_classes = [IsOwnerOrAdmin]

# ✅ Atau filter di queryset
def get_queryset(self):
    user = self.request.user
    if user.is_superuser:
        return Model.objects.all()
    return Model.objects.filter(user=user)
```

### 3. **Handle Exception dengan Graceful**
```python
def get_queryset(self):
    try:
        # Logic yang bisa error
        division_id = user.employee.division_id
        return qs.filter(division_id=division_id)
    except Exception:
        # Return empty queryset jika error
        return qs.none()
```

### 4. **Gunakan Permission Class yang Konsisten**
```python
# ✅ Konsisten untuk semua ViewSet sejenis
class DivisionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]

class PositionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]  # Konsisten dengan Division
```

## Testing Permission Classes

### Test Case Example
```python
from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from .permissions import IsAdmin, IsSupervisor

class PermissionTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(username='admin', password='test')
        self.supervisor_user = User.objects.create_user(username='supervisor', password='test')
        
        admin_group = Group.objects.create(name='admin')
        supervisor_group = Group.objects.create(name='supervisor')
        
        self.admin_user.groups.add(admin_group)
        self.supervisor_user.groups.add(supervisor_group)
    
    def test_admin_permission(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/admin/employees/')
        self.assertEqual(response.status_code, 200)
    
    def test_supervisor_no_admin_access(self):
        self.client.force_authenticate(user=self.supervisor_user)
        response = self.client.get('/api/admin/employees/')
        self.assertEqual(response.status_code, 403)
```

## Migration dari Permission Lama

### Sebelum (Legacy)
```python
class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)
```

### Sesudah (New)
```python
from .permissions import IsAdminOrReadOnly

class DivisionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]  # Lebih clean dan documented
```

## Troubleshooting

### 1. **Permission Denied (403)**
- Cek apakah user sudah login
- Cek apakah user punya group yang sesuai
- Cek apakah permission class yang digunakan sudah benar

### 2. **Object Permission Error**
- Pastikan model punya field `user` atau `owner`
- Handle exception dengan graceful fallback
- Test dengan berbagai role user

### 3. **Performance Issue**
- Gunakan `select_related` dan `prefetch_related`
- Filter di queryset, bukan di permission class
- Cache permission check jika perlu

## Kesimpulan

Sistem permission yang baru memberikan:

1. **Keamanan yang lebih baik** - Setiap role hanya bisa akses data yang relevan
2. **Maintainability** - Kode lebih terorganisir dan mudah di-maintain
3. **Flexibility** - Mudah menambah permission class baru
4. **Documentation** - Setiap permission class punya dokumentasi lengkap
5. **Consistency** - Penggunaan yang konsisten di seluruh aplikasi

Gunakan permission class yang paling spesifik sesuai kebutuhan, dan selalu test dengan berbagai role user untuk memastikan keamanan berfungsi dengan baik.
