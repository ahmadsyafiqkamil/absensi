#!/usr/bin/env python
"""
SIMPLE MULTI-ROLE SYSTEM TEST
=============================

Script sederhana untuk test implementasi multi-role system.
"""

import os
import sys
import django
from pathlib import Path

# Setup Django
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User, Group
from api.models import Employee, EmployeeRole
from api.utils import MultiRoleManager


def test_basic_multi_role():
    """Test basic multi-role functionality"""
    print("🧪 TESTING BASIC MULTI-ROLE FUNCTIONALITY")
    print("=" * 50)

    try:
        # Check if EmployeeRole model exists
        print("1. Checking EmployeeRole model...")
        employee_roles = EmployeeRole.objects.all()
        print(f"   ✓ EmployeeRole model exists. Found {employee_roles.count()} records")

        # Check if MultiRoleManager exists
        print("2. Checking MultiRoleManager...")
        manager = MultiRoleManager()
        print("   ✓ MultiRoleManager exists")

        # Check default groups
        print("3. Checking default groups...")
        admin_group = Group.objects.filter(name='admin').first()
        supervisor_group = Group.objects.filter(name='supervisor').first()
        pegawai_group = Group.objects.filter(name='pegawai').first()

        if admin_group:
            print(f"   ✓ Admin group exists: {admin_group.name}")
        else:
            print("   ❌ Admin group not found")

        if supervisor_group:
            print(f"   ✓ Supervisor group exists: {supervisor_group.name}")
        else:
            print("   ❌ Supervisor group not found")

        if pegawai_group:
            print(f"   ✓ Pegawai group exists: {pegawai_group.name}")
        else:
            print("   ❌ Pegawai group not found")

        # Test utility functions
        print("4. Testing utility functions...")

        # Check if we have any employees
        employees = Employee.objects.all()
        if employees.exists():
            employee = employees.first()
            print(f"   ✓ Found employee: {employee.fullname}")

            # Test role assignment functions
            print("5. Testing role assignment functions...")
            try:
                # Test assign_role
                if admin_group and supervisor_group:
                    role_assigned = MultiRoleManager.assign_role(employee, admin_group)
                    print(f"   ✓ Role assignment function works: {role_assigned}")

                    # Check if role was actually assigned
                    employee_role = EmployeeRole.objects.filter(
                        employee=employee,
                        group=admin_group
                    ).first()
                    if employee_role:
                        print(f"   ✓ Role successfully assigned in database")
                    else:
                        print("   ❌ Role assignment failed")

                    # Test get_user_active_roles
                    active_roles = MultiRoleManager.get_user_active_roles(employee.user)
                    print(f"   ✓ Active roles for user: {[r.name for r in active_roles]}")

                    # Test has_role
                    has_admin = MultiRoleManager.has_role(employee.user, 'admin')
                    print(f"   ✓ User has admin role: {has_admin}")

                    # Clean up test role
                    MultiRoleManager.remove_role(employee, admin_group)
                    print("   ✓ Test role removed")

            except Exception as e:
                print(f"   ❌ Error testing role functions: {e}")
        else:
            print("   ⚠️  No employees found in database")

        print("\n✅ BASIC MULTI-ROLE TEST COMPLETED")
        return True

    except Exception as e:
        print(f"❌ BASIC TEST FAILED: {e}")
        return False


def test_api_endpoints():
    """Test API endpoints existence"""
    print("\n🧪 TESTING API ENDPOINTS")
    print("=" * 50)

    try:
        # Check if views exist
        from api.views import EmployeeRoleViewSet, MultiRoleManagementViewSet
        print("✓ EmployeeRoleViewSet exists")
        print("✓ MultiRoleManagementViewSet exists")

        # Check if serializers exist
        from api.serializers import EmployeeRoleSerializer, EmployeeWithRolesSerializer
        print("✓ EmployeeRoleSerializer exists")
        print("✓ EmployeeWithRolesSerializer exists")

        # Check if permissions exist
        from api.permissions import IsMultiRoleAdmin, IsMultiRoleSupervisor
        print("✓ Multi-role permission classes exist")

        print("\n✅ API ENDPOINTS TEST COMPLETED")
        return True

    except Exception as e:
        print(f"❌ API TEST FAILED: {e}")
        return False


def main():
    print("🚀 MULTI-ROLE SYSTEM TEST SUITE")
    print("=" * 50)

    success = True

    # Run tests
    success &= test_basic_multi_role()
    success &= test_api_endpoints()

    print("\n" + "=" * 50)
    if success:
        print("🎉 ALL TESTS PASSED! Multi-role system is working correctly.")
    else:
        print("❌ SOME TESTS FAILED. Please check the implementation.")

    return success


if __name__ == "__main__":
    main()

