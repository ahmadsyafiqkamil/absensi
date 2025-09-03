#!/usr/bin/env python
"""
Script to seed initial data for KJRI Dubai attendance system.
Creates divisions, positions, users with appropriate roles, and role assignments.
"""
import os
import sys
import django
from pathlib import Path
from datetime import datetime, date

# Setup Django
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'drf.app.core.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import transaction
from api.models import Division, Position, Employee, Role, EmployeeRole

User = get_user_model()

def create_divisions():
    """Create KJRI Dubai divisions"""
    divisions = [
        {
            'name': 'Konsuler',
            'description': 'Bagian Konsuler - Penanganan paspor, visa, legalisasi dokumen'
        },
        {
            'name': 'Protokol',
            'description': 'Bagian Protokol - Penanganan hubungan dengan otoritas setempat'
        },
        {
            'name': 'Ekonomi',
            'description': 'Bagian Ekonomi - Promosi perdagangan dan investasi'
        },
        {
            'name': 'Sosial Budaya',
            'description': 'Bagian Sosial Budaya - Penanganan pendidikan, kebudayaan, dan sosial'
        },
        {
            'name': 'Administrasi',
            'description': 'Bagian Administrasi - Pengelolaan keuangan dan administrasi'
        },
        {
            'name': 'Keamanan',
            'description': 'Bagian Keamanan - Pengamanan dan keamanan konsulat'
        }
    ]

    created_divisions = []
    for div_data in divisions:
        division, created = Division.objects.get_or_create(
            name=div_data['name'],
            defaults={
                'description': div_data['description'],
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }
        )
        created_divisions.append(division)
        if created:
            print(f"✅ Created division: {division.name}")
        else:
            print(f"ℹ️  Division already exists: {division.name}")

    return created_divisions

def create_positions(divisions):
    """Create positions for each division"""
    positions_data = [
        # Konsuler Division
        {
            'name': 'Konsul Jenderal',
            'division': next(d for d in divisions if d.name == 'Konsuler'),
            'approval_level': 2,
            'can_approve_overtime_org_wide': True
        },
        {
            'name': 'Wakil Konsul Jenderal',
            'division': next(d for d in divisions if d.name == 'Konsuler'),
            'approval_level': 2,
            'can_approve_overtime_org_wide': False
        },
        {
            'name': 'Konsul',
            'division': next(d for d in divisions if d.name == 'Konsuler'),
            'approval_level': 1,
            'can_approve_overtime_org_wide': False
        },
        {
            'name': 'Staf Konsuler',
            'division': next(d for d in divisions if d.name == 'Konsuler'),
            'approval_level': 0,
            'can_approve_overtime_org_wide': False
        },

        # Protokol Division
        {
            'name': 'Kepala Protokol',
            'division': next(d for d in divisions if d.name == 'Protokol'),
            'approval_level': 1,
            'can_approve_overtime_org_wide': False
        },
        {
            'name': 'Staf Protokol',
            'division': next(d for d in divisions if d.name == 'Protokol'),
            'approval_level': 0,
            'can_approve_overtime_org_wide': False
        },

        # Ekonomi Division
        {
            'name': 'Kepala Bagian Ekonomi',
            'division': next(d for d in divisions if d.name == 'Ekonomi'),
            'approval_level': 1,
            'can_approve_overtime_org_wide': False
        },
        {
            'name': 'Staf Ekonomi',
            'division': next(d for d in divisions if d.name == 'Ekonomi'),
            'approval_level': 0,
            'can_approve_overtime_org_wide': False
        },

        # Sosial Budaya Division
        {
            'name': 'Kepala Bagian Sosial Budaya',
            'division': next(d for d in divisions if d.name == 'Sosial Budaya'),
            'approval_level': 1,
            'can_approve_overtime_org_wide': False
        },
        {
            'name': 'Staf Sosial Budaya',
            'division': next(d for d in divisions if d.name == 'Sosial Budaya'),
            'approval_level': 0,
            'can_approve_overtime_org_wide': False
        },

        # Administrasi Division
        {
            'name': 'Kepala Administrasi',
            'division': next(d for d in divisions if d.name == 'Administrasi'),
            'approval_level': 1,
            'can_approve_overtime_org_wide': False
        },
        {
            'name': 'Bendahara',
            'division': next(d for d in divisions if d.name == 'Administrasi'),
            'approval_level': 1,
            'can_approve_overtime_org_wide': False
        },
        {
            'name': 'Staf Administrasi',
            'division': next(d for d in divisions if d.name == 'Administrasi'),
            'approval_level': 0,
            'can_approve_overtime_org_wide': False
        },

        # Keamanan Division
        {
            'name': 'Kepala Keamanan',
            'division': next(d for d in divisions if d.name == 'Keamanan'),
            'approval_level': 1,
            'can_approve_overtime_org_wide': False
        },
        {
            'name': 'Staf Keamanan',
            'division': next(d for d in divisions if d.name == 'Keamanan'),
            'approval_level': 0,
            'can_approve_overtime_org_wide': False
        }
    ]

    created_positions = []
    for pos_data in positions_data:
        position, created = Position.objects.get_or_create(
            name=pos_data['name'],
            division=pos_data['division'],
            defaults={
                'description': f'Posisi {pos_data["name"]} di Divisi {pos_data["division"].name}',
                'approval_level': pos_data['approval_level'],
                'can_approve_overtime_org_wide': pos_data['can_approve_overtime_org_wide'],
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }
        )
        created_positions.append(position)
        if created:
            print(f"✅ Created position: {position.name} ({position.division.name})")
        else:
            print(f"ℹ️  Position already exists: {position.name} ({position.division.name})")

    return created_positions

