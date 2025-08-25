#!/usr/bin/env python3
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import Employee, Attendance, WorkSettings, OvertimeRequest
from datetime import date, timedelta

def check_potential_overtime():
    print("=== POTENSI LEMBUR USER PEGAWAI ===\n")
    
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
    user_pegawai = User.objects.filter(username='pegawai').first()
    if not user_pegawai:
        print("❌ User 'pegawai' tidak ditemukan!")
        return
    
    print(f"👤 USER: {user_pegawai.username}")
    print()
    
    # Get attendance records for last 30 days
    end_date = date.today()
    start_date = end_date - timedelta(days=30)
    
    attendance_records = Attendance.objects.filter(
        user=user_pegawai,
        date_local__gte=start_date,
        date_local__lte=end_date,
        total_work_minutes__gt=0
    ).order_by('-date_local')
    
    print(f"📅 ANALISIS POTENSI LEMBUR (Last 30 days):")
    print(f"   Periode: {start_date} sampai {end_date}")
    print()
    
    if not attendance_records.exists():
        print("❌ Tidak ada data attendance yang ditemukan!")
        return
    
    # Get existing overtime requests
    existing_requests = set(
        OvertimeRequest.objects.filter(
            user=user_pegawai,
            date_requested__gte=start_date,
            date_requested__lte=end_date
        ).values_list('date_requested', flat=True)
    )
    
    total_potential_hours = 0
    total_potential_amount = 0
    potential_records = []
    
    for att in attendance_records:
        # Skip if already has overtime request
        if att.date_local in existing_requests:
            continue
        
        # Calculate potential overtime
        potential_minutes = att.total_work_minutes - ws.required_minutes - ws.overtime_threshold_minutes
        
        # Only include if there's potential overtime
        if potential_minutes > 0:
            potential_hours = potential_minutes / 60
            
            # Calculate potential amount (assuming gaji_pokok = 5000 AED for demo)
            gaji_pokok = 5000  # Demo value
            monthly_hours = 22 * 8
            hourly_wage = gaji_pokok / monthly_hours
            potential_amount = potential_hours * hourly_wage * float(ws.overtime_rate_workday)
            
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
            
            print(f"✅ {att.date_local.strftime('%Y-%m-%d')} ({att.date_local.strftime('%A')}):")
            print(f"   - Jam kerja: {att.total_work_minutes}min ({att.total_work_minutes/60:.1f}h)")
            print(f"   - Jam normal: {ws.required_minutes}min ({ws.required_minutes/60:.1f}h)")
            print(f"   - Threshold: {ws.overtime_threshold_minutes}min")
            print(f"   - Potensi lembur: {potential_minutes}min ({potential_hours:.1f}h)")
            print(f"   - Potensi gaji: AED {potential_amount:.2f}")
            print()
        else:
            print(f"❌ {att.date_local.strftime('%Y-%m-%d')} ({att.date_local.strftime('%A')}):")
            print(f"   - Jam kerja: {att.total_work_minutes}min ({att.total_work_minutes/60:.1f}h)")
            print(f"   - Tidak ada potensi lembur (kurang dari {ws.required_minutes + ws.overtime_threshold_minutes}min)")
            print()
    
    print("📊 RINGKASAN POTENSI LEMBUR:")
    print(f"   - Total hari berpotensi: {len(potential_records)}")
    print(f"   - Total jam potensi: {total_potential_hours:.1f}h")
    print(f"   - Total potensi gaji: AED {total_potential_amount:.2f}")
    print()
    
    if potential_records:
        print("💡 REKOMENDASI:")
        print("   - User 'pegawai' dapat mengajukan lembur untuk hari-hari tersebut")
        print("   - Gunakan fitur 'Potensi Pengajuan Lembur' di halaman overtime")
        print("   - Atau buat pengajuan manual dengan data yang sudah ada")
    else:
        print("💡 REKOMENDASI:")
        print("   - Tidak ada potensi lembur dalam 30 hari terakhir")
        print("   - Cek periode yang lebih lama atau tunggu data attendance baru")

if __name__ == "__main__":
    check_potential_overtime()
