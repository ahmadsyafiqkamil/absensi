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
    Permission class untuk user dengan position approval level >= 1 (supervisor capabilities).
    
    Access Control:
    - Position approval level >= 1: read access only
    - Position approval level 0: no access
    - No position/employee: no access
    
    Use Case:
    - View team attendance
    - View division data
    - Read-only access to employee info
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Superuser always has access
        if user.is_superuser:
            return True
        
        # Use position-based approval checking
        from .utils import ApprovalChecker
        approval_level = ApprovalChecker.get_user_approval_level(user)
        
        # Only level 1 and 2 have supervisor capabilities
        return approval_level >= 1


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
    Permission class untuk admin dan position approval level >= 1 (supervisor capabilities).
    
    Access Control:
    - Admin: full access (CRUD operations)
    - Position approval level >= 1: read access only
    - Position approval level 0: no access
    
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
        
        # Use position-based approval checking for supervisor capabilities
        from .utils import ApprovalChecker
        approval_level = ApprovalChecker.get_user_approval_level(user)
        
        # Position approval level >= 1: read-only access
        if approval_level >= 1:
            return request.method in ("GET", "HEAD", "OPTIONS")
        
        return False

class IsAdminOrSupervisorWithApproval(permissions.BasePermission):
    """
    Permission class untuk admin dan position approval level >= 1 dengan akses approval.
    
    Access Control:
    - Admin: full access (CRUD operations)
    - Position approval level >= 1: read access + approval actions (POST for approve/reject)
    - Position approval level 0: read access only, no approval actions
    - No position/employee: no access
    
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
        
        # Use position-based approval checking
        from .utils import ApprovalChecker
        approval_level = ApprovalChecker.get_user_approval_level(user)
        
        # Allow GET, HEAD, OPTIONS for read access if has supervisor capabilities
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return approval_level >= 1
        
        # Check approval level for approval actions
        if request.method == "POST":
            action = getattr(view, 'action', None)
            if action in ['approve', 'reject']:
                # Only level 1 and 2 have approval permission
                return approval_level >= 1
        
        return False


class IsAdminOrSupervisorOvertimeApproval(permissions.BasePermission):
    """
    Permission class untuk admin dan position approval level >= 1 untuk approval overtime.
    
    Access Control:
    - Admin: full access
    - Position approval level >= 1: can approve overtime
    - Position approval level 0: no access to overtime approval
    - No position/employee: no access
    
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
        
        # Use position-based approval checking
        from .utils import ApprovalChecker
        approval_level = ApprovalChecker.get_user_approval_level(user)
        
        # Only level 1 and 2 have overtime approval permission
        return approval_level >= 1


