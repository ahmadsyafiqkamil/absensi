#!/usr/bin/env python
"""
Test script untuk test export PDF dari overtime request
"""
import os
import django
from datetime import date
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import OvertimeSummaryRequest, OvertimeRequest
from django.utils import timezone as dj_timezone

def test_pdf_export():
    """Test PDF export functionality"""
    print("=== Testing PDF Export Functionality ===\n")

    try:
        # Get the user
        User = get_user_model()
        user = User.objects.get(username='staff.konsuler1')
        print(f"✓ Found user: {user.username}")

        # Get employee
        employee = user.employee
        print(f"✓ Employee: {employee.fullname} (NIP: {employee.nip})")

        # Get approved overtime summary request
        summary_request = OvertimeSummaryRequest.objects.filter(
            employee=employee,
            status='approved',
            request_period='2025-08'
        ).first()

        if not summary_request:
            print("❌ No approved overtime summary request found for August 2025")
            return

        print(f"✓ Found approved summary request: {summary_request.request_title}")

        # Test PDF export directly using the model method
        print("Testing PDF export...")

        # Import the viewset and create a mock request
        from django.test import RequestFactory
        from api.views import OvertimeSummaryRequestViewSet

        factory = RequestFactory()
        request = factory.get(f'/api/employee/overtime-summary-requests/{summary_request.id}/export_pdf/')
        request.user = user

        # Create viewset instance with proper setup
        viewset = OvertimeSummaryRequestViewSet()
        viewset.request = request
        viewset.kwargs = {'pk': str(summary_request.id)}  # Set kwargs manually

        print("Testing PDF export...")
        response = viewset.export_pdf(request, pk=summary_request.id)

        if response.status_code == 200:
            print("✓ PDF export successful!")
            print(f"✓ Content-Type: {response.get('Content-Type', 'N/A')}")
            print(f"✓ Content-Disposition: {response.get('Content-Disposition', 'N/A')}")
            print(f"✓ File size: {len(response.content)} bytes")
        else:
            print(f"❌ PDF export failed with status: {response.status_code}")
            print(f"Error details: {response.data}")

    except Exception as e:
        print(f"❌ Error during PDF export test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_pdf_export()
