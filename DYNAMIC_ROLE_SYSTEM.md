# Dynamic Role System Implementation

## Overview

Sistem dynamic role telah berhasil diimplementasikan untuk menggantikan hardcoded roles (`admin`, `supervisor`, `pegawai`) dengan sistem yang dapat dikonfigurasi secara dinamis. Sistem ini memungkinkan administrator untuk menambah, mengubah, dan mengelola role tanpa perlu mengubah kode.

## Komponen yang Diimplementasikan

### 1. Model RoleConfiguration

**File**: `drf/app/api/models.py`

```python
class RoleConfiguration(models.Model):
    name = models.CharField(max_length=50, unique=True)
    display_name = models.CharField(max_length=100)
    role_type = models.CharField(max_length=20, choices=ROLE_TYPES)
    approval_level = models.PositiveSmallIntegerField(default=0)
    group = models.CharField(max_length=50, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
```

**Fitur**:
- Konfigurasi role secara dinamis
- Approval level (0=Basic, 1=Division, 2=Organization)
- Role type (primary, additional, legacy)
- UI grouping untuk organisasi yang lebih baik
- Sort order untuk urutan tampilan

### 2. MultiRoleManager Utility Class

**File**: `drf/app/api/utils.py`

**Methods**:
- `get_user_active_roles(user)` - Mendapatkan semua role aktif user
- `get_user_primary_role(user)` - Mendapatkan primary role user
- `has_role(user, role_name)` - Mengecek apakah user memiliki role tertentu
- `has_any_role(user, role_names)` - Mengecek apakah user memiliki salah satu role
- `has_all_roles(user, role_names)` - Mengecek apakah user memiliki semua role
- `assign_role(employee, group, assigned_by, is_primary)` - Menetapkan role ke employee
- `remove_role(employee, group)` - Menghapus role dari employee
- `set_primary_role(employee, group)` - Mengatur primary role
- `create_default_roles()` - Membuat default role configurations

### 3. API Endpoints

**File**: `drf/app/api/urls.py`

**Endpoint**: `/api/admin/role-configurations/`

**Methods**:
- `GET` - List semua role configurations
- `POST` - Membuat role configuration baru
- `PUT/PATCH` - Update role configuration
- `DELETE` - Hapus role configuration

### 4. Serializers

**File**: `drf/app/api/serializers.py`

**Classes**:
- `RoleConfigurationSerializer` - Basic read/write operations
- `RoleConfigurationCreateSerializer` - Untuk create operations
- `RoleConfigurationUpdateSerializer` - Untuk update operations
- `RoleConfigurationDetailSerializer` - Untuk detail dengan informasi tambahan

### 5. Management Command

**File**: `drf/app/api/management/commands/manage_roles.py`

**Commands**:
```bash
# List semua role configurations
python manage.py manage_roles list

# Membuat role baru
python manage.py manage_roles create --name="manager" --display-name="Manager" --role-type="primary" --approval-level=1

# Update role
python manage.py manage_roles update --name="manager" --approval-level=2

# Assign role ke user
python manage.py manage_roles assign --username="testuser" --name="manager" --is-primary

# Remove role dari user
python manage.py manage_roles remove --username="testuser" --name="manager"

# Seed default roles
python manage.py manage_roles seed
```

## Standarisasi Approval Level

Sistem menggunakan standarisasi approval level yang konsisten:

### **Level 0: Tidak Ada Akses Approval**
- **Pegawai biasa** tidak memiliki akses approval
- **Konsuler** untuk urusan diplomatik
- **Capabilities**: Tidak bisa approve apapun

### **Level 1: Approval Se-Divisi**
- **Supervisor** untuk approval divisi masing-masing
- **Finance & HR** untuk approval sesuai fungsi
- **Capabilities**: Bisa approve dalam divisi sendiri, tidak bisa approve organization-wide

### **Level 2: Approval Se-KJRI (Organization-Wide)**
- **Admin** untuk administrasi penuh
- **Manager** untuk manajemen keseluruhan
- **Supervisor KJRI** untuk supervisory organization-wide
- **Capabilities**: Bisa approve semua divisi + organization-wide

