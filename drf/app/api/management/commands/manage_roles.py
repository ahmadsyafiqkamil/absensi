from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import Group
from api.models import RoleConfiguration
from api.utils import MultiRoleManager


class Command(BaseCommand):
    help = 'Manage role configurations and assignments'

    def add_arguments(self, parser):
        parser.add_argument(
            'action',
            choices=['list', 'create', 'update', 'delete', 'seed', 'assign', 'remove'],
            help='Action to perform'
        )
        parser.add_argument(
            '--name',
            type=str,
            help='Role name'
        )
        parser.add_argument(
            '--display-name',
            type=str,
            help='Display name for the role'
        )
        parser.add_argument(
            '--role-type',
            choices=['primary', 'additional', 'legacy'],
            default='additional',
            help='Role type'
        )
        parser.add_argument(
            '--approval-level',
            type=int,
            default=0,
            help='Approval level (0=Basic, 1=Division, 2=Organization)'
        )
        parser.add_argument(
            '--group',
            type=str,
            help='UI group for role organization'
        )
        parser.add_argument(
            '--description',
            type=str,
            help='Role description'
        )
        parser.add_argument(
            '--sort-order',
            type=int,
            default=0,
            help='Sort order for UI display'
        )
        parser.add_argument(
            '--username',
            type=str,
            help='Username for role assignment/removal'
        )
        parser.add_argument(
            '--is-primary',
            action='store_true',
            help='Set as primary role'
        )

    def handle(self, *args, **options):
        action = options['action']
        
        if action == 'list':
            self.list_roles()
        elif action == 'create':
            self.create_role(options)
        elif action == 'update':
            self.update_role(options)
        elif action == 'delete':
            self.delete_role(options)
        elif action == 'seed':
            self.seed_default_roles()
        elif action == 'assign':
            self.assign_role(options)
        elif action == 'remove':
            self.remove_role(options)

    def list_roles(self):
        """List all role configurations"""
        self.stdout.write(self.style.SUCCESS('=== Role Configurations ==='))
        
        roles = RoleConfiguration.objects.all().order_by('sort_order', 'name')
        if not roles:
            self.stdout.write(self.style.WARNING('No role configurations found'))
            return
        
        for role in roles:
            status = '✓' if role.is_active else '✗'
            self.stdout.write(
                f'{status} {role.name} - {role.display_name} '
                f'(Type: {role.role_type}, Level: {role.approval_level}, Group: {role.group or "None"})'
            )
            
            # Show user count
            try:
                group = Group.objects.get(name=role.name)
                user_count = group.user_set.count()
                self.stdout.write(f'    Users: {user_count}')
            except Group.DoesNotExist:
                self.stdout.write(f'    Users: 0 (Group not found)')

    def create_role(self, options):
        """Create a new role configuration"""
        name = options.get('name')
        if not name:
            raise CommandError('--name is required for create action')
        
        # Check if role already exists
        if RoleConfiguration.objects.filter(name=name).exists():
            raise CommandError(f'Role "{name}" already exists')
        
        role_data = {
            'name': name,
            'display_name': options.get('display_name', name.title()),
            'role_type': options.get('role_type', 'additional'),
            'approval_level': options.get('approval_level', 0),
            'group': options.get('group'),
            'description': options.get('description'),
            'sort_order': options.get('sort_order', 0),
            'is_active': True
        }
        
        role = RoleConfiguration.objects.create(**role_data)
        
        # Create corresponding Django Group
        Group.objects.get_or_create(name=name)
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully created role: {role.name}')
        )

    def update_role(self, options):
        """Update an existing role configuration"""
        name = options.get('name')
        if not name:
            raise CommandError('--name is required for update action')
        
        try:
            role = RoleConfiguration.objects.get(name=name)
        except RoleConfiguration.DoesNotExist:
            raise CommandError(f'Role "{name}" not found')
        
        # Update fields if provided
        if options.get('display_name'):
            role.display_name = options['display_name']
        if options.get('role_type'):
            role.role_type = options['role_type']
        if options.get('approval_level') is not None:
            role.approval_level = options['approval_level']
        if options.get('group'):
            role.group = options['group']
        if options.get('description'):
            role.description = options['description']
        if options.get('sort_order') is not None:
            role.sort_order = options['sort_order']
        
        role.save()
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully updated role: {role.name}')
        )

    def delete_role(self, options):
        """Delete a role configuration"""
        name = options.get('name')
        if not name:
            raise CommandError('--name is required for delete action')
        
        try:
            role = RoleConfiguration.objects.get(name=name)
        except RoleConfiguration.DoesNotExist:
            raise CommandError(f'Role "{name}" not found')
        
        # Check if role is being used
        try:
            group = Group.objects.get(name=name)
            user_count = group.user_set.count()
            if user_count > 0:
                self.stdout.write(
                    self.style.WARNING(
                        f'Role "{name}" is assigned to {user_count} users. '
                        'Consider deactivating instead of deleting.'
                    )
                )
                confirm = input('Are you sure you want to delete? (yes/no): ')
                if confirm.lower() != 'yes':
                    self.stdout.write('Deletion cancelled')
                    return
        except Group.DoesNotExist:
            pass
        
        role.delete()
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully deleted role: {name}')
        )

    def seed_default_roles(self):
        """Seed default role configurations"""
        self.stdout.write('Seeding default role configurations...')
        
        manager = MultiRoleManager()
        manager.create_default_roles()
        
        self.stdout.write(
            self.style.SUCCESS('Successfully seeded default roles')
        )

    def assign_role(self, options):
        """Assign role to user"""
        username = options.get('username')
        role_name = options.get('name')
        is_primary = options.get('is_primary', False)
        
        if not username or not role_name:
            raise CommandError('--username and --name are required for assign action')
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f'User "{username}" not found')
        
        try:
            employee = user.employee
        except:
            raise CommandError(f'User "{username}" does not have an employee record')
        
        try:
            group = Group.objects.get(name=role_name)
        except Group.DoesNotExist:
            raise CommandError(f'Role "{role_name}" not found')
        
        manager = MultiRoleManager()
        manager.assign_role(employee, group, assigned_by=user, is_primary=is_primary)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully assigned role "{role_name}" to user "{username}"'
                f'{" (as primary)" if is_primary else ""}'
            )
        )

    def remove_role(self, options):
        """Remove role from user"""
        username = options.get('username')
        role_name = options.get('name')
        
        if not username or not role_name:
            raise CommandError('--username and --name are required for remove action')
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f'User "{username}" not found')
        
        try:
            employee = user.employee
        except:
            raise CommandError(f'User "{username}" does not have an employee record')
        
        try:
            group = Group.objects.get(name=role_name)
        except Group.DoesNotExist:
            raise CommandError(f'Role "{role_name}" not found')
        
        manager = MultiRoleManager()
        manager.remove_role(employee, group)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully removed role "{role_name}" from user "{username}"'
            )
        )
