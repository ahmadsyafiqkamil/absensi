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
from api.models import Attendance, Employee
from django.db.models import Q

def main():
    print("=== DEBUG DATE FILTERING ===")
    
    # Get user and employee
    user = User.objects.get(username='pegawai')
    employee = Employee.objects.get(user=user)
    
    print(f"User: {user.username}")
    print(f"Employee: {employee.nip}")
    
    # Check all attendance records
    print("\n=== ALL ATTENDANCE RECORDS ===")
    all_records = Attendance.objects.filter(employee=employee)
    print(f"Total records: {all_records.count()}")
    
    for att in all_records:
        print(f"  - Date: {att.date_local} (type: {type(att.date_local)})")
        print(f"    Check-in: {att.check_in_at_utc}")
        print(f"    Check-out: {att.check_out_at_utc}")
        print(f"    Within geofence: {att.within_geofence}")
    
    # Check current date and timezone
    print("\n=== CURRENT DATE INFO ===")
    today = timezone.now().date()
    print(f"Today: {today} (type: {type(today)})")
    print(f"Start of month: {today.replace(day=1)}")
    
    # Test date filtering
    print("\n=== DATE FILTERING TEST ===")
    start_of_month = today.replace(day=1)
    if today.month == 12:
        end_of_month = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        end_of_month = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    
    print(f"Filter range: {start_of_month} to {end_of_month}")
    
    # Test different filter approaches
    print("\n=== FILTER APPROACHES ===")
    
    # Approach 1: Exact date range
    filter1 = Q(date_local__gte=start_of_month) & Q(date_local__lte=end_of_month)
    records1 = all_records.filter(filter1)
    print(f"Approach 1 (gte/lte): {records1.count()} records")
    
    # Approach 2: Just today
    filter2 = Q(date_local=today)
    records2 = all_records.filter(filter2)
    print(f"Approach 2 (exact today): {records2.count()} records")
    
    # Approach 3: All records in current month
    filter3 = Q(date_local__year=today.year, date_local__month=today.month)
    records3 = all_records.filter(filter3)
    print(f"Approach 3 (year/month): {records3.count()} records")
    
    # Approach 4: No date filter
    records4 = all_records
    print(f"Approach 4 (no filter): {records4.count()} records")
    
    # Check if there's a timezone issue
    print("\n=== TIMEZONE DEBUG ===")
    for att in all_records:
        print(f"Record date: {att.date_local}")
        print(f"  - Is today: {att.date_local == today}")
        print(f"  - Is in current month: {att.date_local.year == today.year and att.date_local.month == today.month}")
        print(f"  - Is >= start of month: {att.date_local >= start_of_month}")
        print(f"  - Is <= end of month: {att.date_local <= end_of_month}")

if __name__ == "__main__":
    main()
