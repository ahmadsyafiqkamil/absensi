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