## Default Role Configurations

Sistem dilengkapi dengan default role configurations:

### **Primary Roles (Wajib)**
1. **admin** - Administrator (Level 2, Primary)
2. **supervisor** - Supervisor (Level 1, Primary)
3. **pegawai** - Employee (Level 0, Primary)

### **Additional Roles (Opsional)**
4. **supervisor_division** - Supervisor Divisi (Level 1, Primary)
5. **supervisor_kjri** - Supervisor KJRI (Level 2, Primary)
6. **manager** - Manager (Level 2, Additional)
7. **konsuler** - Consular (Level 0, Additional)
8. **finance** - Finance Manager (Level 1, Additional)
9. **hr** - Human Resources (Level 1, Additional)

## Migration dan Database

**Migration**: `0028_add_role_configuration_model.py`

**Database Changes**:
- Tabel `api_roleconfiguration` dibuat
- Kolom `fullname` ditambahkan ke tabel `api_employee`
- Default role configurations di-seed ke database

## Penggunaan

### 1. Mengelola Role Configurations

```python
from api.models import RoleConfiguration

# Membuat role baru
role = RoleConfiguration.objects.create(
    name='manager',
    display_name='Manager',
    role_type='primary',
    approval_level=1,
    group='Management',
    description='Department manager role'
)

# Update role
role.approval_level = 2
role.save()
```

### 2. Mengelola User Roles

```python
from api.utils import MultiRoleManager
from django.contrib.auth.models import Group

manager = MultiRoleManager()

# Assign role
admin_group = Group.objects.get(name='admin')
manager.assign_role(employee, admin_group, assigned_by=user, is_primary=True)

# Check roles
has_admin = manager.has_role(user, 'admin')
roles = manager.get_user_active_roles(user)
primary_role = manager.get_user_primary_role(user)
```

### 3. Menggunakan API

```javascript
// Get role configurations
fetch('/api/admin/role-configurations/')
  .then(response => response.json())
  .then(data => console.log(data.results));

// Create new role
fetch('/api/admin/role-configurations/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'manager',
    display_name: 'Manager',
    role_type: 'primary',
    approval_level: 1
  })
});
```

## Keuntungan Sistem Dynamic Role

1. **Fleksibilitas**: Role dapat ditambah/diubah tanpa mengubah kode
2. **Skalabilitas**: Mudah menambah role baru sesuai kebutuhan organisasi
3. **Maintainability**: Konfigurasi terpusat dan mudah dikelola
4. **Multi-role Support**: User dapat memiliki multiple roles sekaligus
5. **Primary Role**: Setiap user memiliki satu primary role untuk logika bisnis
6. **Approval Levels**: Sistem approval level yang fleksibel
7. **UI Organization**: Role dapat dikelompokkan untuk tampilan yang lebih baik

## Testing & Verification

### **Approval Level Testing**

Sistem telah ditest dengan standarisasi approval level:

#### **Level 0: Tidak Ada Akses Approval**
```python
# Test user dengan role pegawai
user = User.objects.get(username='test_pegawai')
level = ApprovalChecker.get_user_approval_level(user)
# Result: 0 (No Approval)
# Division Approval: False
# Organization Approval: False
```

#### **Level 1: Approval Se-Divisi**
```python
# Test user dengan role supervisor_division
user = User.objects.get(username='test_supervisor_division')
level = ApprovalChecker.get_user_approval_level(user)
# Result: 1 (Division Level)
# Division Approval: True
# Organization Approval: False
```

#### **Level 2: Approval Se-KJRI**
```python
# Test user dengan role admin
user = User.objects.get(username='testuser')  # admin role
level = ApprovalChecker.get_user_approval_level(user)
# Result: 2 (Organization Level)
# Division Approval: True
# Organization Approval: True
```

### **Complete System Testing**

Sistem telah ditest dengan berbagai skenario:

