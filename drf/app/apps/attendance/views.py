from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import date, timedelta, datetime
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.http import HttpResponse
from io import BytesIO
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from django.db import models
from .models import Attendance
from api.pagination import DefaultPagination
from .serializers import (
    AttendanceSerializer, AttendanceAdminSerializer, AttendanceSupervisorSerializer,
    AttendanceEmployeeSerializer, AttendanceCreateUpdateSerializer,
    AttendanceCheckInSerializer, AttendanceCheckOutSerializer,
    AttendancePrecheckSerializer, AttendanceReportSerializer
)
from .services import AttendanceService
from apps.core.permissions import IsAdmin, IsSupervisor, IsEmployee
from apps.employees.models import Employee


def format_work_hours(minutes, use_indonesian=True):
    """Format work hours from minutes to readable format"""
    if not minutes or minutes <= 0:
        return "0m"
    
    hours = minutes // 60
    mins = minutes % 60
    
    if use_indonesian:
        if hours > 0 and mins > 0:
            return f"{hours}j {mins}m"
        elif hours > 0:
            return f"{hours}j"
        else:
            return f"{mins}m"
    else:
        if hours > 0 and mins > 0:
            return f"{hours}h {mins}m"
        elif hours > 0:
            return f"{hours}h"
        else:
            return f"{mins}m"


