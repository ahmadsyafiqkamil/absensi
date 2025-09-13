from django.utils import timezone
from django.contrib.auth import get_user_model
from zoneinfo import ZoneInfo
from datetime import date, datetime
from .models import Attendance
from apps.settings.models import WorkSettings
from apps.core.utils import haversine_meters, evaluate_lateness_as_dict

User = get_user_model()


class AttendanceService:
    """Service class for attendance business logic"""
    
    def __init__(self):
        self.work_settings = WorkSettings.objects.first()
    
    def process_check_in(self, user, data):
        """Process employee check-in"""
        try:
            # Extract data
            lat = data.get('latitude')
            lng = data.get('longitude')
            accuracy = data.get('accuracy')
            ip_address = data.get('ip_address')
            timezone_name = data.get('timezone', 'Asia/Dubai')
            
            # Get current time in user's timezone
            current_time = timezone.now().astimezone(ZoneInfo(timezone_name))
            current_date = current_time.date()

            # Enforce earliest check-in restriction if enabled
            if self.work_settings and getattr(self.work_settings, 'earliest_check_in_enabled', False):
                if current_time.time() < self.work_settings.earliest_check_in_time:
                    return {
                        'success': False,
                        'error': f"Check-in tidak diperbolehkan sebelum jam {self.work_settings.earliest_check_in_time.strftime('%H:%M')}"
                    }
            
            # Check if attendance already exists for today
            attendance, created = Attendance.objects.get_or_create(
                user=user,
                date_local=current_date,
                defaults={
                    'timezone': timezone_name,
                    'check_in_at_utc': timezone.now(),
                    'check_in_lat': lat,
                    'check_in_lng': lng,
                    'check_in_accuracy_m': accuracy,
                    'check_in_ip': ip_address,
                }
            )
            
            if not created:
                # Update existing attendance
                attendance.check_in_at_utc = timezone.now()
                attendance.check_in_lat = lat
                attendance.check_in_lng = lng
                attendance.check_in_accuracy_m = accuracy
                attendance.check_in_ip = ip_address
                attendance.save()
            
            # Check geofence
            within_geofence = self._check_geofence(lat, lng)
            attendance.within_geofence = within_geofence
            
            # Calculate lateness
            if self.work_settings:
                work_hours = self.work_settings.get_work_hours_for_date(current_date)
                start_time = work_hours['start_time']
                grace_minutes = work_hours['grace_minutes']
                
                lateness_info = evaluate_lateness_as_dict(
                    current_time.time(), 
                    start_time, 
                    grace_minutes
                )
                
                attendance.minutes_late = lateness_info['minutes_late']
            
            attendance.save()
            
            return {
                'success': True,
                'attendance_id': attendance.id,
                'check_in_time': current_time.isoformat(),
                'within_geofence': within_geofence,
                'minutes_late': attendance.minutes_late,
                'status': attendance.status
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def process_check_out(self, user, data):
        """Process employee check-out"""
        try:
            # Extract data
            lat = data.get('latitude')
            lng = data.get('longitude')
            accuracy = data.get('accuracy')
            ip_address = data.get('ip_address')
            timezone_name = data.get('timezone', 'Asia/Dubai')
            
            # Get current time in user's timezone
            current_time = timezone.now().astimezone(ZoneInfo(timezone_name))
            current_date = current_time.date()

            # Enforce latest check-out restriction if enabled
            if self.work_settings and getattr(self.work_settings, 'latest_check_out_enabled', False):
                if current_time.time() > self.work_settings.latest_check_out_time:
                    return {
                        'success': False,
                        'error': f"Check-out tidak diperbolehkan setelah jam {self.work_settings.latest_check_out_time.strftime('%H:%M')}"
                    }
            
            # Get today's attendance
            try:
                attendance = Attendance.objects.get(
                    user=user,
                    date_local=current_date
                )
            except Attendance.DoesNotExist:
                return {
                    'success': False,
                    'error': 'No check-in record found for today'
                }
            
            # Update check-out
            attendance.check_out_at_utc = timezone.now()
            attendance.check_out_lat = lat
            attendance.check_out_lng = lng
            attendance.check_out_accuracy_m = accuracy
            attendance.check_out_ip = ip_address
            
            # Calculate work minutes
            if attendance.check_in_at_utc:
                duration = attendance.check_out_at_utc - attendance.check_in_at_utc
                attendance.total_work_minutes = int(duration.total_seconds() / 60)
            
            # Calculate overtime
            if self.work_settings and attendance.total_work_minutes:
                overtime_minutes, overtime_amount = attendance.calculate_overtime()
                attendance.overtime_minutes = overtime_minutes
                attendance.overtime_amount = overtime_amount
            
            attendance.save()
            
            return {
                'success': True,
                'attendance_id': attendance.id,
                'check_out_time': current_time.isoformat(),
                'total_work_minutes': attendance.total_work_minutes,
                'overtime_minutes': attendance.overtime_minutes,
                'status': attendance.status
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def precheck_attendance(self, user, data):
        """Precheck attendance status for a date"""
        try:
            timezone_name = data.get('timezone', 'Asia/Dubai')
            check_date = data.get('date', date.today())
            
            # Get or create attendance for the date
            attendance, created = Attendance.objects.get_or_create(
                user=user,
                date_local=check_date,
                defaults={
                    'timezone': timezone_name,
                }
            )
            
            # Get work settings
            if self.work_settings:
                work_hours = self.work_settings.get_work_hours_for_date(check_date)
                is_workday = self.work_settings.is_workday(check_date)
            else:
                work_hours = None
                is_workday = True
            
            # Check if it's a holiday
            from apps.settings.models import Holiday
            is_holiday = Holiday.is_holiday_date(check_date)
            
            return {
                'success': True,
                'date': check_date.isoformat(),
                'is_workday': is_workday,
                'is_holiday': is_holiday,
                'has_check_in': bool(attendance.check_in_at_utc),
                'has_check_out': bool(attendance.check_out_at_utc),
                'work_hours': work_hours,
                'status': attendance.status
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _check_geofence(self, lat, lng):
        """Check if coordinates are within office geofence"""
        if not all([lat, lng, self.work_settings]):
            return False
        
        if not (self.work_settings.office_latitude and self.work_settings.office_longitude):
            return False
        
        distance = haversine_meters(
            lat, lng,
            self.work_settings.office_latitude,
            self.work_settings.office_longitude
        )
        
        return distance <= self.work_settings.office_radius_meters
    
    def get_attendance_summary(self, user, start_date, end_date):
        """Get attendance summary for a user"""
        try:
            attendances = Attendance.objects.filter(
                user=user,
                date_local__range=[start_date, end_date]
            ).order_by('date_local')
            
            summary = {
                'total_days': (end_date - start_date).days + 1,
                'work_days': 0,
                'holidays': 0,
                'check_ins': 0,
                'check_outs': 0,
                'late_days': 0,
                'total_work_minutes': 0,
                'total_overtime_minutes': 0,
                'total_overtime_amount': 0,
                'attendances': []
            }
            
            for attendance in attendances:
                summary['attendances'].append({
                    'date': attendance.date_local.isoformat(),
                    'status': attendance.status,
                    'check_in': attendance.check_in_at_utc.isoformat() if attendance.check_in_at_utc else None,
                    'check_out': attendance.check_out_at_utc.isoformat() if attendance.check_out_at_utc else None,
                    'work_minutes': attendance.total_work_minutes,
                    'overtime_minutes': attendance.overtime_minutes,
                    'overtime_amount': float(attendance.overtime_amount),
                    'is_holiday': attendance.is_holiday,
                    'minutes_late': attendance.minutes_late
                })
                
                if attendance.is_holiday:
                    summary['holidays'] += 1
                else:
                    summary['work_days'] += 1
                
                if attendance.check_in_at_utc:
                    summary['check_ins'] += 1
                
                if attendance.check_out_at_utc:
                    summary['check_outs'] += 1
                
                if attendance.minutes_late > 0:
                    summary['late_days'] += 1
                
                summary['total_work_minutes'] += attendance.total_work_minutes or 0
                summary['total_overtime_minutes'] += attendance.overtime_minutes or 0
                summary['total_overtime_amount'] += float(attendance.overtime_amount or 0)
            
            return {
                'success': True,
                'summary': summary
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
