# Role-Based Serializers - Serializer System

## Overview

Sistem serializer yang baru dibuat untuk memberikan akses data yang berbeda berdasarkan role user (admin, supervisor, employee/pegawai) dengan tingkat keamanan yang lebih tinggi.

## Struktur File

- `serializers.py` - Berisi semua role-based serializers
- `README_SERIALIZERS.md` - Dokumentasi lengkap (file ini)

## Kategori Serializer

### 1. **Base Serializers** (Common fields)
- `DivisionSerializer` - Data divisi (id, name)
- `PositionSerializer` - Data posisi (id, name)  
- `UserBasicSerializer` - Data user dasar (id, username, first_name, last_name, email)

### 2. **Employee Serializers** (Role-based access)
- `EmployeeAdminSerializer` - Full access (semua field)
- `EmployeeSupervisorSerializer` - Limited access (tidak include data personal)
- `EmployeeEmployeeSerializer` - Minimal access (hanya data dasar)

### 3. **Work Settings Serializers** (Role-based access)
- `WorkSettingsAdminSerializer` - Full access (semua field)
- `WorkSettingsSupervisorSerializer` - Read-only access

### 4. **Attendance Serializers** (Role-based access)
- `AttendanceAdminSerializer` - Full access (semua field)
- `AttendanceSupervisorSerializer` - Access ke data tim se-divisi
- `AttendanceEmployeeSerializer` - Access hanya ke data milik sendiri

### 5. **Attendance Correction Serializers** (Role-based access)
- `AttendanceCorrectionAdminSerializer` - Full access (semua field)
- `AttendanceCorrectionSupervisorSerializer` - Access ke koreksi tim se-divisi
- `AttendanceCorrectionEmployeeSerializer` - Access hanya ke koreksi milik sendiri

### 6. **Holiday Serializers** (Role-based access)
- `HolidayAdminSerializer` - Full access (CRUD)
- `HolidayPublicSerializer` - Read-only access untuk semua user

## Detail Setiap Serializer

### Employee Serializers

#### `EmployeeAdminSerializer`
```python
# Full access untuk admin
fields = [
    "id", "nip", "user", "user_id", "division", "division_id", 
    "position", "position_id", "gaji_pokok", "tmt_kerja", 
    "tempat_lahir", "tanggal_lahir"
]
```
- **Access**: Admin only
- **Use Case**: Employee management, full CRUD operations
- **Data**: Semua field termasuk data personal dan sensitif

#### `EmployeeSupervisorSerializer`
```python
# Limited access untuk supervisor
fields = [
    "id", "nip", "user", "division", "position", 
    "gaji_pokok", "tmt_kerja"
    # Tidak include: tempat_lahir, tanggal_lahir
]
```
- **Access**: Supervisor only
- **Use Case**: Team monitoring, performance review
- **Data**: Data profesional tanpa data personal sensitif

#### `EmployeeEmployeeSerializer`
```python
# Minimal access untuk employee
fields = [
    "id", "nip", "user", "division", "position"
    # Tidak include: gaji_pokok, tmt_kerja, data personal
]
```
- **Access**: Employee only
- **Use Case**: View own profile, organizational structure
- **Data**: Hanya data dasar yang diperlukan

### Work Settings Serializers

#### `WorkSettingsAdminSerializer`
```python
# Full access untuk admin
fields = [
    "id", "timezone", "start_time", "end_time", "required_minutes",
    "grace_minutes", "workdays", "friday_start_time", "friday_end_time",
    "friday_required_minutes", "friday_grace_minutes", "office_latitude",
    "office_longitude", "office_radius_meters"
]
```
- **Access**: Admin only
- **Use Case**: System configuration, work hours management
- **Data**: Semua pengaturan sistem

#### `WorkSettingsSupervisorSerializer`
```python
# Read-only access untuk supervisor
fields = [semua field sama dengan admin]
read_only_fields = [semua field]  # Semua field read-only
```
- **Access**: Supervisor only (read-only)
- **Use Case**: View system configuration, team scheduling
- **Data**: Bisa lihat tapi tidak bisa ubah

### Attendance Serializers

#### `AttendanceAdminSerializer`
```python
# Full access untuk admin
fields = [
    "id", "user", "employee", "date_local", "timezone",
    "check_in_at_utc", "check_in_lat", "check_in_lng", "check_in_accuracy_m",
    "check_out_at_utc", "check_out_lat", "check_out_lng", "check_out_accuracy_m",
    "is_holiday", "within_geofence", "minutes_late", "total_work_minutes",
    "note", "employee_note", "created_at", "updated_at"
]
```
- **Access**: Admin only
- **Use Case**: System monitoring, audit, reporting
- **Data**: Semua data absensi semua user