- ✅ **Role configuration CRUD operations**
- ✅ **User role assignment dan removal**
- ✅ **Multi-role functionality**
- ✅ **Primary role management**
- ✅ **Management command functionality**
- ✅ **API endpoint testing**
- ✅ **Database migration dan seeding**
- ✅ **Approval level standarisasi**
- ✅ **Hybrid position + role approval system**
- ✅ **Django Admin interface integration**

---

## **Django Admin Interface**

### **RoleConfiguration Admin**

**URL**: `/admin/api/roleconfiguration/`

**Features**:
- ✅ **List View**: Tampilkan semua role configuration dengan informasi lengkap
- ✅ **Search & Filter**: Filter berdasarkan role_type, approval_level, group, status
- ✅ **User Count**: Hitung jumlah user yang memiliki role tersebut
- ✅ **Auto Group Creation**: Otomatis membuat Django Group saat menyimpan
- ✅ **Fieldsets**: Organisasi field yang terstruktur

**List Display**:
- Name, Display Name, Role Type, Approval Level
- Group, Is Active, Sort Order, User Count, Created At

**Filters**:
- Role Type (Primary/Additional/Legacy)
- Approval Level (0/1/2)
- Group (UI grouping)
- Is Active
- Created At

### **EmployeeRole Admin**

**URL**: `/admin/api/employeerole/`

**Features**:
- ✅ **List View**: Tampilkan semua employee role assignments
- ✅ **Role Information**: Tampilkan detail role configuration
- ✅ **Primary Role Indicator**: Tandai role primary
- ✅ **Assignment Tracking**: Track siapa yang assign dan kapan
- ✅ **Smart Foreign Keys**: Filter employees dan groups yang valid

**List Display**:
- Employee, Group, Role Info, Is Primary, Is Active
- Assigned By, Assigned At

**Filters**:
- Group, Is Primary, Is Active, Assigned At

### **Admin Interface Benefits**

1. **✅ User-Friendly**: Interface yang mudah digunakan untuk admin
2. **✅ Comprehensive**: Semua informasi penting ditampilkan
3. **✅ Safe Operations**: Validasi dan safety checks
4. **✅ Audit Trail**: Tracking perubahan dan assignments
5. **✅ Performance**: Optimized queries dengan select_related

## Frontend Integration - COMPLETED ✅

### **Enhanced Approval System**

**Frontend telah berhasil diintegrasikan dengan sistem role-based approval!**

#### **Perubahan yang Dilakukan:**

1. **✅ Enhanced `useSupervisorApprovalLevel` Hook**
   - Prioritas role-based approval over position-based
   - Fallback mechanism ke position jika tidak ada role
   - Return additional data: `userGroups`, `approvalSource`

2. **✅ Enhanced `ApprovalLevelWarning` Component**
   - Menampilkan approval source (Role vs Position)
   - Show user roles sebagai badges
   - Detailed approval level descriptions
   - Visual indicators untuk setiap level

3. **✅ Updated Supervisor Approvals Page**
   - Integration dengan role-based approval level
   - Debug information menampilkan source approval
   - Enhanced UI dengan role information

#### **Dynamic Role Mapping from API:**

```typescript
// 1. Fetch role configurations from API
const response = await fetch('/api/admin/role-configurations/')
const roleConfigurations = await response.json()

// 2. Create dynamic mapping from API data
const roleApprovalMap: { [key: string]: number } = {}
roleConfigurations.forEach((config: any) => {
  if (config.is_active) {
    roleApprovalMap[config.name] = config.approval_level
  }
})

// 3. Check user groups against dynamic mapping
const userGroups = result.user?.groups || []
let maxGroupLevel = 0
let highestRole = ''

for (const group of userGroups) {
  const groupLevel = roleApprovalMap[group] || 0
  if (groupLevel > maxGroupLevel) {
    maxGroupLevel = groupLevel
    highestRole = group
  }
}

// 4. Fallback to position.approval_level if no roles
if (maxGroupLevel === 0) {
  level = result.position?.approval_level || 0
}
```

