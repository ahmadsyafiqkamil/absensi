from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Q, Sum, Avg, Count
from datetime import date, datetime, timedelta
from .models import ReportTemplate, GeneratedReport, ReportSchedule
from apps.attendance.models import Attendance
from apps.overtime.models import OvertimeRequest, MonthlySummaryRequest
from apps.employees.models import Employee, Division
from apps.settings.models import WorkSettings

User = get_user_model()


class ReportGenerationService:
    """Service class for generating various types of reports"""
    
    def __init__(self):
        self.work_settings = WorkSettings.objects.first()
    
    def generate_attendance_report(self, parameters, user):
        """Generate attendance report based on parameters"""
        try:
            start_date = parameters.get('start_date')
            end_date = parameters.get('end_date')
            employee_id = parameters.get('employee_id')
            division_id = parameters.get('division_id')
            include_overtime = parameters.get('include_overtime', True)
            format_type = parameters.get('format', 'json')
            
            # Build queryset
            queryset = Attendance.objects.all()
            
            if start_date:
                queryset = queryset.filter(date_local__gte=start_date)
            if end_date:
                queryset = queryset.filter(date_local__lte=end_date)
            if employee_id:
                queryset = queryset.filter(employee_id=employee_id)
            if division_id:
                queryset = queryset.filter(employee__division_id=division_id)
            
            # Get attendance data
            attendances = queryset.select_related(
                'user', 'employee', 'employee__division'
            ).order_by('date_local', 'user__username')
            
            # Prepare report data
            report_data = {
                'report_type': 'attendance',
                'generated_at': timezone.now().isoformat(),
                'parameters': parameters,
                'summary': self._calculate_attendance_summary(attendances),
                'details': []
            }
            
            # Add detailed data
            for attendance in attendances:
                detail = {
                    'date': attendance.date_local.isoformat(),
                    'user_id': attendance.user.id,
                    'username': attendance.user.username,
                    'employee_name': attendance.employee.fullname if attendance.employee else None,
                    'division': attendance.employee.division.name if attendance.employee and attendance.employee.division else None,
                    'check_in': attendance.check_in_at_utc.isoformat() if attendance.check_in_at_utc else None,
                    'check_out': attendance.check_out_at_utc.isoformat() if attendance.check_out_at_utc else None,
                    'total_work_minutes': attendance.total_work_minutes,
                    'minutes_late': attendance.minutes_late,
                    'is_holiday': attendance.is_holiday,
                    'within_geofence': attendance.within_geofence,
                    'status': attendance.status
                }
                
                if include_overtime:
                    detail.update({
                        'overtime_minutes': attendance.overtime_minutes,
                        'overtime_amount': float(attendance.overtime_amount) if attendance.overtime_amount else 0
                    })
                
                report_data['details'].append(detail)
            
            return {
                'success': True,
                'data': report_data,
                'total_records': len(report_data['details'])
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_overtime_report(self, parameters, user):
        """Generate overtime report based on parameters"""
        try:
            start_date = parameters.get('start_date')
            end_date = parameters.get('end_date')
            employee_id = parameters.get('employee_id')
            division_id = parameters.get('division_id')
            status_filter = parameters.get('status')
            request_type = parameters.get('request_type')
            
            # Build queryset
            queryset = OvertimeRequest.objects.all()
            
            if start_date:
                queryset = queryset.filter(date__gte=start_date)
            if end_date:
                queryset = queryset.filter(date__lte=end_date)
            if employee_id:
                queryset = queryset.filter(employee_id=employee_id)
            if division_id:
                queryset = queryset.filter(employee__division_id=division_id)
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            if request_type:
                queryset = queryset.filter(request_type=request_type)
            
            # Get overtime data
            overtime_requests = queryset.select_related(
                'user', 'employee', 'employee__division'
            ).order_by('date', 'user__username')
            
            # Prepare report data
            report_data = {
                'report_type': 'overtime',
                'generated_at': timezone.now().isoformat(),
                'parameters': parameters,
                'summary': self._calculate_overtime_summary(overtime_requests),
                'details': []
            }
            
            # Add detailed data
            for request in overtime_requests:
                detail = {
                    'id': request.id,
                    'date': request.date.isoformat(),
                    'user_id': request.user.id,
                    'username': request.user.username,
                    'employee_name': request.employee.fullname if request.employee else None,
                    'division': request.employee.division.name if request.employee and request.employee.division else None,
                    'request_type': request.request_type,
                    'start_time': request.start_time.isoformat() if request.start_time else None,
                    'end_time': request.end_time.isoformat() if request.end_time else None,
                    'total_hours': float(request.total_hours) if request.total_hours else 0,
                    'purpose': request.purpose,
                    'status': request.status,
                    'hourly_rate': float(request.hourly_rate) if request.hourly_rate else 0,
                    'total_amount': float(request.total_amount) if request.total_amount else 0,
                    'requested_at': request.requested_at.isoformat()
                }
                
                if request.approved_by:
                    detail['approved_by'] = request.approved_by.username
                    detail['approved_at'] = request.approved_at.isoformat()
                
                report_data['details'].append(detail)
            
            return {
                'success': True,
                'data': report_data,
                'total_records': len(report_data['details'])
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_summary_report(self, parameters, user):
        """Generate summary report based on parameters"""
        try:
            month = parameters.get('month')
            year = parameters.get('year')
            division_id = parameters.get('division_id')
            include_details = parameters.get('include_details', False)
            
            # Get date range
            if month and year:
                start_date = date(year, month, 1)
                if month == 12:
                    end_date = date(year + 1, 1, 1) - timedelta(days=1)
                else:
                    end_date = date(year, month + 1, 1) - timedelta(days=1)
            else:
                # Default to current month
                today = date.today()
                start_date = date(today.year, today.month, 1)
                if today.month == 12:
                    end_date = date(today.year + 1, 1, 1) - timedelta(days=1)
                else:
                    end_date = date(today.year, today.month + 1, 1) - timedelta(days=1)
            
            # Get employees
            employees_queryset = Employee.objects.all()
            if division_id:
                employees_queryset = employees_queryset.filter(division_id=division_id)
            
            employees = employees_queryset.select_related('division').order_by('division__name', 'fullname')
            
            # Prepare report data
            report_data = {
                'report_type': 'summary',
                'generated_at': timezone.now().isoformat(),
                'parameters': parameters,
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'month': month,
                    'year': year
                },
                'summary': {
                    'total_employees': employees.count(),
                    'total_divisions': employees.values('division').distinct().count(),
                    'period_days': (end_date - start_date).days + 1
                },
                'divisions': []
            }
            
            # Group by division
            for division in employees.values('division__name').distinct():
                division_name = division['division__name']
                division_employees = employees.filter(division__name=division_name)
                
                division_summary = {
                    'name': division_name,
                    'employee_count': division_employees.count(),
                    'employees': []
                }
                
                # Get data for each employee
                for employee in division_employees:
                    # Get attendance data
                    attendances = Attendance.objects.filter(
                        employee=employee,
                        date_local__range=[start_date, end_date]
                    )
                    
                    # Get overtime data
                    overtime_requests = OvertimeRequest.objects.filter(
                        employee=employee,
                        date__range=[start_date, end_date]
                    )
                    
                    employee_data = {
                        'id': employee.id,
                        'nip': employee.nip,
                        'name': employee.fullname,
                        'position': employee.position.name if employee.position else None,
                        'attendance_summary': self._calculate_employee_attendance_summary(attendances),
                        'overtime_summary': self._calculate_employee_overtime_summary(overtime_requests)
                    }
                    
                    division_summary['employees'].append(employee_data)
                
                report_data['divisions'].append(division_summary)
            
            return {
                'success': True,
                'data': report_data,
                'total_records': len(report_data['divisions'])
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _calculate_attendance_summary(self, attendances):
        """Calculate summary statistics for attendance data"""
        if not attendances:
            return {}
        
        total_days = len(attendances)
        work_days = sum(1 for a in attendances if not a.is_holiday)
        holidays = sum(1 for a in attendances if a.is_holiday)
        check_ins = sum(1 for a in attendances if a.check_in_at_utc)
        check_outs = sum(1 for a in attendances if a.check_out_at_utc)
        late_days = sum(1 for a in attendances if a.minutes_late > 0)
        
        total_work_minutes = sum(a.total_work_minutes or 0 for a in attendances)
        total_overtime_minutes = sum(a.overtime_minutes or 0 for a in attendances)
        total_overtime_amount = sum(float(a.overtime_amount or 0) for a in attendances)
        
        return {
            'total_days': total_days,
            'work_days': work_days,
            'holidays': holidays,
            'check_ins': check_ins,
            'check_outs': check_outs,
            'late_days': late_days,
            'total_work_minutes': total_work_minutes,
            'total_overtime_minutes': total_overtime_minutes,
            'total_overtime_amount': round(total_overtime_amount, 2)
        }
    
    def _calculate_overtime_summary(self, overtime_requests):
        """Calculate summary statistics for overtime data"""
        if not overtime_requests:
            return {}
        
        total_requests = len(overtime_requests)
        pending = sum(1 for r in overtime_requests if r.status == 'pending')
        approved = sum(1 for r in overtime_requests if r.status == 'approved')
        rejected = sum(1 for r in overtime_requests if r.status == 'rejected')
        cancelled = sum(1 for r in overtime_requests if r.status == 'cancelled')
        
        total_hours = sum(float(r.total_hours or 0) for r in overtime_requests)
        total_amount = sum(float(r.total_amount or 0) for r in overtime_requests)
        
        return {
            'total_requests': total_requests,
            'pending': pending,
            'approved': approved,
            'rejected': rejected,
            'cancelled': cancelled,
            'total_hours': round(total_hours, 2),
            'total_amount': round(total_amount, 2)
        }
    
    def _calculate_employee_attendance_summary(self, attendances):
        """Calculate attendance summary for a specific employee"""
        if not attendances:
            return {}
        
        total_days = len(attendances)
        work_days = sum(1 for a in attendances if not a.is_holiday)
        holidays = sum(1 for a in attendances if a.is_holiday)
        check_ins = sum(1 for a in attendances if a.check_in_at_utc)
        check_outs = sum(1 for a in attendances if a.check_out_at_utc)
        late_days = sum(1 for a in attendances if a.minutes_late > 0)
        
        total_work_minutes = sum(a.total_work_minutes or 0 for a in attendances)
        total_overtime_minutes = sum(a.overtime_minutes or 0 for a in attendances)
        
        return {
            'total_days': total_days,
            'work_days': work_days,
            'holidays': holidays,
            'check_ins': check_ins,
            'check_outs': check_outs,
            'late_days': late_days,
            'total_work_minutes': total_work_minutes,
            'total_overtime_minutes': total_overtime_minutes
        }
    
    def _calculate_employee_overtime_summary(self, overtime_requests):
        """Calculate overtime summary for a specific employee"""
        if not overtime_requests:
            return {}
        
        total_requests = len(overtime_requests)
        approved = sum(1 for r in overtime_requests if r.status == 'approved')
        total_hours = sum(float(r.total_hours or 0) for r in overtime_requests)
        total_amount = sum(float(r.total_amount or 0) for r in overtime_requests)
        
        return {
            'total_requests': total_requests,
            'approved': approved,
            'total_hours': round(total_hours, 2),
            'total_amount': round(total_amount, 2)
        }
