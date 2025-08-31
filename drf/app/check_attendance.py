#!/usr/bin/env python3
import os
import sys
import django
import datetime
from datetime import datetime as dt

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import Attendance, Employee, WorkSettings
from django.utils import timezone

def check_attendance():
    print("=== CHECKING ATTENDANCE DATA ===")
    
    # Check user
    print("\n1. USER CHECK:")
    user = User.objects.filter(username='pegawai').first()
    if user:
        print(f"   Username: {user.username}")
        print(f"   Email: {user.email}")
        print(f"   Is active: {user.is_active}")
        print(f"   Groups: {[g.name for g in user.groups.all()]}")
        
        # Check employee data
        try:
            employee = user.employee
            print(f"   Employee ID: {employee.id}")
            print(f"   Division: {employee.division.name if employee.division else 'None'}")
        except:
            print("   Employee data not found")
    else:
        print("   User 'pegawai' not found!")
        return
    
    # Check work settings
    print("\n2. WORK SETTINGS:")
    ws = WorkSettings.objects.first()
    if ws:
        print(f"   Timezone: {ws.timezone}")
        print(f"   Start time: {ws.start_time}")
        print(f"   End time: {ws.end_time}")
        print(f"   Friday start: {ws.friday_start_time}")
        print(f"   Friday end: {ws.friday_end_time}")
        print(f"   Workdays: {ws.workdays}")
        print(f"   Office location: {ws.office_latitude}, {ws.office_longitude}")
        print(f"   Office radius: {ws.office_radius_meters}m")
    else:
        print("   No work settings found!")
        return
    
    # Check today's attendance
    print("\n3. TODAY'S ATTENDANCE:")
    today = datetime.date.today()
    print(f"   Today's date: {today}")
    
    # Get timezone
    tz_name = ws.timezone or 'Asia/Dubai'
    print(f"   Using timezone: {tz_name}")
    
    # Check if today is workday
    import pytz
    
    try:
        tz = pytz.timezone(tz_name)
        now_tz = timezone.now().astimezone(tz)
        day_of_week = now_tz.strftime('%A')
        print(f"   Current day: {day_of_week}")
        print(f"   Current time in {tz_name}: {now_tz.strftime('%H:%M:%S')}")
        
        # Check if today is workday
        is_workday = str(now_tz.weekday()) in ws.workdays
        print(f"   Is workday: {is_workday}")
        
        # Calculate expected start time
        if is_workday:
            if day_of_week == 'Friday':
                expected_start = ws.friday_start_time
            else:
                expected_start = ws.start_time
            print(f"   Expected start time: {expected_start}")
            
            # Parse expected start time
            try:
                expected_hour, expected_minute = map(int, expected_start.split(':'))
                expected_time = now_tz.replace(hour=expected_hour, minute=expected_minute, second=0, microsecond=0)
                print(f"   Expected start datetime: {expected_time}")
                
                # Calculate minutes late if check-in is after expected time
                if now_tz > expected_time:
                    minutes_late = int((now_tz - expected_time).total_seconds() / 60)
                    print(f"   Minutes late: {minutes_late}")
                else:
                    print("   Not late yet")
            except Exception as e:
                print(f"   Error parsing time: {e}")
        
    except Exception as e:
        print(f"   Error with timezone: {e}")
    
    # Check attendance record
    att = Attendance.objects.filter(user=user, date_local=today).first()
    if att:
        print(f"   Attendance record found: ID {att.id}")
        print(f"   Check-in UTC: {att.check_in_at_utc}")
        print(f"   Check-out UTC: {att.check_out_at_utc}")
        print(f"   Check-in local: {att.check_in_at_utc.astimezone(tz) if att.check_in_at_utc else 'None'}")
        print(f"   Check-out local: {att.check_out_at_utc.astimezone(tz) if att.check_out_at_utc else 'None'}")
        print(f"   Minutes late: {att.minutes_late}")
        print(f"   Total work minutes: {att.total_work_minutes}")
        print(f"   Within geofence: {att.within_geofence}")
        print(f"   Employee note: {att.employee_note}")
        print(f"   System note: {att.note}")
        print(f"   Overtime minutes: {att.overtime_minutes}")
        print(f"   Overtime approved: {att.overtime_approved}")
    else:
        print("   No attendance record found for today")
    
    # Check recent attendance records
    print("\n4. RECENT ATTENDANCE RECORDS:")
    recent_att = Attendance.objects.filter(user=user).order_by('-date_local')[:5]
    for att in recent_att:
        print(f"   {att.date_local}: Check-in {att.check_in_at_utc}, Late {att.minutes_late}m, Work {att.total_work_minutes}m")

if __name__ == "__main__":
    check_attendance()