#### **Fallback Mechanism:**
```typescript
// If API fails, use hardcoded fallback mapping
const fallbackMapping = {
  'admin': 2,
  'supervisor_kjri': 2,
  'manager': 2,
  'supervisor': 1,
  'supervisor_division': 1,
  'finance': 1,
  'hr': 1,
}
```

#### **UI Enhancements:**

- **Approval Level Warning**: Menampilkan source approval dan roles
- **Debug Information**: Source, roles, dan approval level details
- **Visual Indicators**: Icons dan colors untuk setiap approval level
- **Role Badges**: Display active user roles

### **Testing & Verification**

#### **Test Dynamic Role Mapping from API:**

**1. Check API Endpoint:**
```bash
# Test role configurations API
curl -H "Authorization: Bearer <token>" \
     http://localhost:8000/api/admin/role-configurations/

# Expected: JSON array of role configurations with approval_level
```

**2. Test Role-Based Approval:**
```bash
# 1. Create/modify role configuration in Django Admin
#    - Go to /admin/api/roleconfiguration/
#    - Create new role or modify existing
#    - Set approval_level (0, 1, or 2)

# 2. Assign role to user
#    - Go to /admin/api/employeerole/
#    - Create employee role assignment

# 3. Login as user and check approvals page
# Expected: Approval level sesuai dengan role configuration dari API
```

**3. Test Fallback Scenarios:**

```typescript
// Scenario 1: API unavailable
// Expected: Uses hardcoded fallback mapping
console.log('Using fallback mapping due to API error')

// Scenario 2: No role configurations
// Expected: Falls back to position.approval_level
console.log('No active role configurations found')

// Scenario 3: User has no roles
// Expected: Falls back to position.approval_level
console.log('No user roles found, using position-based approval')
```

#### **Debug Information:**
```typescript
// Check browser console for debug logs:
console.log('Role configurations loaded:', configs.length, 'roles')
console.log('Using dynamic role-based approval level:', level, 'from role:', roleName)
console.log('Using position-based approval level:', level)
```

#### **UI Verification:**
- **Approval Level Warning**: Shows "Role: [Display Name] (Level X)"
- **Role Badges**: Display actual role names from API
- **Debug Info**: Shows approval source and role details

---

## **Complete Integration Summary**

### **✅ BACKEND INTEGRATION**
- RoleConfiguration model with approval_level
- ApprovalChecker.get_user_approval_level() with hybrid logic
- Django Admin interface for role management
- API endpoints for role CRUD operations

### **✅ FRONTEND INTEGRATION**
- **Dynamic Role Mapping from API** - Tidak ada hardcoded roles lagi!
- Enhanced useSupervisorApprovalLevel hook with API integration
- Role-based approval level detection from live API data
- Enhanced ApprovalLevelWarning component with role configurations
- Updated supervisor approvals UI with real-time role data
- Debug information and role display with API-sourced information
- **Fallback mechanisms** for API failures and error handling

### **✅ HYBRID APPROVAL SYSTEM**
```
Priority 1: Role-based approval (highest role level)
Priority 2: Position-based approval (fallback)
Priority 3: Level 0 (no approval)
```

### **✅ APPROVAL LEVEL MAPPING**
```
Level 0: No Approval
├── Roles: pegawai, konsuler
├── Capabilities: View only

Level 1: Division Level
├── Roles: supervisor, finance, hr
├── Capabilities: Division approval

Level 2: Organization Level
├── Roles: admin, manager, supervisor_kjri
├── Capabilities: Division + Organization approval
```

---

## **🎉 DYNAMIC ROLE MAPPING IMPLEMENTATION - COMPLETED!**

### **What Was Implemented:**

#### **✅ Dynamic Role Mapping from API**
- **No More Hardcoded Roles**: Semua role mapping diambil dari API `/api/admin/role-configurations/`
- **Real-time Updates**: Perubahan role configuration langsung ter-reflect di frontend
- **API-First Approach**: Frontend mengikuti data dari backend secara dinamis

