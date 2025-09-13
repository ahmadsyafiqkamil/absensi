"""
Custom createsuperuser command that automatically assigns admin role.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.management.commands.createsuperuser import Command as BaseCommand
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError


class Command(BaseCommand):
    help = 'Create a superuser and automatically assign admin role'

    def handle(self, *args, **options):
        """Override the handle method to add admin group assignment."""
        # Call the parent handle method to create the superuser
        super().handle(*args, **options)
        
        # Get the username from options
        username = options.get('username')
        if not username:
            # If username not provided, get it from input
            username = self.get_input_data('username')
        
        if username:
            try:
                # Get the created user
                User = get_user_model()
                user = User.objects.get(username=username)
                
                # Get or create the admin group
                admin_group, created = Group.objects.get_or_create(name='admin')
                
                # Add user to admin group
                user.groups.add(admin_group)
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully created superuser "{username}" and assigned admin role.'
                    )
                )
                
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(
                        f'User "{username}" was not found. Admin role not assigned.'
                    )
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Error assigning admin role: {str(e)}'
                    )
                )
    
    def get_input_data(self, field, message=None):
        """Get input data from user if not provided in options."""
        if message is None:
            message = f'{field}: '
        
        return input(message).strip()
