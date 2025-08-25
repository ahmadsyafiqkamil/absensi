#!/usr/bin/env python3
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import Attendance, WorkSettings, OvertimeRequest
from datetime import date, timedelta

def final_summary():
    print("=" * 60)
    print("           FINAL SUMMARY POTENSI LEMBUR USER PEGAWAI")
    print("=" * 60)
    print()
    
    # Get work settings
    ws = WorkSettings.objects.first()
    if not ws:
        print("❌ Work settings tidak ditemukan!")
        return
    
    # Get user pegawai
    try:
        user = User.objects.get(username='pegawai')
    except User.DoesNotExist:
        print("❌ User 'pegawai' tidak ditemukan!")
        return
    
    print("📋 KONFIGURASI SISTEM:")
    print(f"   - Jam kerja normal: {ws.required_minutes/60:.1f} jam ({ws.required_minutes} menit)")
    print(f"   - Buffer threshold: {ws.overtime_threshold_minutes} menit")
    print(f"   - Total minimum untuk lembur: {(ws.required_minutes + ws.overtime_threshold_minutes)/60:.1f} jam")
    print(f"   - Rate lembur hari kerja: {float(ws.overtime_rate_workday)*100:.0f}%")
    print(f"   - Rate lembur hari libur: {float(ws.overtime_rate_holiday)*100:.0f}%")
    print()
    
    # Get attendance records
    attendance_records = Attendance.objects.filter(
        user=user,
        total_work_minutes__gt=0
    ).order_by('-date_local')
    
    # Get existing overtime requests
    existing_requests = OvertimeRequest.objects.filter(user=user).order_by('-date_requested')
    
    print("📊 ANALISIS DATA ATTENDANCE & OVERTIME REQUESTS:")
    print(f"   - Total hari kerja: {attendance_records.count()}")
    print(f"   - Total overtime requests: {existing_requests.count()}")
    print()
    
    # Analyze each day
    print("📅 ANALISIS PER HARI:")
    print("-" * 60)
    
    total_potential_hours = 0
    total_actual_hours = 0
    total_potential_amount = 0
    total_actual_amount = 0
    days_with_potential = 0
    days_with_requests = 0
    
    for att in attendance_records:
        # Calculate potential overtime
        potential_minutes = att.total_work_minutes - ws.required_minutes - ws.overtime_threshold_minutes
        
        # Check if has overtime request
        overtime_request = existing_requests.filter(date_requested=att.date_local).first()
        
        print(f"📅 {att.date_local.strftime('%Y-%m-%d')} ({att.date_local.strftime('%A')}):")
        print(f"   Jam kerja: {att.total_work_minutes}min ({att.total_work_minutes/60:.1f}h)")
        print(f"   Jam normal: {ws.required_minutes}min ({ws.required_minutes/60:.1f}h)")
        print(f"   Threshold: {ws.overtime_threshold_minutes}min")
        print(f"   Minimum untuk lembur: {(ws.required_minutes + ws.overtime_threshold_minutes)/60:.1f}h")
        
        if potential_minutes > 0:
            days_with_potential += 1
            potential_hours = potential_minutes / 60
            total_potential_hours += potential_hours
            
            # Calculate potential amount
            gaji_pokok = 5000  # Demo value
            monthly_hours = 22 * 8
            hourly_wage = gaji_pokok / monthly_hours
            potential_amount = potential_hours * hourly_wage * float(ws.overtime_rate_workday)
            total_potential_amount += potential_amount
            
            print(f"   🎯 POTENSI LEMBUR: {potential_minutes}min ({potential_hours:.1f}h)")
            print(f"   💰 Potensi gaji: AED {potential_amount:.2f}")
            
            if overtime_request:
                days_with_requests += 1
                actual_hours = float(overtime_request.overtime_hours)
                actual_amount = float(overtime_request.overtime_amount)
                total_actual_hours += actual_hours
                total_actual_amount += actual_amount
                
                print(f"   ✅ SUDAH DIAJUKAN: {actual_hours}h - AED {actual_amount:.2f}")
                print(f"   📝 Status: {overtime_request.status}")
                print(f"   📄 Deskripsi: {overtime_request.work_description[:80]}...")
                
                if overtime_request.level1_approved_by:
                    print(f"   👤 Level 1 approved by: {overtime_request.level1_approved_by.username}")
                if overtime_request.final_approved_by:
                    print(f"   👤 Final approved by: {overtime_request.final_approved_by.username}")
            else:
                print(f"   ❌ BELUM DIAJUKAN - Bisa diajukan sekarang!")
        else:
            print(f"   ❌ Tidak ada potensi lembur")
        
        print()
    
    print("=" * 60)
    print("📊 RINGKASAN FINAL:")
    print("=" * 60)
    print(f"   Hari dengan potensi lembur: {days_with_potential}")
    print(f"   Hari yang sudah diajukan: {days_with_requests}")
    print(f"   Hari yang belum diajukan: {days_with_potential - days_with_requests}")
    print()
    print(f"   Total jam potensi lembur: {total_potential_hours:.1f}h")
    print(f"   Total jam yang diajukan: {total_actual_hours:.1f}h")
    print(f"   Total jam yang belum diajukan: {total_potential_hours - total_actual_hours:.1f}h")
    print()
    print(f"   Total potensi gaji: AED {total_potential_amount:.2f}")
    print(f"   Total gaji yang diajukan: AED {total_actual_amount:.2f}")
    print(f"   Total gaji yang belum diajukan: AED {total_potential_amount - total_actual_amount:.2f}")
    print()
    
    # Recommendations
    print("💡 REKOMENDASI:")
    if days_with_potential > days_with_requests:
        print(f"   - Ada {days_with_potential - days_with_requests} hari yang belum diajukan lembur")
        print(f"   - Total potensi: {total_potential_hours - total_actual_hours:.1f}h lembur")
        print(f"   - Total potensi gaji: AED {total_potential_amount - total_actual_amount:.2f}")
        print()
        print("   Cara mengajukan:")
        print("   1. Buka halaman /pegawai/overtime")
        print("   2. Gunakan fitur 'Potensi Pengajuan Lembur'")
        print("   3. Atau buat pengajuan manual")
        print("   4. Isi deskripsi pekerjaan yang dilakukan")
    else:
        print("   ✅ Semua hari dengan potensi lembur sudah diajukan!")
        print("   🎉 Tidak ada potensi lembur yang terlewat")
    
    print()
    print("🔧 CATATAN TEKNIS:")
    print(f"   - Sistem menggunakan threshold {ws.overtime_threshold_minutes} menit sebagai buffer")
    print(f"   - Lembur hanya dihitung jika kerja > {ws.required_minutes + ws.overtime_threshold_minutes} menit")
    print(f"   - Rate lembur hari kerja: {float(ws.overtime_rate_workday)*100:.0f}% dari gaji per jam")
    print(f"   - Rate lembur hari libur: {float(ws.overtime_rate_holiday)*100:.0f}% dari gaji per jam")
    print("=" * 60)

if __name__ == "__main__":
    final_summary()
