"""
Management command to create a superuser with admin role.
Usage: python manage.py create_admin_user
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction
import getpass


class Command(BaseCommand):
    help = 'Create a superuser with admin role'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            help='Username for the admin user',
        )
        parser.add_argument(
            '--email',
            type=str,
            help='Email for the admin user',
        )
        parser.add_argument(
            '--noinput',
            action='store_true',
            help='Skip interactive prompts',
        )

    def handle(self, *args, **options):
        User = get_user_model()
        
        # Get username
        username = options.get('username')
        if not username and not options['noinput']:
            username = input('Username: ').strip()
        
        if not username:
            self.stdout.write(
                self.style.ERROR('Username is required.')
            )
            return

        # Check if user already exists
        user_exists = User.objects.filter(username=username).exists()
        if user_exists:
            self.stdout.write(
                self.style.WARNING(f'User "{username}" already exists. Will add admin role if not already assigned.')
            )

        # Get email
        email = options.get('email')
        if not email and not options['noinput']:
            email = input('Email address: ').strip()

        # Get password
        password = None
        if not options['noinput']:
            password = getpass.getpass('Password: ')
            password_confirm = getpass.getpass('Password (again): ')
            
            if password != password_confirm:
                self.stdout.write(
                    self.style.ERROR('Passwords do not match.')
                )
                return

        try:
            with transaction.atomic():
                if user_exists:
                    # Get existing user
                    user = User.objects.get(username=username)
                    self.stdout.write(f'Using existing user: {username}')
                else:
                    # Create superuser
                    user = User.objects.create_superuser(
                        username=username,
                        email=email or '',
                        password=password or 'admin123'  # Default password if noinput
                    )
                    self.stdout.write(f'Created new superuser: {username}')
                
                # Get or create admin group
                admin_group, created = Group.objects.get_or_create(name='admin')
                
                # Add user to admin group
                user.groups.add(admin_group)
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully created superuser "{username}" with admin role.'
                    )
                )
                
                if options['noinput']:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Default password: admin123 (please change it)'
                        )
                    )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating admin user: {str(e)}')
            )
