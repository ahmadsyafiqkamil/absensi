"""
Permission Classes untuk Role-Based Access Control (RBAC)

File ini berisi semua permission classes yang digunakan untuk mengontrol akses
berdasarkan role user (admin, supervisor, employee/pegawai).

Struktur Permission Classes:
1. Basic Role Permissions
2. Combined Role Permissions  
3. Object-Level Permissions
4. Legacy Permissions (for backward compatibility)

Usage:
    from .permissions import IsAdmin, IsSupervisor, IsEmployee
    
    class MyViewSet(viewsets.ModelViewSet):
        permission_classes = [IsAdmin]  # Hanya admin yang bisa akses
"""

from rest_framework import permissions


# ============================================================================
# BASIC ROLE PERMISSIONS
# ============================================================================

class IsAdmin(permissions.BasePermission):
    """
    Permission class untuk user dengan role admin.
    
    Access Control:
    - Admin: full access (CRUD operations)
    - Non-admin: no access
    
    Use Case:
    - Employee management
    - System settings
    - User provisioning
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(user.is_superuser or user.groups.filter(name='admin').exists())


class IsSupervisor(permissions.BasePermission):
    """
    Permission class untuk user dengan role supervisor.
    
    Access Control:
    - Supervisor: read access only
    - Non-supervisor: no access
    
    Use Case:
    - View team attendance
    - View division data
    - Read-only access to employee info
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(user.is_superuser or user.groups.filter(name='supervisor').exists())


class IsEmployee(permissions.BasePermission):
    """
    Permission class untuk user dengan role pegawai.
    
    Access Control:
    - Employee: read access only
    - Non-employee: no access
    
    Use Case:
    - View own attendance
    - View own employee data
    - Submit attendance corrections
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(user.is_superuser or user.groups.filter(name='pegawai').exists())


# ============================================================================
# COMBINED ROLE PERMISSIONS
# ============================================================================

class IsAdminOrSupervisor(permissions.BasePermission):
    """
    Permission class untuk admin dan supervisor.
    
    Access Control:
    - Admin: full access (CRUD operations)
    - Supervisor: read access only
    - Employee: no access
    
    Use Case:
    - Work settings (admin edit, supervisor view)
    - Division data (admin manage, supervisor view)
    - Team monitoring (supervisor view, admin full access)
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Admin: full access
        if user.is_superuser or user.groups.filter(name='admin').exists():
            return True
        
        # Supervisor: read-only access
        if user.groups.filter(name='supervisor').exists():
            return request.method in ("GET", "HEAD", "OPTIONS")
        
        return False

class IsAdminOrSupervisorWithApproval(permissions.BasePermission):
    """
    Permission class untuk admin dan supervisor dengan akses approval.
    
    Access Control:
    - Admin: full access (CRUD operations)
    - Supervisor: read access + approval actions (POST for approve/reject)
    - Employee: no access
    
    Use Case:
    - Attendance correction approval/rejection
    - Supervisor actions that require write access
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Admin: full access
        if user.is_superuser or user.groups.filter(name='admin').exists():
            return True
        
        # Supervisor: read access + approval actions (approve/reject)
        if user.groups.filter(name='supervisor').exists():
            # Allow GET, HEAD, OPTIONS for read access
            if request.method in ("GET", "HEAD", "OPTIONS"):
                return True
            
            # Allow POST for approval actions (approve/reject)
            if request.method == "POST":
                # Check if this is an approval action
                action = getattr(view, 'action', None)
                if action in ['approve', 'reject']:
                    return True
            
            return False
        
        return False


class IsAdminOrSupervisorOvertimeApproval(permissions.BasePermission):
    """
    Permission class untuk admin dan supervisor untuk approval overtime.
    
    Access Control:
    - Admin: full access
    - Supervisor: can approve overtime for their division
    - Employee: no access
    
    Use Case:
    - Overtime approval (function-based view)
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Admin: full access
        if user.is_superuser or user.groups.filter(name='admin').exists():
            return True
        
        # Supervisor: can approve overtime
        if user.groups.filter(name='supervisor').exists():
            return True
        
        return False


class IsAdminOrSupervisorReadOnly(permissions.BasePermission):
    """
    Permission class untuk admin dan supervisor (read-only untuk supervisor).
    
    Access Control:
    - Admin: full access (CRUD operations)
    - Supervisor: read access only
    - Employee: no access
    
    Use Case:
    - System configuration (admin edit, supervisor view)
    - Master data (admin manage, supervisor view)
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Admin: full access
        if user.is_superuser or user.groups.filter(name='admin').exists():
            return True
        
        # Supervisor: read-only access
        if user.groups.filter(name='supervisor').exists():
            return request.method in ("GET", "HEAD", "OPTIONS")
        
        return False


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permission class untuk admin write, semua user read.
    
    Access Control:
    - Admin: full access (CRUD operations)
    - Supervisor/Employee: read access only
    
    Use Case:
    - Public data (divisions, positions)
    - Reference data (holidays, work settings)
    """
    def has_permission(self, request, view):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return bool(request.user and request.user.is_authenticated)
        return bool(request.user and request.user.is_authenticated and 
                   (request.user.is_superuser or request.user.groups.filter(name='admin').exists()))


