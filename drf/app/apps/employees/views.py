from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import Group
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from datetime import date
from .models import Division, Position, Employee, EmployeePosition
from .serializers import (
    DivisionSerializer, PositionSerializer, EmployeeSerializer,
    EmployeeAdminSerializer, EmployeeSupervisorSerializer, EmployeeEmployeeSerializer,
    DivisionCreateUpdateSerializer, PositionCreateUpdateSerializer, EmployeeCreateUpdateSerializer,
    EmployeePositionSerializer, EmployeePositionCreateUpdateSerializer,
    PositionAssignmentSerializer, BulkPositionAssignmentSerializer, SetPrimaryPositionSerializer
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
        """Get current user's position information (legacy endpoint)"""
        try:
            employee = request.user.employee_profile
            primary_position = employee.get_primary_position()
            if primary_position:
                serializer = PositionSerializer(primary_position)
                return Response(serializer.data)
            else:
                return Response(
                    {"error": "No primary position assigned"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        except Employee.DoesNotExist:
            return Response(
                {"error": "Employee profile not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def my_positions(self, request):
        """Get current user's all position information"""
        try:
            employee = request.user.employee_profile
            active_assignments = employee.get_active_position_assignments()
            serializer = EmployeePositionSerializer(active_assignments, many=True)
            return Response(serializer.data)
        except Employee.DoesNotExist:
            return Response(
                {"error": "Employee profile not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def my_approval_capabilities(self, request):
        """Get current user's approval capabilities"""
        try:
            employee = request.user.employee_profile
            capabilities = employee.get_approval_capabilities()
            return Response(capabilities)
        except Employee.DoesNotExist:
            return Response(
                {"error": "Employee profile not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def available_contexts(self, request):
        """Get available position contexts for switching"""
        try:
            employee = request.user.employee_profile
            contexts = employee.get_available_position_contexts()
            return Response(contexts)
        except Employee.DoesNotExist:
            return Response(
                {"error": "Employee profile not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def current_context(self, request):
        """Get current position context and capabilities"""
        try:
            employee = request.user.employee_profile
            context_capabilities = employee.get_current_context_capabilities()
            current_assignment = employee.get_current_active_position()
            
            response_data = {
                **context_capabilities,
                'current_assignment': {
                    'id': current_assignment.id,
                    'position': {
                        'id': current_assignment.position.id,
                        'name': current_assignment.position.name,
                        'approval_level': current_assignment.position.approval_level,
                        'can_approve_overtime_org_wide': current_assignment.position.can_approve_overtime_org_wide
                    },
                    'is_primary': current_assignment.is_primary
                } if current_assignment else None
            }
            
            return Response(response_data)
        except Employee.DoesNotExist:
            return Response(
                {"error": "Employee profile not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'])
    def switch_position(self, request):
        """Switch to a specific position context"""
        try:
            
            employee = request.user.employee_profile
            assignment_id = request.data.get('assignment_id')
            
            if assignment_id is None:
                # Reset to primary context
                employee.reset_to_primary_context()
                return Response({
                    "success": True,
                    "message": "Switched to primary position context",
                    "context": employee.get_current_context_capabilities()
                }, status=status.HTTP_200_OK)
            else:
                # Switch to specific assignment
                result = employee.switch_to_position(assignment_id)
                
                if result['success']:
                    return Response(result, status=status.HTTP_200_OK)
                else:
                    return Response(result, status=status.HTTP_400_BAD_REQUEST)
                
        except Employee.DoesNotExist:
            return Response(
                {"error": "Employee profile not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )


class EmployeePositionViewSet(viewsets.ModelViewSet):
    """Employee Position assignment management ViewSet"""
    queryset = EmployeePosition.objects.all()
    serializer_class = EmployeePositionSerializer
    permission_classes = [IsAdmin]  # Only admins can manage position assignments by default
    
    def get_queryset(self):
        """Filter position assignments based on user role"""
        queryset = EmployeePosition.objects.select_related('employee', 'position', 'assigned_by')
        
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return queryset
        elif self.request.user.groups.filter(name='supervisor').exists():
            # Supervisors can see assignments in their division
            if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.division:
                return queryset.filter(employee__division=self.request.user.employee_profile.division)
            return queryset.none()
        else:
            # Regular employees can only see their own assignments
            return queryset.filter(employee__user=self.request.user)
    
    def get_serializer_class(self):
        """Use appropriate serializer based on action"""
        if self.action in ['create', 'update', 'partial_update']:
            return EmployeePositionCreateUpdateSerializer
        return EmployeePositionSerializer
    
    def perform_create(self, serializer):
        """Set assigned_by to current user when creating"""
        serializer.save(assigned_by=self.request.user)
    
    def perform_update(self, serializer):
        """Set assigned_by to current user when updating"""
        serializer.save(assigned_by=self.request.user)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    def assign_position(self, request):
        """Assign a position to an employee"""
        serializer = PositionAssignmentSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            
            try:
                employee = Employee.objects.get(id=data['employee_id'])
                position = Position.objects.get(id=data['position_id'])
                
                # Use the employee's assign_position method
                assignment = employee.assign_position(
                    position=position,
                    is_primary=data.get('is_primary', False),
                    assigned_by=request.user,
                    effective_from=data.get('effective_from'),
                    effective_until=data.get('effective_until'),
                    notes=data.get('assignment_notes', '')
                )
                
                response_serializer = EmployeePositionSerializer(assignment)
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
                
            except (Employee.DoesNotExist, Position.DoesNotExist) as e:
                return Response(
                    {"error": str(e)}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    def bulk_assign(self, request):
        """Bulk assign a position to multiple employees"""
        serializer = BulkPositionAssignmentSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            
            try:
                with transaction.atomic():
                    position = Position.objects.get(id=data['position_id'])
                    employees = Employee.objects.filter(id__in=data['employee_ids'])
                    
                    assignments = []
                    for employee in employees:
                        assignment = employee.assign_position(
                            position=position,
                            is_primary=data.get('is_primary', False),
                            assigned_by=request.user,
                            effective_from=data.get('effective_from'),
                            effective_until=data.get('effective_until'),
                            notes=data.get('assignment_notes', '')
                        )
                        assignments.append(assignment)
                    
                    response_serializer = EmployeePositionSerializer(assignments, many=True)
                    return Response(response_serializer.data, status=status.HTTP_201_CREATED)
                    
            except Position.DoesNotExist:
                return Response(
                    {"error": "Position not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    def set_primary(self, request):
        """Set a position as primary for an employee"""
        serializer = SetPrimaryPositionSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            
            try:
                employee = Employee.objects.get(id=data['employee_id'])
                position = Position.objects.get(id=data['position_id'])
                
                assignment = employee.set_primary_position(position)
                if assignment:
                    response_serializer = EmployeePositionSerializer(assignment)
                    return Response(response_serializer.data, status=status.HTTP_200_OK)
                else:
                    return Response(
                        {"error": "Employee does not have this position assigned"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
            except (Employee.DoesNotExist, Position.DoesNotExist) as e:
                return Response(
                    {"error": str(e)}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def deactivate(self, request, pk=None):
        """Deactivate a position assignment"""
        try:
            assignment = self.get_object()
            assignment.is_active = False
            assignment.save()
            
            serializer = self.get_serializer(assignment)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except EmployeePosition.DoesNotExist:
            return Response(
                {"error": "Assignment not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def activate(self, request, pk=None):
        """Activate a position assignment"""
        try:
            assignment = self.get_object()
            assignment.is_active = True
            assignment.save()
            
            serializer = self.get_serializer(assignment)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except EmployeePosition.DoesNotExist:
            return Response(
                {"error": "Assignment not found"}, 
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
    
    def get_serializer_context(self):
        """Add request context to serializer"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


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


class EmployeePositionReadOnlyViewSet(viewsets.ReadOnlyModelViewSet):
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
