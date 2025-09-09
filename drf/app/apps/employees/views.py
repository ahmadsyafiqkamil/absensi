from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import Group
from .models import Division, Position, Employee
from .serializers import (
    DivisionSerializer, PositionSerializer, EmployeeSerializer,
    EmployeeAdminSerializer, EmployeeSupervisorSerializer, EmployeeEmployeeSerializer,
    DivisionCreateUpdateSerializer, PositionCreateUpdateSerializer, EmployeeCreateUpdateSerializer
)
from apps.core.permissions import IsAdmin, IsSupervisor, IsEmployee, IsAdminOrReadOnly


class DivisionViewSet(viewsets.ModelViewSet):
    """Division management ViewSet"""
    queryset = Division.objects.all()
    serializer_class = DivisionSerializer
    permission_classes = [permissions.AllowAny]  # Allow read access for testing
    
    def get_queryset(self):
        """Filter divisions based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return Division.objects.all()
        
        # For other users, return divisions they have access to
        if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.division:
            return Division.objects.filter(id=self.request.user.employee_profile.division.id)
        
        # For anonymous users or users without specific access, return all divisions (read-only)
        return Division.objects.all()
    
    def get_serializer_class(self):
        """Use appropriate serializer based on action"""
        if self.action in ['create', 'update', 'partial_update']:
            return DivisionCreateUpdateSerializer
        return DivisionSerializer


class PositionViewSet(viewsets.ModelViewSet):
    """Position management ViewSet"""
    queryset = Position.objects.all()
    serializer_class = PositionSerializer
    permission_classes = [IsAdminOrReadOnly]
    
    def get_queryset(self):
        """Filter positions based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return Position.objects.all()
        
        # For other users, return positions they have access to
        if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.position:
            return Position.objects.filter(id=self.request.user.employee_profile.position.id)
        
        return Position.objects.none()
    
    def get_serializer_class(self):
        """Use appropriate serializer based on action"""
        if self.action in ['create', 'update', 'partial_update']:
            return PositionCreateUpdateSerializer
        return PositionSerializer


class EmployeeViewSet(viewsets.ModelViewSet):
    """Employee management ViewSet with role-based access"""
    queryset = Employee.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            if self.action in ['create', 'update', 'partial_update']:
                return EmployeeCreateUpdateSerializer
            return EmployeeAdminSerializer
        elif self.request.user.groups.filter(name='supervisor').exists():
            return EmployeeSupervisorSerializer
        else:
            return EmployeeEmployeeSerializer
    
    def get_queryset(self):
        """Filter employees based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return Employee.objects.all()
        elif self.request.user.groups.filter(name='supervisor').exists():
            # Supervisors can see employees in their division
            if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.division:
                return Employee.objects.filter(division=self.request.user.employee_profile.division)
            return Employee.objects.none()
        else:
            # Regular employees can only see themselves
            return Employee.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user's employee profile"""
        try:
            # Use the filtered queryset to respect permissions, then filter for current user
            queryset = self.get_queryset()
            employee = queryset.select_related('user', 'division', 'position').get(user=request.user)

            serializer = self.get_serializer(employee)
            return Response(serializer.data)
        except Employee.DoesNotExist:
            return Response(
                {"error": "Employee profile not found"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def my_division(self, request):
        """Get current user's division information"""
        try:
            employee = request.user.employee_profile
            if employee.division:
                serializer = DivisionSerializer(employee.division)
                return Response(serializer.data)
            else:
                return Response(
                    {"error": "No division assigned"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        except Employee.DoesNotExist:
            return Response(
                {"error": "Employee profile not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def my_position(self, request):
        """Get current user's position information"""
        try:
            employee = request.user.employee_profile
            if employee.position:
                serializer = PositionSerializer(employee.position)
                return Response(serializer.data)
            else:
                return Response(
                    {"error": "No position assigned"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        except Employee.DoesNotExist:
            return Response(
                {"error": "Employee profile not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )


# Role-specific ViewSets for backward compatibility
class AdminDivisionViewSet(DivisionViewSet):
    """Admin-specific division ViewSet"""
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        return Division.objects.all()


class AdminPositionViewSet(PositionViewSet):
    """Admin-specific position ViewSet"""
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        return Position.objects.all()


class AdminEmployeeViewSet(EmployeeViewSet):
    """Admin-specific employee ViewSet"""
    permission_classes = [IsAdmin]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return EmployeeCreateUpdateSerializer
        return EmployeeAdminSerializer
    
    def get_queryset(self):
        return Employee.objects.all()


class SupervisorDivisionViewSet(viewsets.ReadOnlyModelViewSet):
    """Supervisor-specific division ViewSet (read-only)"""
    queryset = Division.objects.all()
    serializer_class = DivisionSerializer
    permission_classes = [IsSupervisor]
    
    def get_queryset(self):
        # Supervisors can see their own division
        if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.division:
            return Division.objects.filter(id=self.request.user.employee_profile.division.id)
        return Division.objects.none()


class SupervisorPositionViewSet(viewsets.ReadOnlyModelViewSet):
    """Supervisor-specific position ViewSet (read-only)"""
    queryset = Position.objects.all()
    serializer_class = PositionSerializer
    permission_classes = [IsSupervisor]
    
    def get_queryset(self):
        # Supervisors can see their own position
        if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.position:
            return Position.objects.filter(id=self.request.user.employee_profile.position.id)
        return Position.objects.none()


class SupervisorEmployeeViewSet(viewsets.ReadOnlyModelViewSet):
    """Supervisor-specific employee ViewSet (read-only)"""
    serializer_class = EmployeeSupervisorSerializer
    permission_classes = [IsSupervisor]
    
    def get_queryset(self):
        # Supervisors can see employees in their division
        if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.division:
            return Employee.objects.filter(division=self.request.user.employee_profile.division)
        return Employee.objects.none()


class EmployeeDivisionViewSet(viewsets.ReadOnlyModelViewSet):
    """Employee-specific division ViewSet (read-only)"""
    serializer_class = DivisionSerializer
    permission_classes = [IsEmployee]
    
    def get_queryset(self):
        # Employees can only see their own division
        if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.division:
            return Division.objects.filter(id=self.request.user.employee_profile.division.id)
        return Division.objects.none()


class EmployeePositionViewSet(viewsets.ReadOnlyModelViewSet):
    """Employee-specific position ViewSet (read-only)"""
    serializer_class = PositionSerializer
    permission_classes = [IsEmployee]
    
    def get_queryset(self):
        # Employees can only see their own position
        if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.position:
            return Position.objects.filter(id=self.request.user.employee_profile.position.id)
        return Position.objects.none()


class EmployeeEmployeeViewSet(viewsets.ReadOnlyModelViewSet):
    """Employee-specific employee ViewSet (read-only)"""
    serializer_class = EmployeeEmployeeSerializer
    permission_classes = [IsEmployee]
    
    def get_queryset(self):
        # Employees can only see themselves
        return Employee.objects.filter(user=self.request.user)
