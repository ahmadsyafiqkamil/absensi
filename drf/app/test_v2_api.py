from django.test import TestCase, Client, override_settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from apps.employees.models import Division, Position, Employee
from apps.attendance.models import Attendance
from django.utils import timezone
from datetime import date
import json


class V2ApiTests(TestCase):
    def setUp(self):
        self.client = Client()
        # Ensure base groups
        for g in ['admin', 'supervisor', 'pegawai']:
            Group.objects.get_or_create(name=g)

        # Supervisor/admin user and profile
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

        # JWT login
        resp = self.client.post(
            '/api/v2/users/auth/login',
            data=json.dumps({'username': self.username, 'password': self.password}),
            content_type='application/json'
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        tokens = json.loads(resp.content)
        self.access = tokens['access']
        self.auth_headers = {
            'HTTP_AUTHORIZATION': f'Bearer {self.access}'
        }

    def test_health_v2(self):
        resp = self.client.get('/api/v2/core/health')
        self.assertEqual(resp.status_code, 200)
        self.assertJSONEqual(resp.content, {'status': 'ok'})

    def test_users_check_csrf_public_permissions(self):
        self.assertEqual(self.client.get('/api/v2/users/check', {'username': self.username}).status_code, 200)
        self.assertEqual(self.client.get('/api/v2/users/csrf-token').status_code, 200)
        # public-permissions only returns 200 in DEBUG
        with override_settings(DEBUG=True):
            self.assertEqual(self.client.get('/api/v2/users/public-permissions').status_code, 200)

    def test_me_v2(self):
        resp = self.client.get('/api/v2/users/me', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        self.assertEqual(data['username'], self.username)

    def test_supervisor_team_attendance_json_pdf(self):
        # JSON endpoint
        resp = self.client.get('/api/v2/attendance/supervisor/team-attendance', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        self.assertIn('team_attendance', data)
        # PDF endpoint
        resp = self.client.get('/api/v2/attendance/supervisor/team-attendance/pdf', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp['Content-Type'], 'application/pdf')

    def test_attendance_detail_and_approve_overtime(self):
        # Ensure one attendance exists
        Attendance.objects.get_or_create(
            user=self.user,
            employee=self.employee,
            date_local=date.today(),
            defaults={'timezone': 'Asia/Dubai'}
        )
        # Detail endpoint
        resp = self.client.get(f'/api/v2/attendance/supervisor/attendance-detail/{self.employee.id}', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        # Approve overtime on attendance id
        att = Attendance.objects.first()
        resp = self.client.post(f'/api/v2/attendance/attendance/{att.id}/approve_overtime/', **self.auth_headers)
        self.assertEqual(resp.status_code, 200)

    def test_overtime_exports_without_data(self):
        month = date.today().strftime('%Y-%m')
        # Monthly PDF expected 404 if no data
        resp = self.client.get(f'/api/v2/overtime/overtime/export_monthly_pdf/?month={month}', **self.auth_headers)
        self.assertEqual(resp.status_code, 404)
        # List PDF expected 404 if no data
        resp = self.client.get('/api/v2/overtime/overtime/export_list_pdf/', **self.auth_headers)
        self.assertEqual(resp.status_code, 404)
        # Monthly DOCX expected 404 if no data
        resp = self.client.get(f'/api/v2/overtime/monthly-summary/export_monthly_docx/?month={month}', **self.auth_headers)
        self.assertEqual(resp.status_code, 404)


