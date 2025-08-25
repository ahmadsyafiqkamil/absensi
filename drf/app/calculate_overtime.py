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

def calculate_potential_overtime():
    print("=== PERHITUNGAN POTENSI LEMBUR USER PEGAWAI ===\n")
    
    # Get work settings
    ws = WorkSettings.objects.first()
    if not ws:
        print("❌ Work settings tidak ditemukan!")
        return
    
    print("📋 WORK SETTINGS:")
    print(f"   - Required minutes: {ws.required_minutes} ({ws.required_minutes/60:.1f} hours)")
    print(f"   - Overtime threshold: {ws.overtime_threshold_minutes} minutes")
    print(f"   - Overtime rate workday: {ws.overtime_rate_workday}")
    print(f"   - Overtime rate holiday: {ws.overtime_rate_holiday}")
    print()
    
    # Get user pegawai
    try:
        user = User.objects.get(username='pegawai')
        print(f"👤 USER: {user.username}")
    except User.DoesNotExist:
        print("❌ User 'pegawai' tidak ditemukan!")
        return
    
    print()
    
    # Get attendance records with work minutes > 0
    attendance_records = Attendance.objects.filter(
        user=user,
        total_work_minutes__gt=0
    ).order_by('-date_local')
    
    if not attendance_records.exists():
        print("❌ Tidak ada data attendance dengan jam kerja > 0!")
        return
    
    # Get existing overtime requests
    existing_requests = set(
        OvertimeRequest.objects.filter(user=user).values_list('date_requested', flat=True)
    )
    
    print("📅 ANALISIS POTENSI LEMBUR:")
    print()
    
    total_potential_hours = 0
    total_potential_amount = 0
    potential_records = []
    
    for att in attendance_records:
        # Calculate potential overtime
        potential_minutes = att.total_work_minutes - ws.required_minutes - ws.overtime_threshold_minutes
        
        # Check if already has overtime request
        has_request = att.date_local in existing_requests
        status_icon = "🔄" if has_request else "✅"
        status_text = " (Sudah diajukan)" if has_request else ""
        
        print(f"{status_icon} {att.date_local.strftime('%Y-%m-%d')} ({att.date_local.strftime('%A')}){status_text}:")
        print(f"   - Jam kerja: {att.total_work_minutes}min ({att.total_work_minutes/60:.1f}h)")
        print(f"   - Jam normal: {ws.required_minutes}min ({ws.required_minutes/60:.1f}h)")
        print(f"   - Threshold: {ws.overtime_threshold_minutes}min")
        print(f"   - Total minimum untuk lembur: {ws.required_minutes + ws.overtime_threshold_minutes}min ({(ws.required_minutes + ws.overtime_threshold_minutes)/60:.1f}h)")
        
        if potential_minutes > 0:
            potential_hours = potential_minutes / 60
            
            # Calculate potential amount (assuming gaji_pokok = 5000 AED for demo)
            gaji_pokok = 5000  # Demo value - bisa disesuaikan dengan gaji sebenarnya
            monthly_hours = 22 * 8
            hourly_wage = gaji_pokok / monthly_hours
            potential_amount = potential_hours * hourly_wage * float(ws.overtime_rate_workday)
            
            if not has_request:
                total_potential_hours += potential_hours
                total_potential_amount += potential_amount
                
                potential_records.append({
                    'date': att.date_local,
                    'work_minutes': att.total_work_minutes,
                    'work_hours': att.total_work_minutes / 60,
                    'potential_minutes': potential_minutes,
                    'potential_hours': potential_hours,
                    'potential_amount': potential_amount
                })
            
            print(f"   - 🎯 POTENSI LEMBUR: {potential_minutes}min ({potential_hours:.1f}h)")
            print(f"   - 💰 Potensi gaji: AED {potential_amount:.2f}")
        else:
            print(f"   - ❌ Tidak ada potensi lembur (kurang {abs(potential_minutes)}min)")
        
        print()
    
    print("📊 RINGKASAN POTENSI LEMBUR:")
    print(f"   - Total hari berpotensi: {len(potential_records)}")
    print(f"   - Total jam potensi: {total_potential_hours:.1f}h")
    print(f"   - Total potensi gaji: AED {total_potential_amount:.2f}")
    print()
    
    if potential_records:
        print("💡 REKOMENDASI:")
        print("   - User 'pegawai' dapat mengajukan lembur untuk hari-hari berikut:")
        for record in potential_records:
            print(f"     * {record['date'].strftime('%Y-%m-%d')} ({record['date'].strftime('%A')}): {record['potential_hours']:.1f}h - AED {record['potential_amount']:.2f}")
        print()
        print("   - Cara mengajukan:")
        print("     1. Buka halaman /pegawai/overtime")
        print("     2. Gunakan fitur 'Potensi Pengajuan Lembur' untuk quick submit")
        print("     3. Atau buat pengajuan manual dengan data yang sudah ada")
        print("     4. Isi deskripsi pekerjaan yang dilakukan")
    else:
        print("💡 REKOMENDASI:")
        print("   - Tidak ada potensi lembur yang belum diajukan")
        print("   - Semua hari dengan potensi lembur sudah diajukan atau tidak memenuhi syarat")
    
    print()
    print("🔧 CATATAN TEKNIS:")
    print(f"   - Jam kerja normal: {ws.required_minutes/60:.1f} jam ({ws.required_minutes} menit)")
    print(f"   - Buffer threshold: {ws.overtime_threshold_minutes} menit")
    print(f"   - Total minimum untuk lembur: {(ws.required_minutes + ws.overtime_threshold_minutes)/60:.1f} jam")
    print(f"   - Rate lembur hari kerja: {float(ws.overtime_rate_workday)*100:.0f}% dari gaji per jam")
    print(f"   - Rate lembur hari libur: {float(ws.overtime_rate_holiday)*100:.0f}% dari gaji per jam")

if __name__ == "__main__":
    calculate_potential_overtime()
