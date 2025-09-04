from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from zoneinfo import ZoneInfo
from functools import wraps

from django.utils import timezone as dj_timezone

from .models import WorkSettings, Holiday


@dataclass
class LatenessResult:
    is_workday: bool
    is_holiday: bool
    is_late: bool
    minutes_late: int
    earliest_checkout_local_iso: Optional[str]
    settings_timezone: str


def _get_settings() -> WorkSettings:
    obj, _ = WorkSettings.objects.get_or_create()
    return obj


def evaluate_lateness(check_in: datetime) -> LatenessResult:
    """
    Evaluate lateness for a single check-in datetime using global WorkSettings.

    Rules (Option B preferred):
    - If not a workday or it's a holiday: not late.
    - Base start at settings.start_time (local date/time in settings.timezone).
    - If check-in <= base start + grace: on time.
    - If check-in > base start + grace: late, minutes above grace threshold.
    - Earliest checkout is always check-in + required_minutes (flex 8 hours).
    - Friday has special hours: 9:00-13:00 (4 hours total)

    Input `check_in` can be naive or aware; naive is assumed to be in UTC.
    Output `earliest_checkout_local_iso` is in settings.timezone ISO format.
    """
    settings = _get_settings()
    tzname = settings.timezone or dj_timezone.get_current_timezone_name()
    tz = ZoneInfo(tzname)

    # Normalize incoming datetime to aware UTC then to local
    if check_in.tzinfo is None:
        check_in_utc = check_in.replace(tzinfo=ZoneInfo("UTC"))
    else:
        check_in_utc = check_in.astimezone(ZoneInfo("UTC"))
    check_in_local = check_in_utc.astimezone(tz)

    local_date = check_in_local.date()
    weekday = check_in_local.weekday()  # Monday=0..Sunday=6

    workdays = settings.workdays or []
    is_workday = weekday in workdays
    is_holiday = Holiday.objects.filter(date=local_date).exists()

    if not is_workday or is_holiday:
        return LatenessResult(
            is_workday=is_workday,
            is_holiday=is_holiday,
            is_late=False,
            minutes_late=0,
            earliest_checkout_local_iso=None,
            settings_timezone=tzname,
        )

    # Check if it's Friday (weekday 4 in Python)
    is_friday = weekday == 4
    
    if is_friday:
        # Friday-specific settings
        base_start_local = datetime.combine(local_date, settings.friday_start_time, tz)
        grace = timedelta(minutes=int(settings.friday_grace_minutes or 0))
        required = timedelta(minutes=int(settings.friday_required_minutes or 0))
    else:
        # Regular workday settings
        base_start_local = datetime.combine(local_date, settings.start_time, tz)
        grace = timedelta(minutes=int(settings.grace_minutes or 0))
        required = timedelta(minutes=int(settings.required_minutes or 0))

    # Determine lateness
    is_late = check_in_local > (base_start_local + grace)
    late_delta = check_in_local - base_start_local - grace
    minutes_late = int(max(0, round(late_delta.total_seconds() / 60))) if is_late else 0

    # Earliest checkout is always required_minutes after check-in (flex)
    earliest_checkout_local = check_in_local + required

    return LatenessResult(
        is_workday=True,
        is_holiday=False,
        is_late=is_late,
        minutes_late=minutes_late,
        earliest_checkout_local_iso=earliest_checkout_local.isoformat(),
        settings_timezone=tzname,
    )


