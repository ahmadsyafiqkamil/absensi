#!/usr/bin/env python
"""
Test script untuk test export PDF dari individual overtime request
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import OvertimeRequest
from django.utils import timezone as dj_timezone

def test_export_pdf_individual():
    """Test export PDF functionality for individual overtime request"""
    print("=== Testing Individual Overtime PDF Export ===\n")

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

        # Test the export_pdf endpoint
        from django.test import RequestFactory
        from api.views import OvertimeRequestViewSet

        factory = RequestFactory()
        request = factory.get(f'/api/overtime-requests/{overtime_request.id}/export-pdf/')
        request.user = user

        viewset = OvertimeRequestViewSet()
        viewset.request = request
        viewset.kwargs = {'pk': str(overtime_request.id)}

        print("Testing PDF export...")
        response = viewset.export_pdf(request, pk=overtime_request.id)

        if response.status_code == 200:
            print("✓ PDF export successful!")
            print(f"✓ Content-Type: {response.get('Content-Type', 'N/A')}")
            print(f"✓ Content-Disposition: {response.get('Content-Disposition', 'N/A')}")
            print(f"✓ File size: {len(response.content)} bytes")
            print("✓ Export PDF error has been fixed!")
        else:
            print(f"❌ PDF export failed: {response.status_code}")
            print(f"Error details: {response.data}")

            # Check if it's still the requests module error
            if 'requests' in str(response.data):
                print("❌ requests module error still exists!")
            else:
                print("✓ requests module error has been resolved")

    except Exception as e:
        print(f"❌ Error during PDF export test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_export_pdf_individual()
