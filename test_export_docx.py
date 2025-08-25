#!/usr/bin/env python3
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import MonthlySummaryRequest
from api.views import MonthlySummaryRequestViewSet
from django.test import RequestFactory
from django.contrib.auth.models import User

def test_export_docx():
    try:
        # Setup
        request = RequestFactory().get('/')
        user = User.objects.filter(username='pegawai').first()
        request.user = user
        
        viewset = MonthlySummaryRequestViewSet()
        viewset.request = request
        
        # Get approved request
        approved_request = MonthlySummaryRequest.objects.filter(status='approved').first()
        if not approved_request:
            print("No approved request found")
            return
        
        print(f"=== TESTING EXPORT DOCX FUNCTION ===")
        print(f"Request ID: {approved_request.id}")
        print(f"Status: {approved_request.status}")
        print(f"Employee: {approved_request.employee}")
        print(f"Period: {approved_request.request_period}")
        
        # Get overtime data
        overtime_data = viewset.get_overtime_data_for_period(
            approved_request.employee, 
            approved_request.request_period,
            include_approved_only=True
        )
        print(f"Overtime records: {overtime_data.count()}")
        
        # Test template path
        template_path, template_name = viewset.get_monthly_export_template_path()
        print(f"Template path: {template_path}")
        print(f"Template name: {template_name}")
        
        # Test DOCX generation
        print("=== TESTING DOCX GENERATION ===")
        docx_file = viewset.generate_monthly_summary_docx(
            approved_request, 
            overtime_data, 
            approved_request.request_period
        )
        print(f"DOCX generated successfully: {docx_file}")
        
        # Check file
        if os.path.exists(docx_file):
            print(f"File size: {os.path.getsize(docx_file)} bytes")
            # Clean up
            os.unlink(docx_file)
            print("Temporary file cleaned up")
        else:
            print("File not found after generation")
            
    except Exception as e:
        import traceback
        print(f"Error: {str(e)}")
        print("Traceback:")
        traceback.print_exc()

if __name__ == "__main__":
    test_export_docx()
