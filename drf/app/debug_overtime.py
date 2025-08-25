#!/usr/bin/env python3
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import Attendance

def debug_attendance():
    print("=== DEBUG ATTENDANCE DATA ===\n")
    
    # Get user pegawai
    try:
        user = User.objects.get(username='pegawai')
        print(f"✅ User found: {user.username}")
    except User.DoesNotExist:
        print("❌ User 'pegawai' not found")
        return
    
    # Count total records
    total_records = Attendance.objects.filter(user=user).count()
    print(f"📊 Total attendance records: {total_records}")
    
    # Count records with work minutes > 0
    work_records = Attendance.objects.filter(user=user, total_work_minutes__gt=0).count()
    print(f"📊 Records with work minutes > 0: {work_records}")
    
    # Show sample records
    print("\n📅 Sample records with work minutes > 0:")
    records = Attendance.objects.filter(user=user, total_work_minutes__gt=0).order_by('-date_local')[:10]
    
    if records:
        for att in records:
            print(f"  {att.date_local}: {att.total_work_minutes}min ({att.total_work_minutes/60:.1f}h)")
    else:
        print("  No records found")
    
    # Check all records for this user
    print("\n📅 All records for user 'pegawai':")
    all_records = Attendance.objects.filter(user=user).order_by('-date_local')[:10]
    
    if all_records:
        for att in all_records:
            print(f"  {att.date_local}: {att.total_work_minutes}min ({att.total_work_minutes/60:.1f}h) - Check in: {att.check_in_at_utc}, Check out: {att.check_out_at_utc}")
    else:
        print("  No records found")

if __name__ == "__main__":
    debug_attendance()
