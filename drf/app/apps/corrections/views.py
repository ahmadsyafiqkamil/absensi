from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import AttendanceCorrection
from .serializers import (
    AttendanceCorrectionSerializer, AttendanceCorrectionAdminSerializer,
    AttendanceCorrectionSupervisorSerializer, AttendanceCorrectionEmployeeSerializer,
    AttendanceCorrectionCreateUpdateSerializer, AttendanceCorrectionApprovalSerializer,
    AttendanceCorrectionListSerializer
)
from apps.core.permissions import IsAdmin, IsSupervisor, IsEmployee


class AttendanceCorrectionViewSet(viewsets.ModelViewSet):
    """Attendance correction management ViewSet with role-based access"""
    serializer_class = AttendanceCorrectionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return AttendanceCorrectionAdminSerializer
        elif self.request.user.groups.filter(name='supervisor').exists():
            return AttendanceCorrectionSupervisorSerializer
        else:
            return AttendanceCorrectionEmployeeSerializer
    
    def get_queryset(self):
        """Filter corrections based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return AttendanceCorrection.objects.all()
        elif self.request.user.groups.filter(name='supervisor').exists():
            # Supervisors can see corrections of employees in their division
            if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.division:
                return AttendanceCorrection.objects.filter(
                    employee__division=self.request.user.employee_profile.division
                )
            return AttendanceCorrection.objects.none()
        else:
            # Regular employees can only see their own corrections
            return AttendanceCorrection.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Set user when creating correction"""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve or reject a correction request"""
        if not (request.user.is_superuser or 
                request.user.groups.filter(name__in=['admin', 'supervisor']).exists()):
            return Response(
                {"error": "Only admins and supervisors can approve corrections"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        correction = self.get_object()
        serializer = AttendanceCorrectionApprovalSerializer(data=request.data)
        
        if serializer.is_valid():
            action = serializer.validated_data['action']
            reason = serializer.validated_data.get('reason', '')
            
            if action == 'approve':
                correction.approve(request.user)
                return Response(
                    {"message": "Correction approved successfully"}, 
                    status=status.HTTP_200_OK
                )
            elif action == 'reject':
                correction.reject(request.user, reason)
                return Response(
                    {"message": "Correction rejected successfully"}, 
                    status=status.HTTP_200_OK
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending corrections for approval"""
        if not (request.user.is_superuser or 
                request.user.groups.filter(name__in=['admin', 'supervisor']).exists()):
            return Response(
                {"error": "Only admins and supervisors can view pending corrections"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.get_queryset().filter(status='pending')
        serializer = AttendanceCorrectionListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_corrections(self, request):
        """Get current user's correction requests"""
        queryset = AttendanceCorrection.objects.filter(user=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_status(self, request):
        """Get corrections filtered by status"""
        status_filter = request.query_params.get('status', '')
        if status_filter:
            queryset = self.get_queryset().filter(status=status_filter)
        else:
            queryset = self.get_queryset()
        
        serializer = AttendanceCorrectionListSerializer(queryset, many=True)
        return Response(serializer.data)


# Role-specific ViewSets for backward compatibility
class AdminAttendanceCorrectionViewSet(AttendanceCorrectionViewSet):
    """Admin-specific attendance correction ViewSet"""
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        return AttendanceCorrection.objects.all()


class SupervisorAttendanceCorrectionViewSet(AttendanceCorrectionViewSet):
    """Supervisor-specific attendance correction ViewSet"""
    permission_classes = [IsSupervisor]
    
    def get_queryset(self):
        # Supervisors can see corrections of employees in their division
        if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.division:
            return AttendanceCorrection.objects.filter(
                employee__division=self.request.user.employee_profile.division
            )
        return AttendanceCorrection.objects.none()


class EmployeeAttendanceCorrectionViewSet(AttendanceCorrectionViewSet):
    """Employee-specific attendance correction ViewSet"""
    permission_classes = [IsEmployee]
    
    def get_queryset(self):
        # Employees can only see their own corrections
        return AttendanceCorrection.objects.filter(user=self.request.user)