# ============================================================================
# OBJECT-LEVEL PERMISSIONS
# ============================================================================

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission class untuk user hanya bisa akses data milik sendiri, admin bisa akses semua.
    
    Access Control:
    - Admin: access to all data
    - User: access only to own data
    
    Use Case:
    - Personal attendance records
    - User profile data
    - Personal settings
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)
    
    def has_object_permission(self, request, view, obj):
        # Admin bisa akses semua
        if request.user.is_superuser or request.user.groups.filter(name='admin').exists():
            return True
        
        # User hanya bisa akses data milik sendiri
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'owner'):
            return obj.owner == request.user
        
        return False


class IsDivisionMemberOrAdmin(permissions.BasePermission):
    """
    Permission class untuk user hanya bisa akses data se-divisi, admin bisa akses semua.
    
    Access Control:
    - Admin: access to all data
    - Supervisor: access to data within same division
    - Employee: access only to own data
    
    Use Case:
    - Team attendance data
    - Division-specific reports
    - Employee data within division
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)
    
    def has_object_permission(self, request, view, obj):
        # Admin bisa akses semua
        if request.user.is_superuser or request.user.groups.filter(name='admin').exists():
            return True
        
        # Supervisor bisa akses data se-divisi
        if request.user.groups.filter(name='supervisor').exists():
            try:
                supervisor_division = request.user.employee.division
                if hasattr(obj, 'user') and hasattr(obj.user, 'employee'):
                    return obj.user.employee.division == supervisor_division
                elif hasattr(obj, 'division'):
                    return obj.division == supervisor_division
            except Exception:
                return False
        
        # Employee hanya bisa akses data milik sendiri
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        return False


# ============================================================================
# LEGACY PERMISSION CLASSES (for backward compatibility)
# ============================================================================

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Legacy permission class - use IsAdminOrReadOnly instead.
    """
    def has_permission(self, request, view):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsSupervisorOrAdmin(permissions.BasePermission):
    """
    Legacy permission class - use IsAdminOrSupervisor instead.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(
            user.is_superuser or user.groups.filter(name__in=['admin', 'supervisor']).exists()
        )


# ============================================================================
# PERMISSION MATRIX
# ============================================================================

"""
PERMISSION MATRIX - Panduan Penggunaan Permission Classes

┌─────────────────┬─────────┬────────────┬──────────┬─────────────┐
│ Permission      │ Admin   │ Supervisor│ Employee │ Anonymous   │
├─────────────────┼─────────┼────────────┼──────────┼─────────────┤
│ IsAdmin         │   CRUD  │    None    │   None   │    None     │
│ IsSupervisor    │   None  │    Read    │   None   │    None     │
│ IsEmployee      │   None  │    None    │   Read   │    None     │
├─────────────────┼─────────┼────────────┼──────────┼─────────────┤
│ IsAdminOrSupervisor│ CRUD  │    Read    │   None   │    None     │
│ IsAdminOrSupervisorReadOnly│ CRUD  │    Read    │   None   │    None     │
│ IsAdminOrReadOnly│ CRUD  │    Read    │   Read   │    None     │
├─────────────────┼─────────┼────────────┼──────────┼─────────────┤
│ IsOwnerOrAdmin  │   All   │    Own     │   Own    │    None     │
│ IsDivisionMemberOrAdmin│ All   │  Division│   Own    │    None     │
└─────────────────┴─────────┴────────────┴──────────┴─────────────┘

CRUD = Create, Read, Update, Delete
Read = Read only
Own = Own data only
Division = Data within same division
All = All data
None = No access
"""


# ============================================================================
# USAGE EXAMPLES
# ============================================================================

"""
CONTOH PENGGUNAAN PERMISSION CLASSES:

1. Employee Management (Admin only):
   class EmployeeViewSet(viewsets.ModelViewSet):
       permission_classes = [IsAdmin]

2. Work Settings (Admin edit, Supervisor view):
   class WorkSettingsViewSet(viewsets.ViewSet):
       permission_classes = [IsAdminOrSupervisorReadOnly]

3. Public Data (Admin edit, all authenticated users view):
   class DivisionViewSet(viewsets.ModelViewSet):
       permission_classes = [IsAdminOrReadOnly]

4. Personal Data (Admin all, user own only):
   class AttendanceViewSet(viewsets.ReadOnlyModelViewSet):
       permission_classes = [IsOwnerOrAdmin]

5. Team Data (Admin all, Supervisor division, Employee own):
   class TeamAttendanceViewSet(viewsets.ReadOnlyModelViewSet):
       permission_classes = [IsDivisionMemberOrAdmin]
"""
