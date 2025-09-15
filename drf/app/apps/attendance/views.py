from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import date, timedelta
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
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