def evaluate_lateness_as_dict(check_in: datetime) -> Dict[str, Any]:
    r = evaluate_lateness(check_in)
    return {
        "is_workday": r.is_workday,
        "is_holiday": r.is_holiday,
        "is_late": r.is_late,
        "minutes_late": r.minutes_late,
        "earliest_checkout_local_iso": r.earliest_checkout_local_iso,
        "timezone": r.settings_timezone,
    }


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in meters between two lat/lng points using Haversine."""
    from math import radians, sin, cos, asin, sqrt
    R = 6371000.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    return R * c


# ============================================================================
# APPROVAL UTILITIES
# ============================================================================

class ApprovalChecker:
    """
    Utility class untuk check approval permissions berdasarkan position approval level
    """
    
    @staticmethod
    def get_user_approval_level(user):
        """
        Get approval level dari user berdasarkan roles yang dimiliki

        Args:
            user: User object

        Returns:
            int: Approval level (0=No Approval, 1=Division Level, 2=Organization Level)
        """
        if user.is_superuser:
            return 2  # Superuser has organization level approval

        try:
            employee = user.employee
            if employee:
                # Check primary role first
                primary_role_assignment = employee.roles.filter(is_active=True, is_primary=True).first()
                if primary_role_assignment:
                    return primary_role_assignment.role.approval_level

                # Check all active roles for highest approval level
                max_approval_level = 0
                for role_assignment in employee.roles.filter(is_active=True):
                    max_approval_level = max(max_approval_level, role_assignment.role.approval_level)

                return max_approval_level
        except:
            pass

        return 0  # Default: no approval permission

    @staticmethod
    def get_user_active_roles(user):
        """
        Get all active roles for a user

        Args:
            user: User object

        Returns:
            QuerySet: Active EmployeeRole objects for the user
        """
        try:
            employee = user.employee
            if employee:
                return employee.roles.filter(is_active=True)
        except:
            pass

        from .models import EmployeeRole
        return EmployeeRole.objects.none()

    @staticmethod
    def get_user_primary_role(user):
        """
        Get the primary role for a user

        Args:
            user: User object

        Returns:
            EmployeeRole or None: Primary role if exists
        """
        try:
            employee = user.employee
            if employee:
                return employee.roles.filter(is_active=True, is_primary=True).first()
        except:
            pass

        return None

    @staticmethod
    def can_approve_division_level(user):
        """
        Check if user can approve at division level (level 1)
        
        Args:
            user: User object
            
        Returns:
            bool: True if user can approve division level
        """
        approval_level = ApprovalChecker.get_user_approval_level(user)
        return approval_level >= 1
    
    @staticmethod
    def can_approve_organization_level(user):
        """
        Check if user can approve at organization level (level 2)
        
        Args:
            user: User object
            
        Returns:
            bool: True if user can approve organization level
        """
        approval_level = ApprovalChecker.get_user_approval_level(user)
        return approval_level >= 2
    
    @staticmethod
    def can_approve_overtime_org_wide(user):
        """
        Check if user can approve overtime organization-wide

        Args:
            user: User object

        Returns:
            bool: True if user can approve overtime org-wide
        """
        if user.is_superuser:
            return True

        # Check if user has organization-level approval (level 2)
        return ApprovalChecker.can_approve_organization_level(user)
    
    @staticmethod
    def can_approve_division_overtime(user, target_employee):
        """
        Check if user can approve overtime for specific employee at division level

        Args:
            user: User object (approver)
            target_employee: Employee object (target)

        Returns:
            bool: True if user can approve
        """
        # Check if user has division level approval
        if not ApprovalChecker.can_approve_division_level(user):
            return False

        # Check if same division
        try:
            approver_employee = user.employee
            if approver_employee and approver_employee.division:
                return approver_employee.division == target_employee.division
        except:
            pass

        return False

    @staticmethod
    def can_approve_organization_overtime(user, target_employee):
        """
        Check if user can approve overtime for specific employee at organization level

        Args:
            user: User object (approver)
            target_employee: Employee object (target)

        Returns:
            bool: True if user can approve
        """
        # Check if user has organization level approval
        return ApprovalChecker.can_approve_organization_level(user)
    
    @staticmethod
    def get_approval_capabilities(user):
        """
        Get comprehensive approval capabilities for a user

        Args:
            user: User object

        Returns:
            dict: Dictionary with approval capabilities
        """
        approval_level = ApprovalChecker.get_user_approval_level(user)
        active_roles = ApprovalChecker.get_user_active_roles(user)
        primary_role = ApprovalChecker.get_user_primary_role(user)

        # Get role names
        role_names = []
        for role_assignment in active_roles:
            role_names.append(role_assignment.role.name)

        return {
            'approval_level': approval_level,
            'can_approve_division': approval_level >= 1,
            'can_approve_organization': approval_level >= 2,
            'can_approve_overtime_org_wide': ApprovalChecker.can_approve_overtime_org_wide(user),
            'has_no_approval': approval_level == 0,
            'is_superuser': user.is_superuser,
            'position_name': user.employee.position.name if user.employee and user.employee.position else None,
            'roles': role_names,
            'primary_role': primary_role.role.name if primary_role else None,
            'has_multiple_roles': active_roles.count() > 1,
            'is_admin': 'admin' in role_names,
            'is_supervisor': 'supervisor' in role_names,
            'is_employee': 'pegawai' in role_names,
            'division_name': user.employee.division.name if user.employee and user.employee.division else None,
        }


# ============================================================================
# PERMISSION UTILITIES
# ============================================================================

class PermissionChecker:
    """
    Utility class untuk check permission dengan menggabungkan Django permission dan custom permission
    """
    
    @staticmethod
    def has_permission(user, permission_type, permission_action):
        """
        Check if user has permission (Django + Custom)
        
        Args:
            user: User object
            permission_type: Type of permission (e.g., 'employee', 'overtime')
            permission_action: Action (e.g., 'view', 'create', 'approve')
        
        Returns:
            bool: True if user has permission
        """
        # Superuser has all permissions
        if user.is_superuser:
            return True
        
        # Check Django permission first
        django_perm = f"api.{permission_action}_{permission_type}"
        if user.has_perm(django_perm):
            return True
        
        # Check custom permission
        try:
            from .models import GroupPermission
            return GroupPermission.has_permission(user, permission_type, permission_action)
        except ImportError:
            # If models not available yet (during migration)
            return False
    
    @staticmethod
    def has_any_permission(user, permission_type, actions):
        """
        Check if user has any of the specified actions for a permission type
        
        Args:
            user: User object
            permission_type: Type of permission
            actions: List of actions to check
        
        Returns:
            bool: True if user has any of the specified permissions
        """
        for action in actions:
            if PermissionChecker.has_permission(user, permission_type, action):
                return True
        return False
    
    @staticmethod
    def has_all_permissions(user, permission_type, actions):
        """
        Check if user has all of the specified actions for a permission type
        
        Args:
            user: User object
            permission_type: Type of permission
            actions: List of actions to check
        
        Returns:
            bool: True if user has all of the specified permissions
        """
        for action in actions:
            if not PermissionChecker.has_permission(user, permission_type, action):
                return False
        return True
    
    @staticmethod
    def get_user_permissions(user):
        """
        Get all permissions for a user (Django + Custom)
        
        Args:
            user: User object
        
        Returns:
            dict: Dictionary with permission information
        """
        if user.is_superuser:
            return {
                'is_superuser': True,
                'django_permissions': list(user.get_all_permissions()),
                'custom_permissions': [],
                'all_permissions': 'all'
            }
        
        # Django permissions
        django_perms = list(user.get_all_permissions())
        
        # Custom permissions
        custom_perms = []
        try:
            from .models import GroupPermission
            user_groups = user.groups.all()
            custom_perms = list(GroupPermission.objects.filter(
                group__in=user_groups,
                is_active=True
            ).values('permission_type', 'permission_action'))
        except ImportError:
            pass
        
        return {
            'is_superuser': False,
            'django_permissions': django_perms,
            'custom_permissions': custom_perms,
            'all_permissions': 'mixed'
        }
    
    @staticmethod
    def check_permission_decorator(permission_type, permission_action):
        """
        Decorator untuk check permission pada views
        
        Usage:
            @PermissionChecker.check_permission_decorator('overtime', 'approve')
            def approve_overtime(request):
                pass
        """
        def decorator(view_func):
            @wraps(view_func)
            def wrapper(request, *args, **kwargs):
                if not PermissionChecker.has_permission(request.user, permission_type, permission_action):
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied(f"Permission denied: {permission_type}.{permission_action}")
                return view_func(request, *args, **kwargs)
            return wrapper
        return decorator


class PermissionMixin:
    """
    Mixin untuk ViewSets yang ingin menggunakan permission checker
    """
    
    def check_permission(self, user, permission_type, permission_action):
        """Check if user has specific permission"""
        return PermissionChecker.has_permission(user, permission_type, permission_action)
    
    def check_any_permission(self, user, permission_type, actions):
        """Check if user has any of the specified permissions"""
        return PermissionChecker.has_any_permission(user, permission_type, actions)
    
    def check_all_permissions(self, user, permission_type, actions):
        """Check if user has all of the specified permissions"""
        return PermissionChecker.has_all_permissions(user, permission_type, actions)
    
    def get_queryset_with_permission(self, user, permission_type, permission_action, base_queryset):
        """
        Get queryset based on user permissions
        
        Args:
            user: User object
            permission_type: Type of permission
            permission_action: Action
            base_queryset: Base queryset to filter
        
        Returns:
            QuerySet: Filtered queryset based on permissions
        """
        if self.check_permission(user, permission_type, permission_action):
            return base_queryset
        return base_queryset.none()


# ============================================================================
# MULTI-ROLE MANAGEMENT UTILITIES
# ============================================================================

class MultiRoleManager:
    """
    Utility class untuk mengelola multi-role system
    """

    @staticmethod
    def get_user_active_roles(user):
        """Get all active roles for a user"""
        try:
            employee = user.employee
            if employee:
                return employee.roles.filter(is_active=True)
        except:
            pass
        return []

    @staticmethod
    def get_user_primary_role(user):
        """Get primary role for a user"""
        try:
            employee = user.employee
            if employee:
                role_assignment = employee.roles.filter(
                    is_active=True,
                    is_primary=True
                ).first()
                return role_assignment.role if role_assignment else None
        except:
            pass
        return None

    @staticmethod
    def has_role(user, role_name):
        """Check if user has specific role"""
        role_assignments = MultiRoleManager.get_user_active_roles(user)
        return any(ra.role.name == role_name for ra in role_assignments)

    @staticmethod
    def has_any_role(user, role_names):
        """Check if user has any of the specified roles"""
        role_assignments = MultiRoleManager.get_user_active_roles(user)
        return any(ra.role.name in role_names for ra in role_assignments)

    @staticmethod
    def has_all_roles(user, role_names):
        """Check if user has all of the specified roles"""
        role_assignments = MultiRoleManager.get_user_active_roles(user)
        user_role_names = [ra.role.name for ra in role_assignments]
        return set(role_names).issubset(set(user_role_names))

    @staticmethod
    def assign_role(employee, role, assigned_by=None, is_primary=False):
        """Assign role to employee"""
        from .models import EmployeeRole

        role_assignment, created = EmployeeRole.objects.get_or_create(
            employee=employee,
            role=role,
            defaults={
                'assigned_by': assigned_by,
                'is_primary': is_primary
            }
        )

        # Auto-set as primary if it's the first role
        if created and not EmployeeRole.objects.filter(
            employee=employee,
            is_active=True,
            is_primary=True
        ).exclude(pk=role_assignment.pk).exists():
            role_assignment.is_primary = True
            role_assignment.save()

        return role_assignment, created

    @staticmethod
    def remove_role(employee, role):
        """Remove role from employee"""
        from .models import EmployeeRole

        deleted_count, _ = EmployeeRole.objects.filter(
            employee=employee,
            role=role
        ).delete()

        # If primary role was removed, set another role as primary
        if deleted_count > 0:
            remaining_assignments = EmployeeRole.objects.filter(
                employee=employee,
                is_active=True
            )
            if remaining_assignments.exists() and not remaining_assignments.filter(is_primary=True).exists():
                first_assignment = remaining_assignments.first()
                first_assignment.is_primary = True
                first_assignment.save()

        return deleted_count > 0

    @staticmethod
    def set_primary_role(employee, role):
        """Set a role as primary for employee"""
        from .models import EmployeeRole

        # First, set all roles as non-primary
        EmployeeRole.objects.filter(
            employee=employee,
            is_active=True
        ).update(is_primary=False)

        # Set the specified role as primary
        updated = EmployeeRole.objects.filter(
            employee=employee,
            role=role,
            is_active=True
        ).update(is_primary=True)

        return updated > 0

    @staticmethod
    def get_user_role_names(user):
        """Get list of role names for a user"""
        role_assignments = MultiRoleManager.get_user_active_roles(user)
        return [ra.role.name for ra in role_assignments]

    @staticmethod
    def get_user_permissions(user):
        """Get all permissions for a user based on their roles"""
        role_assignments = MultiRoleManager.get_user_active_roles(user)
        permissions = []

        for role_assignment in role_assignments:
            # Note: This assumes roles have permissions through some mechanism
            # For now, return empty list as permissions are handled elsewhere
            pass

        return permissions

    @staticmethod
    def create_default_roles():
        """Create default roles if they don't exist"""
        from django.contrib.auth.models import Group
        from .models import Role

        # Create default roles
        default_roles = [
            {
                'name': 'admin',
                'display_name': 'Administrator',
                'approval_level': 2,
                'description': 'Full system access and organization-level approval',
                'sort_order': 1
            },
            {
                'name': 'supervisor',
                'display_name': 'Supervisor',
                'approval_level': 1,
                'description': 'Division-level supervision and approval',
                'sort_order': 2
            },
            {
                'name': 'pegawai',
                'display_name': 'Pegawai',
                'approval_level': 0,
                'description': 'Basic employee access',
                'sort_order': 3
            },
        ]

        for role_data in default_roles:
            role, created = Role.objects.get_or_create(
                name=role_data['name'],
                defaults=role_data
            )
            # Ensure Django Group exists
            Group.objects.get_or_create(name=role_data['name'])