def create_users_and_employees(positions):
    """Create users with appropriate roles and employee profiles"""
    users_data = [
        # Admin User
        {
            'username': 'admin.kjri',
            'email': 'admin@kjri-dubai.go.id',
            'first_name': 'Administrator',
            'last_name': 'KJRI Dubai',
            'password': '1',
            'is_superuser': True,
            'is_staff': True,
            'is_active': True,
            'position': next(p for p in positions if p.name == 'Konsul Jenderal'),
            'employee_id': 'ADM001',
            'phone': '+971-50-123-4567',
            'salary': 150000.00,
            'hire_date': date(2020, 1, 15),
            'roles': ['admin', 'level_2_approver']
        },

        # Konsul Jenderal (Level 2 Approver)
        {
            'username': 'konsul.jenderal',
            'email': 'konsul@kjri-dubai.go.id',
            'first_name': 'Dr. Ahmad',
            'last_name': 'Santoso',
            'password': '1',
            'is_superuser': False,
            'is_staff': False,
            'is_active': True,
            'position': next(p for p in positions if p.name == 'Konsul Jenderal'),
            'employee_id': 'KJ001',
            'phone': '+971-50-234-5678',
            'salary': 200000.00,
            'hire_date': date(2019, 6, 1),
            'birth_date': date(1975, 3, 15),
            'roles': ['level_2_approver']
        },

        # Wakil Konsul Jenderal (Level 2 Approver)
        {
            'username': 'wakil.konsul',
            'email': 'wakil@kjri-dubai.go.id',
            'first_name': 'Siti',
            'last_name': 'Rahayu',
            'password': '1',
            'is_superuser': False,
            'is_staff': False,
            'is_active': True,
            'position': next(p for p in positions if p.name == 'Wakil Konsul Jenderal'),
            'employee_id': 'KJ002',
            'phone': '+971-50-345-6789',
            'salary': 180000.00,
            'hire_date': date(2020, 3, 1),
            'birth_date': date(1980, 7, 22),
            'roles': ['level_2_approver']
        },

        # Kepala Bagian Konsuler (Level 1 Approver)
        {
            'username': 'kepala.konsuler',
            'email': 'konsuler@kjri-dubai.go.id',
            'first_name': 'Budi',
            'last_name': 'Prasetyo',
            'password': '1',
            'is_superuser': False,
            'is_staff': False,
            'is_active': True,
            'position': next(p for p in positions if p.name == 'Konsul'),
            'employee_id': 'KBK001',
            'phone': '+971-50-456-7890',
            'salary': 120000.00,
            'hire_date': date(2021, 1, 10),
            'birth_date': date(1985, 11, 8),
            'roles': ['level_1_approver']
        },

        # Kepala Bagian Administrasi (Level 1 Approver)
        {
            'username': 'kepala.admin',
            'email': 'admin@kjri-dubai.go.id',
            'first_name': 'Maya',
            'last_name': 'Sari',
            'password': '1',
            'is_superuser': False,
            'is_staff': False,
            'is_active': True,
            'position': next(p for p in positions if p.name == 'Kepala Administrasi'),
            'employee_id': 'KBA001',
            'phone': '+971-50-567-8901',
            'salary': 100000.00,
            'hire_date': date(2021, 2, 15),
            'birth_date': date(1988, 4, 12),
            'roles': ['level_1_approver']
        },

        # Staf Konsuler (Regular Employee)
        {
            'username': 'staf.konsuler1',
            'email': 'staf1.konsuler@kjri-dubai.go.id',
            'first_name': 'Rina',
            'last_name': 'Wijaya',
            'password': '1',
            'is_superuser': False,
            'is_staff': False,
            'is_active': True,
            'position': next(p for p in positions if p.name == 'Staf Konsuler'),
            'employee_id': 'SK001',
            'phone': '+971-50-678-9012',
            'salary': 75000.00,
            'hire_date': date(2022, 1, 20),
            'birth_date': date(1990, 9, 5),
            'roles': ['employee']
        },

        # Staf Administrasi (Regular Employee)
        {
            'username': 'staf.admin1',
            'email': 'staf1.admin@kjri-dubai.go.id',
            'first_name': 'Dedi',
            'last_name': 'Kurniawan',
            'password': '1',
            'is_superuser': False,
            'is_staff': False,
            'is_active': True,
            'position': next(p for p in positions if p.name == 'Staf Administrasi'),
            'employee_id': 'SA001',
            'phone': '+971-50-789-0123',
            'salary': 70000.00,
            'hire_date': date(2022, 3, 10),
            'birth_date': date(1992, 1, 18),
            'roles': ['employee']
        },

        # Staf Protokol (Regular Employee)
        {
            'username': 'staf.protokol',
            'email': 'staf.protokol@kjri-dubai.go.id',
            'first_name': 'Lina',
            'last_name': 'Hartati',
            'password': '1',
            'is_superuser': False,
            'is_staff': False,
            'is_active': True,
            'position': next(p for p in positions if p.name == 'Staf Protokol'),
            'employee_id': 'SP001',
            'phone': '+971-50-890-1234',
            'salary': 72000.00,
            'hire_date': date(2022, 5, 15),
            'birth_date': date(1991, 6, 25),
            'roles': ['employee']
        },

        # Staf Ekonomi (Regular Employee)
        {
            'username': 'staf.ekonomi',
            'email': 'staf.ekonomi@kjri-dubai.go.id',
            'first_name': 'Fajar',
            'last_name': 'Ramadan',
            'password': '1',
            'is_superuser': False,
            'is_staff': False,
            'is_active': True,
            'position': next(p for p in positions if p.name == 'Staf Ekonomi'),
            'employee_id': 'SE001',
            'phone': '+971-50-901-2345',
            'salary': 73000.00,
            'hire_date': date(2022, 7, 1),
            'birth_date': date(1989, 12, 3),
            'roles': ['employee']
        },

        # Staf Sosial Budaya (Regular Employee)
        {
            'username': 'staf.sosbud',
            'email': 'staf.sosbud@kjri-dubai.go.id',
            'first_name': 'Nina',
            'last_name': 'Permata',
            'password': '1',
            'is_superuser': False,
            'is_staff': False,
            'is_active': True,
            'position': next(p for p in positions if p.name == 'Staf Sosial Budaya'),
            'employee_id': 'SS001',
            'phone': '+971-50-012-3456',
            'salary': 71000.00,
            'hire_date': date(2022, 9, 1),
            'birth_date': date(1993, 2, 14),
            'roles': ['employee']
        }
    ]

    created_users = []
    for user_data in users_data:
        # Create or update user
        user, created = User.objects.get_or_create(
            username=user_data['username'],
            defaults={
                'email': user_data['email'],
                'first_name': user_data['first_name'],
                'last_name': user_data['last_name'],
                'is_superuser': user_data['is_superuser'],
                'is_staff': user_data['is_staff'],
                'is_active': user_data['is_active'],
                'date_joined': datetime.now()
            }
        )

        if created:
            user.set_password(user_data['password'])
            user.save()
            print(f"✅ Created user: {user.username} ({user.get_full_name()})")
        else:
            print(f"ℹ️  User already exists: {user.username} ({user.get_full_name()})")

        # Create or update employee profile
        employee, emp_created = Employee.objects.get_or_create(
            user=user,
            defaults={
                'employee_id': user_data['employee_id'],
                'full_name': f"{user_data['first_name']} {user_data['last_name']}",
                'phone': user_data['phone'],
                'salary': user_data['salary'],
                'position': user_data['position'],
                'division': user_data['position'].division,
                'hire_date': user_data['hire_date'],
                'birth_date': user_data.get('birth_date'),
                'is_active': True,
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }
        )

        if emp_created:
            print(f"✅ Created employee profile: {employee.employee_id} - {employee.full_name}")
        else:
            print(f"ℹ️  Employee profile exists: {employee.employee_id} - {employee.full_name}")

        # Store user and roles for later assignment
        user_data['user'] = user
        created_users.append(user_data)

    return created_users

