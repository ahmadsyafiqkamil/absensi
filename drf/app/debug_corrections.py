#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import Attendance, AttendanceCorrection, Employee
from datetime import datetime

def main():
    print("=== DEBUG CORRECTIONS DATA ===")
    
    # Check user
    try:
        user = User.objects.get(username='pegawai')
        print(f"User: {user.username}")
        print(f"User ID: {user.id}")
    except User.DoesNotExist:
        print("User 'pegawai' not found!")
        return
    
    # Check employee
    try:
        employee = Employee.objects.get(user=user)
        print(f"Employee: {employee.nip} - {employee.fullname}")
    except Employee.DoesNotExist:
        print("Employee not found for user 'pegawai'!")
        return
    
    # Check attendance records
    print("\n=== ATTENDANCE RECORDS ===")
    attendance_records = Attendance.objects.filter(user=user)
    print(f"Total attendance records: {attendance_records.count()}")
    
    for att in attendance_records:
        print(f"  - Date: {att.date_local}")
        print(f"    Check-in: {att.check_in_at_utc}")
        print(f"    Check-out: {att.check_out_at_utc}")
        print(f"    Within geofence: {att.within_geofence}")
        print(f"    Minutes late: {att.minutes_late}")
        print(f"    Note: {att.note}")
        print(f"    Employee note: {att.employee_note}")
        print()
    
    # Check correction requests
    print("=== CORRECTION REQUESTS ===")
    correction_requests = AttendanceCorrection.objects.filter(user=user)
    print(f"Total correction requests: {correction_requests.count()}")
    
    for corr in correction_requests:
        print(f"  - Date: {corr.date_local}")
        print(f"    Type: {corr.type}")
        print(f"    Status: {corr.status}")
        print(f"    Reason: {corr.reason}")
        print(f"    Proposed check-in: {corr.proposed_check_in_local}")
        print(f"    Proposed check-out: {corr.proposed_check_out_local}")
        print(f"    Created: {corr.created_at}")
        print()
    
    # Check what should appear in corrections
    print("=== POTENTIAL CORRECTIONS ===")
    
    # Get work settings
    from api.models import WorkSettings
    try:
        work_settings = WorkSettings.objects.first()
        print(f"Work settings timezone: {work_settings.timezone if work_settings else 'None'}")
    except:
        print("No work settings found")
    
    # Check for records that need correction
    for att in attendance_records:
        needs_correction = False
        reasons = []
        
        # Check for missing attendance
        if not att.check_in_at_utc and not att.check_out_at_utc:
            needs_correction = True
            reasons.append('missing_both')
        elif not att.check_in_at_utc:
            needs_correction = True
            reasons.append('missing_check_in')
        elif not att.check_out_at_utc:
            needs_correction = True
            reasons.append('missing_check_out')
        
        # Check for WFA
        if att.check_in_at_utc and not att.within_geofence:
            needs_correction = True
            reasons.append('wfa')
        
        # Check for system notes
        if att.note and ('luar area kantor' in att.note.lower() or 'outside office' in att.note.lower()):
            needs_correction = True
            reasons.append('system_note')
        
        if needs_correction:
            print(f"  - Date {att.date_local} needs correction: {reasons}")
        else:
            print(f"  - Date {att.date_local} is OK")

if __name__ == "__main__":
    main()