class AttendanceViewSet(viewsets.ReadOnlyModelViewSet):
    """Attendance management ViewSet with role-based access"""
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = DefaultPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['date_local', 'user', 'employee']
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'employee__name']
    ordering_fields = ['date_local', 'created_at', 'check_in_at_utc']
    ordering = ['-date_local', '-created_at']
    
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
        queryset = Attendance.objects.all()
        
        # Apply role-based filtering
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            queryset = queryset
        elif self.request.user.groups.filter(name='supervisor').exists():
            # Supervisors can see their own attendances and attendances of employees in their division
            if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.division:
                from django.db import models
                queryset = queryset.filter(
                    models.Q(user=self.request.user) |  # Own attendance
                    models.Q(employee__division=self.request.user.employee_profile.division)  # Team attendance
                )
            else:
                # If no division, supervisors can only see their own attendance
                queryset = queryset.filter(user=self.request.user)
        else:
            # Regular employees can only see their own attendances
            queryset = queryset.filter(user=self.request.user)
        
        # Apply date range filtering if start and end parameters are provided
        start_date = self.request.query_params.get('start')
        end_date = self.request.query_params.get('end')
        
        if start_date:
            try:
                start_date_obj = date.fromisoformat(start_date)
                queryset = queryset.filter(date_local__gte=start_date_obj)
            except ValueError:
                pass  # Invalid date format, ignore
        
        if end_date:
            try:
                end_date_obj = date.fromisoformat(end_date)
                queryset = queryset.filter(date_local__lte=end_date_obj)
            except ValueError:
                pass  # Invalid date format, ignore
        
        return queryset
    
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
            # Use queryset to avoid MultipleObjectsReturned and pick the latest record deterministically
            qs = Attendance.objects.filter(
                user=request.user,
                date_local=date.today()
            ).order_by('-check_in_at_utc', '-id')

            attendance = qs.first()
            if not attendance:
                return Response(
                    {"message": "Tidak ada catatan kehadiran untuk hari ini"}, 
                    status=status.HTTP_404_NOT_FOUND
                )

            serializer = self.get_serializer(attendance)
            return Response(serializer.data)
        except Exception:
            # Avoid leaking internal errors; return a safe message
            return Response(
                {"detail": "Gagal mengambil kehadiran hari ini"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get attendance summary for current user"""
        # Get date range from query params
        end_date = date.today()
        start_date = end_date - timedelta(days=30)  # Default to last 30 days
        month = request.query_params.get('month')
        
        # Priority: month filter overrides date range filters
        if month:
            try:
                year, month_num = month.split('-')
                from datetime import datetime
                start_date = datetime.strptime(f"{year}-{month_num}-01", "%Y-%m-%d").date()
                if month_num == '12':
                    end_date = datetime.strptime(f"{int(year)+1}-01-01", "%Y-%m-%d").date() - timedelta(days=1)
                else:
                    end_date = datetime.strptime(f"{year}-{int(month_num)+1}-01", "%Y-%m-%d").date() - timedelta(days=1)
            except ValueError:
                return Response(
                    {"error": "Format bulan tidak valid. Gunakan YYYY-MM"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Only use date range if month is not set
            if 'start_date' in request.query_params:
                try:
                    start_date = date.fromisoformat(request.query_params['start_date'])
                except ValueError:
                    return Response(
                        {"error": "Format tanggal mulai tidak valid. Gunakan YYYY-MM-DD"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            if 'end_date' in request.query_params:
                try:
                    end_date = date.fromisoformat(request.query_params['end_date'])
                except ValueError:
                    return Response(
                        {"error": "Format tanggal akhir tidak valid. Gunakan YYYY-MM-DD"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
        
        service = AttendanceService()
        result = service.get_attendance_summary(request.user, start_date, end_date, month)
        
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
    
    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        """Generate PDF report for attendance data"""
        from apps.settings.models import WorkSettings
        import pytz
        
        user = request.user
        
        # Get query parameters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        month = request.query_params.get('month')
        
        # Get work settings for timezone
        work_settings = WorkSettings.objects.first()
        if work_settings and work_settings.timezone:
            try:
                work_tz = pytz.timezone(work_settings.timezone)
            except pytz.exceptions.UnknownTimeZoneError:
                work_tz = pytz.UTC
        else:
            work_tz = pytz.UTC
        
        # Validate date formats
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            except ValueError:
                return Response({"detail": "Format tanggal mulai tidak valid. Gunakan YYYY-MM-DD"}, status=400)
        
        if end_date:
            try:
                end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            except ValueError:
                return Response({"detail": "Format tanggal akhir tidak valid. Gunakan YYYY-MM-DD"}, status=400)
        
        # Validate that end_date is not before start_date
        if start_date and end_date:
            if end_dt < start_dt:
                return Response({"detail": "tanggal_akhir tidak boleh sebelum tanggal_mulai"}, status=400)
        
        # Build attendance queryset
        attendance_qs = Attendance.objects.filter(user=user)
        
        # Apply date filters
        # Priority: month filter overrides date range filters
        if month:
            try:
                year, month_num = month.split('-')
                attendance_qs = attendance_qs.filter(
                    date_local__year=year,
                    date_local__month=month_num
                )
            except ValueError:
                return Response({"detail": "format_bulan_tidak_valid_gunakan_yyyy_mm"}, status=400)
        else:
            # Apply date range filters (can be partial - just start or just end)
            if start_date:
                attendance_qs = attendance_qs.filter(date_local__gte=start_date)
            if end_date:
                attendance_qs = attendance_qs.filter(date_local__lte=end_date)
        
        # Get attendance records
        attendances = attendance_qs.order_by('-date_local')
        
        # Calculate statistics
        total_days = attendances.count()
        present_days = attendances.filter(check_in_at_utc__isnull=False).count()
        late_days = attendances.filter(minutes_late__gt=0).count()
        absent_days = total_days - present_days
        total_late_minutes = attendances.filter(minutes_late__gt=0).aggregate(
            total=models.Sum('minutes_late')
        )['total'] or 0
        total_work_minutes = attendances.filter(
            total_work_minutes__gt=0
        ).aggregate(
            total=models.Sum('total_work_minutes')
        )['total'] or 0
        
        # Create PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(A4))
        elements = []
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        
        # Title
        title = Paragraph("Laporan Absensi Pegawai", title_style)
        elements.append(title)
        
        # Employee Info
        try:
            employee = user.employee_profile
            # Get full name from user
            full_name = f"{user.first_name} {user.last_name}".strip()
            if not full_name:
                full_name = user.username
            if not full_name:
                full_name = user.email
            
            employee_info = f"""
            <b>Nama:</b> {full_name}<br/>
            <b>Username:</b> {user.username}<br/>
            <b>NIP:</b> {employee.nip if employee else 'N/A'}<br/>
            <b>Divisi:</b> {employee.division.name if employee and employee.division else 'N/A'}<br/>
            <b>Jabatan:</b> {employee.position.name if employee and employee.position else 'N/A'}<br/>
            <b>Periode:</b> {start_date or 'Semua'} - {end_date or 'Semua'}
            """
            if month:
                employee_info += f"<br/><b>Bulan:</b> {month}"
        except:
            # Fallback with username
            employee_info = f"<b>Nama:</b> {user.username}<br/><b>Periode:</b> {start_date or 'Semua'} - {end_date or 'Semua'}"
        
        employee_para = Paragraph(employee_info, styles['Normal'])
        elements.append(employee_para)
        elements.append(Spacer(1, 20))
        
        # Summary Statistics
        summary_title = Paragraph("Ringkasan Statistik", styles['Heading2'])
        elements.append(summary_title)
        elements.append(Spacer(1, 10))
        
        summary_data = [
            ['Total Hari', 'Hadir', 'Terlambat', 'Tidak Hadir', 'Tingkat Kehadiran'],
            [
                str(total_days),
                str(present_days),
                str(late_days),
                str(absent_days),
                f"{round((present_days / total_days * 100) if total_days > 0 else 0, 2)}%"
            ]
        ]
        
        summary_table = Table(summary_data)
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 20))
        
        # Work Hours Summary
        work_hours_title = Paragraph("Ringkasan Jam Kerja", styles['Heading2'])
        elements.append(work_hours_title)
        elements.append(Spacer(1, 10))
        
        work_hours_data = [
            ['Total Jam Kerja', 'Total Keterlambatan', 'Rata-rata Jam Kerja/Hari'],
            [
                format_work_hours(total_work_minutes),
                format_work_hours(total_late_minutes),
                format_work_hours(total_work_minutes / present_days) if present_days > 0 else '0m'
            ]
        ]
        
        work_hours_table = Table(work_hours_data)
        work_hours_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(work_hours_table)
        elements.append(Spacer(1, 20))
        
        # Detailed Records
        if attendances.exists():
            records_title = Paragraph("Detail Absensi", styles['Heading2'])
            elements.append(records_title)
            elements.append(Spacer(1, 10))
            
            # Prepare table data
            table_data = [['Tanggal', 'Status', 'Check-in', 'Check-out', 'Terlambat', 'Jam Kerja']]
            
            for att in attendances[:50]:  # Limit to 50 records to avoid PDF too large
                # Determine status
                if att.is_holiday:
                    status = 'Hari Libur'
                elif att.minutes_late > 0:
                    status = f'Terlambat {att.minutes_late}m'
                elif att.check_in_at_utc and att.check_out_at_utc:
                    status = 'Hadir Lengkap'
                elif att.check_in_at_utc:
                    status = 'Hanya Check-in'
                else:
                    status = 'Tidak Hadir'
                
                # Format times with timezone conversion
                if att.check_in_at_utc:
                    # Convert UTC to work timezone
                    check_in_utc = att.check_in_at_utc.replace(tzinfo=pytz.UTC)
                    check_in_local = check_in_utc.astimezone(work_tz)
                    check_in = check_in_local.strftime('%H:%M')
                else:
                    check_in = '-'
                
                if att.check_out_at_utc:
                    # Convert UTC to work timezone
                    check_out_utc = att.check_out_at_utc.replace(tzinfo=pytz.UTC)
                    check_out_local = check_out_utc.astimezone(work_tz)
                    check_out = check_out_local.strftime('%H:%M')
                else:
                    check_out = '-'
                
                # Format work hours
                work_hours = format_work_hours(att.total_work_minutes)
                
                table_data.append([
                    att.date_local.strftime('%d/%m/%Y'),
                    status,
                    check_in,
                    check_out,
                    f"{att.minutes_late}m" if att.minutes_late > 0 else '-',
                    work_hours
                ])
            
            # Create table with auto-width and text wrapping
            records_table = Table(table_data, repeatRows=1)
            records_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('WORDWRAP', (0, 0), (-1, -1), 'CJK'),  # Enable text wrapping
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(records_table)
            
            if attendances.count() > 50:
                elements.append(Spacer(1, 10))
                note = Paragraph(f"<i>Catatan: Ditampilkan 50 record terbaru dari total {attendances.count()} record</i>", styles['Normal'])
                elements.append(note)
        
        # Footer - Use work timezone
        elements.append(Spacer(1, 30))
        current_time = datetime.now(work_tz)
        footer = Paragraph(f"<i>Dibuat pada: {current_time.strftime('%d/%m/%Y %H:%M:%S')}</i>", styles['Normal'])
        elements.append(footer)
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        # Create response
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="attendance-report-{current_time.strftime("%Y%m%d-%H%M%S")}.pdf"'
        
        return response


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
    
    @action(detail=False, methods=['get'])
    def team_attendance(self, request):
        """Get team attendance summary for supervisor"""
        from apps.employees.models import Employee
        from django.db.models import Count, Avg, Sum, Q
        from datetime import date, timedelta
        
        # Get query parameters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        employee_id = request.query_params.get('employee_id')
        
        # Set default date range if not provided
        if not end_date:
            end_date = date.today()
        else:
            end_date = date.fromisoformat(end_date)
            
        if not start_date:
            start_date = end_date - timedelta(days=30)
        else:
            start_date = date.fromisoformat(start_date)
        
        # Get supervisor's division
        if not hasattr(request.user, 'employee_profile') or not request.user.employee_profile.division:
            return Response({"error": "Supervisor harus memiliki divisi yang ditugaskan"}, status=400)
        
        division = request.user.employee_profile.division
        
        # Get employees in supervisor's division
        employees_qs = Employee.objects.filter(division=division).select_related('user', 'division', 'position')
        
        # Filter by specific employee if requested
        if employee_id:
            employees_qs = employees_qs.filter(id=employee_id)
        
        team_attendance_data = []
        
        for employee in employees_qs:
            # Get attendance records for this employee in the date range
            attendances = Attendance.objects.filter(
                employee=employee,
                date_local__range=[start_date, end_date]
            ).order_by('-date_local')
            
            # Calculate summary statistics
            total_days = attendances.count()
            present_days = attendances.filter(check_in_at_utc__isnull=False).count()
            late_days = attendances.filter(minutes_late__gt=0).count()
            absent_days = total_days - present_days
            attendance_rate = (present_days / total_days * 100) if total_days > 0 else 0
            
            # Get recent attendance records (last 10)
            recent_attendance = attendances[:10].values(
                'id', 'date_local', 'check_in_at_utc', 'check_out_at_utc',
                'minutes_late', 'total_work_minutes', 'is_holiday',
                'within_geofence', 'note', 'employee_note'
            )
            
            team_attendance_data.append({
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
                        'id': employee.division.id,
                        'name': employee.division.name,
                    } if employee.division else None,
                    'position': {
                        'id': employee.position.id,
                        'name': employee.position.name,
                    } if employee.position else None,
                },
                'summary': {
                    'total_days': total_days,
                    'present_days': present_days,
                    'late_days': late_days,
                    'absent_days': absent_days,
                    'attendance_rate': round(attendance_rate, 2),
                },
                'recent_attendance': list(recent_attendance),
            })
        
        return Response({
            'team_attendance': team_attendance_data,
            'filters': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'employee_id': employee_id,
                'division_id': division.id,
            }
        })
    
    @action(detail=False, methods=['get'])
    def team_attendance_pdf(self, request):
        """Generate PDF report for supervisor team attendance"""
        from apps.employees.models import Employee
        from apps.settings.models import WorkSettings
        from django.db.models import Count, Avg, Sum, Q
        from datetime import date, timedelta
        import pytz
        
        # Get query parameters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        employee_id = request.query_params.get('employee_id')
        
        # Set default date range if not provided
        if not end_date:
            end_date = date.today()
        else:
            end_date = date.fromisoformat(end_date)
            
        if not start_date:
            start_date = end_date - timedelta(days=30)
        else:
            start_date = date.fromisoformat(start_date)
        
        # Get supervisor's division
        if not hasattr(request.user, 'employee_profile') or not request.user.employee_profile.division:
            return Response({"error": "Supervisor harus memiliki divisi yang ditugaskan"}, status=400)
        
        division = request.user.employee_profile.division
        
        # Get employees in supervisor's division
        employees_qs = Employee.objects.filter(division=division).select_related('user', 'division', 'position')
        
        # Filter by specific employee if requested
        if employee_id:
            employees_qs = employees_qs.filter(id=employee_id)
        
        # Get work settings for timezone
        work_settings = WorkSettings.objects.first()
        if work_settings and work_settings.timezone:
            try:
                work_tz = pytz.timezone(work_settings.timezone)
            except pytz.exceptions.UnknownTimeZoneError:
                work_tz = pytz.UTC
        else:
            work_tz = pytz.UTC
        
        # Create PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(A4))
        elements = []
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        
        # Title
        title = Paragraph("Laporan Absensi Tim", title_style)
        elements.append(title)
        
        # Supervisor Info - Use employee profile fullname if available
        supervisor_name = request.user.employee_profile.fullname if hasattr(request.user, 'employee_profile') and request.user.employee_profile.fullname else f"{request.user.first_name} {request.user.last_name}".strip()
        if not supervisor_name:
            supervisor_name = request.user.username
        
        supervisor_info = f"""
        <b>Supervisor:</b> {supervisor_name}<br/>
        <b>Divisi:</b> {division.name}<br/>
        <b>Periode:</b> {start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}<br/>
        <b>Total Anggota Tim:</b> {employees_qs.count()}
        """
        
        supervisor_para = Paragraph(supervisor_info, styles['Normal'])
        elements.append(supervisor_para)
        elements.append(Spacer(1, 20))
        
        # Team Summary Statistics
        team_attendance_data = []
        total_team_days = 0
        total_team_present = 0
        total_team_late = 0
        
        for employee in employees_qs:
            # Get attendance records for this employee in the date range
            attendances = Attendance.objects.filter(
                employee=employee,
                date_local__range=[start_date, end_date]
            ).order_by('-date_local')
            
            # Calculate summary statistics
            total_days = attendances.count()
            present_days = attendances.filter(check_in_at_utc__isnull=False).count()
            late_days = attendances.filter(minutes_late__gt=0).count()
            absent_days = total_days - present_days
            attendance_rate = (present_days / total_days * 100) if total_days > 0 else 0
            
            team_attendance_data.append({
                'employee': employee,
                'total_days': total_days,
                'present_days': present_days,
                'late_days': late_days,
                'absent_days': absent_days,
                'attendance_rate': attendance_rate,
            })
            
            total_team_days += total_days
            total_team_present += present_days
            total_team_late += late_days
        
        # Team Summary
        summary_title = Paragraph("Ringkasan Tim", styles['Heading2'])
        elements.append(summary_title)
        elements.append(Spacer(1, 10))
        
        team_summary_data = [
            ['Total Hari', 'Total Hadir', 'Total Terlambat', 'Rata-rata Kehadiran (%)'],
            [
                str(total_team_days),
                str(total_team_present),
                str(total_team_late),
                f"{round((total_team_present / total_team_days * 100) if total_team_days > 0 else 0, 2)}%"
            ]
        ]
        
        team_summary_table = Table(team_summary_data)
        team_summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(team_summary_table)
        elements.append(Spacer(1, 20))
        
        # Individual Employee Details
        if team_attendance_data:
            details_title = Paragraph("Detail Per Anggota Tim", styles['Heading2'])
            elements.append(details_title)
            elements.append(Spacer(1, 10))
            
            # Prepare table data
            table_data = [['Nama', 'Total Hari', 'Hadir', 'Terlambat', 'Tidak Hadir', 'Rate (%)']]
            
            for data in team_attendance_data:
                employee = data['employee']
                table_data.append([
                    employee.fullname,
                    str(data['total_days']),
                    str(data['present_days']),
                    str(data['late_days']),
                    str(data['absent_days']),
                    f"{round(data['attendance_rate'], 2)}%"
                ])
            
            # Create table with auto-width and text wrapping
            details_table = Table(table_data, repeatRows=1)
            details_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('WORDWRAP', (0, 0), (-1, -1), 'CJK'),  # Enable text wrapping
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(details_table)
        
        # Footer - Use work timezone
        elements.append(Spacer(1, 30))
        current_time = datetime.now(work_tz)
        footer = Paragraph(f"<i>Dibuat pada: {current_time.strftime('%d/%m/%Y %H:%M:%S')}</i>", styles['Normal'])
        elements.append(footer)
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        # Create response
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="supervisor-team-attendance-{current_time.strftime("%Y%m%d-%H%M%S")}.pdf"'
        
        return response


class EmployeeAttendanceViewSet(AttendanceViewSet):
    """Employee-specific attendance ViewSet"""
    permission_classes = [IsEmployee]
    
    def get_queryset(self):
        # Employees can only see their own attendances
        return Attendance.objects.filter(user=self.request.user)


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
