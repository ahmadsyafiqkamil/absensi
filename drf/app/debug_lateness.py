#!/usr/bin/env python3
"""
Debug script untuk memeriksa perhitungan keterlambatan
"""
import os
import sys
import django
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import WorkSettings, Holiday, Attendance
from api.utils import evaluate_lateness, evaluate_lateness_as_dict
from django.utils import timezone as dj_timezone

def debug_work_settings():
    """Debug pengaturan kerja"""
    print("=== DEBUG WORK SETTINGS ===")
    try:
        ws = WorkSettings.objects.first()
        if ws:
            print(f"Timezone: {ws.timezone}")
            print(f"Start Time: {ws.start_time}")
            print(f"End Time: {ws.end_time}")
            print(f"Grace Minutes: {ws.grace_minutes}")
            print(f"Required Minutes: {ws.required_minutes}")
            print(f"Workdays: {ws.workdays}")
            print(f"Friday Start: {ws.friday_start_time}")
            print(f"Friday End: {ws.friday_end_time}")
            print(f"Friday Grace: {ws.friday_grace_minutes}")
            print(f"Friday Required: {ws.friday_required_minutes}")
        else:
            print("No WorkSettings found!")
    except Exception as e:
        print(f"Error getting WorkSettings: {e}")

def debug_holiday_check(date_str):
    """Debug pengecekan hari libur"""
    print(f"\n=== DEBUG HOLIDAY CHECK for {date_str} ===")
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        holiday = Holiday.objects.filter(date=date_obj).first()
        if holiday:
            print(f"Found holiday: {holiday.note}")
        else:
            print("No holiday found")
    except Exception as e:
        print(f"Error checking holiday: {e}")

def debug_lateness_calculation(check_in_time_str, timezone_str="Asia/Dubai"):
    """Debug perhitungan keterlambatan"""
    print(f"\n=== DEBUG LATENESS CALCULATION ===")
    print(f"Check-in time: {check_in_time_str}")
    print(f"Timezone: {timezone_str}")
    
    try:
        # Parse check-in time
        check_in_dt = datetime.fromisoformat(check_in_time_str)
        if check_in_dt.tzinfo is None:
            check_in_dt = check_in_dt.replace(tzinfo=ZoneInfo("UTC"))
        
        print(f"Parsed check-in (UTC): {check_in_dt}")
        
        # Convert to target timezone
        target_tz = ZoneInfo(timezone_str)
        check_in_local = check_in_dt.astimezone(target_tz)
        print(f"Check-in (local): {check_in_local}")
        
        # Get work settings
        ws = WorkSettings.objects.first()
        if not ws:
            print("No WorkSettings found!")
            return
        
        # Manual calculation
        local_date = check_in_local.date()
        weekday = check_in_local.weekday()
        print(f"Local date: {local_date}")
        print(f"Weekday: {weekday} (0=Monday, 4=Friday)")
        
        workdays = ws.workdays or []
        is_workday = weekday in workdays
        print(f"Is workday: {is_workday}")
        
        # Check holiday
        is_holiday = Holiday.objects.filter(date=local_date).exists()
        print(f"Is holiday: {is_holiday}")
        
        if not is_workday or is_holiday:
            print("Not a workday or holiday - no lateness calculation")
            return
        
        # Calculate base start time
        is_friday = weekday == 4
        if is_friday:
            base_start_local = datetime.combine(local_date, ws.friday_start_time, target_tz)
            grace = ws.friday_grace_minutes or 0
            print(f"Friday start time: {base_start_local}")
            print(f"Friday grace minutes: {grace}")
        else:
            base_start_local = datetime.combine(local_date, ws.start_time, target_tz)
            grace = ws.grace_minutes or 0
            print(f"Regular start time: {base_start_local}")
            print(f"Grace minutes: {grace}")
        
        # Calculate lateness
        grace_delta = check_in_local - base_start_local
        grace_minutes = grace_delta.total_seconds() / 60
        print(f"Minutes from start: {grace_minutes:.1f}")
        
        is_late = grace_minutes > grace
        if is_late:
            minutes_late = int(grace_minutes - grace)
            print(f"IS LATE: {minutes_late} minutes")
        else:
            print("NOT LATE")
        
        # Test utility function
        print(f"\n--- Testing utility function ---")
        result = evaluate_lateness_as_dict(check_in_dt)
        print(f"Utility result: {result}")
        
    except Exception as e:
        print(f"Error in lateness calculation: {e}")
        import traceback
        traceback.print_exc()

