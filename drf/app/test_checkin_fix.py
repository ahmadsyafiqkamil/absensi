#!/usr/bin/env python3
"""
Script untuk test fungsi check-in yang sudah diperbaiki
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

def test_lateness_calculation():
    """Test perhitungan keterlambatan yang sudah diperbaiki"""
    print("=== TEST LATENESS CALCULATION ===")
    
    ws = WorkSettings.objects.first()
    if not ws:
        print("No WorkSettings found!")
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
    
    # Test different check-in times
    if test_weekday == 4:  # Friday
        start_time = ws.friday_start_time
        grace_minutes = ws.friday_grace_minutes or 0
    else:
        start_time = ws.start_time
        grace_minutes = ws.grace_minutes or 0
    
    print(f"Start time: {start_time}")
    print(f"Grace minutes: {grace_minutes}")
    
    # Test 1: Check-in tepat waktu
    on_time = datetime.combine(test_date.date(), start_time, target_tz)
    on_time_utc = on_time.astimezone(ZoneInfo("UTC"))
    
    print(f"\n--- Test 1: Check-in tepat waktu ---")
    print(f"Check-in time: {on_time.strftime('%H:%M')}")
    result1 = evaluate_lateness_as_dict(on_time_utc)
    print(f"Utility result: {result1}")
    
    # Test 2: Check-in dalam grace period
    grace_checkin = on_time + timedelta(minutes=grace_minutes - 1)
    grace_checkin_utc = grace_checkin.astimezone(ZoneInfo("UTC"))
    
    print(f"\n--- Test 2: Check-in dalam grace period ---")
    print(f"Check-in time: {grace_checkin.strftime('%H:%M')} (+{grace_minutes-1} minutes)")
    result2 = evaluate_lateness_as_dict(grace_checkin_utc)
    print(f"Utility result: {result2}")
    
    # Test 3: Check-in terlambat
    late_checkin = on_time + timedelta(minutes=grace_minutes + 30)
    late_checkin_utc = late_checkin.astimezone(ZoneInfo("UTC"))
    
    print(f"\n--- Test 3: Check-in terlambat ---")
    print(f"Check-in time: {late_checkin.strftime('%H:%M')} (+{grace_minutes+30} minutes)")
    result3 = evaluate_lateness_as_dict(late_checkin_utc)
    print(f"Utility result: {result3}")
    
    # Manual calculation verification
    print(f"\n--- Manual Calculation Verification ---")
    
    # Test 1
    delta1 = on_time - on_time
    minutes1 = delta1.total_seconds() / 60
    expected1 = 0 if minutes1 <= grace_minutes else int(minutes1 - grace_minutes)
    print(f"Test 1: {minutes1:.1f} minutes from start, expected late: {expected1}")
    
    # Test 2
    delta2 = grace_checkin - on_time
    minutes2 = delta2.total_seconds() / 60
    expected2 = 0 if minutes2 <= grace_minutes else int(minutes2 - grace_minutes)
    print(f"Test 2: {minutes2:.1f} minutes from start, expected late: {expected2}")
    
    # Test 3
    delta3 = late_checkin - on_time
    minutes3 = delta3.total_seconds() / 60
    expected3 = 0 if minutes3 <= grace_minutes else int(minutes3 - grace_minutes)
    print(f"Test 3: {minutes3:.1f} minutes from start, expected late: {expected3}")
    
    # Verify results
    print(f"\n--- Verification ---")
    print(f"Test 1 - Utility: {result1.get('minutes_late')}, Expected: {expected1}")
    print(f"Test 2 - Utility: {result2.get('minutes_late')}, Expected: {expected2}")
    print(f"Test 3 - Utility: {result3.get('minutes_late')}, Expected: {expected3}")
    
    all_correct = (
        result1.get('minutes_late') == expected1 and
        result2.get('minutes_late') == expected2 and
        result3.get('minutes_late') == expected3
    )
    
    if all_correct:
        print("✅ All calculations are correct!")
    else:
        print("❌ Some calculations are incorrect!")

def main():
    print("=== TEST CHECKIN FIX SCRIPT ===")
    
    # Test lateness calculation
    test_lateness_calculation()
    
    print("\n=== SCRIPT COMPLETED ===")

if __name__ == "__main__":
    main()
