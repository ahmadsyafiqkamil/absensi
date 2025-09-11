from django.test import TestCase, Client, override_settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from apps.employees.models import Division, Position, Employee
from apps.attendance.models import Attendance
from apps.overtime.models import OvertimeRequest, MonthlySummaryRequest
from apps.settings.models import WorkSettings
from django.utils import timezone
from datetime import date, datetime, timedelta
import json


class V2ComprehensiveApiTests(TestCase):
    def setUp(self):
        self.client = Client()
        # Ensure base groups
        for g in ['admin', 'supervisor', 'pegawai']:
            Group.objects.get_or_create(name=g)

        # Create test user with admin/supervisor privileges
        User = get_user_model()
        self.username = 'testadmin'
        self.password = 'pass1234'
        self.user = User.objects.create_user(
            username=self.username,
            password=self.password,
            email='admin@example.com',
            is_staff=True,
            is_superuser=True,
        )
        self.user.groups.add(Group.objects.get(name='admin'))
        self.user.groups.add(Group.objects.get(name='supervisor'))

        # Create employee test data
        self.division, _ = Division.objects.get_or_create(name='Divisi QA')
        self.position, _ = Position.objects.get_or_create(name='Supervisor QA')
        self.employee = getattr(self.user, 'employee_profile', None)
        if self.employee is None:
            self.employee = Employee.objects.create(
                user=self.user,
                nip='90001',
                division=self.division,
                position=self.position,
                fullname='QA Admin',
            )

        # Create regular employee for testing
        self.reg_user = User.objects.create_user(
            username='employee1',
            password='emp123',
            email='emp@example.com'
        )
        self.reg_user.groups.add(Group.objects.get(name='pegawai'))
        self.reg_employee = Employee.objects.create(
            user=self.reg_user,
            nip='90002',
            division=self.division,
            position=Position.objects.get_or_create(name='Staff')[0],
            fullname='Regular Employee',
        )

        # JWT login
        resp = self.client.post(
            '/api/v2/users/auth/login/',
            data=json.dumps({'username': self.username, 'password': self.password}),
            content_type='application/json'
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        tokens = json.loads(resp.content)
        self.access = tokens['access']
        self.auth_headers = {
            'HTTP_AUTHORIZATION': f'Bearer {self.access}'
        }

    def test_users_management_endpoints(self):
        """Test user management endpoints"""
        # List users (admin only)
        resp = self.client.get('/api/v2/users/list/', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        
        # Groups endpoints
        resp = self.client.get('/api/v2/users/groups/', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        
        # Group permissions
        resp = self.client.get('/api/v2/users/group-permissions/', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)

    def test_attendance_with_data(self):
        """Test attendance endpoints with actual data"""
        # Create attendance record
        att = Attendance.objects.create(
            user=self.reg_user,
            employee=self.reg_employee,
            date_local=date.today(),
            timezone='Asia/Dubai',
            check_in_time=timezone.now(),
        )
        
        # Test supervisor team attendance with data
        resp = self.client.get('/api/v2/attendance/supervisor/team-attendance/', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        self.assertIn('team_attendance', data)
        
        # Test attendance detail
        resp = self.client.get(f'/api/v2/attendance/supervisor/attendance-detail/{self.reg_employee.id}/', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)

    def test_overtime_with_data(self):
        """Test overtime endpoints with actual data"""
        # Create attendance first (required for overtime)
        att = Attendance.objects.create(
            user=self.reg_user,
            employee=self.reg_employee,
            date_local=date.today(),
            timezone='Asia/Dubai',
            check_in_time=timezone.now(),
        )
        
        # Create overtime request
        overtime = OvertimeRequest.objects.create(
            user=self.reg_user,
            employee=self.reg_employee,
            attendance=att,
            date=date.today(),
            start_time=timezone.now().time(),
            end_time=(timezone.now() + timedelta(hours=2)).time(),
            purpose='Testing overtime',
            work_description='Test work description',
            status='pending'
        )
        
        # Create monthly summary request
        monthly = MonthlySummaryRequest.objects.create(
            user=self.user,
            employee=self.employee,
            month=date.today().month,
            year=date.today().year,
            purpose='Testing monthly summary',
            status='pending'
        )
        
        # Test overtime list (should now return data)
        resp = self.client.get('/api/v2/overtime/overtime/', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        
        # Test monthly summary list
        resp = self.client.get('/api/v2/overtime/monthly-summary/', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        
        # Test export endpoints with data (should now return PDFs)
        month = date.today().strftime('%Y-%m')
        resp = self.client.get(f'/api/v2/overtime/overtime/export_monthly_pdf/?month={month}', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp['Content-Type'], 'application/pdf')
        
        resp = self.client.get('/api/v2/overtime/overtime/export_list_pdf/', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp['Content-Type'], 'application/pdf')

    def test_settings_endpoints(self):
        """Test settings endpoints"""
        # Create work settings
        WorkSettings.objects.get_or_create(
            defaults={
                'start_time': '08:00',
                'end_time': '17:00',
                'workdays': 'monday,tuesday,wednesday,thursday,friday'
            }
        )
        
        # Test work settings endpoint
        resp = self.client.get('/api/v2/settings/work-settings/', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)

    def test_employees_endpoints(self):
        """Test employees endpoints"""
        resp = self.client.get('/api/v2/employees/employees/', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        
        resp = self.client.get('/api/v2/employees/divisions/', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        
        resp = self.client.get('/api/v2/employees/positions/', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)

    def test_corrections_endpoints(self):
        """Test corrections endpoints"""
        resp = self.client.get('/api/v2/corrections/corrections/', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)

    def test_reporting_endpoints(self):
        """Test reporting endpoints"""
        resp = self.client.get('/api/v2/reporting/reports/', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)

    @override_settings(DEBUG=True)
    def test_auth_flow_complete(self):
        """Test complete authentication flow"""
        # Logout
        resp = self.client.post('/api/v2/users/logout/', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        
        # Login again
        resp = self.client.post(
            '/api/v2/users/auth/login/',
            data=json.dumps({'username': self.username, 'password': self.password}),
            content_type='application/json'
        )
        self.assertEqual(resp.status_code, 200)
        tokens = json.loads(resp.content)
        
        # Verify token
        resp = self.client.post(
            '/api/v2/users/auth/verify/',
            data=json.dumps({'token': tokens['access']}),
            content_type='application/json'
        )
        self.assertEqual(resp.status_code, 200)
        
        # Refresh token
        resp = self.client.post(
            '/api/v2/users/auth/refresh/',
            data=json.dumps({'refresh': tokens['refresh']}),
            content_type='application/json'
        )
        self.assertEqual(resp.status_code, 200)
