from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """Allow access only to admin users"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_superuser or 
            request.user.groups.filter(name='admin').exists()
        )


class IsSupervisor(permissions.BasePermission):
    """Allow access only to supervisor users"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.groups.filter(name='supervisor').exists()
        )


class IsEmployee(permissions.BasePermission):
    """Allow access only to employee users"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.groups.filter(name='employee').exists()
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """Allow access to object owner or admin"""
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        return obj.user == request.user


class IsDivisionMemberOrAdmin(permissions.BasePermission):
    """Allow access to division members or admin"""
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        
        # Check if user is in the same division
        if hasattr(obj, 'division') and obj.division:
            if hasattr(request.user, 'employee_profile') and request.user.employee_profile.division:
                return obj.division == request.user.employee_profile.division
            return False
        return False


class IsAdminOrSupervisor(permissions.BasePermission):
    """Allow access to admin or supervisor users"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_superuser or 
            request.user.groups.filter(name__in=['admin', 'supervisor']).exists()
        )


class IsAdminOrReadOnly(permissions.BasePermission):
    """Allow read access to all users, write access to admin only"""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and (
            request.user.is_superuser or 
            request.user.groups.filter(name='admin').exists()
        )
