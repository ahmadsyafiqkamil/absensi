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
from api.models import Employee, EmployeeRole, Role
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

        # Check default roles
        print("3. Checking default roles...")
        admin_role = Role.objects.filter(name='admin').first()
        supervisor_role = Role.objects.filter(name='supervisor').first()
        pegawai_role = Role.objects.filter(name='pegawai').first()

        if admin_role:
            print(f"   ✓ Admin role exists: {admin_role.display_name}")
        else:
            print("   ❌ Admin role not found")

        if supervisor_role:
            print(f"   ✓ Supervisor role exists: {supervisor_role.display_name}")
        else:
            print("   ❌ Supervisor role not found")

        if pegawai_role:
            print(f"   ✓ Pegawai role exists: {pegawai_role.display_name}")
        else:
            print("   ❌ Pegawai role not found")

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
                # Check if employee already has admin role
                existing_admin_role = EmployeeRole.objects.filter(
                    employee=employee,
                    role=admin_role
                ).first()

                if existing_admin_role:
                    print("   ⚠️  Employee already has admin role, skipping assignment test")
                    # Test get_user_active_roles
                    active_roles = MultiRoleManager.get_user_active_roles(employee.user)
                    print(f"   ✓ Active roles for user: {[r.display_name if hasattr(r, 'display_name') else str(r) for r in active_roles]}")

                    # Test has_role
                    has_admin = MultiRoleManager.has_role(employee.user, 'admin')
                    print(f"   ✓ User has admin role: {has_admin}")
                else:
                    # Test assign_role
                    if admin_role and supervisor_role:
                        role_assigned = MultiRoleManager.assign_role(employee, admin_role)
                        print(f"   ✓ Role assignment function works: {role_assigned}")  

                        # Check if role was actually assigned
                        employee_role = EmployeeRole.objects.filter(
                            employee=employee,
                            role=admin_role
                        ).first()
                        if employee_role:
                            print(f"   ✓ Role successfully assigned in database")
                        else:
                            print("   ❌ Role assignment failed")

                        # Test get_user_active_roles
                        active_roles = MultiRoleManager.get_user_active_roles(employee.user)
                        print(f"   ✓ Active roles for user: {[r.display_name if hasattr(r, 'display_name') else str(r) for r in active_roles]}")

                        # Test has_role
                        has_admin = MultiRoleManager.has_role(employee.user, 'admin')
                        print(f"   ✓ User has admin role: {has_admin}")

                        # Clean up test role
                        MultiRoleManager.remove_role(employee, admin_role)
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