def debug_attendance_records():
    """Debug record attendance yang ada"""
    print("\n=== DEBUG ATTENDANCE RECORDS ===")
    try:
        # Get recent attendance records
        records = Attendance.objects.filter(
            check_in_at_utc__isnull=False
        ).order_by('-date_local')[:5]
        
        for record in records:
            print(f"\nRecord ID: {record.id}")
            print(f"Date: {record.date_local}")
            print(f"Check-in: {record.check_in_at_utc}")
            print(f"Minutes late: {record.minutes_late}")
            print(f"Timezone: {record.timezone}")
            print(f"Is holiday: {record.is_holiday}")
            print(f"Within geofence: {record.within_geofence}")
            
    except Exception as e:
        print(f"Error getting attendance records: {e}")

def test_workday_lateness():
    """Test perhitungan keterlambatan untuk hari kerja"""
    print("\n=== TEST WORKDAY LATENESS ===")
    
    # Cari hari kerja terdekat (Senin-Jumat)
    today = datetime.now()
    ws = WorkSettings.objects.first()
    if not ws:
        print("No WorkSettings found!")
        return
    
    target_tz = ZoneInfo(ws.timezone or "Asia/Dubai")
    
    # Cari hari kerja berikutnya
    for i in range(1, 8):  # Check next 7 days
        test_date = today + timedelta(days=i)
        test_date_local = test_date.astimezone(target_tz)
        weekday = test_date_local.weekday()
        
        if weekday in (ws.workdays or []):  # Monday=0, Friday=4
            # Test check-in terlambat pada hari kerja
            if weekday == 4:  # Friday
                start_time = ws.friday_start_time
                grace_minutes = ws.friday_grace_minutes or 0
            else:
                start_time = ws.start_time
                grace_minutes = ws.grace_minutes or 0
            
            # Check-in 30 menit terlambat
            late_checkin_local = datetime.combine(
                test_date_local.date(), 
                start_time, 
                target_tz
            ) + timedelta(minutes=grace_minutes + 30)
            
            # Convert to UTC for testing
            late_checkin_utc = late_checkin_local.astimezone(ZoneInfo("UTC"))
            
            print(f"\nTesting {test_date_local.strftime('%A, %Y-%m-%d')} (weekday {weekday})")
            print(f"Start time: {start_time}")
            print(f"Grace minutes: {grace_minutes}")
            print(f"Late check-in (local): {late_checkin_local.strftime('%H:%M')}")
            print(f"Late check-in (UTC): {late_checkin_utc}")
            
            # Test utility function
            result = evaluate_lateness_as_dict(late_checkin_utc)
            print(f"Utility result: {result}")
            
            # Manual calculation
            grace_delta = late_checkin_local - datetime.combine(
                test_date_local.date(), start_time, target_tz
            ) - timedelta(minutes=grace_minutes)
            manual_minutes_late = int(grace_delta.total_seconds() / 60)
            print(f"Manual calculation: {manual_minutes_late} minutes late")
            
            break

def main():
    print("=== LATENESS DEBUG SCRIPT ===")
    
    # Debug work settings
    debug_work_settings()
    
    # Debug holiday check for today
    today = datetime.now().strftime('%Y-%m-%d')
    debug_holiday_check(today)
    
    # Debug lateness calculation for a late check-in
    # Contoh: check-in jam 9:30 (30 menit terlambat dari jam 9:00)
    late_checkin = f"{today}T09:30:00"
    debug_lateness_calculation(late_checkin)
    
    # Test workday lateness
    test_workday_lateness()
    
    # Debug attendance records
    debug_attendance_records()

if __name__ == "__main__":
    main()
