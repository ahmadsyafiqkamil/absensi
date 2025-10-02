#!/usr/bin/env python3
"""
Debug script untuk memeriksa masalah user stafkonsuler tidak bisa melihat data potensi lembur.

Script ini akan:
1. Memeriksa apakah user stafkonsuler memiliki grup 'pegawai'
2. Memeriksa data attendance user stafkonsuler
3. Memeriksa apakah ada data yang memenuhi kriteria potensi lembur
4. Memeriksa konfigurasi work settings
"""

import os
import sys
import django
from datetime import date, timedelta

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User, Group
from apps.attendance.models import Attendance
from apps.settings.models import WorkSettings
from apps.employees.models import Employee

def debug_stafkonsuler_overtime():
    print("=== DEBUG: Stafkonsuler Overtime Issue ===\n")
    
    # 1. Cari user stafkonsuler
    try:
        user = User.objects.get(username='stafkonsuler')
        print(f"✓ User ditemukan: {user.username}")
        print(f"  - ID: {user.id}")
        print(f"  - Email: {user.email}")
        print(f"  - Is Active: {user.is_active}")
        print(f"  - Is Superuser: {user.is_superuser}")
        print(f"  - Date Joined: {user.date_joined}")
    except User.DoesNotExist:
        print("✗ User 'stafkonsuler' tidak ditemukan!")
        return
    except Exception as e:
        print(f"✗ Error mencari user: {e}")
        return
    
    print()
    
    # 2. Periksa grup user
    print("2. Memeriksa grup user:")
    user_groups = user.groups.all()
    print(f"   Total grup: {user_groups.count()}")
    for group in user_groups:
        print(f"   - {group.name}")
    
    has_pegawai_group = user.groups.filter(name='pegawai').exists()
    print(f"   ✓ Memiliki grup 'pegawai': {has_pegawai_group}")
    
    if not has_pegawai_group:
        print("   ⚠️  MASALAH: User tidak memiliki grup 'pegawai'!")
        print("   💡 Solusi: Tambahkan user ke grup 'pegawai'")
        
        # Tampilkan grup yang tersedia
        all_groups = Group.objects.all()
        print(f"\n   Grup yang tersedia:")
        for group in all_groups:
            print(f"   - {group.name}")
    
    print()
    
    # 3. Periksa profil employee
    print("3. Memeriksa profil employee:")
    try:
        employee = user.employee_profile
        print(f"   ✓ Profil employee ditemukan:")
        print(f"   - ID: {employee.id}")
        print(f"   - Nama: {employee.fullname}")
        print(f"   - NIP: {employee.nip}")
        print(f"   - Gaji Pokok: {employee.gaji_pokok}")
        print(f"   - Position: {employee.position.name if employee.position else 'None'}")
        print(f"   - Division: {employee.division.name if employee.division else 'None'}")
    except Exception as e:
        print(f"   ✗ Profil employee tidak ditemukan: {e}")
        print("   💡 Solusi: Buat profil employee untuk user ini")
        return
    
    print()
    
    # 4. Periksa work settings
    print("4. Memeriksa work settings:")
    try:
        ws = WorkSettings.objects.first()
        if ws:
            print(f"   ✓ Work settings ditemukan:")
            print(f"   - Required Minutes: {ws.required_minutes}")
            print(f"   - Friday Required Minutes: {ws.friday_required_minutes}")
            print(f"   - Overtime Threshold Minutes: {ws.overtime_threshold_minutes}")
            print(f"   - Overtime Rate Workday: {ws.overtime_rate_workday}")
            print(f"   - Overtime Rate Holiday: {ws.overtime_rate_holiday}")
        else:
            print("   ⚠️  Work settings tidak ditemukan!")
            print("   💡 Solusi: Buat work settings di admin panel")
    except Exception as e:
        print(f"   ✗ Error memeriksa work settings: {e}")
    
    print()
    
    # 5. Periksa data attendance
    print("5. Memeriksa data attendance:")
    
    # Default date range (last 30 days)
    end_date = date.today()
    start_date = end_date - timedelta(days=30)
    
    attendance_records = Attendance.objects.filter(
        user=user,
        date_local__gte=start_date,
        date_local__lte=end_date
    ).order_by('date_local')
    
    print(f"   Periode: {start_date} sampai {end_date}")
    print(f"   Total attendance records: {attendance_records.count()}")
    
    if attendance_records.count() == 0:
        print("   ⚠️  Tidak ada data attendance!")
        print("   💡 Solusi: Pastikan user sudah melakukan check-in/check-out")
        return
    
    # Filter attendance yang memiliki check-in dan check-out
    complete_records = attendance_records.filter(
        check_in_at_utc__isnull=False,
        check_out_at_utc__isnull=False
    )
    
    print(f"   Complete records (dengan check-in & check-out): {complete_records.count()}")
    
    # Filter yang belum memiliki overtime request
    records_without_overtime = complete_records.exclude(
        overtime_requests__isnull=False
    )
    
    print(f"   Records tanpa overtime request: {records_without_overtime.count()}")
    
    print()
    
    # 6. Analisis potensi lembur
    print("6. Analisis potensi lembur:")
    
    overtime_threshold = int(ws.overtime_threshold_minutes or 30) if ws else 30
    print(f"   Overtime threshold: {overtime_threshold} menit")
    
    potential_records = []
    
    for att in records_without_overtime:
        # Determine required minutes
        if att.date_local.weekday() == 4:  # Friday
            required_minutes = int(ws.friday_required_minutes or 240) if ws else 240
        else:
            required_minutes = int(ws.required_minutes or 480) if ws else 480
        
        # Calculate potential overtime
        potential_overtime_minutes = att.total_work_minutes - required_minutes - overtime_threshold
        
        if potential_overtime_minutes > 0:
            potential_overtime_hours = potential_overtime_minutes / 60
            
            record_info = {
                'date': att.date_local,
                'total_work_minutes': att.total_work_minutes,
                'required_minutes': required_minutes,
                'potential_overtime_minutes': potential_overtime_minutes,
                'potential_overtime_hours': round(potential_overtime_hours, 2),
                'is_holiday': att.is_holiday,
                'within_geofence': att.within_geofence,
            }
            potential_records.append(record_info)
    
    print(f"   Records dengan potensi lembur: {len(potential_records)}")
    
    if len(potential_records) == 0:
        print("   ⚠️  Tidak ada data yang memenuhi kriteria potensi lembur!")
        print("   💡 Kriteria: total_work_minutes > required_minutes + overtime_threshold")
        print("   💡 Cek apakah user bekerja lebih dari jam normal + buffer")
        
        # Tampilkan beberapa contoh attendance
        print("\n   Contoh attendance records:")
        for i, att in enumerate(complete_records[:5]):
            if att.date_local.weekday() == 4:  # Friday
                required = int(ws.friday_required_minutes or 240) if ws else 240
            else:
                required = int(ws.required_minutes or 480) if ws else 480
            
            potential = att.total_work_minutes - required - overtime_threshold
            print(f"   {i+1}. {att.date_local} - Work: {att.total_work_minutes}m, Required: {required}m, Potential: {potential}m")
    else:
        print("   ✓ Data potensi lembur ditemukan:")
        for record in potential_records[:5]:  # Tampilkan 5 pertama
            print(f"   - {record['date']}: {record['potential_overtime_hours']}j ({record['potential_overtime_minutes']}m)")
    
    print()
    
    # 7. Kesimpulan dan solusi
    print("7. Kesimpulan dan Solusi:")
    
    issues = []
    if not has_pegawai_group:
        issues.append("User tidak memiliki grup 'pegawai'")
    if len(potential_records) == 0:
        issues.append("Tidak ada data yang memenuhi kriteria potensi lembur")
    
    if not issues:
        print("   ✓ Tidak ada masalah yang terdeteksi!")
        print("   💡 Coba refresh halaman atau cek network tab di browser")
    else:
        print("   ⚠️  Masalah yang ditemukan:")
        for i, issue in enumerate(issues, 1):
            print(f"   {i}. {issue}")
        
        print("\n   💡 Solusi:")
        if not has_pegawai_group:
            print("   1. Tambahkan user 'stafkonsuler' ke grup 'pegawai':")
            print("      - Login ke admin panel")
            print("      - Users → stafkonsuler → Groups → pilih 'pegawai'")
        
        if len(potential_records) == 0:
            print("   2. Pastikan user memiliki data attendance yang valid:")
            print("      - User harus melakukan check-in dan check-out")
            print("      - Total jam kerja harus lebih dari jam normal + buffer")
            print("      - Cek apakah work settings sudah dikonfigurasi dengan benar")

if __name__ == "__main__":
    debug_stafkonsuler_overtime()
