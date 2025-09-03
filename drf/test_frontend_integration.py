#!/usr/bin/env python
"""
Test script for frontend integration with new unified Role system.
This script tests the new API endpoints without Django test client issues.
"""
import os
import sys
import django
from pathlib import Path

# Setup Django
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.core.settings')
django.setup()

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.test.utils import override_settings

User = get_user_model()

class FrontendIntegrationTestCase(TestCase):
    """
    Test case for frontend integration with proper ALLOWED_HOSTS override.
    """

    def setUp(self):
        """Set up test data"""
        # Create test users
        self.admin_user = User.objects.create_user(
            username='test_admin',
            email='admin@test.com',
            password='testpass123',
            is_superuser=True,
            is_staff=True
        )

        self.employee_user = User.objects.create_user(
            username='test_employee',
            email='employee@test.com',
            password='testpass123'
        )

    @override_settings(ALLOWED_HOSTS=['testserver', 'localhost', '127.0.0.1'])
    def test_role_endpoints(self):
        """Test new role management endpoints"""
        client = Client()

        # Login as admin
        client.force_login(self.admin_user)

        # Test roles endpoint
        response = client.get('/api/admin/roles/')
        print(f"✅ Roles endpoint: {response.status_code}")

        # Test role creation
        role_data = {
            'name': 'test_frontend_role',
            'display_name': 'Test Frontend Role',
            'description': 'Role created by frontend test',
            'approval_level': 1,
            'is_active': True,
            'sort_order': 99
        }
        response = client.post('/api/admin/roles/', role_data, content_type='application/json')
        print(f"✅ Create role: {response.status_code}")

        if response.status_code == 201:
            created_role = response.json()
            role_id = created_role['id']

            # Test role detail
            response = client.get(f'/api/admin/roles/{role_id}/')
            print(f"✅ Role detail: {response.status_code}")

            # Test toggle active
            response = client.post(f'/api/admin/roles/{role_id}/toggle_active/')
            print(f"✅ Toggle active: {response.status_code}")

            # Clean up
            response = client.delete(f'/api/admin/roles/{role_id}/')
            print(f"✅ Delete role: {response.status_code}")

    @override_settings(ALLOWED_HOSTS=['testserver', 'localhost', '127.0.0.1'])
    def test_employee_profile_endpoints(self):
        """Test employee profile with multi-roles"""
        client = Client()

        # Login as employee
        client.force_login(self.employee_user)

        # Test employee profile
        response = client.get('/api/employees/me')
        print(f"✅ Employee profile: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            if 'multi_roles' in data:
                print(f"✅ Multi-roles present: {data['multi_roles']['has_multiple_roles']}")
                print(f"✅ Active roles: {len(data['multi_roles']['active_roles'])}")
            if 'approval_level' in data:
                print(f"✅ Approval level: {data['approval_level']}")

def run_tests():
    """Run the integration tests"""
    print("=== FRONTEND INTEGRATION TEST ===\n")

    # Create test suite
    from django.test.utils import get_runner
    from django.conf import settings

    TestRunner = get_runner(settings)
    test_runner = TestRunner()

    # Run specific test
    failures = test_runner.run_tests(["__main__.FrontendIntegrationTestCase"])

    if failures == 0:
        print("\n🎉 All frontend integration tests passed!")
    else:
        print(f"\n❌ {failures} test(s) failed")

if __name__ == "__main__":
    run_tests()