def assign_roles_to_users(users_data):
    """Assign roles to users based on their data"""
    # Get all roles
    roles = {role.name: role for role in Role.objects.all()}

    print("\n🚀 Assigning roles to users...")

    for user_data in users_data:
        user = user_data['user']
        user_roles = user_data['roles']

        for role_name in user_roles:
            if role_name in roles:
                role = roles[role_name]

                # Assign role to user
                employee_role, created = EmployeeRole.objects.get_or_create(
                    employee=user.employee_profile,
                    role=role,
                    defaults={
                        'is_primary': len(user_roles) == 1,  # Make primary if only one role
                        'is_active': True,
                        'assigned_by': User.objects.filter(is_superuser=True).first(),  # Assign by admin
                        'assigned_at': datetime.now(),
                        'updated_at': datetime.now()
                    }
                )

                if created:
                    print(f"✅ Assigned role '{role.display_name}' to {user.username}")
                else:
                    print(f"ℹ️  Role '{role.display_name}' already assigned to {user.username}")

        # Set primary role for users with multiple roles
        if len(user_roles) > 1:
            # Make the first role primary
            primary_role_name = user_roles[0]
            if primary_role_name in roles:
                primary_role = roles[primary_role_name]
                EmployeeRole.objects.filter(
                    employee=user.employee_profile,
                    role=primary_role
                ).update(is_primary=True)

                print(f"✅ Set primary role '{primary_role.display_name}' for {user.username}")

