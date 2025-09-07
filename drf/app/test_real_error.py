#!/usr/bin/env python
"""
Test script untuk mereproduksi error 'NoneType' object has no attribute 'strftime'
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import OvertimeSummaryRequest
from django.utils import timezone as dj_timezone

def test_real_world_scenario():
    """Test real-world scenario that might cause strftime error"""
    print("=== Testing Real-World Error Scenario ===\n")

    try:
        # Get the user
        User = get_user_model()
        user = User.objects.get(username='staff.konsuler1')
        print(f"✓ Found user: {user.username}")

        # Get employee
        employee = user.employee
        print(f"✓ Employee: {employee.fullname} (NIP: {employee.nip})")

        # Get existing approved summary request
        summary_request = OvertimeSummaryRequest.objects.filter(
            employee=employee,
            status='approved',
            request_period='2025-08'
        ).first()

        if not summary_request:
            print("❌ No approved overtime summary request found for August 2025")
            return

        print(f"✓ Found approved summary request: {summary_request.request_title}")

        # Test the actual export_docx method
        from django.test import RequestFactory
        from api.views import OvertimeSummaryRequestViewSet

        factory = RequestFactory()
        request = factory.get(f'/api/employee/overtime-summary-requests/{summary_request.id}/export_docx/')
        request.user = user

        viewset = OvertimeSummaryRequestViewSet()
        viewset.request = request
        viewset.kwargs = {'pk': str(summary_request.id)}

        print("Testing DOCX export...")
        response = viewset.export_docx(request, pk=summary_request.id)

        if response.status_code == 200:
            print("✓ DOCX export successful!")
            print(f"✓ Content-Type: {response.get('Content-Type', 'N/A')}")
            print(f"✓ File size: {len(response.content)} bytes")
            print("✓ Error 'NoneType' object has no attribute 'strftime' has been fixed!")
        else:
            print(f"❌ DOCX export failed: {response.status_code}")
            print(f"Error details: {response.data}")

            # Check if it's still the strftime error
            if 'strftime' in str(response.data):
                print("❌ strftime error still exists!")
            else:
                print("✓ strftime error has been resolved")

    except Exception as e:
        print(f"❌ Error during test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_real_world_scenario()
