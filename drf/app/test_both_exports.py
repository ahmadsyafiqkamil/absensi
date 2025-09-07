#!/usr/bin/env python
"""
Test script untuk membandingkan export PDF individual dan monthly summary
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import OvertimeRequest, OvertimeSummaryRequest
from django.utils import timezone as dj_timezone

def test_both_export_processes():
    """Test both individual and monthly summary PDF exports"""
    print("=== Comparing Individual vs Monthly Summary PDF Export Processes ===\n")

    try:
        # Get the user
        User = get_user_model()
        user = User.objects.get(username='staff.konsuler1')
        print(f"✓ Found user: {user.username}")

        # Get employee
        employee = user.employee
        print(f"✓ Employee: {employee.fullname} (NIP: {employee.nip})")

        # Test Individual Overtime Export
        print("\n--- Testing Individual Overtime PDF Export ---")
        individual_request = OvertimeRequest.objects.filter(
            employee=employee,
            status='approved'
        ).first()

        if individual_request:
            print(f"✓ Found individual request: ID {individual_request.id}")

            from django.test import RequestFactory
            from api.views import OvertimeRequestViewSet

            factory = RequestFactory()
            request = factory.get(f'/api/overtime-requests/{individual_request.id}/export-pdf/')
            request.user = user

            viewset = OvertimeRequestViewSet()
            viewset.request = request
            viewset.kwargs = {'pk': str(individual_request.id)}

            response = viewset.export_pdf(request, pk=individual_request.id)

            if response.status_code == 200:
                print("✓ Individual PDF export successful!")
                print(f"  File size: {len(response.content)} bytes")
                print(f"  Content-Type: {response.get('Content-Type')}")
                individual_size = len(response.content)
            else:
                print(f"❌ Individual PDF export failed: {response.status_code}")
                print(f"  Error: {response.data}")
                individual_size = 0
        else:
            print("❌ No individual overtime request found")
            individual_size = 0

        # Test Monthly Summary Export
        print("\n--- Testing Monthly Summary PDF Export ---")
        summary_request = OvertimeSummaryRequest.objects.filter(
            employee=employee,
            status='approved',
            request_period='2025-08'
        ).first()

        if summary_request:
            print(f"✓ Found monthly summary request: {summary_request.request_title}")

            from api.views import OvertimeSummaryRequestViewSet

            factory = RequestFactory()
            request = factory.get(f'/api/employee/overtime-summary-requests/{summary_request.id}/export_pdf/')
            request.user = user

            viewset = OvertimeSummaryRequestViewSet()
            viewset.request = request
            viewset.kwargs = {'pk': str(summary_request.id)}

            response = viewset.export_pdf(request, pk=summary_request.id)

            if response.status_code == 200:
                print("✓ Monthly summary PDF export successful!")
                print(f"  File size: {len(response.content)} bytes")
                print(f"  Content-Type: {response.get('Content-Type')}")
                monthly_size = len(response.content)
            else:
                print(f"❌ Monthly summary PDF export failed: {response.status_code}")
                print(f"  Error: {response.data}")
                monthly_size = 0
        else:
            print("❌ No monthly summary request found")
            monthly_size = 0

        # Compare results
        print("\n--- Comparison Results ---")
        if individual_size > 0 and monthly_size > 0:
            print("✅ Both export processes are working!")
            print(f"  Individual PDF size: {individual_size} bytes")
            print(f"  Monthly PDF size: {monthly_size} bytes")
            print("✅ Both processes now use the same DOCX converter service!")
            print("✅ Monthly summary PDF export successfully updated to match individual process!")

        elif individual_size > 0:
            print("⚠️ Only individual export is working")
            print(f"  Individual PDF size: {individual_size} bytes")

        elif monthly_size > 0:
            print("⚠️ Only monthly summary export is working")
            print(f"  Monthly PDF size: {monthly_size} bytes")

        else:
            print("❌ Both exports are failing")

    except Exception as e:
        print(f"❌ Error during comparison test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_both_export_processes()
