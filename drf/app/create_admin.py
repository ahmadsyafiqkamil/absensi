#!/usr/bin/env python
"""
Script to create admin user with proper role assignment.
This can be run directly or via Django shell.
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction

def create_admin_user(username='admin', email='admin@example.com', password='admin123'):
    """Create a superuser with admin role."""
    User = get_user_model()
    
    try:
        with transaction.atomic():
            # Check if user already exists
            if User.objects.filter(username=username).exists():
                print(f'User "{username}" already exists.')
                user = User.objects.get(username=username)
            else:
                # Create superuser
                user = User.objects.create_superuser(
                    username=username,
                    email=email,
                    password=password
                )
                print(f'Created superuser: {username}')
            
            # Get or create admin group
            admin_group, created = Group.objects.get_or_create(name='admin')
            if created:
                print('Created admin group')
            
            # Add user to admin group
            user.groups.add(admin_group)
            print(f'Added {username} to admin group')
            
            print(f'✅ Successfully created admin user: {username}')
            print(f'   Email: {email}')
            print(f'   Password: {password}')
            print(f'   Role: admin')
            
            return user
            
    except Exception as e:
        print(f'❌ Error creating admin user: {str(e)}')
        return None

if __name__ == '__main__':
    # Get parameters from command line or use defaults
    username = sys.argv[1] if len(sys.argv) > 1 else 'admin'
    email = sys.argv[2] if len(sys.argv) > 2 else 'admin@example.com'
    password = sys.argv[3] if len(sys.argv) > 3 else 'admin123'
    
    create_admin_user(username, email, password)
