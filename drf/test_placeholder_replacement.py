#!/usr/bin/env python3
"""
Test script untuk memverifikasi sistem placeholder {{TABEL_OVERTIME}} replacement
"""

import os
import sys
import django
from datetime import datetime, date
from decimal import Decimal

# Setup Django
sys.path.append('/Users/ahmadsyafiqkamil/Documents/Project/SYAMIL/KJRI Dubai/absensi/drf')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.core.settings')
django.setup()

from app.api.models import OvertimeRequest, Employee, User
from app.api.views import OvertimeSummaryRequestViewSet

def create_test_overtime_requests():
    """Membuat data overtime request untuk testing"""
    try:
        # Get or create test user
        user, created = User.objects.get_or_create(
            username='test_user',
            defaults={
                'email': 'test@example.com',
                'first_name': 'Test',
                'last_name': 'User'
            }
        )

        # Get or create employee
        employee, created = Employee.objects.get_or_create(
            user=user,
            defaults={
                'nip': 'TEST001',
                'fullname': 'Test User'
            }
        )

        # Create test overtime requests
        overtime_requests = []
        for i in range(3):
            request = OvertimeRequest.objects.create(
                employee=employee,
                user=user,
                date_requested=date(2025, 1, i+1),
                overtime_hours=Decimal('2.5'),
                work_description=f'Test work description {i+1}',
                status='approved',
                overtime_amount=Decimal('50.00')
            )
            overtime_requests.append(request)

        print(f"Created {len(overtime_requests)} test overtime requests")
        return overtime_requests

    except Exception as e:
        print(f"Error creating test data: {e}")
        return []

def test_placeholder_replacement():
    """Test sistem placeholder replacement"""
    try:
        # Create test data
        overtime_requests = create_test_overtime_requests()

        if not overtime_requests:
            print("Failed to create test data")
            return

        # Test generate_monthly_summary_docx method
        viewset = OvertimeSummaryRequestViewSet()

        # Mock summary request object
        class MockSummaryRequest:
            def __init__(self):
                self.employee = overtime_requests[0].employee
                self.request_period = '2025-01'
                self.request_title = 'Test Rekap Lembur'
                self.request_description = 'Test description'
                self.include_overtime_details = True
                self.include_overtime_summary = True
                self.include_approver_info = True
                self.level1_approved_by = overtime_requests[0].user
                self.final_approved_by = overtime_requests[0].user
                self.level1_approved_at = datetime.now()
                self.final_approved_at = datetime.now()

        summary_request = MockSummaryRequest()

        # Test generate DOCX
        docx_path = viewset.generate_monthly_summary_docx(
            summary_request,
            overtime_requests,
            '2025-01'
        )

        if docx_path and os.path.exists(docx_path):
            print(f"✅ DOCX generated successfully at: {docx_path}")
            print(f"File size: {os.path.getsize(docx_path)} bytes")

            # Clean up test data
            for request in overtime_requests:
                request.delete()

            print("✅ Test completed successfully")
        else:
            print("❌ Failed to generate DOCX")

    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    print("🚀 Starting placeholder replacement test...")
    test_placeholder_replacement()