#### `AttendanceSupervisorSerializer`
```python
# Access untuk supervisor (tim se-divisi)
fields = [semua field sama dengan admin]
read_only_fields = [
    "user", "employee", "date_local", "timezone", "check_in_at_utc",
    "check_out_at_utc", "is_holiday", "within_geofence", "minutes_late",
    "total_work_minutes", "employee_note", "created_at", "updated_at"
]
```
- **Access**: Supervisor only (read-only)
- **Use Case**: Team monitoring, performance review
- **Data**: Data tim se-divisi, tidak bisa ubah

#### `AttendanceEmployeeSerializer`
```python
# Access untuk employee (data sendiri)
fields = [
    "id", "date_local", "timezone", "check_in_at_utc", "check_in_lat",
    "check_in_lng", "check_in_accuracy_m", "check_out_at_utc", "check_out_lat",
    "check_out_lng", "check_out_accuracy_m", "is_holiday", "within_geofence",
    "minutes_late", "total_work_minutes", "note", "employee_note",
    "created_at", "updated_at"
]
read_only_fields = [
    "user", "employee", "date_local", "timezone", "check_in_at_utc",
    "check_out_at_utc", "is_holiday", "within_geofence", "minutes_late",
    "total_work_minutes", "employee_note", "created_at", "updated_at"
]
```
- **Access**: Employee only (read-only)
- **Use Case**: Personal attendance record, self-monitoring
- **Data**: Hanya data absensi milik sendiri

### Attendance Correction Serializers

#### `AttendanceCorrectionAdminSerializer`
```python
# Full access untuk admin
fields = [
    "id", "user", "date_local", "type", "proposed_check_in_local",
    "proposed_check_out_local", "reason", "attachment", "status",
    "reviewed_by", "reviewed_at", "decision_note", "created_at", "updated_at"
]
```
- **Access**: Admin only
- **Use Case**: System oversight, audit trail
- **Data**: Semua koreksi absensi

#### `AttendanceCorrectionSupervisorSerializer`
```python
# Access untuk supervisor (tim se-divisi)
fields = [semua field sama dengan admin]
read_only_fields = [
    "user", "status", "reviewed_by", "reviewed_at", "decision_note",
    "created_at", "updated_at"
]
```
- **Access**: Supervisor only (partial write)
- **Use Case**: Approve/reject corrections, team management
- **Data**: Koreksi tim se-divisi, bisa approve/reject

#### `AttendanceCorrectionEmployeeSerializer`
```python
# Access untuk employee (koreksi sendiri)
fields = [semua field sama dengan admin]
read_only_fields = [
    "user", "status", "reviewed_by", "reviewed_at", "decision_note",
    "created_at", "updated_at"
]
```
- **Access**: Employee only (partial write)
- **Use Case**: Submit corrections, view status
- **Data**: Hanya koreksi milik sendiri, bisa submit

## Implementasi di ViewSet

### Contoh 1: Employee Management dengan Role-Based Serializers
```python
class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related('user', 'division', 'position').all()
    pagination_class = DefaultPagination
    
    def get_serializer_class(self):
        user = self.request.user
        
        if user.is_superuser or user.groups.filter(name='admin').exists():
            return EmployeeAdminSerializer
        elif user.groups.filter(name='supervisor').exists():
            return EmployeeSupervisorSerializer
        else:
            return EmployeeEmployeeSerializer
```

### Contoh 2: Work Settings dengan Role-Based Serializers
```python
class WorkSettingsViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrSupervisorReadOnly]
    
    def get_serializer_class(self):
        user = self.request.user
        
        if user.is_superuser or user.groups.filter(name='admin').exists():
            return WorkSettingsAdminSerializer
        else:
            return WorkSettingsSupervisorSerializer
    
    def list(self, request):
        obj, _ = WorkSettings.objects.get_or_create()
        serializer_class = self.get_serializer_class()
        serializer = serializer_class(obj)
        return JsonResponse(serializer.data, safe=False)
    
    def update(self, request, pk=None):
        # Hanya admin yang bisa update
        serializer_class = self.get_serializer_class()
        if serializer_class == WorkSettingsSupervisorSerializer:
            return JsonResponse({"detail": "Read-only access"}, status=403)
        
        # Logic update untuk admin
        pass
```