# ============================================================================
# MULTI-ROLE MIDDLEWARE
# ============================================================================

class MultiRoleMiddleware:
    """
    Middleware untuk menambahkan informasi multi-role ke request
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            # Tambahkan informasi role ke request
            request.user_roles = MultiRoleManager.get_user_active_roles(request.user)
            request.user_primary_role = MultiRoleManager.get_user_primary_role(request.user)
            request.user_role_names = MultiRoleManager.get_user_role_names(request.user)
            request.user_permissions = MultiRoleManager.get_user_permissions(request.user)

            # Helper methods
            request.has_role = lambda role_name: MultiRoleManager.has_role(request.user, role_name)
            request.has_any_role = lambda role_names: MultiRoleManager.has_any_role(request.user, role_names)
            request.has_all_roles = lambda role_names: MultiRoleManager.has_all_roles(request.user, role_names)

        return self.get_response(request)


# ============================================================================
# MULTI-ROLE AUTHENTICATION BACKEND
# ============================================================================

class MultiRoleAuthenticationBackend:
    """
    Custom authentication backend yang support multi-role
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        """Authenticate user and add role information"""
        from django.contrib.auth.backends import ModelBackend
        from django.contrib.auth import get_user_model

        User = get_user_model()
        backend = ModelBackend()

        # Use default authentication
        user = backend.authenticate(request, username=username, password=password, **kwargs)

        if user:
            # Add role information to user object
            user.active_roles = MultiRoleManager.get_user_active_roles(user)
            user.primary_role = MultiRoleManager.get_user_primary_role(user)
            user.role_names = MultiRoleManager.get_user_role_names(user)
            user.role_permissions = MultiRoleManager.get_user_permissions(user)

        return user

    def get_user(self, user_id):
        """Get user by ID"""
        from django.contrib.auth import get_user_model

        User = get_user_model()
        try:
            user = User.objects.get(pk=user_id)
            # Add role information
            user.active_roles = MultiRoleManager.get_user_active_roles(user)
            user.primary_role = MultiRoleManager.get_user_primary_role(user)
            user.role_names = MultiRoleManager.get_user_role_names(user)
            user.role_permissions = MultiRoleManager.get_user_permissions(user)
            return user
        except User.DoesNotExist:
            return None