def create_default_roles():
    """Create default roles if they don't exist"""
    default_roles = [
        {
            'name': 'admin',
            'display_name': 'Administrator',
            'description': 'Full system access and management',
            'approval_level': 2,
            'is_active': True,
            'sort_order': 1
        },
        {
            'name': 'level_2_approver',
            'display_name': 'Level 2 Approver',
            'description': 'Can approve requests organization-wide',
            'approval_level': 2,
            'is_active': True,
            'sort_order': 2
        },
        {
            'name': 'level_1_approver',
            'display_name': 'Level 1 Approver',
            'description': 'Can approve requests within division',
            'approval_level': 1,
            'is_active': True,
            'sort_order': 3
        },
        {
            'name': 'employee',
            'display_name': 'Employee',
            'description': 'Regular employee with basic access',
            'approval_level': 0,
            'is_active': True,
            'sort_order': 4
        }
    ]

    created_roles = []
    for role_data in default_roles:
        role, created = Role.objects.get_or_create(
            name=role_data['name'],
            defaults={
                'display_name': role_data['display_name'],
                'description': role_data['description'],
                'approval_level': role_data['approval_level'],
                'is_active': role_data['is_active'],
                'sort_order': role_data['sort_order'],
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }
        )
        created_roles.append(role)
        if created:
            print(f"✅ Created role: {role.display_name}")
        else:
            print(f"ℹ️  Role already exists: {role.display_name}")

    return created_roles

@transaction.atomic
def main():
    """Main function to seed all data"""
    print("🌟 Starting KJRI Dubai Data Seeding...")
    print("=" * 50)

    try:
        # 1. Create default roles first
        print("\n📋 Step 1: Creating default roles...")
        roles = create_default_roles()

        # 2. Create divisions
        print("\n🏢 Step 2: Creating divisions...")
        divisions = create_divisions()

        # 3. Create positions
        print("\n👔 Step 3: Creating positions...")
        positions = create_positions(divisions)

        # 4. Create users and employees
        print("\n👥 Step 4: Creating users and employee profiles...")
        users_data = create_users_and_employees(positions)

        # 5. Assign roles to users
        print("\n🔐 Step 5: Assigning roles to users...")
        assign_roles_to_users(users_data)

        print("\n" + "=" * 50)
        print("🎉 KJRI Dubai data seeding completed successfully!")
        print("\n📊 Summary:")
        print(f"   • {len(divisions)} divisions created")
        print(f"   • {len(positions)} positions created")
        print(f"   • {len(users_data)} users created")
        print(f"   • {len(roles)} roles available")

        print("\n🔑 Default Login Credentials:")
        print("   Admin: admin.kjri / 1")
        print("   Konsul Jenderal: konsul.jenderal / 1")
        print("   All users: [username] / 1")

    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