### Contoh 3: Attendance dengan Role-Based Serializers
```python
class AttendanceViewSet(viewsets.ReadOnlyModelViewSet):
    pagination_class = DefaultPagination
    
    def get_serializer_class(self):
        user = self.request.user
        
        if user.is_superuser or user.groups.filter(name='admin').exists():
            return AttendanceAdminSerializer
        elif user.groups.filter(name='supervisor').exists():
            return AttendanceSupervisorSerializer
        else:
            return AttendanceEmployeeSerializer
    
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

## Keuntungan Role-Based Serializers

### 1. **Keamanan Data**
- Setiap role hanya bisa akses field yang relevan
- Data sensitif (gaji, tanggal lahir) tidak terekspos ke role yang tidak berhak
- Kontrol akses yang lebih granular

### 2. **Performance**
- Serializer yang lebih ringan sesuai kebutuhan role
- Tidak ada field yang tidak perlu di-serialize
- Query yang lebih efisien

### 3. **Maintainability**
- Kode lebih terorganisir dan mudah di-maintain
- Mudah menambah field baru untuk role tertentu
- Konsistensi dalam akses data

### 4. **API Documentation**
- Swagger/OpenAPI yang lebih jelas
- Field yang ditampilkan sesuai dengan role
- Dokumentasi yang lebih akurat

## Migration dari Serializer Lama

### Sebelum (Legacy)
```python
class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer  # Semua field terekspos
```

### Sesudah (Role-Based)
```python
class EmployeeViewSet(viewsets.ModelViewSet):
    def get_serializer_class(self):
        user = self.request.user
        if user.is_superuser or user.groups.filter(name='admin').exists():
            return EmployeeAdminSerializer
        elif user.groups.filter(name='supervisor').exists():
            return EmployeeSupervisorSerializer
        else:
            return EmployeeEmployeeSerializer
```

## Best Practices

### 1. **Gunakan Serializer yang Paling Spesifik**
```python
# ✅ Gunakan role-specific serializer
def get_serializer_class(self):
    if self.request.user.groups.filter(name='admin').exists():
        return EmployeeAdminSerializer
    return EmployeeEmployeeSerializer

# ❌ Jangan gunakan serializer yang terlalu broad
serializer_class = EmployeeSerializer  # Semua field terekspos
```

### 2. **Kombinasikan dengan Permission Classes**
```python
class EmployeeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrSupervisorReadOnly]
    
    def get_serializer_class(self):
        # Permission class sudah handle access control
        # Serializer handle field exposure
        pass
```

### 3. **Handle Exception dengan Graceful**
```python
def get_queryset(self):
    try:
        division_id = user.employee.division_id
        return qs.filter(division_id=division_id)
    except Exception:
        return qs.none()  # Return empty jika error
```

### 4. **Gunakan Serializer yang Konsisten**
```python
# ✅ Konsisten untuk semua ViewSet sejenis
class DivisionViewSet(viewsets.ModelViewSet):
    def get_serializer_class(self):
        # Logic yang konsisten dengan ViewSet lain
        pass
```

## Testing Role-Based Serializers

### Test Case Example
```python
from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from .models import Employee
from .serializers import EmployeeAdminSerializer, EmployeeSupervisorSerializer

class SerializerTestCase(TestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(username='admin', password='test')
        self.supervisor_user = User.objects.create_user(username='supervisor', password='test')
        
        admin_group = Group.objects.create(name='admin')
        supervisor_group = Group.objects.create(name='supervisor')
        
        self.admin_user.groups.add(admin_group)
        self.supervisor_user.groups.add(supervisor_group)
    
    def test_admin_serializer_fields(self):
        serializer = EmployeeAdminSerializer()
        expected_fields = ['id', 'nip', 'user', 'user_id', 'division', 'division_id', 
                          'position', 'position_id', 'gaji_pokok', 'tmt_kerja', 
                          'tempat_lahir', 'tanggal_lahir']
        self.assertEqual(list(serializer.fields.keys()), expected_fields)
    
    def test_supervisor_serializer_fields(self):
        serializer = EmployeeSupervisorSerializer()
        expected_fields = ['id', 'nip', 'user', 'division', 'position', 'gaji_pokok', 'tmt_kerja']
        self.assertEqual(list(serializer.fields.keys()), expected_fields)
        # Pastikan field sensitif tidak ada
        self.assertNotIn('tempat_lahir', serializer.fields)
        self.assertNotIn('tanggal_lahir', serializer.fields)
```

## Kesimpulan

Sistem role-based serializers memberikan:

1. **Keamanan data yang lebih baik** - Setiap role hanya bisa akses field yang relevan
2. **Performance yang lebih baik** - Serializer yang lebih ringan sesuai kebutuhan
3. **Maintainability** - Kode lebih terorganisir dan mudah di-maintain
4. **API yang lebih clean** - Field yang ditampilkan sesuai dengan role
5. **Konsistensi** - Penggunaan yang konsisten di seluruh aplikasi

Gunakan serializer yang paling spesifik sesuai kebutuhan role, dan selalu test dengan berbagai role user untuk memastikan keamanan data berfungsi dengan baik.
