#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import Attendance, Employee

def main():
    print("=== DEBUG ATTENDANCE-EMPLOYEE RELATION ===")
    
    # Get user
    user = User.objects.get(username='pegawai')
    print(f"User: {user.username}")
    print(f"User ID: {user.id}")
    
    # Get employee
    employee = Employee.objects.filter(user=user).first()
    print(f"Employee: {employee}")
    if employee:
        print(f"Employee ID: {employee.id}")
        print(f"Employee NIP: {employee.nip}")
    
    # Check all attendance records
    print("\n=== ALL ATTENDANCE RECORDS ===")
    all_attendance = Attendance.objects.all()
    print(f"Total attendance records: {all_attendance.count()}")
    
    for att in all_attendance:
        print(f"  - ID: {att.id}")
        print(f"    User: {att.user.username} (ID: {att.user.id})")
        print(f"    Employee: {att.employee}")
        print(f"    Date: {att.date_local}")
        print(f"    Check-in: {att.check_in_at_utc}")
        print(f"    Check-out: {att.check_out_at_utc}")
        print()
    
    # Check attendance records for this user
    print("=== ATTENDANCE RECORDS FOR USER ===")
    user_attendance = Attendance.objects.filter(user=user)
    print(f"Attendance records for user 'pegawai': {user_attendance.count()}")
    
    for att in user_attendance:
        print(f"  - Date: {att.date_local}")
        print(f"    Employee: {att.employee}")
        print(f"    Check-in: {att.check_in_at_utc}")
        print(f"    Check-out: {att.check_out_at_utc}")
        print()
    
    # Check attendance records for this employee
    if employee:
        print("=== ATTENDANCE RECORDS FOR EMPLOYEE ===")
        employee_attendance = Attendance.objects.filter(employee=employee)
        print(f"Attendance records for employee: {employee_attendance.count()}")
        
        for att in employee_attendance:
            print(f"  - Date: {att.date_local}")
            print(f"    User: {att.user.username}")
            print(f"    Check-in: {att.check_in_at_utc}")
            print(f"    Check-out: {att.check_out_at_utc}")
            print()

if __name__ == "__main__":
    main()