# Phase 2: Role Management Utilities
@dataclass
class RoleHierarchyNode:
    role: Any  # Role model instance
    children: list['RoleHierarchyNode']
    level: int
    permissions_count: int
    descendant_count: int


def build_role_hierarchy(roles: list) -> list[RoleHierarchyNode]:
    """
    Build hierarchical tree structure from flat role list
    """
    if not roles:
        return []

    # Create role map for quick lookup
    role_map = {role.id: role for role in roles}

    # Find root roles (no parent)
    root_nodes = []

    for role in roles:
        if not role.parent_role_id:
            node = _build_hierarchy_node(role, role_map, set(), 0)
            if node:
                root_nodes.append(node)

    return root_nodes


def _build_hierarchy_node(role, role_map: dict, processed: set, level: int) -> RoleHierarchyNode | None:
    """
    Recursively build hierarchy node
    """
    if role.id in processed:
        return None

    processed.add(role.id)

    node = RoleHierarchyNode(
        role=role,
        children=[],
        level=level,
        permissions_count=len(role.permissions) if hasattr(role, 'permissions') else 0,
        descendant_count=0
    )

    # Find children
    for child_role in role_map.values():
        if child_role.parent_role_id == role.id and child_role.id not in processed:
            child_node = _build_hierarchy_node(child_role, role_map, processed, level + 1)
            if child_node:
                node.children.append(child_node)
                node.descendant_count += 1 + child_node.descendant_count

    return node


