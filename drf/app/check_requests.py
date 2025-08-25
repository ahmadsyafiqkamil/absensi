#!/usr/bin/env python3
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import OvertimeRequest

def check_overtime_requests():
    print("=== CEK OVERTIME REQUESTS USER PEGAWAI ===\n")
    
    # Get user pegawai
    try:
        user = User.objects.get(username='pegawai')
        print(f"👤 User: {user.username}")
    except User.DoesNotExist:
        print("❌ User 'pegawai' not found")
        return
    
    # Get overtime requests
    requests = OvertimeRequest.objects.filter(user=user).order_by('-date_requested')
    
    print(f"📊 Total overtime requests: {requests.count()}")
    print()
    
    if requests.exists():
        print("📅 Daftar overtime requests:")
        for req in requests:
            print(f"  {req.date_requested} ({req.date_requested.strftime('%A')}):")
            print(f"    - Jam lembur: {req.overtime_hours}h")
            print(f"    - Status: {req.status}")
            print(f"    - Deskripsi: {req.work_description[:100]}...")
            print(f"    - Jumlah gaji: AED {req.overtime_amount}")
            print(f"    - Dibuat: {req.created_at}")
            if req.level1_approved_by:
                print(f"    - Level 1 approved by: {req.level1_approved_by.username}")
            if req.final_approved_by:
                print(f"    - Final approved by: {req.final_approved_by.username}")
            print()
    else:
        print("❌ Tidak ada overtime requests")
    
    print("💡 Status Legend:")
    print("  - pending: Menunggu approval")
    print("  - level1_approved: Disetujui level 1 (supervisor divisi)")
    print("  - approved: Final approved")
    print("  - rejected: Ditolak")

if __name__ == "__main__":
    check_overtime_requests()
