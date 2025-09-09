from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from .models import ReportTemplate, GeneratedReport, ReportSchedule, ReportAccessLog
from .serializers import (
    ReportTemplateSerializer, ReportTemplateAdminSerializer, ReportTemplateCreateUpdateSerializer,
    GeneratedReportSerializer, GeneratedReportAdminSerializer, GeneratedReportCreateSerializer,
    ReportScheduleSerializer, ReportScheduleAdminSerializer, ReportScheduleCreateUpdateSerializer,
    ReportAccessLogSerializer,
    AttendanceReportRequestSerializer, OvertimeReportRequestSerializer, SummaryReportRequestSerializer,
    ReportDownloadSerializer, ReportStatisticsSerializer
)
from .services import ReportGenerationService
from apps.core.permissions import IsAdmin, IsSupervisor, IsEmployee
from datetime import datetime, timedelta


# Report Template Views
class ReportTemplateViewSet(viewsets.ModelViewSet):
    """Report template management ViewSet with role-based access"""
    serializer_class = ReportTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return ReportTemplateAdminSerializer
        return ReportTemplateSerializer
    
    def get_queryset(self):
        """Filter templates based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return ReportTemplate.objects.all()
        else:
            # Regular users can only see active templates
            return ReportTemplate.objects.filter(is_active=True)
    
    def perform_create(self, serializer):
        """Set creator when creating template"""
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get templates filtered by type"""
        template_type = request.query_params.get('type', '')
        if template_type:
            queryset = self.get_queryset().filter(template_type=template_type)
        else:
            queryset = self.get_queryset()
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active templates"""
        queryset = self.get_queryset().filter(is_active=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# Generated Report Views
class GeneratedReportViewSet(viewsets.ModelViewSet):
    """Generated report management ViewSet with role-based access"""
    serializer_class = GeneratedReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return GeneratedReportAdminSerializer
        return GeneratedReportSerializer
    
    def get_queryset(self):
        """Filter reports based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return GeneratedReport.objects.all()
        elif self.request.user.groups.filter(name='supervisor').exists():
            # Supervisors can see reports of employees in their division
            if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.division:
                return GeneratedReport.objects.filter(
                    requested_by__employee_profile__division=self.request.user.employee_profile.division
                )
            return GeneratedReport.objects.none()
        else:
            # Regular employees can only see their own reports
            return GeneratedReport.objects.filter(requested_by=self.request.user)
    
    def perform_create(self, serializer):
        """Set requester when creating report"""
        serializer.save(requested_by=self.request.user)
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download generated report file"""
        report = self.get_object()
        
        if report.status != 'completed':
            return Response(
                {"error": "Report is not ready for download"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if report.is_expired:
            return Response(
                {"error": "Report has expired"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not report.output_file:
            return Response(
                {"error": "Report file not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Log download access
        ReportAccessLog.objects.create(
            report=report,
            user=request.user,
            action='downloaded',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            session_id=request.session.session_key or ''
        )
        
        # Return file response
        response = HttpResponse(report.output_file, content_type=report.mime_type)
        response['Content-Disposition'] = f'attachment; filename="{report.name}.{report.template.format if report.template else "pdf"}"'
        return response
    
    @action(detail=False, methods=['get'])
    def by_status(self, request):
        """Get reports filtered by status"""
        status_filter = request.query_params.get('status', '')
        if status_filter:
            queryset = self.get_queryset().filter(status=status_filter)
        else:
            queryset = self.get_queryset()
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get reports filtered by type"""
        report_type = request.query_params.get('type', '')
        if report_type:
            queryset = self.get_queryset().filter(report_type=report_type)
        else:
            queryset = self.get_queryset()
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_reports(self, request):
        """Get current user's reports"""
        queryset = GeneratedReport.objects.filter(requested_by=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# Report Schedule Views
class ReportScheduleViewSet(viewsets.ModelViewSet):
    """Report schedule management ViewSet with role-based access"""
    serializer_class = ReportScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return ReportScheduleAdminSerializer
        return ReportScheduleSerializer
    
    def get_queryset(self):
        """Filter schedules based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return ReportSchedule.objects.all()
        else:
            # Regular users can only see their own schedules
            return ReportSchedule.objects.filter(created_by=request.user)
    
    def perform_create(self, serializer):
        """Set creator when creating schedule"""
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active schedules"""
        queryset = self.get_queryset().filter(is_active=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_frequency(self, request):
        """Get schedules filtered by frequency"""
        frequency = request.query_params.get('frequency', '')
        if frequency:
            queryset = self.get_queryset().filter(frequency=frequency)
        else:
            queryset = self.get_queryset()
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# Report Generation Views
class ReportGenerationViewSet(viewsets.ViewSet):
    """Report generation ViewSet with role-based access"""
    permission_classes = [permissions.IsAuthenticated]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.report_service = ReportGenerationService()
    
    @action(detail=False, methods=['post'])
    def attendance(self, request):
        """Generate attendance report"""
        serializer = AttendanceReportRequestSerializer(data=request.data)
        if serializer.is_valid():
            parameters = serializer.validated_data
            result = self.report_service.generate_attendance_report(parameters, request.user)
            
            if result['success']:
                # Create report record
                report = GeneratedReport.objects.create(
                    name=f"Attendance Report {parameters['start_date']} - {parameters['end_date']}",
                    report_type='attendance',
                    parameters=parameters,
                    requested_by=request.user,
                    status='completed'
                )
                
                # Log access
                ReportAccessLog.objects.create(
                    report=report,
                    user=request.user,
                    action='viewed',
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    session_id=request.session.session_key or ''
                )
                
                return Response({
                    'success': True,
                    'report_id': report.id,
                    'data': result['data']
                })
            else:
                return Response({
                    'success': False,
                    'error': result['error']
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def overtime(self, request):
        """Generate overtime report"""
        serializer = OvertimeReportRequestSerializer(data=request.data)
        if serializer.is_valid():
            parameters = serializer.validated_data
            result = self.report_service.generate_overtime_report(parameters, request.user)
            
            if result['success']:
                # Create report record
                report = GeneratedReport.objects.create(
                    name=f"Overtime Report {parameters['start_date']} - {parameters['end_date']}",
                    report_type='overtime',
                    parameters=parameters,
                    requested_by=request.user,
                    status='completed'
                )
                
                # Log access
                ReportAccessLog.objects.create(
                    report=report,
                    user=request.user,
                    action='viewed',
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    session_id=request.session.session_key or ''
                )
                
                return Response({
                    'success': True,
                    'report_id': report.id,
                    'data': result['data']
                })
            else:
                return Response({
                    'success': False,
                    'error': result['error']
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def summary(self, request):
        """Generate summary report"""
        serializer = SummaryReportRequestSerializer(data=request.data)
        if serializer.is_valid():
            parameters = serializer.validated_data
            result = self.report_service.generate_summary_report(parameters, request.user)
            
            if result['success']:
                # Create report record
                month = parameters.get('month', 'current')
                year = parameters.get('year', 'current')
                report = GeneratedReport.objects.create(
                    name=f"Summary Report {month}/{year}",
                    report_type='summary',
                    parameters=parameters,
                    requested_by=request.user,
                    status='completed'
                )
                
                # Log access
                ReportAccessLog.objects.create(
                    report=report,
                    user=request.user,
                    action='viewed',
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    session_id=request.session.session_key or ''
                )
                
                return Response({
                    'success': True,
                    'report_id': report.id,
                    'data': result['data']
                })
            else:
                return Response({
                    'success': False,
                    'error': result['error']
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get reporting system statistics"""
        if not (request.user.is_superuser or 
                request.user.groups.filter(name='admin').exists()):
            return Response(
                {"error": "Only admins can view statistics"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Calculate statistics
        total_templates = ReportTemplate.objects.count()
        total_reports = GeneratedReport.objects.count()
        total_schedules = ReportSchedule.objects.count()
        
        reports_by_status = {}
        for status_choice in GeneratedReport.STATUS_CHOICES:
            reports_by_status[status_choice[0]] = GeneratedReport.objects.filter(
                status=status_choice[0]
            ).count()
        
        reports_by_type = {}
        for type_choice in GeneratedReport.REPORT_TYPE_CHOICES:
            reports_by_type[type_choice[0]] = GeneratedReport.objects.filter(
                report_type=type_choice[0]
            ).count()
        
        # Recent activity (last 10 actions)
        recent_activity = ReportAccessLog.objects.select_related(
            'user', 'report'
        ).order_by('-created_at')[:10]
        
        recent_activity_data = []
        for log in recent_activity:
            recent_activity_data.append({
                'user': log.user.username,
                'action': log.action,
                'report': log.report.name,
                'timestamp': log.created_at.isoformat()
            })
        
        statistics = {
            'total_templates': total_templates,
            'total_reports': total_reports,
            'total_schedules': total_schedules,
            'reports_by_status': reports_by_status,
            'reports_by_type': reports_by_type,
            'recent_activity': recent_activity_data
        }
        
        serializer = ReportStatisticsSerializer(statistics)
        return Response(serializer.data)


# Role-specific ViewSets for backward compatibility
class AdminReportTemplateViewSet(ReportTemplateViewSet):
    """Admin-specific report template ViewSet"""
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        return ReportTemplate.objects.all()


class AdminGeneratedReportViewSet(GeneratedReportViewSet):
    """Admin-specific generated report ViewSet"""
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        return GeneratedReport.objects.all()


class AdminReportScheduleViewSet(ReportScheduleViewSet):
    """Admin-specific report schedule ViewSet"""
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        return ReportSchedule.objects.all()
