from rest_framework import permissions
from django.contrib.auth.models import User
from apps.core.models import GroupPermission
from apps.employees.models import Employee


class NotificationPermissionMixin:
    """Mixin untuk permission logic yang reusable"""
    
    @staticmethod
    def can_create_notification(user):
        """Check if user can create notifications"""
        # Superuser/admin always can
        if user.is_superuser or user.groups.filter(name='admin').exists():
            return True
        
        # Check custom permission
        return GroupPermission.has_permission(user, 'notification', 'create')
    
    @staticmethod
    def can_send_to_organization(user):
        """Check if user can send organization-wide notifications"""
        if user.is_superuser or user.groups.filter(name='admin').exists():
            return True
        
        # Position approval level 2 can send org-wide
        try:
            employee = user.employee_profile
            capabilities = employee.get_current_context_capabilities()
            return capabilities['approval_level'] >= 2
        except:
            return False
    
    @staticmethod
    def can_send_to_division(user):
        """Check if user can send division notifications"""
        if user.is_superuser or user.groups.filter(name='admin').exists():
            return True
        
        # Supervisor (approval level >= 1) can send to their division
        try:
            employee = user.employee_profile
            capabilities = employee.get_current_context_capabilities()
            return capabilities['approval_level'] >= 1
        except:
            return False
    
    @staticmethod
    def get_allowed_targets(user):
        """Get allowed target options for user"""
        targets = {
            'groups': [],
            'divisions': [],
            'positions': [],
            'organization_wide': False,
            'division_wide': False
        }
        
        if user.is_superuser or user.groups.filter(name='admin').exists():
            # Admin can target everything
            from django.contrib.auth.models import Group
            from apps.employees.models import Division, Position
            
            targets['groups'] = list(Group.objects.all().values('id', 'name'))
            targets['divisions'] = list(Division.objects.all().values('id', 'name'))
            targets['positions'] = list(Position.objects.all().values('id', 'name'))
            targets['organization_wide'] = True
            targets['division_wide'] = True
            
        elif NotificationPermissionMixin.can_send_to_organization(user):
            # Approval level 2 can send org-wide
            from django.contrib.auth.models import Group
            from apps.employees.models import Division, Position
            
            targets['groups'] = list(Group.objects.all().values('id', 'name'))
            targets['divisions'] = list(Division.objects.all().values('id', 'name'))
            targets['positions'] = list(Position.objects.all().values('id', 'name'))
            targets['organization_wide'] = True
            targets['division_wide'] = True
            
        elif NotificationPermissionMixin.can_send_to_division(user):
            # Supervisor can send to their division only
            try:
                employee = user.employee_profile
                division = employee.division
                
                if division:
                    targets['divisions'] = [{'id': division.id, 'name': division.name}]
                    targets['division_wide'] = True
                    
                    # Can target groups that have users in their division
                    from django.contrib.auth.models import Group
                    division_groups = Group.objects.filter(
                        user__employee_profile__division=division
                    ).distinct().values('id', 'name')
                    targets['groups'] = list(division_groups)
                    
                    # Can target positions in their division
                    division_positions = Position.objects.filter(
                        position_employees__employee__division=division
                    ).distinct().values('id', 'name')
                    targets['positions'] = list(division_positions)
            except:
                pass
        
        return targets


class IsNotificationCreator(permissions.BasePermission):
    """Permission untuk create notifications berdasarkan role"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        return NotificationPermissionMixin.can_create_notification(request.user)


class IsNotificationTargetValidator(permissions.BasePermission):
    """Permission untuk validate target berdasarkan role creator"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Allow admin and approval level 2 for organization-wide
        if request.method == 'POST':
            data = request.data
            
            # Check if trying to send organization-wide
            target_divisions = data.get('target_divisions', [])
            target_groups = data.get('target_groups', [])
            
            # Multiple divisions = organization-wide
            if len(target_divisions) > 1:
                if not NotificationPermissionMixin.can_send_to_organization(request.user):
                    return False
            
            # Multiple groups could also be organization-wide
            elif len(target_groups) > 1:
                if not NotificationPermissionMixin.can_send_to_organization(request.user):
                    return False
        
        return True


class IsNotificationRecipient(permissions.BasePermission):
    """Permission untuk user yang menjadi target notification"""
    
    def has_object_permission(self, request, view, obj):
        # Check if user is in target groups
        user_groups = request.user.groups.all()
        if obj.target_groups.filter(id__in=user_groups).exists():
            return True
        
        # Check if user is in target divisions
        if hasattr(request.user, 'employee_profile'):
            if obj.target_divisions.filter(id=request.user.employee_profile.division_id).exists():
                return True
        
        # Check if user is specifically targeted
        if obj.target_specific_users.filter(id=request.user.id).exists():
            return True
        
        return False


class IsNotificationOwnerOrAdmin(permissions.BasePermission):
    """Permission untuk user hanya bisa akses notifikasi yang mereka buat, admin bisa akses semua"""
    
    def has_object_permission(self, request, view, obj):
        # Admin bisa akses semua
        if request.user.is_superuser or request.user.groups.filter(name='admin').exists():
            return True
        
        # User hanya bisa akses notifikasi yang mereka buat
        return obj.created_by == request.user


class IsNotificationManager(permissions.BasePermission):
    """Permission untuk manage notifications (CRUD operations)"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Admin always has permission
        if request.user.is_superuser or request.user.groups.filter(name='admin').exists():
            return True
        
        # Check custom permission for notification management
        return GroupPermission.has_permission(request.user, 'notification', 'create')


class IsNotificationViewer(permissions.BasePermission):
    """Permission untuk view notifications (read access)"""
    
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class CanPublishNotification(permissions.BasePermission):
    """Permission untuk publish notifications"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Admin can always publish
        if request.user.is_superuser or request.user.groups.filter(name='admin').exists():
            return True
        
        # Others need notification create permission
        return NotificationPermissionMixin.can_create_notification(request.user)


class CanArchiveNotification(permissions.BasePermission):
    """Permission untuk archive notifications"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Admin can always archive
        if request.user.is_superuser or request.user.groups.filter(name='admin').exists():
            return True
        
        # Others need notification management permission
        return GroupPermission.has_permission(request.user, 'notification', 'edit')
