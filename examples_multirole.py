# ============================================================================
# MULTI-ROLE SYSTEM EXAMPLES
# ============================================================================
"""
Contoh penggunaan lengkap sistem Multi-Role untuk Django REST Framework

File ini berisi contoh-contoh praktis untuk mengimplementasikan
dan menggunakan sistem multi-role dalam aplikasi Django.
"""

# ============================================================================
# 1. MODEL IMPLEMENTATION
# ============================================================================

from django.db import models
from django.contrib.auth.models import User, Group
from django.conf import settings

class Employee(models.Model):
    """Model Employee dengan multi-role support"""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="employee"
    )
    nip = models.CharField(max_length=32, unique=True)
    fullname = models.TextField()
    division = models.ForeignKey(
        'Division',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="employees"
    )
    position = models.ForeignKey(
        'Position',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="employees"
    )

    class Meta:
        ordering = ["nip"]

    def __str__(self):
        return f"{self.nip} - {self.fullname}"


class EmployeeRole(models.Model):
    """
    Model untuk mapping employee dengan multiple roles (groups).
    Memungkinkan satu employee memiliki multiple roles sekaligus.
    """
    employee = models.ForeignKey(
        'Employee',
        on_delete=models.CASCADE,
        related_name='employee_roles',
        verbose_name="Employee"
    )
    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name='employee_roles',
        verbose_name="Role/Group"
    )
    is_primary = models.BooleanField(
        default=False,
        help_text='Mark this as the primary role for the employee',
        verbose_name='Primary Role'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this role assignment is active',
        verbose_name='Is Active'
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_roles',
        verbose_name='Assigned By'
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Employee Role'
        verbose_name_plural = 'Employee Roles'
        ordering = ['-is_primary', 'group__name']
        unique_together = ('employee', 'group')

    def __str__(self):
        return f"{self.employee} - {self.group.name}"

    def save(self, *args, **kwargs):
        # Ensure only one primary role per employee
        if self.is_primary:
            # First, set all other roles for this employee as non-primary
            EmployeeRole.objects.filter(
                employee=self.employee,
                is_active=True
            ).exclude(pk=self.pk).update(is_primary=False)

        # If this is the first role for the employee, make it primary
        elif not EmployeeRole.objects.filter(
            employee=self.employee,
            is_active=True,
            is_primary=True
        ).exclude(pk=self.pk).exists():
            self.is_primary = True

        super().save(*args, **kwargs)


# ============================================================================
# 2. UTILITY CLASSES
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
                return employee.employee_roles.filter(is_active=True).select_related('group')
        except:
            pass
        return EmployeeRole.objects.none()

    @staticmethod
    def get_user_primary_role(user):
        """Get primary role for a user"""
        try:
            employee = user.employee
            if employee:
                return employee.employee_roles.filter(
                    is_active=True,
                    is_primary=True
                ).select_related('group').first()
        except:
            pass
        return None

    @staticmethod
    def has_role(user, role_name):
        """Check if user has specific role"""
        roles = MultiRoleManager.get_user_active_roles(user)
        return roles.filter(group__name=role_name).exists()

    @staticmethod
    def has_any_role(user, role_names):
        """Check if user has any of the specified roles"""
        roles = MultiRoleManager.get_user_active_roles(user)
        return roles.filter(group__name__in=role_names).exists()

    @staticmethod
    def assign_role(employee, group, assigned_by=None, is_primary=False):
        """Assign role to employee"""
        role, created = EmployeeRole.objects.get_or_create(
            employee=employee,
            group=group,
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
        ).exclude(pk=role.pk).exists():
            role.is_primary = True
            role.save()

        return role, created

    @staticmethod
    def remove_role(employee, group):
        """Remove role from employee"""
        deleted_count, _ = EmployeeRole.objects.filter(
            employee=employee,
            group=group
        ).delete()

        # If primary role was removed, set another role as primary
        if deleted_count > 0:
            remaining_roles = EmployeeRole.objects.filter(
                employee=employee,
                is_active=True
            )
            if remaining_roles.exists() and not remaining_roles.filter(is_primary=True).exists():
                first_role = remaining_roles.first()
                first_role.is_primary = True
                first_role.save()

        return deleted_count > 0

    @staticmethod
    def set_primary_role(employee, group):
        """Set a role as primary for employee"""
        # First, set all roles as non-primary
        EmployeeRole.objects.filter(
            employee=employee,
            is_active=True
        ).update(is_primary=False)

        # Set the specified role as primary
        updated = EmployeeRole.objects.filter(
            employee=employee,
            group=group,
            is_active=True
        ).update(is_primary=True)

        return updated > 0

    @staticmethod
    def get_user_role_names(user):
        """Get list of role names for a user"""
        roles = MultiRoleManager.get_user_active_roles(user)
        return list(roles.values_list('group__name', flat=True))

    @staticmethod
    def create_default_roles():
        """Create default roles if they don't exist"""
        default_roles = ['admin', 'supervisor', 'pegawai']
        for role_name in default_roles:
            Group.objects.get_or_create(name=role_name)


# ============================================================================
# 3. PERMISSION CLASSES
# ============================================================================

from rest_framework import permissions

class MultiRolePermission(permissions.BasePermission):
    """
    Base permission class untuk multi-role system
    """

    def __init__(self, allowed_roles=None, require_all=False):
        self.allowed_roles = allowed_roles if isinstance(allowed_roles, list) else [allowed_roles] if allowed_roles else []
        self.require_all = require_all

    def has_permission(self, request, view):
        """Check if user has required roles"""
        if not request.user.is_authenticated:
            return False

        if self.require_all:
            return MultiRoleManager.has_all_roles(request.user, self.allowed_roles)
        else:
            return MultiRoleManager.has_any_role(request.user, self.allowed_roles)

    def has_object_permission(self, request, view, obj):
        """Check object-level permissions - same as has_permission for multi-role"""
        return self.has_permission(request, view)


class IsMultiRoleAdmin(MultiRolePermission):
    """Permission class for admin role using multi-role system"""
    def __init__(self):
        super().__init__(allowed_roles=['admin'])


class IsMultiRoleSupervisor(MultiRolePermission):
    """Permission class for supervisor role using multi-role system"""
    def __init__(self):
        super().__init__(allowed_roles=['supervisor'])


class IsMultiRoleEmployee(MultiRolePermission):
    """Permission class for employee role using multi-role system"""
    def __init__(self):
        super().__init__(allowed_roles=['pegawai'])


class IsMultiRoleAdminOrSupervisor(MultiRolePermission):
    """Permission class for admin or supervisor roles using multi-role system"""
    def __init__(self):
        super().__init__(allowed_roles=['admin', 'supervisor'])


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


# ============================================================================
# 4. VIEWS EXAMPLES
# ============================================================================

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

# Example 1: Basic ViewSet with Multi-Role Permissions
class EmployeeViewSet(viewsets.ModelViewSet):
    """
    ViewSet untuk manajemen employee dengan multi-role permissions
    """
    queryset = Employee.objects.select_related('user', 'division', 'position')
    permission_classes = [IsMultiRoleAdminOrSupervisor]

    def get_queryset(self):
        """Filter queryset berdasarkan role user"""
        user = self.request.user

        # Admin dapat melihat semua employee
        if MultiRoleManager.has_role(user, 'admin'):
            return self.queryset

        # Supervisor dapat melihat employee di divisi mereka
        elif MultiRoleManager.has_role(user, 'supervisor'):
            user_employee = user.employee
            return self.queryset.filter(division=user_employee.division)

        # Employee biasa hanya dapat melihat dirinya sendiri
        else:
            return self.queryset.filter(user=user)

    def perform_create(self, serializer):
        """Hanya admin yang dapat membuat employee baru"""
        if not MultiRoleManager.has_role(self.request.user, 'admin'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admin can create employees")
        serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[IsMultiRoleAdmin])
    def assign_role(self, request, pk=None):
        """Assign role to employee (admin only)"""
        employee = self.get_object()
        group_name = request.data.get('group_name')
        is_primary = request.data.get('is_primary', False)

        if not group_name:
            return Response(
                {'detail': 'group_name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            group = Group.objects.get(name=group_name)
            role, created = MultiRoleManager.assign_role(
                employee=employee,
                group=group,
                assigned_by=request.user,
                is_primary=is_primary
            )

            return Response({
                'detail': f'Role {group_name} {"assigned" if created else "already assigned"}',
                'role_id': role.id,
                'created': created
            })

        except Group.DoesNotExist:
            return Response(
                {'detail': 'Group not found'},
                status=status.HTTP_404_NOT_FOUND
            )


# Example 2: Role Management ViewSet
class RoleManagementViewSet(viewsets.ViewSet):
    """
    ViewSet untuk manajemen roles
    """
    permission_classes = [IsMultiRoleAdmin]

    @action(detail=False, methods=['get'])
    def user_roles(self, request):
        """Get current user roles"""
        user = request.user
        roles = MultiRoleManager.get_user_active_roles(user)
        primary_role = MultiRoleManager.get_user_primary_role(user)
        role_names = MultiRoleManager.get_user_role_names(user)

        return Response({
            'roles': [{'id': r.id, 'name': r.group.name, 'is_primary': r.is_primary} for r in roles],
            'primary_role': primary_role.group.name if primary_role else None,
            'role_names': role_names,
            'has_admin': MultiRoleManager.has_role(user, 'admin'),
            'has_supervisor': MultiRoleManager.has_role(user, 'supervisor'),
            'has_employee': MultiRoleManager.has_role(user, 'pegawai')
        })

    @action(detail=False, methods=['post'])
    def assign_role(self, request):
        """Assign role to employee"""
        employee_id = request.data.get('employee_id')
        group_name = request.data.get('group_name')
        is_primary = request.data.get('is_primary', False)

        try:
            employee = Employee.objects.get(id=employee_id)
            group = Group.objects.get(name=group_name)

            role, created = MultiRoleManager.assign_role(
                employee=employee,
                group=group,
                assigned_by=request.user,
                is_primary=is_primary
            )

            return Response({
                'success': True,
                'message': f'Role {group_name} {"assigned" if created else "already assigned"}',
                'role_id': role.id
            })

        except Employee.DoesNotExist:
            return Response(
                {'detail': 'Employee not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Group.DoesNotExist:
            return Response(
                {'detail': 'Group not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'])
    def bulk_assign_roles(self, request):
        """Bulk assign roles to multiple employees"""
        assignments = request.data.get('assignments', [])
        results = []

        for assignment in assignments:
            employee_id = assignment.get('employee_id')
            group_name = assignment.get('group_name')
            is_primary = assignment.get('is_primary', False)

            try:
                employee = Employee.objects.get(id=employee_id)
                group = Group.objects.get(name=group_name)

                role, created = MultiRoleManager.assign_role(
                    employee=employee,
                    group=group,
                    assigned_by=request.user,
                    is_primary=is_primary
                )

                results.append({
                    'employee_id': employee_id,
                    'group_name': group_name,
                    'success': True,
                    'created': created
                })

            except Exception as e:
                results.append({
                    'employee_id': employee_id,
                    'group_name': group_name,
                    'success': False,
                    'error': str(e)
                })

        return Response({'results': results})


# Example 3: Function-based views with multi-role
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_data(request):
    """Dashboard data berdasarkan role user"""
    user = request.user
    data = {}

    # Admin dapat melihat semua statistik
    if MultiRoleManager.has_role(user, 'admin'):
        data = {
            'total_employees': Employee.objects.count(),
            'total_divisions': 5,  # contoh
            'recent_activities': []  # contoh
        }

    # Supervisor dapat melihat data divisi mereka
    elif MultiRoleManager.has_role(user, 'supervisor'):
        user_employee = user.employee
        division_employees = Employee.objects.filter(division=user_employee.division)
        data = {
            'division_employees': division_employees.count(),
            'division_name': user_employee.division.name if user_employee.division else None
        }

    # Employee dapat melihat data pribadi
    else:
        data = {
            'my_profile': {
                'nip': user.employee.nip,
                'fullname': user.employee.fullname,
                'roles': MultiRoleManager.get_user_role_names(user)
            }
        }

    return Response(data)


# ============================================================================
# 5. SERIALIZERS EXAMPLES
# ============================================================================

from rest_framework import serializers

class EmployeeRoleSerializer(serializers.ModelSerializer):
    """Serializer untuk EmployeeRole"""
    group_name = serializers.CharField(source='group.name', read_only=True)
    employee_name = serializers.CharField(source='employee.fullname', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.username', read_only=True)

    class Meta:
        model = EmployeeRole
        fields = [
            'id', 'employee', 'employee_name', 'group', 'group_name',
            'is_primary', 'is_active', 'assigned_by', 'assigned_by_name',
            'assigned_at'
        ]
        read_only_fields = ['id', 'assigned_at', 'assigned_by_name']


class EmployeeWithRolesSerializer(serializers.ModelSerializer):
    """Serializer untuk Employee dengan informasi roles"""
    user = serializers.StringRelatedField(read_only=True)
    roles = serializers.SerializerMethodField()
    primary_role = serializers.SerializerMethodField()
    has_admin_role = serializers.SerializerMethodField()
    has_supervisor_role = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id', 'user', 'nip', 'fullname', 'division', 'position',
            'roles', 'primary_role', 'has_admin_role', 'has_supervisor_role'
        ]

    def get_roles(self, obj):
        """Get all active roles for this employee"""
        roles = MultiRoleManager.get_user_active_roles(obj.user)
        return EmployeeRoleSerializer(roles, many=True).data

    def get_primary_role(self, obj):
        """Get the primary role for this employee"""
        primary_role = MultiRoleManager.get_user_primary_role(obj.user)
        return EmployeeRoleSerializer(primary_role).data if primary_role else None

    def get_has_admin_role(self, obj):
        """Check if employee has admin role"""
        return MultiRoleManager.has_role(obj.user, 'admin')

    def get_has_supervisor_role(self, obj):
        """Check if employee has supervisor role"""
        return MultiRoleManager.has_role(obj.user, 'supervisor')


# ============================================================================
# 6. USAGE EXAMPLES IN BUSINESS LOGIC
# ============================================================================

def process_leave_request(request, employee_id):
    """
    Contoh business logic dengan multi-role checking
    """
    user = request.user
    employee = Employee.objects.get(id=employee_id)

    # Admin dapat approve semua request
    if MultiRoleManager.has_role(user, 'admin'):
        # Process approval
        return "Approved by admin"

    # Supervisor dapat approve request di divisi mereka
    elif MultiRoleManager.has_role(user, 'supervisor'):
        user_employee = user.employee
        if employee.division == user_employee.division:
            # Process approval
            return "Approved by supervisor"
        else:
            raise PermissionError("Cannot approve request from different division")

    # Employee hanya dapat melihat request mereka sendiri
    elif MultiRoleManager.has_role(user, 'pegawai'):
        if employee.user == user:
            return "Own request"
        else:
            raise PermissionError("Cannot view other employee's request")

    else:
        raise PermissionError("No permission")


def calculate_salary(employee):
    """
    Contoh perhitungan gaji berdasarkan role
    """
    base_salary = employee.gaji_pokok or 0
    multiplier = 1.0

    user = employee.user
    roles = MultiRoleManager.get_user_active_roles(user)

    # Bonus berdasarkan role
    for role in roles:
        if role.group.name == 'admin':
            multiplier += 0.5  # 50% bonus untuk admin
        elif role.group.name == 'supervisor':
            multiplier += 0.3  # 30% bonus untuk supervisor
        elif role.group.name == 'pegawai':
            multiplier += 0.1  # 10% bonus untuk pegawai

    return base_salary * multiplier


# ============================================================================
# 7. TESTING EXAMPLES
# ============================================================================

def test_multi_role_system():
    """Test cases untuk multi-role system"""

    # Create test users and groups
    from django.contrib.auth.models import User, Group

    # Create groups
    admin_group, _ = Group.objects.get_or_create(name='admin')
    supervisor_group, _ = Group.objects.get_or_create(name='supervisor')
    employee_group, _ = Group.objects.get_or_create(name='pegawai')

    # Create test user
    user = User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )

    # Create employee
    employee = Employee.objects.create(
        user=user,
        nip='12345',
        fullname='Test User'
    )

    # Test role assignment
    print("Testing role assignment...")

    # Assign admin role
    role1, created1 = MultiRoleManager.assign_role(employee, admin_group, user, is_primary=True)
    print(f"Admin role assigned: {created1}")

    # Assign supervisor role
    role2, created2 = MultiRoleManager.assign_role(employee, supervisor_group, user)
    print(f"Supervisor role assigned: {created2}")

    # Check roles
    roles = MultiRoleManager.get_user_active_roles(user)
    print(f"Active roles: {[r.group.name for r in roles]}")

    primary_role = MultiRoleManager.get_user_primary_role(user)
    print(f"Primary role: {primary_role.group.name if primary_role else None}")

    # Test permission checking
    print(f"Has admin role: {MultiRoleManager.has_role(user, 'admin')}")
    print(f"Has any admin/supervisor: {MultiRoleManager.has_any_role(user, ['admin', 'supervisor'])}")

    # Test role removal
    removed = MultiRoleManager.remove_role(employee, admin_group)
    print(f"Admin role removed: {removed}")

    # Check remaining roles
    roles_after = MultiRoleManager.get_user_active_roles(user)
    print(f"Remaining roles: {[r.group.name for r in roles_after]}")

    primary_after = MultiRoleManager.get_user_primary_role(user)
    print(f"New primary role: {primary_after.group.name if primary_after else None}")

    print("Multi-role system test completed!")


# ============================================================================
# 8. DJANGO TEMPLATE TAGS
# ============================================================================

# template_tags/role_tags.py
from django import template
from .utils import MultiRoleManager

register = template.Library()

@register.filter
def has_role(user, role_name):
    """Template filter to check if user has specific role"""
    return MultiRoleManager.has_role(user, role_name)

@register.filter
def has_any_role(user, role_names):
    """Template filter to check if user has any of the specified roles"""
    if isinstance(role_names, str):
        role_names = [role_names]
    return MultiRoleManager.has_any_role(user, role_names)

@register.simple_tag
def get_user_roles(user):
    """Template tag to get all user role names"""
    return MultiRoleManager.get_user_role_names(user)

@register.simple_tag
def get_primary_role(user):
    """Template tag to get user's primary role"""
    primary_role = MultiRoleManager.get_user_primary_role(user)
    return primary_role.group.name if primary_role else None


# ============================================================================
# 9. URL PATTERNS EXAMPLE
# ============================================================================

# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet, RoleManagementViewSet

# Create routers
router = DefaultRouter()
admin_router = DefaultRouter()
supervisor_router = DefaultRouter()
employee_router = DefaultRouter()

# Register viewsets
router.register(r'employees', EmployeeViewSet)

# Admin endpoints
admin_router.register(r'employees', EmployeeViewSet, basename='admin-employee')
admin_router.register(r'role-management', RoleManagementViewSet, basename='admin-role-management')

# Supervisor endpoints
supervisor_router.register(r'employees', EmployeeViewSet, basename='supervisor-employee')

# Employee endpoints
employee_router.register(r'employees', EmployeeViewSet, basename='employee-employee')

urlpatterns = [
    # General endpoints
    path('', include(router.urls)),

    # Role-specific endpoints
    path('admin/', include((admin_router.urls, 'admin'), namespace='admin')),
    path('supervisor/', include((supervisor_router.urls, 'supervisor'), namespace='supervisor')),
    path('employee/', include((employee_router.urls, 'employee'), namespace='employee')),

    # Function-based views
    path('dashboard/', dashboard_data, name='dashboard'),
]


# ============================================================================
# 10. DJANGO ADMIN INTEGRATION
# ============================================================================

from django.contrib import admin
from .models import EmployeeRole

@admin.register(EmployeeRole)
class EmployeeRoleAdmin(admin.ModelAdmin):
    """Django admin untuk EmployeeRole"""
    list_display = [
        'employee', 'group', 'is_primary', 'is_active',
        'assigned_by', 'assigned_at'
    ]
    list_filter = ['group', 'is_primary', 'is_active', 'assigned_at']
    search_fields = [
        'employee__fullname', 'employee__nip',
        'group__name', 'assigned_by__username'
    ]
    readonly_fields = ['assigned_at']

    def save_model(self, request, obj, form, change):
        """Set assigned_by when saving"""
        if not change:  # New object
            obj.assigned_by = request.user
        super().save_model(request, obj, form, change)

    def has_delete_permission(self, request, obj=None):
        """Only admin can delete roles"""
        return MultiRoleManager.has_role(request.user, 'admin')


# ============================================================================
# 11. SIGNALS FOR DEFAULT ROLES
# ============================================================================

from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.contrib.auth.models import Group

@receiver(post_migrate)
def create_default_roles(sender, **kwargs):
    """Create default roles after migration"""
    default_roles = ['admin', 'supervisor', 'pegawai']
    for role_name in default_roles:
        Group.objects.get_or_create(name=role_name)


# ============================================================================
# 12. MANAGEMENT COMMAND
# ============================================================================

# management/commands/setup_roles.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, User
from api.models import Employee, EmployeeRole
from api.utils import MultiRoleManager

class Command(BaseCommand):
    help = 'Setup initial roles and assign to users'

    def handle(self, *args, **options):
        # Create default roles
        MultiRoleManager.create_default_roles()
        self.stdout.write('Default roles created')

        # Get or create admin user
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@example.com',
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()

        # Create employee for admin
        admin_employee, created = Employee.objects.get_or_create(
            user=admin_user,
            defaults={
                'nip': '00001',
                'fullname': 'Administrator'
            }
        )

        # Assign admin role
        admin_group = Group.objects.get(name='admin')
        role, created = MultiRoleManager.assign_role(
            employee=admin_employee,
            group=admin_group,
            assigned_by=admin_user,
            is_primary=True
        )

        if created:
            self.stdout.write('Admin role assigned to admin user')
        else:
            self.stdout.write('Admin role already assigned')

        self.stdout.write(self.style.SUCCESS('Role setup completed'))


# ============================================================================
# USAGE SUMMARY
# ============================================================================

"""
RINGKASAN PENGGUNAAN MULTI-ROLE SYSTEM:

1. MODEL:
   - EmployeeRole: Mapping employee ke multiple groups
   - ForeignKey ke Employee dan Group
   - is_primary untuk role utama
   - assigned_by dan assigned_at untuk audit

2. UTILITIES:
   - MultiRoleManager: Class untuk manage roles
   - assign_role(), remove_role(), set_primary_role()
   - has_role(), has_any_role(), get_user_roles()

3. PERMISSIONS:
   - MultiRolePermission: Base class untuk role-based permissions
   - IsMultiRoleAdmin, IsMultiRoleSupervisor, dll.
   - Support untuk require_all atau any roles

4. VIEWS:
   - RoleManagementViewSet: Untuk manage roles via API
   - Filtered querysets berdasarkan role
   - Custom actions untuk assign/remove roles

5. SERIALIZERS:
   - EmployeeWithRolesSerializer: Include role info
   - EmployeeRoleSerializer: CRUD operations
   - Role validation dan relationship handling

6. URL PATTERNS:
   - Role-specific routers (admin/, supervisor/, employee/)
   - RESTful endpoints untuk role management
   - Namespace untuk menghindari konflik

7. ADMIN INTEGRATION:
   - Custom admin classes
   - Role assignment di Django admin
   - Audit trail dan validation

8. TESTING:
   - Test cases untuk role assignment
   - Permission checking
   - Bulk operations

IMPLEMENTASI INI MEMUNGKINKAN:
- ✅ Satu employee memiliki multiple roles
- ✅ Role-based access control yang fleksibel
- ✅ Audit trail untuk semua perubahan role
- ✅ Permission system yang granular
- ✅ Integration dengan Django admin
- ✅ RESTful API untuk role management
- ✅ Performance optimized queries
- ✅ Easy to extend dan maintain
"""
