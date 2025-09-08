#!/usr/bin/env python3
"""
Test script untuk memverifikasi penggunaan template template_rekap_lembur.docx
dalam sistem generate DOCX rekap lembur bulanan
"""

import os
import sys
import django
from datetime import datetime, date
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import OvertimeRequest, Employee, OvertimeSummaryRequest
from django.contrib.auth.models import User
from api.views import OvertimeSummaryRequestViewSet

def test_template_usage():
    """Test penggunaan template template_rekap_lembur.docx"""
    try:
        print("🚀 Testing template usage untuk rekap lembur bulanan...")
        print("=" * 60)

        # Test 1: Verifikasi template ada
        print("📋 Test 1: Memeriksa keberadaan template")
        template_path = '/app/template/template_rekap_lembur.docx'

        if os.path.exists(template_path):
            print(f"✅ Template ditemukan: {template_path}")
            print(f"   File size: {os.path.getsize(template_path)} bytes")
        else:
            print(f"❌ Template tidak ditemukan: {template_path}")
            return False

        # Test 2: Test method get_monthly_export_template_path
        print("\n📋 Test 2: Testing get_monthly_export_template_path method")
        viewset = OvertimeSummaryRequestViewSet()
        returned_template_path, returned_template_name = viewset.get_monthly_export_template_path()

        print(f"   Returned template path: {returned_template_path}")
        print(f"   Returned template name: {returned_template_name}")

        if returned_template_name == 'template_rekap_lembur.docx':
            print("✅ Method mengembalikan template yang benar")
        else:
            print(f"❌ Method mengembalikan template yang salah: {returned_template_name}")
            return False

        # Test 3: Buat data test
        print("\n📋 Test 3: Membuat data test")
        user, created = User.objects.get_or_create(
            username='test_user_template',
            defaults={
                'email': 'test.template@example.com',
                'first_name': 'Test',
                'last_name': 'Template'
            }
        )

        employee, created = Employee.objects.get_or_create(
            user=user,
            defaults={
                'nip': 'TEST001',
                'fullname': 'Test Template User'
            }
        )

        print(f"   User: {user.username}")
        print(f"   Employee: {employee.nip} - {employee.fullname}")

        # Test 4: Buat OvertimeSummaryRequest test
        print("\n📋 Test 4: Membuat OvertimeSummaryRequest test")
        summary_request = OvertimeSummaryRequest.objects.create(
            employee=employee,
            user=user,
            request_period='2025-01',
            request_title='Test Template Rekap Lembur',
            request_description='Test untuk memverifikasi penggunaan template template_rekap_lembur.docx',
            include_overtime_details=True,
            include_overtime_summary=True,
            include_approver_info=True,
            status='approved',
            level1_approved_by=user,
            final_approved_by=user,
            level1_approved_at=datetime.now(),
            final_approved_at=datetime.now()
        )
        print(f"   Summary request created with ID: {summary_request.id}")

        # Test 5: Test generate_monthly_summary_docx
        print("\n📋 Test 5: Testing generate_monthly_summary_docx")
        try:
            docx_path = viewset.generate_monthly_summary_docx(
                summary_request,
                OvertimeRequest.objects.none(),  # Empty queryset untuk test
                '2025-01'
            )

            if docx_path and os.path.exists(docx_path):
                print(f"✅ DOCX generated successfully at: {docx_path}")
                print(f"   File size: {os.path.getsize(docx_path)} bytes")

                # Verifikasi bahwa OvertimeSummaryDocument dibuat
                if summary_request.docx_document:
                    print(f"✅ OvertimeSummaryDocument created with ID: {summary_request.docx_document.id}")
                    print(f"   DOCX file path: {summary_request.docx_document.docx_file.path}")
                else:
                    print("❌ OvertimeSummaryDocument tidak dibuat")

                # Cleanup
                try:
                    os.unlink(docx_path)
                    print("🧹 Cleanup: Temporary file deleted")
                except:
                    pass

            else:
                print("❌ Failed to generate DOCX")
                return False

        except Exception as e:
            print(f"❌ Error during DOCX generation: {e}")
            import traceback
            traceback.print_exc()
            return False

        # Cleanup test data
        print("\n📋 Test 6: Cleanup test data")
        summary_request.delete()
        print("✅ Test data cleaned up")

        print("\n" + "=" * 60)
        print("🎉 SEMUA TEST BERHASIL!")
        print("Template template_rekap_lembur.docx berhasil digunakan untuk generate DOCX")
        print("=" * 60)

        return True

    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_template_priority_fallback():
    """Test fallback mechanism ketika template utama tidak ada"""
    try:
        print("\n🔄 Testing template fallback mechanism...")

        # Simpan path template asli
        original_template_path = '/app/template/template_rekap_lembur.docx'

        # Backup template asli
        backup_path = '/app/template/template_rekap_lembur.docx.backup'
        if os.path.exists(original_template_path):
            os.rename(original_template_path, backup_path)
            print("📦 Template asli di-backup")

        # Test fallback
        viewset = OvertimeSummaryRequestViewSet()
        fallback_path, fallback_name = viewset.get_monthly_export_template_path()

        print(f"   Fallback template: {fallback_name}")
        print(f"   Fallback path: {fallback_path}")

        if fallback_name and os.path.exists(fallback_path):
            print("✅ Fallback mechanism bekerja dengan baik")
        else:
            print("❌ Fallback mechanism gagal")

        # Restore template asli
        if os.path.exists(backup_path):
            os.rename(backup_path, original_template_path)
            print("🔄 Template asli di-restore")

        return True

    except Exception as e:
        print(f"❌ Fallback test failed: {e}")
        return False

if __name__ == '__main__':
    print("🧪 TEMPLATE USAGE TESTING")
    print("Testing penggunaan template template_rekap_lembur.docx")
    print("=" * 70)

    # Main test
    success = test_template_usage()

    if success:
        # Test fallback mechanism
        test_template_priority_fallback()

    print("\n" + "=" * 70)
    if success:
        print("✅ TESTING COMPLETED SUCCESSFULLY")
        sys.exit(0)
    else:
        print("❌ TESTING FAILED")
        sys.exit(1)
