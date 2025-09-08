#!/usr/bin/env python
"""
Test script untuk test handling null date_requested
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import OvertimeRequest, OvertimeSummaryRequest
from django.utils import timezone as dj_timezone

def test_null_date_handling():
    """Test handling of null date_requested in overtime requests"""
    print("=== Testing Null Date Handling ===\n")

    try:
        # Get the user
        User = get_user_model()
        user = User.objects.get(username='staff.konsuler1')
        print(f"✓ Found user: {user.username}")

        # Get employee
        employee = user.employee
        print(f"✓ Employee: {employee.fullname} (NIP: {employee.nip})")

        # Create an overtime request with NULL date_requested (simulate corrupted data)
        overtime_request = OvertimeRequest.objects.create(
            employee=employee,
            user=user,
            date_requested=None,  # This will be NULL
            overtime_hours=2.5,
            work_description='Test dengan date_requested NULL',
            status='approved'
        )

        print(f"✓ Created overtime request with NULL date_requested: ID {overtime_request.id}")

        # Now test the PDF export functionality
        from django.test import RequestFactory
        from api.views import OvertimeSummaryRequestViewSet

        # Create a summary request for testing
        summary_request = OvertimeSummaryRequest.objects.create(
            employee=employee,
            user=user,
            request_period='2025-08',
            request_title='Test Null Date Handling',
            status='approved'
        )

        factory = RequestFactory()
        request = factory.get(f'/api/employee/overtime-summary-requests/{summary_request.id}/export_docx/')
        request.user = user

        viewset = OvertimeSummaryRequestViewSet()
        viewset.request = request
        viewset.kwargs = {'pk': str(summary_request.id)}

        print("Testing DOCX export with NULL date_requested...")
        response = viewset.export_docx(request, pk=summary_request.id)

        if response.status_code == 200:
            print("✓ DOCX export successful with NULL date handling!")
            print(f"✓ Content-Type: {response.get('Content-Type', 'N/A')}")
            print(f"✓ File size: {len(response.content)} bytes")
        else:
            print(f"❌ DOCX export failed: {response.status_code}")
            print(f"Error: {response.data}")

        # Clean up test data
        overtime_request.delete()
        summary_request.delete()
        print("✓ Test data cleaned up")

    except Exception as e:
        print(f"❌ Error during null date test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_null_date_handling()
