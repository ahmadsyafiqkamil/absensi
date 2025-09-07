#!/usr/bin/env python
"""
Test script untuk test export PDF dari monthly summary overtime
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import OvertimeSummaryRequest
from django.utils import timezone as dj_timezone

def test_export_pdf_monthly():
    """Test export PDF functionality for monthly summary overtime"""
    print("=== Testing Monthly Summary PDF Export ===\n")

    try:
        # Get the user
        User = get_user_model()
        user = User.objects.get(username='staff.konsuler1')
        print(f"✓ Found user: {user.username}")

        # Get employee
        employee = user.employee
        print(f"✓ Employee: {employee.fullname} (NIP: {employee.nip})")

        # Get an approved overtime summary request
        summary_request = OvertimeSummaryRequest.objects.filter(
            employee=employee,
            status='approved',
            request_period='2025-08'
        ).first()

        if not summary_request:
            print("❌ No approved overtime summary request found for August 2025")
            return

        print(f"✓ Found approved summary request: {summary_request.request_title}")
        print(f"  Period: {summary_request.request_period}")
        print(f"  Status: {summary_request.status}")

        # Test the export_pdf endpoint
        from django.test import RequestFactory
        from api.views import OvertimeSummaryRequestViewSet

        factory = RequestFactory()
        request = factory.get(f'/api/employee/overtime-summary-requests/{summary_request.id}/export_pdf/')
        request.user = user

        viewset = OvertimeSummaryRequestViewSet()
        viewset.request = request
        viewset.kwargs = {'pk': str(summary_request.id)}

        print("Testing PDF export for monthly summary...")
        response = viewset.export_pdf(request, pk=summary_request.id)

        if response.status_code == 200:
            print("✓ PDF export successful!")
            print(f"✓ Content-Type: {response.get('Content-Type', 'N/A')}")
            print(f"✓ Content-Disposition: {response.get('Content-Disposition', 'N/A')}")
            print(f"✓ File size: {len(response.content)} bytes")
            print("✓ Monthly summary PDF export now uses the same process as individual overtime!")
        else:
            print(f"❌ PDF export failed: {response.status_code}")
            print(f"Error details: {response.data}")

            # Check specific error types
            if 'requests' in str(response.data):
                print("❌ requests module error")
            elif 'convert' in str(response.data).lower():
                print("❌ DOCX to PDF conversion error")
            elif 'file' in str(response.data).lower():
                print("❌ File handling error")
            else:
                print("❌ Other error type")

    except Exception as e:
        print(f"❌ Error during PDF export test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_export_pdf_monthly()