def get_all_permissions(role, all_roles: list) -> dict:
    """
    Get all permissions for a role including inherited ones
    """
    all_permissions = dict(role.permissions) if hasattr(role, 'permissions') else {}

    if not getattr(role, 'inherit_permissions', True) or not role.parent_role_id:
        return all_permissions

    # Find parent role
    parent_role = next((r for r in all_roles if r.id == role.parent_role_id), None)
    if not parent_role:
        return all_permissions

    # Get parent's permissions recursively
    parent_permissions = get_all_permissions(parent_role, all_roles)

    # Merge permissions (child takes precedence)
    for perm_type, actions in parent_permissions.items():
        if perm_type not in all_permissions:
            all_permissions[perm_type] = actions
        else:
            # Merge actions, remove duplicates
            combined = set(all_permissions[perm_type]) | set(actions)
            all_permissions[perm_type] = list(combined)

    return all_permissions


def has_permission_inherited(role, permission_type: str, permission_action: str, all_roles: list) -> bool:
    """
    Check if a role has a specific permission including inherited ones
    """
    all_permissions = get_all_permissions(role, all_roles)
    return permission_action in all_permissions.get(permission_type, [])


def get_parent_chain(role, all_roles: list) -> list:
    """
    Get the full parent chain of a role
    """
    chain = []
    current = role

    while getattr(current, 'parent_role_id', None):
        parent = next((r for r in all_roles if r.id == current.parent_role_id), None)
        if not parent:
            break
        chain.insert(0, parent)
        current = parent

        # Prevent infinite loops
        if len(chain) > 10:
            break

    return chain