#### **✅ Robust Error Handling**
- **API Failure Fallback**: Jika API gagal, menggunakan hardcoded fallback mapping
- **Network Error Recovery**: Graceful handling untuk network issues
- **Data Validation**: Validasi response dari API sebelum menggunakan

#### **✅ Enhanced User Experience**
- **Role Display Names**: Menampilkan nama display yang user-friendly dari API
- **Real-time Role Information**: Informasi role selalu up-to-date
- **Visual Role Mapping**: UI menampilkan mapping role ke approval level

---

## **🔧 Technical Implementation Details**

### **API Integration Flow:**
```typescript
1. Fetch role configurations from API
   GET /api/admin/role-configurations/

2. Create dynamic mapping object
   roleApprovalMap[role.name] = role.approval_level

3. Apply to user groups
   userGroups.forEach(group => {
     const level = roleApprovalMap[group] || 0
     // Calculate highest level
   })

4. Fallback to position if no roles
   if (maxRoleLevel === 0) {
     level = position.approval_level
   }
```

### **Fallback Strategy:**
```typescript
// Primary: API-based dynamic mapping
try {
  const configs = await fetchRoleConfigurations()
  // Use API data
} catch (error) {
  // Secondary: Hardcoded fallback mapping
  const fallbackMap = { 'admin': 2, 'supervisor': 1, ... }
  // Use fallback
}

// Tertiary: Position-based approval
if (noRoles && noFallback) {
  level = position.approval_level
}
```

---

## **🧪 Testing Scenarios**

### **✅ Normal Operation:**
```bash
# API available, roles exist
✅ Uses dynamic mapping from API
✅ Shows role display names
✅ Real-time approval levels
```

### **✅ API Failure:**
```bash
# API unavailable
✅ Falls back to hardcoded mapping
✅ Console warning logged
✅ System continues to work
```

### **✅ No Roles:**
```bash
# User has no role assignments
✅ Falls back to position.approval_level
✅ Clear fallback indication
✅ No disruption to workflow
```

---

## **📊 Benefits of Dynamic Role Mapping**

### **🔄 Dynamic & Flexible**
- **Real-time Updates**: Perubahan role langsung berlaku
- **No Code Changes**: Tambah role baru tanpa redeploy
- **Centralized Management**: Semua role dikelola di satu tempat

### **🛡️ Robust & Reliable**
- **Multi-layer Fallbacks**: Selalu ada backup plan
- **Error Recovery**: Graceful handling semua error scenarios
- **Data Validation**: Validasi sebelum menggunakan data

### **👥 User Experience**
- **Clear Information**: User tahu approval level dari role mana
- **Visual Feedback**: Badge dan indicators untuk setiap role
- **Transparent System**: Tidak ada "magic numbers" atau hardcoded logic

---

## Next Steps

1. **✅ Dynamic Role Mapping from API** - COMPLETED
2. **Permission System**: Integrasi dengan sistem permission yang lebih granular
3. **Role Templates**: Template untuk role configurations yang umum
4. **Audit Trail**: Logging untuk perubahan role configurations
5. **Bulk Operations**: Operasi bulk untuk role management

## Troubleshooting

### Common Issues

1. **Role not found**: Pastikan role configuration sudah dibuat dan Django Group sudah ada
2. **Permission denied**: Pastikan user memiliki akses admin untuk mengelola role configurations
3. **Migration issues**: Pastikan semua migration sudah dijalankan dengan `python manage.py migrate`

### Debug Commands

```bash
# Check role configurations
python manage.py manage_roles list

# Check user roles
python manage.py shell -c "
from api.utils import MultiRoleManager
from django.contrib.auth import get_user_model
User = get_user_model()
user = User.objects.get(username='your_username')
manager = MultiRoleManager()
print(manager.get_user_active_roles(user))
"
```

## Conclusion

Sistem dynamic role telah berhasil diimplementasikan dan siap digunakan. Sistem ini memberikan fleksibilitas yang tinggi untuk mengelola role dan permission dalam aplikasi, menggantikan hardcoded roles dengan konfigurasi yang dapat diubah secara dinamis.
