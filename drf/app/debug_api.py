#!/usr/bin/env python
import os
import sys
import django
from datetime import datetime, timedelta
from django.utils import timezone

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import Attendance, AttendanceCorrection, Employee, WorkSettings
from django.db.models import Q

def main():
    print("=== DEBUG API LOGIC ===")
    
    # Get user
    user = User.objects.get(username='pegawai')
    print(f"User: {user.username}")
    
    # Get employee
    employee = Employee.objects.get(user=user)
    print(f"Employee: {employee.nip}")
    
    # Test date filtering logic
    print("\n=== DATE FILTERING TEST ===")
    
    # Default to current month if no date filter
    today = timezone.now().date()
    start_of_month = today.replace(day=1)
    if today.month == 12:
        end_of_month = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        end_of_month = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    
    date_filter = Q(date_local__gte=start_of_month) & Q(date_local__lte=end_of_month)
    
    print(f"Today: {today}")
    print(f"Start of month: {start_of_month}")
    print(f"End of month: {end_of_month}")
    
    # Get attendance records for the employee
    attendance_records = Attendance.objects.filter(
        employee=employee
    ).filter(date_filter).order_by('-date_local')
    
    print(f"Attendance records in date range: {attendance_records.count()}")
    
    for record in attendance_records:
        print(f"  - Date: {record.date_local}, Check-in: {record.check_in_at_utc}, Check-out: {record.check_out_at_utc}")
    
    # Test correction logic
    print("\n=== CORRECTION LOGIC TEST ===")
    
    correction_records = []
    total_records = 0
    wfa_records = 0
    missing_attendance = 0
    pending_corrections = 0

    for record in attendance_records:
        total_records += 1
        print(f"\nProcessing record for {record.date_local}:")
        
        # Check if record needs correction
        needs_correction = False
        correction_reasons = []
        
        # Check for missing attendance
        if not record.check_in_at_utc and not record.check_out_at_utc:
            needs_correction = True
            correction_reasons.append('missing_both')
            missing_attendance += 1
            print(f"  - Missing both check-in and check-out")
        elif not record.check_in_at_utc:
            needs_correction = True
            correction_reasons.append('missing_check_in')
            missing_attendance += 1
            print(f"  - Missing check-in")
        elif not record.check_out_at_utc:
            needs_correction = True
            correction_reasons.append('missing_check_out')
            missing_attendance += 1
            print(f"  - Missing check-out")
        
        # Check for WFA
        if record.check_in_at_utc and not record.within_geofence:
            needs_correction = True
            correction_reasons.append('wfa')
            wfa_records += 1
            print(f"  - WFA detected (within_geofence: {record.within_geofence})")
        
        # Check for system notes
        if record.note and ('luar area kantor' in record.note.lower() or 'outside office' in record.note.lower()):
            needs_correction = True
            correction_reasons.append('system_note')
            print(f"  - System note detected: {record.note}")
        
        # Check if correction request exists
        try:
            correction = AttendanceCorrection.objects.filter(
                user=user,
                date_local=record.date_local
            ).first()
            if correction:
                correction_status = correction.status
                if correction.status == 'pending':
                    pending_corrections += 1
                print(f"  - Existing correction: {correction.status}")
            else:
                correction_status = None
                print(f"  - No existing correction")
        except Exception as e:
            correction_status = None
            print(f"  - Error checking correction: {e}")
        
        # Add to correction records if needs correction or has correction request
        if needs_correction or correction_status:
            correction_records.append({
                'id': record.id,
                'date_local': record.date_local,
                'needs_correction': needs_correction,
                'correction_reasons': correction_reasons,
                'correction_status': correction_status
            })
            print(f"  - ADDED TO CORRECTION RECORDS")
        else:
            print(f"  - NOT ADDED (no correction needed)")

    # Get manual correction requests
    print("\n=== MANUAL CORRECTIONS TEST ===")
    manual_corrections = AttendanceCorrection.objects.filter(
        user=user
    ).filter(date_filter).exclude(
        date_local__in=[record.date_local for record in attendance_records]
    )
    
    print(f"Manual corrections in date range: {manual_corrections.count()}")
    
    for manual_correction in manual_corrections:
        print(f"  - Date: {manual_correction.date_local}, Status: {manual_correction.status}")
        if manual_correction.status == 'pending':
            pending_corrections += 1
        total_records += 1
        correction_records.append({
            'id': f"manual_{manual_correction.id}",
            'date_local': manual_correction.date_local,
            'needs_correction': True,
            'correction_reasons': ['manual_request'],
            'correction_status': manual_correction.status
        })

    print(f"\n=== FINAL RESULTS ===")
    print(f"Total records: {total_records}")
    print(f"WFA records: {wfa_records}")
    print(f"Missing attendance: {missing_attendance}")
    print(f"Pending corrections: {pending_corrections}")
    print(f"Correction records: {len(correction_records)}")
    
    for record in correction_records:
        print(f"  - {record['date_local']}: {record['correction_reasons']} (status: {record['correction_status']})")

if __name__ == "__main__":
    main()
