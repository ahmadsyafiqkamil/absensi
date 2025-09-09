from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
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


# Overtime Request Views
class OvertimeRequestViewSet(viewsets.ModelViewSet):
    """Overtime request management ViewSet with role-based access"""
    serializer_class = OvertimeRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return OvertimeRequestAdminSerializer
        elif self.request.user.groups.filter(name='supervisor').exists():
            return OvertimeRequestSupervisorSerializer
        else:
            return OvertimeRequestEmployeeSerializer
    
    def get_queryset(self):
        """Filter overtime requests based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return OvertimeRequest.objects.all()
        elif self.request.user.groups.filter(name='supervisor').exists():
            # Supervisors can see overtime requests of employees in their division
            if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.division:
                return OvertimeRequest.objects.filter(
                    employee__division=self.request.user.employee_profile.division
                )
            return OvertimeRequest.objects.none()
        else:
            # Regular employees can only see their own overtime requests
            return OvertimeRequest.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Set user when creating overtime request"""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve, reject, or cancel an overtime request"""
        if not (request.user.is_superuser or 
                request.user.groups.filter(name__in=['admin', 'supervisor']).exists()):
            return Response(
                {"error": "Only admins and supervisors can approve overtime requests"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        overtime_request = self.get_object()
        serializer = OvertimeRequestApprovalSerializer(data=request.data)
        
        if serializer.is_valid():
            action = serializer.validated_data['action']
            reason = serializer.validated_data.get('reason', '')
            
            if action == 'approve':
                overtime_request.approve(request.user)
                return Response(
                    {"message": "Overtime request approved successfully"}, 
                    status=status.HTTP_200_OK
                )
            elif action == 'reject':
                overtime_request.reject(request.user, reason)
                return Response(
                    {"message": "Overtime request rejected successfully"}, 
                    status=status.HTTP_200_OK
                )
            elif action == 'cancel':
                overtime_request.cancel(request.user)
                return Response(
                    {"message": "Overtime request cancelled successfully"}, 
                    status=status.HTTP_200_OK
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
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
        if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.division:
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
