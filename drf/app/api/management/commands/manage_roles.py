from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import Group
from api.models import Role, RoleTemplate  
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

    def add_arguments(self, parser):
        # Existing arguments...
        parser.add_argument('--list-templates', action='store_true', help='List all role templates')
        parser.add_argument('--create-from-template', type=str, help='Create role from template: --create-from-template=template_name --role-name=new_role_name')
        parser.add_argument('--role-name', type=str, help='Role name for create-from-template')
        parser.add_argument('--parent-role', type=str, help='Parent role name for hierarchy')
        parser.add_argument('--show-hierarchy', action='store_true', help='Show role hierarchy')
        parser.add_argument('--template-stats', action='store_true', help='Show template usage statistics')

        super().add_arguments(parser)

    def handle(self, *args, **options):
        # Phase 2: Handle new template and hierarchy features first
        if options.get('list_templates'):
            self.list_templates()
            return
        elif options.get('create_from_template'):
            self.create_from_template(options)
            return
        elif options.get('show_hierarchy'):
            self.show_hierarchy()
            return
        elif options.get('template_stats'):
            self.show_template_stats()
            return

        # Handle legacy actions
        action = options.get('action')
        if not action:
            self.stdout.write(self.style.ERROR('Action is required. Use --help for available options.'))
            return

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
        else:
            self.stdout.write(self.style.ERROR(f'Unknown action: {action}'))

    # Phase 2: Template and Hierarchy Management Methods
    def list_templates(self):
        """List all role templates"""
        from api.models import RoleTemplate

        self.stdout.write(self.style.SUCCESS('=== Role Templates ==='))

        templates = RoleTemplate.objects.all().order_by('category', 'name')
        if not templates:
            self.stdout.write(self.style.WARNING('No role templates found'))
            return

        for template in templates:
            status = '✓' if template.is_active else '✗'
            system = '[SYSTEM]' if template.is_system_template else ''
            self.stdout.write(
                f'{status} {template.name} ({template.category}) - {template.display_name} {system}'
            )
            self.stdout.write(f'    Usage: {template.usage_count} roles created')
            self.stdout.write(f'    Permissions: {len(template.base_permissions)} types')
            self.stdout.write('')

    def create_from_template(self, options):
        """Create a role from a template"""
        from api.models import RoleTemplate, Role

        template_name = options.get('create_from_template')
        role_name = options.get('role_name')
        parent_role_name = options.get('parent_role')

        if not template_name or not role_name:
            self.stdout.write(
                self.style.ERROR('--create-from-template and --role-name are required')
            )
            return

        try:
            template = RoleTemplate.objects.get(name=template_name, is_active=True)
        except RoleTemplate.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Template "{template_name}" not found'))
            return

        # Check if role already exists
        if Role.objects.filter(name=role_name).exists():
            self.stdout.write(self.style.ERROR(f'Role "{role_name}" already exists'))
            return

        # Get parent role if specified
        parent_role = None
        if parent_role_name:
            try:
                parent_role = Role.objects.get(name=parent_role_name, is_active=True)
            except Role.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Parent role "{parent_role_name}" not found'))
                return

        # Create role from template
        try:
            role = template.create_role_from_template(
                role_name=role_name,
                parent_role=parent_role
            )
            self.stdout.write(
                self.style.SUCCESS(f'Role "{role.name}" created from template "{template.name}"')
            )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error creating role: {e}'))

    def show_hierarchy(self):
        """Show role hierarchy"""
        from api.models import Role

        self.stdout.write(self.style.SUCCESS('=== Role Hierarchy ==='))

        # Get root roles (no parent)
        root_roles = Role.objects.filter(parent_role__isnull=True, is_active=True).order_by('role_priority')

        if not root_roles:
            self.stdout.write(self.style.WARNING('No root roles found'))
            return

        for root_role in root_roles:
            self._print_role_tree(root_role, 0)

    def _print_role_tree(self, role, level):
        """Recursively print role tree"""
        indent = '  ' * level
        marker = '├── ' if level > 0 else ''
        self.stdout.write(
            f'{indent}{marker}{role.display_name} ({role.name}) - Priority: {role.role_priority}'
        )

        for child in role.child_roles.filter(is_active=True).order_by('-role_priority'):
            self._print_role_tree(child, level + 1)

    def show_template_stats(self):
        """Show template usage statistics"""
        from api.models import RoleTemplate

        self.stdout.write(self.style.SUCCESS('=== Template Usage Statistics ==='))

        templates = RoleTemplate.objects.all().order_by('-usage_count')
        total_usage = sum(t.usage_count for t in templates)

        if not templates:
            self.stdout.write(self.style.WARNING('No templates found'))
            return

        self.stdout.write(f'Total roles created from templates: {total_usage}')
        self.stdout.write('')

        for template in templates:
            percentage = (template.usage_count / total_usage * 100) if total_usage > 0 else 0
            self.stdout.write(
                f'{template.display_name}: {template.usage_count} roles ({percentage:.1f}%)'
            )

    def list_roles(self):
        """List all role configurations"""
        self.stdout.write(self.style.SUCCESS('=== Role Configurations ==='))
        
        roles = Role.objects.all().order_by('sort_order', 'name')
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
        if Role.objects.filter(name=name).exists():
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
        
        role = Role.objects.create(**role_data)
        
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
            role = Role.objects.get(name=name)
        except Role.DoesNotExist:
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
            role = Role.objects.get(name=name)
        except Role.DoesNotExist:
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
