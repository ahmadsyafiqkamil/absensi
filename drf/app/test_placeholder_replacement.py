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
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import OvertimeRequest, Employee
from django.contrib.auth.models import User
from api.views import OvertimeSummaryRequestViewSet

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
        for i in range(3):=
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

        # Create real OvertimeSummaryRequest
        from api.models import OvertimeSummaryRequest
        summary_request = OvertimeSummaryRequest.objects.create(
            employee=overtime_requests[0].employee,
            user=overtime_requests[0].user,
            request_period='2025-01',
            request_title='Test Rekap Lembur',
            request_description='Test description',
            include_overtime_details=True,
            include_overtime_summary=True,
            include_approver_info=True,
            status='approved',
            level1_approved_by=overtime_requests[0].user,
            final_approved_by=overtime_requests[0].user,
            level1_approved_at=datetime.now(),
            final_approved_at=datetime.now()
        )

        # Convert list to QuerySet for compatibility
        from django.db.models import QuerySet
        overtime_queryset = OvertimeRequest.objects.filter(id__in=[req.id for req in overtime_requests])

        # Test generate DOCX
        docx_path = viewset.generate_monthly_summary_docx(
            summary_request,
            overtime_queryset,
            '2025-01'
        )

        if docx_path and os.path.exists(docx_path):
            print(f"✅ DOCX generated successfully at: {docx_path}")
            print(f"File size: {os.path.getsize(docx_path)} bytes")

            # Clean up test data
            for request in overtime_requests:
                request.delete()
            summary_request.delete()

            print("✅ Test completed successfully")
        else:
            print("❌ Failed to generate DOCX")

    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

def use_existing_template():
    """Use the existing template that should have TABEL_OVERTIME placeholder"""
    template_path = '/app/template/template_rekap_lembur.docx'

    if os.path.exists(template_path):
        print(f"✅ Using existing template at: {template_path}")
        print(f"File size: {os.path.getsize(template_path)} bytes")
        return template_path
    else:
        print(f"❌ Template not found at: {template_path}")
        return None

if __name__ == '__main__':
    print("🚀 Starting placeholder replacement test with existing template...")

    # Use existing template
    template_path = use_existing_template()

    if template_path:
        print("✅ Template found, now testing placeholder replacement...")
        test_placeholder_replacement()
    else:
        print("❌ Template not found")
