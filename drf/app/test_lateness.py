#!/usr/bin/env python3
"""
Script untuk test perhitungan keterlambatan dengan membuat record attendance baru
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
from django.contrib.auth import get_user_model

User = get_user_model()

def create_test_attendance():
    """Buat record attendance test untuk hari kerja"""
    print("=== CREATE TEST ATTENDANCE ===")
    
    ws = WorkSettings.objects.first()
    if not ws:
        print("No WorkSettings found!")
        return
    
    # Cari user pegawai
    try:
        user = User.objects.filter(groups__name='pegawai').first()
        if not user:
            print("No pegawai user found!")
            return
        print(f"Using user: {user.username}")
    except Exception as e:
        print(f"Error finding user: {e}")
        return
    
    target_tz = ZoneInfo(ws.timezone or "Asia/Dubai")
    
    # Cari hari kerja berikutnya
    today = datetime.now()
    test_date = None
    test_weekday = None
    
    for i in range(1, 8):  # Check next 7 days
        check_date = today + timedelta(days=i)
        check_date_local = check_date.astimezone(target_tz)
        weekday = check_date_local.weekday()
        
        if weekday in (ws.workdays or []):  # Monday=0, Friday=4
            test_date = check_date_local
            test_weekday = weekday
            break
    
    if not test_date:
        print("No workday found in next 7 days!")
        return
    
    print(f"Test date: {test_date.strftime('%A, %Y-%m-%d')} (weekday {test_weekday})")
    
    # Check if holiday
    is_holiday = Holiday.objects.filter(date=test_date.date()).exists()
    if is_holiday:
        print("Test date is a holiday, skipping...")
        return
    
    # Delete existing record for this date if exists
    existing = Attendance.objects.filter(user=user, date_local=test_date.date()).first()
    if existing:
        print(f"Deleting existing record ID: {existing.id}")
        existing.delete()
    
    # Create test check-in time (30 minutes late)
    if test_weekday == 4:  # Friday
        start_time = ws.friday_start_time
        grace_minutes = ws.friday_grace_minutes or 0
    else:
        start_time = ws.start_time
        grace_minutes = ws.grace_minutes or 0
    
    # Check-in 30 menit terlambat
    late_checkin_local = datetime.combine(
        test_date.date(), 
        start_time, 
        target_tz
    ) + timedelta(minutes=grace_minutes + 30)
    
    # Convert to UTC for storage
    late_checkin_utc = late_checkin_local.astimezone(ZoneInfo("UTC"))
    
    print(f"Start time: {start_time}")
    print(f"Grace minutes: {grace_minutes}")
    print(f"Late check-in (local): {late_checkin_local.strftime('%H:%M')}")
    print(f"Late check-in (UTC): {late_checkin_utc}")
    
    # Calculate expected lateness
    grace_delta = late_checkin_local - datetime.combine(
        test_date.date(), start_time, target_tz
    ) - timedelta(minutes=grace_minutes)
    expected_minutes_late = int(grace_delta.total_seconds() / 60)
    print(f"Expected minutes late: {expected_minutes_late}")
    
    # Test utility function
    print(f"\n--- Testing utility function ---")
    result = evaluate_lateness_as_dict(late_checkin_utc)
    print(f"Utility result: {result}")
    
    # Create attendance record
    try:
        att = Attendance.objects.create(
            user=user,
            date_local=test_date.date(),
            timezone=ws.timezone or "Asia/Dubai",
            check_in_at_utc=late_checkin_utc,
            check_in_lat=25.2048,  # Dubai coordinates
            check_in_lng=55.2708,
            check_in_accuracy_m=10,
            check_in_ip="127.0.0.1",
            within_geofence=True,
            is_holiday=False,
            minutes_late=expected_minutes_late
        )
        
        print(f"\n✅ Created attendance record ID: {att.id}")
        print(f"Minutes late: {att.minutes_late}")
        
        # Verify the record
        att.refresh_from_db()
        print(f"Verified minutes late: {att.minutes_late}")
        
        return att
        
    except Exception as e:
        print(f"❌ Error creating attendance: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_existing_records():
    """Test record yang sudah ada"""
    print("\n=== TEST EXISTING RECORDS ===")
    
    records = Attendance.objects.filter(
        check_in_at_utc__isnull=False
    ).order_by('-date_local')[:5]
    
    for record in records:
        print(f"\nRecord ID: {record.id}")
        print(f"Date: {record.date_local}")
        print(f"Check-in: {record.check_in_at_utc}")
        print(f"Minutes late: {record.minutes_late}")
        
        if record.check_in_at_utc:
            result = evaluate_lateness_as_dict(record.check_in_at_utc)
            print(f"Utility calculation: {result}")
            
            if result.get('minutes_late') != record.minutes_late:
                print(f"❌ MISMATCH: Utility shows {result.get('minutes_late')}, record shows {record.minutes_late}")
            else:
                print(f"✅ MATCH: Both show {record.minutes_late}")

def main():
    print("=== TEST LATENESS SCRIPT ===")
    
    # Create test attendance
    test_record = create_test_attendance()
    
    # Test existing records
    test_existing_records()
    
    if test_record:
        print(f"\n=== TEST COMPLETED ===")
        print(f"Test record ID: {test_record.id}")
        print(f"Check this record in the database and frontend")
    else:
        print(f"\n=== TEST FAILED ===")

if __name__ == "__main__":
    main()