def get_hierarchy_level(role, all_roles: list) -> int:
    """
    Get hierarchy level of a role (0 = root)
    """
    if not getattr(role, 'parent_role_id', None):
        return 0

    parent = next((r for r in all_roles if r.id == role.parent_role_id), None)
    if not parent:
        return 0

    return get_hierarchy_level(parent, all_roles) + 1


def can_be_parent_of(parent_role, child_role, all_roles: list) -> bool:
    """
    Check if a role can be assigned as parent of another role
    """
    if parent_role.id == child_role.id:
        return False

    # Check if child is in parent's ancestry
    parent_chain = get_parent_chain(parent_role, all_roles)
    return not any(r.id == child_role.id for r in parent_chain)


def get_descendants(role, all_roles: list) -> list:
    """
    Get all descendant roles of a role
    """
    descendants = []

    for r in all_roles:
        if getattr(r, 'parent_role_id', None) == role.id:
            descendants.append(r)
            descendants.extend(get_descendants(r, all_roles))

    return descendants


def get_role_statistics(roles: list) -> dict:
    """
    Get comprehensive statistics about roles
    """
    if not roles:
        return {
            'total': 0, 'active': 0, 'inactive': 0, 'system': 0,
            'by_category': {}, 'with_inheritance': 0, 'maxDepth': 0, 'averagePermissions': 0
        }

    stats = {
        'total': len(roles),
        'active': len([r for r in roles if getattr(r, 'is_active', True)]),
        'inactive': len([r for r in roles if not getattr(r, 'is_active', True)]),
        'system': len([r for r in roles if getattr(r, 'is_system_role', False)]),
        'by_category': {},
        'with_inheritance': len([r for r in roles if getattr(r, 'inherit_permissions', True)]),
        'maxDepth': 0,
        'averagePermissions': 0
    }

    # Category breakdown
    for role in roles:
        category = getattr(role, 'role_category', 'unknown')
        stats['by_category'][category] = stats['by_category'].get(category, 0) + 1

    # Max depth
    for role in roles:
        level = get_hierarchy_level(role, roles)
        stats['maxDepth'] = max(stats['maxDepth'], level)

    # Average permissions
    total_permissions = sum(len(getattr(r, 'permissions', {})) for r in roles)
    stats['averagePermissions'] = total_permissions / len(roles) if roles else 0

    return stats


def validate_hierarchy(roles: list) -> dict:
    """
    Validate role hierarchy for circular references and other issues
    """
    errors = []

    for role in roles:
        if getattr(role, 'parent_role_id', None):
            parent = next((r for r in roles if r.id == role.parent_role_id), None)
            if not parent:
                errors.append(f'Role "{getattr(role, "name", role.id)}" has invalid parent reference')
                continue

            # Check for circular reference
            chain = get_parent_chain(role, roles)
            if any(r.id == role.id for r in chain):
                errors.append(f'Circular reference detected in role "{getattr(role, "name", role.id)}" hierarchy')

    return {
        'valid': len(errors) == 0,
        'errors': errors
    }


