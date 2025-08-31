#!/usr/bin/env python3
"""
Script untuk memeriksa dan memperbaiki record attendance yang tidak memiliki minutes_late
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

def analyze_attendance_records():
    """Analisis record attendance yang ada"""
    print("=== ANALISIS ATTENDANCE RECORDS ===")
    
    # Get all attendance records with check-in
    records = Attendance.objects.filter(
        check_in_at_utc__isnull=False
    ).order_by('-date_local')
    
    print(f"Total records: {records.count()}")
    
    # Group by date
    records_by_date = {}
    for record in records:
        date_key = record.date_local.isoformat()
        if date_key not in records_by_date:
            records_by_date[date_key] = []
        records_by_date[date_key].append(record)
    
    print(f"Unique dates: {len(records_by_date)}")
    
    # Analyze each date
    for date_key, date_records in list(records_by_date.items())[:10]:  # Show first 10 dates
        print(f"\n=== Date: {date_key} ===")
        
        for record in date_records:
            print(f"  Record ID: {record.id}")
            print(f"  User: {record.user.username}")
            print(f"  Check-in: {record.check_in_at_utc}")
            print(f"  Check-out: {record.check_out_at_utc}")
            print(f"  Minutes late: {record.minutes_late}")
            print(f"  Is holiday: {record.is_holiday}")
            print(f"  Timezone: {record.timezone}")
            
            # Check if this should have lateness calculation
            if record.check_in_at_utc:
                # Convert to local time
                ws = WorkSettings.objects.first()
                if ws:
                    target_tz = ZoneInfo(ws.timezone or "Asia/Dubai")
                    check_in_local = record.check_in_at_utc.astimezone(target_tz)
                    local_date = check_in_local.date()
                    weekday = check_in_local.weekday()
                    
                    workdays = ws.workdays or []
                    is_workday = weekday in workdays
                    is_holiday = Holiday.objects.filter(date=local_date).exists()
                    
                    print(f"  Local check-in: {check_in_local}")
                    print(f"  Weekday: {weekday} (0=Monday, 4=Friday)")
                    print(f"  Is workday: {is_workday}")
                    print(f"  Is holiday: {is_holiday}")
                    
                    if is_workday and not is_holiday:
                        # Calculate expected lateness
                        if weekday == 4:  # Friday
                            start_time = ws.friday_start_time
                            grace_minutes = ws.friday_grace_minutes or 0
                        else:
                            start_time = ws.start_time
                            grace_minutes = ws.grace_minutes or 0
                        
                        base_start = datetime.combine(local_date, start_time, target_tz)
                        grace_delta = check_in_local - base_start
                        grace_minutes_from_start = grace_delta.total_seconds() / 60
                        
                        print(f"  Base start time: {base_start}")
                        print(f"  Grace minutes: {grace_minutes}")
                        print(f"  Minutes from start: {grace_minutes_from_start:.1f}")
                        
                        if grace_minutes_from_start > grace_minutes:
                            expected_late = int(grace_minutes_from_start - grace_minutes)
                            print(f"  EXPECTED LATE: {expected_late} minutes")
                            
                            if record.minutes_late != expected_late:
                                print(f"  ❌ MISMATCH: Record shows {record.minutes_late}, should be {expected_late}")
                            else:
                                print(f"  ✅ CORRECT: Record shows {record.minutes_late}")
                        else:
                            print(f"  ✅ NOT LATE: Within grace period")
                    else:
                        print(f"  ℹ️  No lateness calculation needed (not workday or holiday)")

def fix_attendance_records():
    """Perbaiki record attendance yang tidak memiliki minutes_late yang benar"""
    print("\n=== PERBAIKAN ATTENDANCE RECORDS ===")
    
    ws = WorkSettings.objects.first()
    if not ws:
        print("No WorkSettings found!")
        return
    
    target_tz = ZoneInfo(ws.timezone or "Asia/Dubai")
    
    # Get records that need fixing
    records_to_fix = Attendance.objects.filter(
        check_in_at_utc__isnull=False,
        minutes_late=0  # Only check records with 0 minutes late
    ).order_by('-date_local')
    
    print(f"Records to check: {records_to_fix.count()}")
    
    fixed_count = 0
    for record in records_to_fix:
        if not record.check_in_at_utc:
            continue
            
        # Convert to local time
        check_in_local = record.check_in_at_utc.astimezone(target_tz)
        local_date = check_in_local.date()
        weekday = check_in_local.weekday()
        
        workdays = ws.workdays or []
        is_workday = weekday in workdays
        is_holiday = Holiday.objects.filter(date=local_date).exists()
        
        if is_workday and not is_holiday:
            # Calculate lateness
            if weekday == 4:  # Friday
                start_time = ws.friday_start_time
                grace_minutes = ws.friday_grace_minutes or 0
            else:
                start_time = ws.start_time
                grace_minutes = ws.grace_minutes or 0
            
            base_start = datetime.combine(local_date, start_time, target_tz)
            grace_delta = check_in_local - base_start
            grace_minutes_from_start = grace_delta.total_seconds() / 60
            
            if grace_minutes_from_start > grace_minutes:
                expected_late = int(grace_minutes_from_start - grace_minutes)
                
                if expected_late != record.minutes_late:
                    print(f"Fixing Record ID {record.id} ({local_date}): {record.minutes_late} -> {expected_late}")
                    record.minutes_late = expected_late
                    record.save(update_fields=['minutes_late'])
                    fixed_count += 1
    
    print(f"Fixed {fixed_count} records")

def test_specific_record(record_id):
    """Test record tertentu"""
    print(f"\n=== TEST RECORD ID: {record_id} ===")
    
    try:
        record = Attendance.objects.get(id=record_id)
        print(f"User: {record.user.username}")
        print(f"Date: {record.date_local}")
        print(f"Check-in: {record.check_in_at_utc}")
        print(f"Minutes late: {record.minutes_late}")
        print(f"Timezone: {record.timezone}")
        
        if record.check_in_at_utc:
            # Test lateness calculation
            result = evaluate_lateness_as_dict(record.check_in_at_utc)
            print(f"Utility calculation result: {result}")
            
            # Manual calculation
            ws = WorkSettings.objects.first()
            if ws:
                target_tz = ZoneInfo(ws.timezone or "Asia/Dubai")
                check_in_local = record.check_in_at_utc.astimezone(target_tz)
                local_date = check_in_local.date()
                weekday = check_in_local.weekday()
                
                workdays = ws.workdays or []
                is_workday = weekday in workdays
                is_holiday = Holiday.objects.filter(date=local_date).exists()
                
                print(f"Local check-in: {check_in_local}")
                print(f"Weekday: {weekday}")
                print(f"Is workday: {is_workday}")
                print(f"Is holiday: {is_holiday}")
                
                if is_workday and not is_holiday:
                    if weekday == 4:  # Friday
                        start_time = ws.friday_start_time
                        grace_minutes = ws.friday_grace_minutes or 0
                    else:
                        start_time = ws.start_time
                        grace_minutes = ws.grace_minutes or 0
                    
                    base_start = datetime.combine(local_date, start_time, target_tz)
                    grace_delta = check_in_local - base_start
                    grace_minutes_from_start = grace_delta.total_seconds() / 60
                    
                    print(f"Base start: {base_start}")
                    print(f"Grace minutes: {grace_minutes}")
                    print(f"Minutes from start: {grace_minutes_from_start:.1f}")
                    
                    if grace_minutes_from_start > grace_minutes:
                        expected_late = int(grace_minutes_from_start - grace_minutes)
                        print(f"Expected late: {expected_late} minutes")
                    else:
                        print("Not late")
        
    except Attendance.DoesNotExist:
        print(f"Record ID {record_id} not found")

def main():
    print("=== ATTENDANCE FIX SCRIPT ===")
    
    # Analyze existing records
    analyze_attendance_records()
    
    # Test specific record if provided
    import sys
    if len(sys.argv) > 1:
        try:
            record_id = int(sys.argv[1])
            test_specific_record(record_id)
        except ValueError:
            print("Invalid record ID")
    
    # Fix records
    fix_attendance_records()
    
    print("\n=== SCRIPT COMPLETED ===")

if __name__ == "__main__":
    main()
