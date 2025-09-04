"""
Phase 2 Role Management Tests
Test suite for hierarchical roles, templates, and permission inheritance
"""

import json
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse

from .models import Role, RoleTemplate, EmployeeRole
from .utils import (
    build_role_hierarchy, get_all_permissions, get_parent_chain,
    get_descendants, validate_hierarchy, get_role_statistics
)


class RoleHierarchyTestCase(TestCase):
    """Test role hierarchy functionality"""

    def setUp(self):
        # Create test roles
        self.root_role = Role.objects.create(
            name='root_admin',
            display_name='Root Admin',
            role_category='admin',
            approval_level=2,
            permissions={'admin': ['view', 'create', 'edit', 'delete']}
        )

        self.child_role = Role.objects.create(
            name='division_admin',
            display_name='Division Admin',
            role_category='admin',
            approval_level=1,
            parent_role=self.root_role,
            permissions={'division': ['view', 'edit']}
        )

        self.grandchild_role = Role.objects.create(
            name='unit_supervisor',
            display_name='Unit Supervisor',
            role_category='supervisor',
            approval_level=1,
            parent_role=self.child_role,
            permissions={'attendance': ['view', 'approve']}
        )

    def test_parent_child_relationship(self):
        """Test basic parent-child relationships"""
        self.assertEqual(self.child_role.parent_role, self.root_role)
        self.assertEqual(self.grandchild_role.parent_role, self.child_role)
        self.assertIsNone(self.root_role.parent_role)

    def test_get_parent_chain(self):
        """Test getting parent chain"""
        chain = self.grandchild_role.get_parent_chain()
        self.assertEqual(len(chain), 2)
        self.assertEqual(chain[0], self.root_role)
        self.assertEqual(chain[1], self.child_role)

    def test_get_child_roles(self):
        """Test getting child roles recursively"""
        children = self.root_role.get_child_roles()
        self.assertEqual(len(children), 2)  # child + grandchild

        child_names = [r.name for r in children]
        self.assertIn('division_admin', child_names)
        self.assertIn('unit_supervisor', child_names)

    def test_hierarchy_level(self):
        """Test hierarchy level calculation"""
        self.assertEqual(self.root_role.get_hierarchy_level(), 0)
        self.assertEqual(self.child_role.get_hierarchy_level(), 1)
        self.assertEqual(self.grandchild_role.get_hierarchy_level(), 2)

    def test_can_be_parent_of(self):
        """Test circular reference prevention"""
        # Should allow valid parent-child
        self.assertTrue(self.root_role.can_be_parent_of(self.child_role, []))

        # Should prevent self-reference
        self.assertFalse(self.root_role.can_be_parent_of(self.root_role, []))

        # Should prevent circular reference
        self.assertFalse(self.child_role.can_be_parent_of(self.root_role, []))


class PermissionInheritanceTestCase(TestCase):
    """Test permission inheritance functionality"""

    def setUp(self):
        # Create role hierarchy
        self.parent_role = Role.objects.create(
            name='parent_role',
            display_name='Parent Role',
            permissions={
                'attendance': ['view', 'create'],
                'overtime': ['view'],
                'admin': ['view']
            },
            inherit_permissions=True
        )

        self.child_role = Role.objects.create(
            name='child_role',
            display_name='Child Role',
            parent_role=self.parent_role,
            permissions={
                'attendance': ['edit', 'delete'],  # Should merge with parent
                'reports': ['view']  # New permission
            },
            inherit_permissions=True
        )

    def test_permission_inheritance(self):
        """Test that child roles inherit parent permissions"""
        all_permissions = self.child_role.get_all_permissions()

        # Child should have own permissions
        self.assertIn('reports', all_permissions)
        self.assertIn('view', all_permissions['reports'])

        # Child should have inherited permissions
        self.assertIn('attendance', all_permissions)
        self.assertIn('overtime', all_permissions)
        self.assertIn('admin', all_permissions)

        # Child permissions should override parent
        attendance_actions = set(all_permissions['attendance'])
        expected_actions = {'view', 'create', 'edit', 'delete'}
        self.assertEqual(attendance_actions, expected_actions)

    def test_permission_inheritance_disabled(self):
        """Test that inheritance can be disabled"""
        self.child_role.inherit_permissions = False
        self.child_role.save()

        all_permissions = self.child_role.get_all_permissions()

        # Should only have own permissions
        self.assertNotIn('admin', all_permissions)
        self.assertNotIn('overtime', all_permissions)
        self.assertIn('reports', all_permissions)
        self.assertIn('attendance', all_permissions)

    def test_has_permission_inherited(self):
        """Test permission checking with inheritance"""
        # Should have inherited permission
        self.assertTrue(self.child_role.has_permission_inherited('admin', 'view'))

        # Should have own permission
        self.assertTrue(self.child_role.has_permission_inherited('reports', 'view'))

        # Should not have non-existent permission
        self.assertFalse(self.child_role.has_permission_inherited('nonexistent', 'view'))


