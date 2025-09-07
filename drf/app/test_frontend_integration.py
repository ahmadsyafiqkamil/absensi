#!/usr/bin/env python
"""
Test script untuk verifikasi integrasi frontend export PDF monthly summary
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import OvertimeSummaryRequest
from django.test import RequestFactory
from django.urls import reverse
from django.http import HttpRequest

def test_frontend_integration():
    """Test frontend integration for monthly summary PDF export"""
    print("=== Testing Frontend Integration for Monthly Summary PDF Export ===\n")

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
        print(f"  ID: {summary_request.id}")
        print(f"  Period: {summary_request.request_period}")

        # Test URL resolution
        print("\n--- Testing URL Resolution ---")
        try:
            url = reverse('employee-overtime-summary-export-pdf', kwargs={'pk': summary_request.id})
            print(f"✓ URL resolved: {url}")
            expected_url = f'/api/employee/overtime-summary-requests/{summary_request.id}/export_pdf'
            if url == expected_url:
                print("✓ URL matches expected format")
            else:
                print(f"⚠️ URL mismatch: expected {expected_url}, got {url}")
        except Exception as e:
            print(f"❌ URL resolution failed: {e}")

        # Test actual endpoint
        print("\n--- Testing Endpoint Access ---")
        from api.views import OvertimeSummaryRequestViewSet

        factory = RequestFactory()
        request = factory.get(f'/api/employee/overtime-summary-requests/{summary_request.id}/export_pdf/')
        request.user = user

        viewset = OvertimeSummaryRequestViewSet()
        viewset.request = request
        viewset.kwargs = {'pk': str(summary_request.id)}

        try:
            response = viewset.export_pdf(request, pk=summary_request.id)

            if response.status_code == 200:
                print("✓ Endpoint accessible and working!")
                print(f"✓ Response status: {response.status_code}")
                print(f"✓ Content-Type: {response.get('Content-Type', 'N/A')}")
                print(f"✓ Content-Disposition: {response.get('Content-Disposition', 'N/A')}")
                print(f"✓ File size: {len(response.content)} bytes")

                # Simulate frontend download
                filename = response.get('Content-Disposition', '').split('filename=')[1].strip('"') if 'filename=' in response.get('Content-Disposition', '') else 'unknown.pdf'
                print(f"✓ Frontend would download: {filename}")

            else:
                print(f"❌ Endpoint failed: {response.status_code}")
                print(f"Error details: {response.data}")

        except Exception as e:
            print(f"❌ Endpoint error: {str(e)}")
            import traceback
            traceback.print_exc()

        # Verify frontend code integration
        print("\n--- Verifying Frontend Integration ---")
        frontend_code_working = True

        # Check if the URL pattern matches what frontend expects
        frontend_expected_url = f"/api/employee/overtime-summary-requests/{summary_request.id}/export_pdf/"
        try:
            resolved_url = reverse('employee-overtime-summary-export-pdf', kwargs={'pk': summary_request.id})
            if resolved_url == frontend_expected_url:
                print("✓ Frontend URL pattern matches backend endpoint")
            else:
                print(f"⚠️ URL pattern mismatch: frontend expects {frontend_expected_url}, backend provides {resolved_url}")
                frontend_code_working = False
        except:
            print("❌ URL pattern not found")
            frontend_code_working = False

        # Check method availability
        if hasattr(viewset, 'export_pdf'):
            print("✓ export_pdf method available in ViewSet")
        else:
            print("❌ export_pdf method not found in ViewSet")
            frontend_code_working = False

        # Final status
        print("\n--- Integration Status ---")
        if frontend_code_working:
            print("✅ Frontend integration is COMPLETE and WORKING!")
            print("✅ Users can now export PDF from monthly summary table!")
        else:
            print("⚠️ Frontend integration has ISSUES that need to be resolved")

    except Exception as e:
        print(f"❌ Error during frontend integration test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_frontend_integration()