class IsAdminOrSupervisorReadOnly(permissions.BasePermission):
    """
    Permission class untuk admin dan position approval level >= 1 (read-only untuk supervisor).
    
    Access Control:
    - Admin: full access (CRUD operations)
    - Position approval level >= 1: read access only
    - Position approval level 0: no access
    
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
        
        # Use position-based approval checking for supervisor capabilities
        from .utils import ApprovalChecker
        approval_level = ApprovalChecker.get_user_approval_level(user)
        
        # Position approval level >= 1: read-only access
        if approval_level >= 1:
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
    Updated to use position-based approval levels.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Admin/Superuser access
        if user.is_superuser or user.groups.filter(name='admin').exists():
            return True
        
        # Use position-based approval checking for supervisor capabilities
        from .utils import ApprovalChecker
        approval_level = ApprovalChecker.get_user_approval_level(user)
        
        return approval_level >= 1


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


class IsOvertimeRequestOwnerOrSupervisor(permissions.BasePermission):
    """
    Permission class untuk overtime request management.
    
    Access Control:
    - Admin: full access to all overtime requests
    - Supervisor: can view and approve overtime requests from their division
    - Employee: can create and view their own overtime requests only
    
    Use Case:
    - Overtime request management (ViewSet actions)
    """
    
    def has_permission(self, request, view):
        """Check if user has basic permission to access overtime requests"""
        if not request.user.is_authenticated:
            return False
        
        # Admin has full access
        if request.user.is_superuser or request.user.groups.filter(name='admin').exists():
            return True
        
        # Supervisor has access
        if request.user.groups.filter(name='supervisor').exists():
            return True
        
        # Employee has access
        if request.user.groups.filter(name='pegawai').exists():
            return True
        
        return False
    
    def has_object_permission(self, request, view, obj):
        """Check if user has permission to access specific overtime request"""
        user = request.user
        
        # Admin has full access
        if user.is_superuser or user.groups.filter(name='admin').exists():
            return True
        
        # Supervisor can access overtime requests from their division or org-wide
        if user.groups.filter(name='supervisor').exists():
            try:
                supervisor_employee = user.employee
                
                # Check if supervisor has org-wide approval permission
                if (supervisor_employee.position and 
                    supervisor_employee.position.can_approve_overtime_org_wide):
                    # Org-wide supervisors can see any request
                    return True
                else:
                    # Division supervisors can only see requests from their division
                    return supervisor_employee.division == obj.employee.division
            except:
                pass
            return False
        
        # Employee can only access their own overtime requests
        if user.groups.filter(name='pegawai').exists():
            return obj.user == user
        
        return False


class IsOvertimeRequestApprover(permissions.BasePermission):
    """
    Permission class for overtime request approval actions using position-based approval levels.
    
    Access Control:
    - Admin/Superuser: can approve any overtime request (both level 1 and final)
    - Position approval level 2 + org-wide: can approve any overtime request (final approval)
    - Position approval level 1: can approve overtime requests from their division (level 1)
    - Position approval level 0: no approval permission
    - No position/employee: no approval permission
    
    Use Case:
    - Overtime approval/rejection actions with 2-level approval system
    """
    
    def has_permission(self, request, view):
        """Check if user has permission to approve overtime requests"""
        if not request.user.is_authenticated:
            return False
        
        # Admin/Superuser can approve
        if request.user.is_superuser or request.user.groups.filter(name='admin').exists():
            return True
        
        # Use position-based approval checking
        from .utils import ApprovalChecker
        approval_level = ApprovalChecker.get_user_approval_level(request.user)
        
        # Only level 1 and 2 have approval permission
        return approval_level >= 1
    
    def has_object_permission(self, request, view, obj):
        """Check if user can approve specific overtime request"""
        user = request.user
        
        # Admin/Superuser can approve any request
        if user.is_superuser or user.groups.filter(name='admin').exists():
            return True
        
        # Use position-based approval checking
        from .utils import ApprovalChecker
        
        # Check if user can approve organization-wide
        if ApprovalChecker.can_approve_organization_overtime(user, obj.employee):
            return True
        
        # Check if user can approve division-level
        if ApprovalChecker.can_approve_division_overtime(user, obj.employee):
            return True

        return False


# ============================================================================
# MULTI-ROLE PERMISSION CLASSES
# ============================================================================

class MultiRolePermission(permissions.BasePermission):
    """
    Base permission class untuk multi-role system
    """

    def __init__(self, allowed_roles=None, require_all=False):
        """
        Initialize permission with allowed roles

        Args:
            allowed_roles: List of role names or single role name
            require_all: If True, user must have ALL specified roles; if False, user needs ANY of the roles
        """
        self.allowed_roles = allowed_roles if isinstance(allowed_roles, list) else [allowed_roles] if allowed_roles else []
        self.require_all = require_all

    def has_permission(self, request, view):
        """Check if user has required roles"""
        if not request.user.is_authenticated:
            return False

        from .utils import MultiRoleManager

        if self.require_all:
            return MultiRoleManager.has_all_roles(request.user, self.allowed_roles)
        else:
            return MultiRoleManager.has_any_role(request.user, self.allowed_roles)

    def has_object_permission(self, request, view, obj):
        """Check object-level permissions - same as has_permission for multi-role"""
        return self.has_permission(request, view)


class IsMultiRoleAdmin(MultiRolePermission):
    """
    Permission class for admin role using multi-role system
    """
    def __init__(self):
        super().__init__(allowed_roles=['admin'])


class IsMultiRoleSupervisor(MultiRolePermission):
    """
    Permission class for supervisor role using multi-role system
    """
    def __init__(self):
        super().__init__(allowed_roles=['supervisor'])


class IsMultiRoleEmployee(MultiRolePermission):
    """
    Permission class for employee role using multi-role system
    """
    def __init__(self):
        super().__init__(allowed_roles=['pegawai'])


class IsMultiRoleAdminOrSupervisor(MultiRolePermission):
    """
    Permission class for admin or supervisor roles using multi-role system
    """
    def __init__(self):
        super().__init__(allowed_roles=['admin', 'supervisor'])


class IsMultiRoleAdminOrSupervisorOrEmployee(MultiRolePermission):
    """
    Permission class for any authenticated user using multi-role system
    """
    def __init__(self):
        super().__init__(allowed_roles=['admin', 'supervisor', 'pegawai'])


class IsMultiRoleAdminReadOnly(MultiRolePermission):
    """
    Permission class for admin role with read-only access using multi-role system
    """
    def __init__(self):
        super().__init__(allowed_roles=['admin'])

    def has_permission(self, request, view):
        """Allow read access for admin, deny write access"""
        if not super().has_permission(request, view):
            return False

        # Allow GET, HEAD, OPTIONS
        if request.method in permissions.SAFE_METHODS:
            return True

        return False


class IsMultiRoleSupervisorReadOnly(MultiRolePermission):
    """
    Permission class for supervisor role with read-only access using multi-role system
    """
    def __init__(self):
        super().__init__(allowed_roles=['supervisor'])

    def has_permission(self, request, view):
        """Allow read access for supervisor, deny write access"""
        if not super().has_permission(request, view):
            return False

        # Allow GET, HEAD, OPTIONS
        if request.method in permissions.SAFE_METHODS:
            return True

        return False


class IsMultiRoleOwnerOrAdmin(MultiRolePermission):
    """
    Permission class untuk akses data milik sendiri atau admin
    """
    def __init__(self):
        super().__init__(allowed_roles=['admin'])

    def has_object_permission(self, request, view, obj):
        """Check if user owns the object or is admin"""
        # Admin can access all objects
        if super().has_permission(request, view):
            return True

        # Check if user owns the object
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'employee'):
            return obj.employee.user == request.user

        return False


class IsMultiRoleDivisionMemberOrAdmin(MultiRolePermission):
    """
    Permission class untuk akses data divisi sendiri atau admin/supervisor
    """
    def __init__(self):
        super().__init__(allowed_roles=['admin', 'supervisor'])

    def has_object_permission(self, request, view, obj):
        """Check if user is in same division or has admin/supervisor role"""
        # Admin/Supervisor can access all objects
        if super().has_permission(request, view):
            return True

        # Check if user is in same division
        try:
            user_employee = request.user.employee
            if hasattr(obj, 'employee'):
                return obj.employee.division == user_employee.division
            elif hasattr(obj, 'user') and hasattr(obj.user, 'employee'):
                return obj.user.employee.division == user_employee.division
        except:
            pass

        return False


class DynamicRolePermission(permissions.BasePermission):
    """
    Dynamic permission class that checks roles from view attributes
    """

    def has_permission(self, request, view):
        """Check permissions based on view attributes"""
        if not request.user.is_authenticated:
            return False

        from .utils import MultiRoleManager

        # Get allowed roles from view
        allowed_roles = getattr(view, 'allowed_roles', None)
        require_all = getattr(view, 'require_all_roles', False)

        if not allowed_roles:
            return True  # No role restriction

        if isinstance(allowed_roles, str):
            allowed_roles = [allowed_roles]

        if require_all:
            return MultiRoleManager.has_all_roles(request.user, allowed_roles)
        else:
            return MultiRoleManager.has_any_role(request.user, allowed_roles)

    def has_object_permission(self, request, view, obj):
        """Same as has_permission for dynamic role checking"""
        return self.has_permission(request, view)
