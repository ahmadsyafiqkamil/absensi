from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import JsonResponse
from django.utils import timezone
from datetime import date, timedelta
from .models import Division, Position
from .serializers import DivisionSerializer, PositionSerializer
from apps.employees.models import Employee
from apps.attendance.services import AttendanceService

class DivisionViewSet(viewsets.ModelViewSet):
    queryset = Division.objects.all()
    serializer_class = DivisionSerializer

class PositionViewSet(viewsets.ModelViewSet):
    queryset = Position.objects.all()
    serializer_class = PositionSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def supervisor_attendance_detail(request, employee_id):
    """Get detailed attendance information for a specific employee (supervisor view)"""
    try:
        # Check if user is supervisor
        if not request.user.groups.filter(name='supervisor').exists():
            return Response({"error": "Akses ditolak. Peran supervisor diperlukan."}, status=403)
        
        # Get the employee
        try:
            employee = Employee.objects.select_related('user', 'division', 'position').get(id=employee_id)
        except Employee.DoesNotExist:
            return Response({"error": "Pegawai tidak ditemukan"}, status=404)
        
        # Check if supervisor has access to this employee (same division)
        if (hasattr(request.user, 'employee_profile') and 
            request.user.employee_profile.division and 
            employee.division != request.user.employee_profile.division):
            return Response({"error": "Akses ditolak. Anda hanya dapat melihat pegawai di divisi Anda."}, status=403)
        
        # Get query parameters
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        month = request.GET.get('month')
        
        # Set default date range if not provided
        if not end_date:
            end_date = date.today()
        else:
            end_date = date.fromisoformat(end_date)
        
        if not start_date:
            start_date = end_date - timedelta(days=30)
        else:
            start_date = date.fromisoformat(start_date)
        
        # Get attendance summary using the service
        attendance_service = AttendanceService()
        result = attendance_service.get_attendance_summary(
            employee.user, 
            start_date, 
            end_date, 
            month
        )
        
        if not result['success']:
            return Response({"error": result['error']}, status=500)
        
        summary_data = result['summary']
        
        # Calculate additional metrics
        present_days = summary_data['check_ins']
        absent_days = summary_data['work_days'] - present_days
        attendance_rate = (present_days / summary_data['work_days'] * 100) if summary_data['work_days'] > 0 else 0
        
        # Transform attendance records to match frontend expectations
        attendance_records = []
        for att in summary_data['attendances']:
            attendance_records.append({
                'id': len(attendance_records) + 1,
                'date_local': att['date'],
                'check_in_at_utc': att['check_in'],
                'check_out_at_utc': att['check_out'],
                'check_in_lat': None,  # Not stored in current system
                'check_in_lng': None,  # Not stored in current system
                'check_out_lat': None,  # Not stored in current system
                'check_out_lng': None,  # Not stored in current system
                'minutes_late': att['minutes_late'],
                'total_work_minutes': att['work_minutes'],
                'is_holiday': att['is_holiday'],
                'within_geofence': True,  # Default to true
                'note': None,
                'employee_note': None,
                'created_at': att['date'],
                'updated_at': att['date']
            })
        
        # Build response
        response_data = {
            'employee': {
                'id': employee.id,
                'nip': employee.nip,
                'fullname': employee.fullname,
                'user': {
                    'id': employee.user.id,
                    'username': employee.user.username,
                    'first_name': employee.user.first_name,
                    'last_name': employee.user.last_name,
                    'email': employee.user.email,
                },
                'division': {
                    'id': employee.division.id if employee.division else None,
                    'name': employee.division.name if employee.division else None,
                } if employee.division else None,
                'position': {
                    'id': employee.position.id if employee.position else None,
                    'name': employee.position.name if employee.position else None,
                } if employee.position else None,
            },
            'summary': {
                'total_days': summary_data['total_days'],
                'present_days': present_days,
                'late_days': summary_data['late_days'],
                'absent_days': absent_days,
                'attendance_rate': round(attendance_rate, 2),
                'total_late_minutes': 0,  # Not calculated in current system
                'total_work_minutes': summary_data['total_work_minutes'],
                'average_work_minutes': summary_data['total_work_minutes'] / present_days if present_days > 0 else 0,
            },
            'attendance_records': attendance_records,
            'filters': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'month': month,
            }
        }
        
        return Response(response_data)
        
    except Exception as e:
        return Response({"error": f"Kesalahan server internal: {str(e)}"}, status=500)
