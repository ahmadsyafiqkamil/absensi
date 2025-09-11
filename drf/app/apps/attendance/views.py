from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.http import JsonResponse
from django.db import models
from datetime import date, timedelta, datetime
from io import BytesIO
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from django.http import HttpResponse
from .models import Attendance
from .serializers import (
    AttendanceSerializer, AttendanceAdminSerializer, AttendanceSupervisorSerializer,
    AttendanceEmployeeSerializer, AttendanceCreateUpdateSerializer,
    AttendanceCheckInSerializer, AttendanceCheckOutSerializer,
    AttendancePrecheckSerializer, AttendanceReportSerializer
)
from .services import AttendanceService
from apps.core.permissions import IsAdmin, IsSupervisor, IsEmployee


class AttendanceViewSet(viewsets.ReadOnlyModelViewSet):
    """Attendance management ViewSet with role-based access"""
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return AttendanceAdminSerializer
        elif self.request.user.groups.filter(name='supervisor').exists():
            return AttendanceSupervisorSerializer
        else:
            return AttendanceEmployeeSerializer
    
    def get_queryset(self):
        """Filter attendances based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return Attendance.objects.all()
        elif self.request.user.groups.filter(name='supervisor').exists():
            # Supervisors can see attendances of employees in their division
            if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.division:
                return Attendance.objects.filter(
                    employee__division=self.request.user.employee_profile.division
                )
            return Attendance.objects.none()
        else:
            # Regular employees can only see their own attendances
            return Attendance.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def check_in(self, request):
        """Employee check-in endpoint"""
        serializer = AttendanceCheckInSerializer(data=request.data)
        if serializer.is_valid():
            service = AttendanceService()
            result = service.process_check_in(request.user, serializer.validated_data)
            
            if result['success']:
                return Response(result, status=status.HTTP_201_CREATED)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def check_out(self, request):
        """Employee check-out endpoint"""
        serializer = AttendanceCheckOutSerializer(data=request.data)
        if serializer.is_valid():
            service = AttendanceService()
            result = service.process_check_out(request.user, serializer.validated_data)
            
            if result['success']:
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def precheck(self, request):
        """Attendance precheck endpoint"""
        serializer = AttendancePrecheckSerializer(data=request.data)
        if serializer.is_valid():
            service = AttendanceService()
            result = service.precheck_attendance(request.user, serializer.validated_data)
            
            if result['success']:
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's attendance for current user"""
        try:
            attendance = Attendance.objects.get(
                user=request.user,
                date_local=date.today()
            )
            serializer = self.get_serializer(attendance)
            return Response(serializer.data)
        except Attendance.DoesNotExist:
            return Response(
                {"message": "No attendance record for today"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get attendance summary for current user"""
        # Get date range from query params
        end_date = date.today()
        start_date = end_date - timedelta(days=30)  # Default to last 30 days
        
        if 'start_date' in request.query_params:
            try:
                start_date = date.fromisoformat(request.query_params['start_date'])
            except ValueError:
                return Response(
                    {"error": "Invalid start_date format. Use YYYY-MM-DD"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if 'end_date' in request.query_params:
            try:
                end_date = date.fromisoformat(request.query_params['end_date'])
            except ValueError:
                return Response(
                    {"error": "Invalid end_date format. Use YYYY-MM-DD"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        service = AttendanceService()
        result = service.get_attendance_summary(request.user, start_date, end_date)
        
        if result['success']:
            return Response(result['summary'])
        else:
            return Response(
                {"error": result['error']}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def report(self, request):
        """Generate attendance report"""
        serializer = AttendanceReportSerializer(data=request.data)
        if serializer.is_valid():
            # For now, return summary. PDF generation can be added later
            start_date = serializer.validated_data['start_date']
            end_date = serializer.validated_data['end_date']
            
            service = AttendanceService()
            result = service.get_attendance_summary(request.user, start_date, end_date)
            
            if result['success']:
                return Response(result['summary'])
            else:
                return Response(
                    {"error": result['error']}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def approve_overtime(self, request, pk=None):
        """Approve overtime for a specific attendance record (v2 companion to legacy)."""
        if not (request.user.is_superuser or request.user.groups.filter(name__in=['admin', 'supervisor']).exists()):
            return Response({"detail": "forbidden"}, status=status.HTTP_403_FORBIDDEN)
        try:
            att = Attendance.objects.get(pk=pk)
        except Attendance.DoesNotExist:
            return Response({"detail": "attendance_not_found"}, status=status.HTTP_404_NOT_FOUND)
        att.overtime_approved = True
        att.overtime_approved_by = request.user
        att.overtime_approved_at = timezone.now()
        att.save()
        return Response({"detail": "overtime_approved"})


# Role-specific ViewSets for backward compatibility
class AdminAttendanceViewSet(AttendanceViewSet):
    """Admin-specific attendance ViewSet"""
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        return Attendance.objects.all()


class SupervisorAttendanceViewSet(AttendanceViewSet):
    """Supervisor-specific attendance ViewSet"""
    permission_classes = [IsSupervisor]
    
    def get_queryset(self):
        # Supervisors can see attendances of employees in their division
        if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.division:
            return Attendance.objects.filter(
                employee__division=self.request.user.employee_profile.division
            )
        return Attendance.objects.none()


class EmployeeAttendanceViewSet(AttendanceViewSet):
    """Employee-specific attendance ViewSet"""
    permission_classes = [IsEmployee]
    
    def get_queryset(self):
        # Employees can only see their own attendances
        return Attendance.objects.filter(user=self.request.user)


# Supervisor team endpoints (JSON) - v2 port of legacy
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def supervisor_team_attendance(request):
    user = request.user
    # Allow admin/superuser or supervisors
    if not (user.is_superuser or user.groups.filter(name__in=['admin', 'supervisor']).exists()):
        return JsonResponse({"detail": "forbidden"}, status=403)

    # Supervisor division
    try:
        supervisor_division_id = user.employee_profile.division_id
        if not supervisor_division_id:
            return JsonResponse({"detail": "supervisor_division_not_configured"}, status=400)
    except Exception:
        return JsonResponse({"detail": "supervisor_employee_record_not_found"}, status=400)

    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    employee_id = request.GET.get('employee_id')

    from apps.employees.models import Employee
    from .models import Attendance

    team_employees = Employee.objects.filter(
        division_id=supervisor_division_id
    ).select_related('user', 'division', 'position')

    if employee_id:
        team_employees = team_employees.filter(id=employee_id)

    attendance_data = []
    for employee in team_employees:
        qs = Attendance.objects.filter(
            user=employee.user
        ).select_related('user', 'employee')
        if start_date:
            qs = qs.filter(date_local__gte=start_date)
        if end_date:
            qs = qs.filter(date_local__lte=end_date)
        attendances = qs.order_by('-date_local')

        total_days = attendances.count()
        present_days = attendances.filter(check_in_at_utc__isnull=False).count()
        late_days = attendances.filter(minutes_late__gt=0).count()
        absent_days = total_days - present_days
        recent_attendance = attendances[:7]

        employee_data = {
            "employee": {
                "id": employee.id,
                "nip": employee.nip,
                "fullname": employee.fullname,
                "user": {
                    "id": employee.user.id,
                    "username": employee.user.username,
                    "first_name": employee.user.first_name,
                    "last_name": employee.user.last_name,
                    "email": employee.user.email,
                },
                "division": {
                    "id": employee.division.id,
                    "name": employee.division.name
                } if employee.division else None,
                "position": {
                    "id": employee.position.id,
                    "name": employee.position.name
                } if employee.position else None,
            },
            "summary": {
                "total_days": total_days,
                "present_days": present_days,
                "late_days": late_days,
                "absent_days": absent_days,
                "attendance_rate": round((present_days / total_days * 100) if total_days > 0 else 0, 2)
            },
            "recent_attendance": [
                {
                    "id": att.id,
                    "date_local": str(att.date_local),
                    "check_in_at_utc": att.check_in_at_utc.isoformat() if att.check_in_at_utc else None,
                    "check_out_at_utc": att.check_out_at_utc.isoformat() if att.check_out_at_utc else None,
                    "minutes_late": att.minutes_late,
                    "total_work_minutes": att.total_work_minutes,
                    "is_holiday": att.is_holiday,
                    "within_geofence": att.within_geofence,
                    "note": att.note,
                    "employee_note": att.employee_note,
                }
                for att in recent_attendance
            ]
        }
        attendance_data.append(employee_data)

    return JsonResponse({
        "team_attendance": attendance_data,
        "filters": {
            "start_date": start_date,
            "end_date": end_date,
            "employee_id": employee_id,
            "division_id": supervisor_division_id
        }
    }, safe=False)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def supervisor_attendance_detail(request, employee_id):
    user = request.user
    if not (user.is_superuser or user.groups.filter(name__in=['admin', 'supervisor']).exists()):
        return JsonResponse({"detail": "forbidden"}, status=403)

    try:
        supervisor_division_id = user.employee_profile.division_id
        if not supervisor_division_id:
            return JsonResponse({"detail": "supervisor_division_not_configured"}, status=400)
    except Exception:
        return JsonResponse({"detail": "supervisor_employee_record_not_found"}, status=400)

    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    month = request.GET.get('month')

    from apps.employees.models import Employee
    from .models import Attendance

    try:
        employee = Employee.objects.select_related('user', 'division', 'position').get(
            id=employee_id, division_id=supervisor_division_id
        )
    except Employee.DoesNotExist:
        return JsonResponse({"detail": "employee_not_found_or_not_in_team"}, status=404)

    qs = Attendance.objects.filter(user=employee.user)
    if start_date:
        qs = qs.filter(date_local__gte=start_date)
    if end_date:
        qs = qs.filter(date_local__lte=end_date)
    if month:
        try:
            y, m = month.split('-')
            qs = qs.filter(date_local__year=y, date_local__month=m)
        except ValueError:
            return JsonResponse({"detail": "invalid_month_format_use_yyyy_mm"}, status=400)

    attendances = qs.order_by('-date_local')
    total_days = attendances.count()
    present_days = attendances.filter(check_in_at_utc__isnull=False).count()
    late_days = attendances.filter(minutes_late__gt=0).count()
    absent_days = total_days - present_days
    total_late_minutes = attendances.filter(minutes_late__gt=0).aggregate(total=models.Sum('minutes_late'))['total'] or 0
    total_work_minutes = attendances.filter(total_work_minutes__gt=0).aggregate(total=models.Sum('total_work_minutes'))['total'] or 0

    attendance_records = [
        {
            "id": att.id,
            "date_local": str(att.date_local),
            "check_in_at_utc": att.check_in_at_utc.isoformat() if att.check_in_at_utc else None,
            "check_out_at_utc": att.check_out_at_utc.isoformat() if att.check_out_at_utc else None,
            "check_in_lat": float(att.check_in_lat) if att.check_in_lat else None,
            "check_in_lng": float(att.check_in_lng) if att.check_in_lng else None,
            "check_out_lat": float(att.check_out_lat) if att.check_out_lat else None,
            "check_out_lng": float(att.check_out_lng) if att.check_out_lng else None,
            "check_in_ip": att.check_in_ip,
            "check_out_ip": att.check_out_ip,
            "minutes_late": att.minutes_late,
            "total_work_minutes": att.total_work_minutes,
            "is_holiday": att.is_holiday,
            "within_geofence": att.within_geofence,
            "note": att.note,
            "employee_note": att.employee_note,
            "created_at": att.created_at.isoformat(),
            "updated_at": att.updated_at.isoformat(),
        }
        for att in attendances
    ]

    return JsonResponse({
        "employee": {
            "id": employee.id,
            "nip": employee.nip,
            "fullname": employee.fullname,
            "user": {
                "id": employee.user.id,
                "username": employee.user.username,
                "first_name": employee.user.first_name,
                "last_name": employee.user.last_name,
                "email": employee.user.email,
            },
            "division": {"id": employee.division.id, "name": employee.division.name} if employee.division else None,
            "position": {"id": employee.position.id, "name": employee.position.name} if employee.position else None,
        },
        "summary": {
            "total_days": total_days,
            "present_days": present_days,
            "late_days": late_days,
            "absent_days": absent_days,
            "attendance_rate": round((present_days / total_days * 100) if total_days > 0 else 0, 2),
            "total_late_minutes": total_late_minutes,
            "total_work_minutes": total_work_minutes,
            "average_work_minutes": round(total_work_minutes / present_days, 2) if present_days > 0 else 0
        },
        "attendance_records": attendance_records,
        "filters": {"start_date": start_date, "end_date": end_date, "month": month}
    }, safe=False)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def supervisor_team_attendance_pdf(request):
    """Export supervisor team attendance summary to PDF (v2)"""
    user = request.user
    if not (user.is_superuser or user.groups.filter(name__in=['admin', 'supervisor']).exists()):
        return JsonResponse({"detail": "forbidden"}, status=403)

    try:
        division_id = user.employee_profile.division_id
        if not division_id:
            return JsonResponse({"detail": "supervisor_division_not_configured"}, status=400)
    except Exception:
        return JsonResponse({"detail": "supervisor_employee_record_not_found"}, status=400)

    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    employee_id = request.GET.get('employee_id')

    from apps.employees.models import Employee
    from .models import Attendance

    team = Employee.objects.filter(division_id=division_id).select_related('user', 'division', 'position')
    if employee_id:
        team = team.filter(id=employee_id)

    # Build data rows
    rows = [["NIP", "Nama", "Divisi", "Posisi", "Hadir", "Terlambat", "Alpa"]]
    for emp in team:
        qs = Attendance.objects.filter(user=emp.user)
        if start_date:
            qs = qs.filter(date_local__gte=start_date)
        if end_date:
            qs = qs.filter(date_local__lte=end_date)
        qs = qs.order_by('-date_local')
        total_days = qs.count()
        present_days = qs.filter(check_in_at_utc__isnull=False).count()
        late_days = qs.filter(minutes_late__gt=0).count()
        absent_days = total_days - present_days
        rows.append([
            emp.nip,
            emp.fullname or emp.user.get_full_name() or emp.user.username,
            emp.division.name if emp.division else '-',
            emp.position.name if emp.position else '-',
            str(present_days),
            str(late_days),
            str(absent_days),
        ])

    # Generate PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    elements = []

    title = Paragraph("Ringkasan Kehadiran Tim", styles['Title'])
    subtitle_parts = []
    if start_date:
        subtitle_parts.append(f"Mulai: {start_date}")
    if end_date:
        subtitle_parts.append(f"Sampai: {end_date}")
    sub = Paragraph(' &nbsp;&nbsp; '.join(subtitle_parts), styles['Normal']) if subtitle_parts else Spacer(1, 0.01*cm)
    elements.extend([title, Spacer(1, 0.4*cm), sub, Spacer(1, 0.6*cm)])

    table = Table(rows, colWidths=[3.0*cm, 5.0*cm, 3.0*cm, 3.0*cm, 2.0*cm, 2.0*cm, 2.0*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ('ALIGN', (4,1), (-1,-1), 'RIGHT'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
    ]))
    elements.append(table)

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="Ringkasan_Kehadiran_Tim.pdf"'
    return response
