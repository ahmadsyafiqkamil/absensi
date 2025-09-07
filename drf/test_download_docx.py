#!/usr/bin/env python
"""
Test script untuk test download DOCX dari individual overtime request
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import OvertimeRequest
from django.utils import timezone as dj_timezone

def test_download_docx():
    """Test download DOCX functionality for individual overtime request"""
    print("=== Testing Individual Overtime DOCX Download ===\n")

    try:
        # Get the user
        User = get_user_model()
        user = User.objects.get(username='staff.konsuler1')
        print(f"✓ Found user: {user.username}")

        # Get employee
        employee = user.employee
        print(f"✓ Employee: {employee.fullname} (NIP: {employee.nip})")

        # Get an approved overtime request
        overtime_request = OvertimeRequest.objects.filter(
            employee=employee,
            status='approved'
        ).first()

        if not overtime_request:
            print("❌ No approved overtime request found")
            return

        print(f"✓ Found approved overtime request: ID {overtime_request.id}")
        print(f"  Date requested: {overtime_request.date_requested}")
        print(f"  Final approved at: {overtime_request.final_approved_at}")

        # Test the download endpoint
        from django.test import RequestFactory
        from api.views import OvertimeRequestViewSet

        factory = RequestFactory()
        request = factory.get(f'/api/overtime-requests/{overtime_request.id}/download/')
        request.user = user

        viewset = OvertimeRequestViewSet()
        viewset.request = request
        viewset.kwargs = {'pk': str(overtime_request.id)}

        print("Testing DOCX download...")
        response = viewset.download(request, pk=overtime_request.id)

        if response.status_code == 200:
            print("✓ DOCX download successful!")
            print(f"✓ Content-Type: {response.get('Content-Type', 'N/A')}")
            print(f"✓ Content-Disposition: {response.get('Content-Disposition', 'N/A')}")
            print(f"✓ File size: {len(response.content)} bytes")
            print("✓ Error 'NoneType' object has no attribute 'strftime' has been fixed!")
        else:
            print(f"❌ DOCX download failed: {response.status_code}")
            print(f"Error details: {response.data}")

            # Check if it's still the strftime error
            if 'strftime' in str(response.data):
                print("❌ strftime error still exists!")
            else:
                print("✓ strftime error has been resolved")

    except Exception as e:
        print(f"❌ Error during download test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_download_docx()
