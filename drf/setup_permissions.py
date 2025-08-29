#!/usr/bin/env python
"""
Script untuk setup initial permission data
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from api.models import GroupPermission, GroupPermissionTemplate

def setup_permission_templates():
    """Setup permission templates"""
    print("Setting up permission templates...")
    
    # Admin Full Access Template
    admin_template, created = GroupPermissionTemplate.objects.get_or_create(
        name="Admin Full Access",
        defaults={
            'description': 'Full access for admin users',
            'permissions': [
                {'type': 'employee', 'action': 'view'},
                {'type': 'employee', 'action': 'create'},
                {'type': 'employee', 'action': 'edit'},
                {'type': 'employee', 'action': 'delete'},
                {'type': 'overtime', 'action': 'view'},
                {'type': 'overtime', 'action': 'approve'},
                {'type': 'overtime', 'action': 'reject'},
                {'type': 'reports', 'action': 'export'},
                {'type': 'settings', 'action': 'configure'},
                {'type': 'admin', 'action': 'view'},
            ]
        }
    )
    if created:
        print(f"Created admin template: {admin_template.name}")
    else:
        print(f"Admin template already exists: {admin_template.name}")
    
    # Supervisor Template
    supervisor_template, created = GroupPermissionTemplate.objects.get_or_create(
        name="Supervisor Access",
        defaults={
            'description': 'Access for supervisor users',
            'permissions': [
                {'type': 'employee', 'action': 'view'},
                {'type': 'overtime', 'action': 'view'},
                {'type': 'overtime', 'action': 'approve'},
                {'type': 'overtime', 'action': 'reject'},
                {'type': 'reports', 'action': 'view'},
            ]
        }
    )
    if created:
        print(f"Created supervisor template: {supervisor_template.name}")
    else:
        print(f"Supervisor template already exists: {supervisor_template.name}")
    
    # Employee Template
    employee_template, created = GroupPermissionTemplate.objects.get_or_create(
        name="Employee Basic Access",
        defaults={
            'description': 'Basic access for employee users',
            'permissions': [
                {'type': 'attendance', 'action': 'view'},
                {'type': 'attendance', 'action': 'create'},
                {'type': 'overtime', 'action': 'view'},
                {'type': 'overtime', 'action': 'create'},
            ]
        }
    )
    if created:
        print(f"Created employee template: {employee_template.name}")
    else:
        print(f"Employee template already exists: {employee_template.name}")
    
    return admin_template, supervisor_template, employee_template

def apply_templates_to_groups():
    """Apply templates to existing groups"""
    print("Applying templates to groups...")
    
    try:
        # Get groups
        admin_group = Group.objects.get(name='admin')
        supervisor_group = Group.objects.get(name='supervisor')
        employee_group = Group.objects.get(name='pegawai')
        
        # Get templates
        admin_template = GroupPermissionTemplate.objects.get(name="Admin Full Access")
        supervisor_template = GroupPermissionTemplate.objects.get(name="Supervisor Access")
        employee_template = GroupPermissionTemplate.objects.get(name="Employee Basic Access")
        
        # Apply templates
        admin_template.apply_to_group(admin_group)
        print(f"Applied {admin_template.name} to {admin_group.name}")
        
        supervisor_template.apply_to_group(supervisor_group)
        print(f"Applied {supervisor_template.name} to {supervisor_group.name}")
        
        employee_template.apply_to_group(employee_group)
        print(f"Applied {employee_template.name} to {employee_group.name}")
        
    except Group.DoesNotExist as e:
        print(f"Group not found: {e}")
    except GroupPermissionTemplate.DoesNotExist as e:
        print(f"Template not found: {e}")

def create_custom_permissions():
    """Create some custom permissions for testing"""
    print("Creating custom permissions...")
    
    try:
        # Get groups
        admin_group = Group.objects.get(name='admin')
        
        # Create some additional custom permissions
        custom_permissions = [
            ('attendance', 'export'),
            ('overtime', 'export'),
            ('reports', 'import'),
            ('settings', 'view'),
        ]
        
        for perm_type, perm_action in custom_permissions:
            perm, created = GroupPermission.objects.get_or_create(
                group=admin_group,
                permission_type=perm_type,
                permission_action=perm_action,
                defaults={'is_active': True}
            )
            if created:
                print(f"Created permission: {perm_type}.{perm_action} for {admin_group.name}")
            else:
                print(f"Permission already exists: {perm_type}.{perm_action} for {admin_group.name}")
                
    except Group.DoesNotExist as e:
        print(f"Group not found: {e}")

def main():
    """Main function"""
    print("Starting permission setup...")
    
    # Setup templates
    templates = setup_permission_templates()
    
    # Apply templates to groups
    apply_templates_to_groups()
    
    # Create custom permissions
    create_custom_permissions()
    
    print("Permission setup completed!")
    
    # Show summary
    print("\nSummary:")
    print(f"Total templates: {GroupPermissionTemplate.objects.count()}")
    print(f"Total custom permissions: {GroupPermission.objects.count()}")
    
    for group in Group.objects.all():
        perm_count = GroupPermission.objects.filter(group=group).count()
        print(f"Group '{group.name}': {perm_count} custom permissions")

if __name__ == '__main__':
    main()
