#!/usr/bin/env python3
"""
Script untuk memperbaiki semua record attendance yang ada dengan perhitungan keterlambatan yang benar
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

def fix_all_attendance_records():
    """Perbaiki semua record attendance dengan perhitungan keterlambatan yang benar"""
    print("=== PERBAIKAN SEMUA ATTENDANCE RECORDS ===")
    
    ws = WorkSettings.objects.first()
    if not ws:
        print("No WorkSettings found!")
        return
    
    target_tz = ZoneInfo(ws.timezone or "Asia/Dubai")
    
    # Get all attendance records with check-in
    records = Attendance.objects.filter(
        check_in_at_utc__isnull=False
    ).order_by('-date_local')
    
    print(f"Total records to process: {records.count()}")
    
    fixed_count = 0
    skipped_count = 0
    
    for record in records:
        try:
            if not record.check_in_at_utc:
                continue
            
            # Convert to local time
            check_in_local = record.check_in_at_utc.astimezone(target_tz)
            local_date = check_in_local.date()
            weekday = check_in_local.weekday()
            
            workdays = ws.workdays or []
            is_workday = weekday in workdays
            is_holiday = Holiday.objects.filter(date=local_date).exists()
            
            # Skip if not workday or holiday
            if not is_workday or is_holiday:
                print(f"Record ID {record.id} ({local_date}): Skipped - not workday or holiday")
                skipped_count += 1
                continue
            
            # Calculate correct lateness
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
                correct_minutes_late = int(grace_minutes_from_start - grace_minutes)
            else:
                correct_minutes_late = 0
            
            # Check if record needs fixing
            if record.minutes_late != correct_minutes_late:
                print(f"Record ID {record.id} ({local_date}): {record.minutes_late} -> {correct_minutes_late}")
                record.minutes_late = correct_minutes_late
                record.save(update_fields=['minutes_late'])
                fixed_count += 1
            else:
                print(f"Record ID {record.id} ({local_date}): Already correct ({record.minutes_late})")
                
        except Exception as e:
            print(f"Error processing record ID {record.id}: {e}")
            continue
    
    print(f"\n=== SUMMARY ===")
    print(f"Total records processed: {records.count()}")
    print(f"Records fixed: {fixed_count}")
    print(f"Records skipped: {skipped_count}")
    print(f"Records already correct: {records.count() - fixed_count - skipped_count}")

def verify_fixes():
    """Verifikasi perbaikan yang telah dilakukan"""
    print("\n=== VERIFIKASI PERBAIKAN ===")
    
    ws = WorkSettings.objects.first()
    if not ws:
        print("No WorkSettings found!")
        return
    
    target_tz = ZoneInfo(ws.timezone or "Asia/Dubai")
    
    # Get recent records
    records = Attendance.objects.filter(
        check_in_at_utc__isnull=False
    ).order_by('-date_local')[:10]
    
    for record in records:
        print(f"\nRecord ID: {record.id}")
        print(f"Date: {record.date_local}")
        print(f"Check-in: {record.check_in_at_utc}")
        print(f"Minutes late: {record.minutes_late}")
        
        if record.check_in_at_utc:
            # Test utility function
            result = evaluate_lateness_as_dict(record.check_in_at_utc)
            print(f"Utility calculation: {result}")
            
            # Manual calculation
            check_in_local = record.check_in_at_utc.astimezone(target_tz)
            local_date = check_in_local.date()
            weekday = check_in_local.weekday()
            
            workdays = ws.workdays or []
            is_workday = weekday in workdays
            is_holiday = Holiday.objects.filter(date=local_date).exists()
            
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
                
                if grace_minutes_from_start > grace_minutes:
                    expected_late = int(grace_minutes_from_start - grace_minutes)
                    print(f"Manual calculation: {expected_late} minutes late")
                    
                    if expected_late == record.minutes_late:
                        print(f"✅ VERIFIED: Record matches calculation")
                    else:
                        print(f"❌ MISMATCH: Record shows {record.minutes_late}, should be {expected_late}")
                else:
                    print(f"Manual calculation: Not late")
                    
                    if record.minutes_late == 0:
                        print(f"✅ VERIFIED: Record shows 0 (correct)")
                    else:
                        print(f"❌ MISMATCH: Record shows {record.minutes_late}, should be 0")
            else:
                print(f"Not workday or holiday - no lateness calculation needed")

def main():
    print("=== ATTENDANCE FIX ALL SCRIPT ===")
    
    # Fix all records
    fix_all_attendance_records()
    
    # Verify fixes
    verify_fixes()
    
    print("\n=== SCRIPT COMPLETED ===")

if __name__ == "__main__":
    main()
