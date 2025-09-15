from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from datetime import date
from .models import OvertimeRequest, MonthlySummaryRequest
from .serializers import (
    OvertimeRequestSerializer, OvertimeRequestAdminSerializer,
    OvertimeRequestSupervisorSerializer, OvertimeRequestEmployeeSerializer,
    OvertimeRequestCreateUpdateSerializer, OvertimeRequestApprovalSerializer,
    OvertimeRequestListSerializer,
    MonthlySummaryRequestSerializer, MonthlySummaryRequestAdminSerializer,
    MonthlySummaryRequestSupervisorSerializer, MonthlySummaryRequestEmployeeSerializer,
    MonthlySummaryRequestCreateUpdateSerializer, MonthlySummaryRequestApprovalSerializer,
    MonthlySummaryRequestListSerializer
)
from apps.core.permissions import IsAdmin, IsSupervisor, IsEmployee
from .services import OvertimeService


# Overtime Request Views
class OvertimeRequestViewSet(viewsets.ModelViewSet):
    """Overtime request management ViewSet with role-based access"""
    serializer_class = OvertimeRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'request_type', 'user', 'employee']
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'employee__name']
    ordering_fields = ['created_at', 'date', 'status']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on user role"""
        if self.action in ['create', 'update', 'partial_update']:
            return OvertimeRequestCreateUpdateSerializer
        elif self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return OvertimeRequestAdminSerializer
        elif self.request.user.groups.filter(name='supervisor').exists():
            return OvertimeRequestSupervisorSerializer
        else:
            return OvertimeRequestEmployeeSerializer
    
    def get_serializer_context(self):
        """Add request context to serializer"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_queryset(self):
        """Filter overtime requests based on user role and date range"""
        queryset = OvertimeRequest.objects.all()
        
        # Apply role-based filtering
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            queryset = queryset
        elif self.request.user.groups.filter(name='supervisor').exists():
            # Supervisors can see overtime requests of employees in their division
            # If they have org-wide approval, they can see all overtime requests
            if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.position:
                if self.request.user.employee_profile.position.can_approve_overtime_org_wide:
                    # Org-wide approval: can see all overtime requests
                    queryset = queryset
                elif self.request.user.employee_profile.division:
                    # Division-only approval: can see only their division's requests
                    queryset = queryset.filter(
                        employee__division=self.request.user.employee_profile.division
                    )
                else:
                    queryset = queryset.none()
            else:
                queryset = queryset.none()
        else:
            # Regular employees can only see their own overtime requests
            queryset = queryset.filter(user=self.request.user)
        
        # Apply date range filtering if start_date and end_date parameters are provided
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            try:
                start_date_obj = date.fromisoformat(start_date)
                queryset = queryset.filter(date__gte=start_date_obj)
            except ValueError:
                pass  # Invalid date format, ignore
        
        if end_date:
            try:
                end_date_obj = date.fromisoformat(end_date)
                queryset = queryset.filter(date__lte=end_date_obj)
            except ValueError:
                pass  # Invalid date format, ignore
        
        return queryset
    
    def perform_create(self, serializer):
        """Auto-set user when creating"""
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsSupervisor])
    def approve(self, request, pk=None):
        """Approve an overtime request (Level 1 or Final)"""
        try:
            overtime_request = self.get_object()
        except OvertimeRequest.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        supervisor = request.user
        approval_level = request.data.get('approval_level')

        if approval_level == 1:
            if overtime_request.status != 'pending':
                return Response({"detail": "Request is not pending approval."}, status=status.HTTP_400_BAD_REQUEST)
            
            overtime_request.status = 'level1_approved'
            overtime_request.level1_approved_by = supervisor
            overtime_request.level1_approved_at = timezone.now()
            overtime_request.save()
            
            serializer = self.get_serializer(overtime_request)
            return Response(serializer.data)

        elif approval_level == 2:
            if overtime_request.status not in ['pending', 'level1_approved']:
                return Response({"detail": "Request is not awaiting final approval."}, status=status.HTTP_400_BAD_REQUEST)
            
            overtime_request.status = 'approved'
            # If level 1 was skipped, fill it in too
            if not overtime_request.level1_approved_by:
                overtime_request.level1_approved_by = supervisor
                overtime_request.level1_approved_at = timezone.now()
            
            overtime_request.final_approved_by = supervisor
            overtime_request.final_approved_at = timezone.now()
            overtime_request.save()
            
            serializer = self.get_serializer(overtime_request)
            return Response(serializer.data)

        else:
            return Response({"detail": "Invalid or missing approval_level."}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[IsSupervisor])
    def reject(self, request, pk=None):
        """Reject an overtime request"""
        try:
            overtime_request = self.get_object()
        except OvertimeRequest.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        supervisor = request.user
        rejection_reason = request.data.get('rejection_reason', '')

        # Check if request can be rejected
        if overtime_request.status not in ['pending', 'level1_approved']:
            return Response({"detail": "Request cannot be rejected in current status."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Set rejection status and reason
        overtime_request.status = 'rejected'
        overtime_request.rejection_reason = rejection_reason
        overtime_request.save()
        
        serializer = self.get_serializer(overtime_request)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending overtime requests for approval"""
        if not (request.user.is_superuser or 
                request.user.groups.filter(name__in=['admin', 'supervisor']).exists()):
            return Response(
                {"error": "Only admins and supervisors can view pending overtime requests"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.get_queryset().filter(status='pending')
        serializer = OvertimeRequestListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_overtime(self, request):
        """Get current user's overtime requests"""
        queryset = OvertimeRequest.objects.filter(user=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_status(self, request):
        """Get overtime requests filtered by status"""
        status_filter = request.query_params.get('status', '')
        if status_filter:
            queryset = self.get_queryset().filter(status=status_filter)
        else:
            queryset = self.get_queryset()
        
        serializer = OvertimeRequestListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get overtime requests filtered by type"""
        request_type = request.query_params.get('type', '')
        if request_type:
            queryset = self.get_queryset().filter(request_type=request_type)
        else:
            queryset = self.get_queryset()
        
        serializer = OvertimeRequestListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def potential_overtime(self, request):
        """Get attendance records that could be submitted as overtime requests"""
        user = self.request.user
        
        # Only employees can view their potential overtime
        if not user.groups.filter(name='pegawai').exists():
            return Response(
                {"detail": "Hanya pegawai yang dapat melihat potensi lembur"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            employee = user.employee_profile
        except:
            return Response(
                {"detail": "User tidak memiliki profil employee"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get date range (default: last 30 days)
        from datetime import date, timedelta
        from apps.attendance.models import Attendance
        from apps.settings.models import WorkSettings
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            try:
                start_date = date.fromisoformat(start_date)
            except ValueError:
                return Response(
                    {"detail": "Format start_date tidak valid. Gunakan YYYY-MM-DD"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            start_date = date.today() - timedelta(days=30)
        
        if end_date:
            try:
                end_date = date.fromisoformat(end_date)
            except ValueError:
                return Response(
                    {"detail": "Format end_date tidak valid. Gunakan YYYY-MM-DD"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            end_date = date.today()
        
        # Get work settings
        try:
            ws = WorkSettings.objects.first()
        except:
            ws = None
        
        # Get overtime threshold (default: 30 minutes)
        overtime_threshold = int(ws.overtime_threshold_minutes or 30) if ws else 30
        
        # Get attendance records for the date range
        # Exclude records that already have overtime requests
        attendance_records = Attendance.objects.filter(
            user=user,
            date_local__gte=start_date,
            date_local__lte=end_date,
            check_in_at_utc__isnull=False,
            check_out_at_utc__isnull=False
        ).exclude(
            overtime_requests__isnull=False
        ).order_by('date_local')
        
        potential_records = []
        
        for att in attendance_records:
            # Determine required minutes based on day of week and settings
            if att.date_local.weekday() == 4:  # Friday
                required_minutes = int(ws.friday_required_minutes or 240) if ws else 240
            else:
                required_minutes = int(ws.required_minutes or 480) if ws else 480
            
            # Calculate potential overtime (total work - required - threshold)
            potential_overtime_minutes = att.total_work_minutes - required_minutes - overtime_threshold
            
            # Only include if there's potential overtime (worked more than required + threshold)
            if potential_overtime_minutes > 0:
                potential_overtime_hours = potential_overtime_minutes / 60
                
                # Calculate potential overtime amount
                potential_amount = 0
                if employee.gaji_pokok and ws:
                    monthly_hours = 22 * 8
                    hourly_wage = float(employee.gaji_pokok) / monthly_hours
                    
                    # Determine rate
                    if att.is_holiday:
                        rate = float(ws.overtime_rate_holiday or 0.75)
                    else:
                        rate = float(ws.overtime_rate_workday or 0.50)
                    
                    potential_amount = potential_overtime_hours * hourly_wage * rate
                
                # Format times
                check_in_time = None
                check_out_time = None
                
                if att.check_in_at_utc:
                    check_in_time = att.check_in_at_utc.strftime('%H:%M')
                if att.check_out_at_utc:
                    check_out_time = att.check_out_at_utc.strftime('%H:%M')
                
                potential_records.append({
                    'date_local': att.date_local.isoformat(),
                    'weekday': att.date_local.strftime('%A'),
                    'check_in_time': check_in_time,
                    'check_out_time': check_out_time,
                    'total_work_minutes': att.total_work_minutes,
                    'required_minutes': required_minutes,
                    'overtime_threshold_minutes': overtime_threshold,
                    'potential_overtime_minutes': potential_overtime_minutes,
                    'potential_overtime_hours': round(potential_overtime_hours, 2),
                    'potential_overtime_amount': round(potential_amount, 2),
                    'is_holiday': att.is_holiday,
                    'within_geofence': att.within_geofence,
                    'can_submit': True,  # All records here are eligible for submission
                })
        
        return Response({
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'overtime_threshold_minutes': overtime_threshold,
            'total_potential_records': len(potential_records),
            'total_potential_hours': sum(r['potential_overtime_hours'] for r in potential_records),
            'total_potential_amount': sum(r['potential_overtime_amount'] for r in potential_records),
            'potential_records': potential_records,
        })

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get overtime summary for current user"""
        # Get date range from query params
        end_date = date.today()
        start_date = end_date.replace(day=1)

        start_date_str = request.query_params.get('start_date', start_date.isoformat())
        end_date_str = request.query_params.get('end_date', end_date.isoformat())

        try:
            start_date = date.fromisoformat(start_date_str)
            end_date = date.fromisoformat(end_date_str)
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST
            )

        service = OvertimeService()
        result = service.get_overtime_summary(request.user, start_date, end_date)

        if result['success']:
            return Response(result['summary'])
        else:
            return Response(
                {"error": result['message']},
                status=status.HTTP_400_BAD_REQUEST
            )


# Monthly Summary Request Views
class MonthlySummaryRequestViewSet(viewsets.ModelViewSet):
    """Monthly summary request management ViewSet with role-based access"""
    serializer_class = MonthlySummaryRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return MonthlySummaryRequestAdminSerializer
        elif self.request.user.groups.filter(name='supervisor').exists():
            return MonthlySummaryRequestSupervisorSerializer
        else:
            return MonthlySummaryRequestEmployeeSerializer
    
    def get_queryset(self):
        """Filter monthly summary requests based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return MonthlySummaryRequest.objects.all()
        elif self.request.user.groups.filter(name='supervisor').exists():
            # Supervisors can see monthly summary requests of employees in their division
            if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.division:
                return MonthlySummaryRequest.objects.filter(
                    employee__division=self.request.user.employee_profile.division
                )
            return MonthlySummaryRequest.objects.none()
        else:
            # Regular employees can only see their own monthly summary requests
            return MonthlySummaryRequest.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Set user when creating monthly summary request"""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve or reject a monthly summary request"""
        if not (request.user.is_superuser or 
                request.user.groups.filter(name__in=['admin', 'supervisor']).exists()):
            return Response(
                {"error": "Only admins and supervisors can approve monthly summary requests"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        monthly_summary = self.get_object()
        serializer = MonthlySummaryRequestApprovalSerializer(data=request.data)
        
        if serializer.is_valid():
            action = serializer.validated_data['action']
            reason = serializer.validated_data.get('reason', '')
            
            if action == 'approve':
                monthly_summary.approve(request.user)
                return Response(
                    {"message": "Monthly summary request approved successfully"}, 
                    status=status.HTTP_200_OK
                )
            elif action == 'reject':
                monthly_summary.reject(request.user, reason)
                return Response(
                    {"message": "Monthly summary request rejected successfully"}, 
                    status=status.HTTP_200_OK
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending monthly summary requests for approval"""
        if not (request.user.is_superuser or 
                request.user.groups.filter(name__in=['admin', 'supervisor']).exists()):
            return Response(
                {"error": "Only admins and supervisors can view pending monthly summary requests"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.get_queryset().filter(status='pending')
        serializer = MonthlySummaryRequestListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_summaries(self, request):
        """Get current user's monthly summary requests"""
        queryset = MonthlySummaryRequest.objects.filter(user=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_month_year(self, request):
        """Get monthly summary requests filtered by month and year"""
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        
        queryset = self.get_queryset()
        if month:
            queryset = queryset.filter(month=month)
        if year:
            queryset = queryset.filter(year=year)
        
        serializer = MonthlySummaryRequestListSerializer(queryset, many=True)
        return Response(serializer.data)


# Role-specific ViewSets for backward compatibility
class AdminOvertimeRequestViewSet(OvertimeRequestViewSet):
    """Admin-specific overtime request ViewSet"""
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        return OvertimeRequest.objects.all()


class SupervisorOvertimeRequestViewSet(OvertimeRequestViewSet):
    """Supervisor-specific overtime request ViewSet"""
    permission_classes = [IsSupervisor]
    
    def get_queryset(self):
        # Supervisors can see overtime requests of employees in their division
        # If they have org-wide approval, they can see all overtime requests
        if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.position:
            if self.request.user.employee_profile.position.can_approve_overtime_org_wide:
                # Org-wide approval: can see all overtime requests
                return OvertimeRequest.objects.all()
            elif self.request.user.employee_profile.division:
                # Division-only approval: can see only their division's requests
                return OvertimeRequest.objects.filter(
                    employee__division=self.request.user.employee_profile.division
                )
        return OvertimeRequest.objects.none()


class EmployeeOvertimeRequestViewSet(OvertimeRequestViewSet):
    """Employee-specific overtime request ViewSet"""
    permission_classes = [IsEmployee]
    
    def get_queryset(self):
        # Employees can only see their own overtime requests
        return OvertimeRequest.objects.filter(user=self.request.user)