class RoleTemplateTestCase(TestCase):
    """Test role template functionality"""

    def setUp(self):
        self.template = RoleTemplate.objects.create(
            name='test_template',
            display_name='Test Template',
            category='organizational',
            base_role_category='supervisor',
            base_approval_level=1,
            base_permissions={
                'attendance': ['view', 'create'],
                'overtime': ['view']
            },
            base_max_users=10,
            base_role_priority=50,
            is_system_template=False,
            is_active=True
        )

    def test_template_creation(self):
        """Test template creation"""
        self.assertEqual(self.template.name, 'test_template')
        self.assertEqual(self.template.category, 'organizational')
        self.assertEqual(self.template.base_role_category, 'supervisor')

    def test_create_role_from_template(self):
        """Test creating role from template"""
        role = self.template.create_role_from_template(
            role_name='test_role_from_template',
            display_name='Test Role',
            description='Created from template'
        )

        self.assertEqual(role.name, 'test_role_from_template')
        self.assertEqual(role.display_name, 'Test Role')
        self.assertEqual(role.role_category, 'supervisor')
        self.assertEqual(role.approval_level, 1)
        self.assertEqual(role.max_users, 10)
        self.assertEqual(role.role_priority, 50)

        # Check permissions
        self.assertEqual(role.permissions['attendance'], ['view', 'create'])
        self.assertEqual(role.permissions['overtime'], ['view'])

        # Check usage count increased
        self.template.refresh_from_db()
        self.assertEqual(self.template.usage_count, 1)

    def test_template_stats(self):
        """Test template statistics"""
        # Create a role from template
        self.template.create_role_from_template('test_role_1')

        stats = self.template.get_template_stats()

        self.assertEqual(stats['total_roles_created'], 1)
        self.assertEqual(stats['active_roles'], 1)
        self.assertEqual(stats['inactive_roles'], 0)


class APITestCase(APITestCase):
    """Test API endpoints for Phase 2 features"""

    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@test.com',
            password='admin123'
        )
        self.client.force_authenticate(user=self.admin_user)

        # Create test data
        self.root_role = Role.objects.create(
            name='api_root',
            display_name='API Root',
            role_category='admin'
        )

        self.template = RoleTemplate.objects.create(
            name='api_template',
            display_name='API Template',
            base_role_category='employee'
        )

    def test_role_hierarchy_endpoint(self):
        """Test role hierarchy API endpoint"""
        url = reverse('admin-role-hierarchy')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_role_descendants_endpoint(self):
        """Test role descendants API endpoint"""
        url = reverse('admin-role-descendants', kwargs={'pk': self.root_role.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_role_permissions_inherited_endpoint(self):
        """Test inherited permissions API endpoint"""
        url = reverse('admin-role-permissions-inherited', kwargs={'pk': self.root_role.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('role', response.data)
        self.assertIn('permissions', response.data)

    def test_role_analytics_endpoint(self):
        """Test role analytics API endpoint"""
        url = reverse('admin-role-analytics') + '?type=usage'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_roles', response.data)

    def test_role_template_list_endpoint(self):
        """Test role template list API endpoint"""
        url = reverse('admin-role-template-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)
        self.assertIn('results', response.data)

    def test_role_template_create_endpoint(self):
        """Test role template creation API endpoint"""
        url = reverse('admin-role-template-list')
        data = {
            'name': 'test_template_api',
            'display_name': 'Test Template API',
            'category': 'custom',
            'base_role_category': 'employee'
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_role_from_template_endpoint(self):
        """Test creating role from template via API"""
        url = reverse('admin-role-template-create-role', kwargs={'pk': self.template.id})
        data = {
            'role_name': 'role_from_template_api',
            'display_name': 'Role from Template API'
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class UtilityFunctionsTestCase(TestCase):
    """Test utility functions"""

    def setUp(self):
        # Create test roles
        self.roles = []
        for i in range(5):
            role = Role.objects.create(
                name=f'test_role_{i}',
                display_name=f'Test Role {i}',
                role_category='employee' if i < 3 else 'supervisor',
                permissions={'test': ['view']}
            )
            self.roles.append(role)

        # Create hierarchy
        self.roles[1].parent_role = self.roles[0]
        self.roles[1].save()

        self.roles[2].parent_role = self.roles[1]
        self.roles[2].save()

        self.roles[3].parent_role = self.roles[0]
        self.roles[3].save()

    def test_build_role_hierarchy(self):
        """Test building role hierarchy"""
        hierarchy = build_role_hierarchy(self.roles)

        # Should have one root role
        self.assertEqual(len(hierarchy), 1)
        self.assertEqual(hierarchy[0].role.id, self.roles[0].id)

        # Root should have 2 children
        self.assertEqual(len(hierarchy[0].children), 2)

    def test_get_role_statistics(self):
        """Test role statistics calculation"""
        stats = get_role_statistics(self.roles)

        self.assertEqual(stats['total'], 5)
        self.assertEqual(stats['active'], 5)  # All roles are active by default
        self.assertEqual(stats['maxDepth'], 2)  # Max hierarchy depth

    def test_validate_hierarchy(self):
        """Test hierarchy validation"""
        validation = validate_hierarchy(self.roles)

        self.assertTrue(validation['valid'])
        self.assertEqual(len(validation['errors']), 0)

    def test_validate_hierarchy_circular(self):
        """Test circular reference detection"""
        # Create circular reference
        self.roles[0].parent_role = self.roles[2]  # Root points to grandchild
        self.roles[0].save()

        validation = validate_hierarchy(self.roles)

        self.assertFalse(validation['valid'])
        self.assertGreater(len(validation['errors']), 0)


if __name__ == '__main__':
    import unittest
    unittest.main()
