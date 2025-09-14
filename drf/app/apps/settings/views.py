from rest_framework import viewsets, permissions, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import WorkSettings, Holiday
from .serializers import (
    WorkSettingsSerializer, WorkSettingsAdminSerializer, WorkSettingsSupervisorSerializer,
    WorkSettingsEmployeeSerializer, WorkSettingsCreateUpdateSerializer,
    HolidaySerializer, HolidayAdminSerializer, HolidayPublicSerializer
)
from apps.core.permissions import IsAdmin, IsSupervisor, IsEmployee, IsAdminOrReadOnly


class WorkSettingsViewSet(viewsets.GenericViewSet):
    """Work settings ViewSet (singleton pattern)"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            if self.action in ['create', 'update', 'partial_update']:
                return WorkSettingsCreateUpdateSerializer
            return WorkSettingsAdminSerializer
        elif self.request.user.groups.filter(name='supervisor').exists():
            return WorkSettingsSupervisorSerializer
        else:
            return WorkSettingsEmployeeSerializer
    
    def get_object(self):
        """Get the single WorkSettings instance"""
        return WorkSettings.objects.first()
    
    def list(self, request):
        """Get work settings (always returns single instance)"""
        settings = self.get_object()
        if not settings:
            return Response(
                {"error": "Work settings not configured"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(settings)
        return Response(serializer.data)
    
    def retrieve(self, request, pk=None):
        """Get work settings by ID (always returns single instance)"""
        return self.list(request)
    
    def create(self, request):
        """Create work settings (only if none exist)"""
        if WorkSettings.objects.exists():
            return Response(
                {"error": "Work settings already exist"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, pk=None):
        """Update work settings"""
        settings = self.get_object()
        if not settings:
            return Response(
                {"error": "Work settings not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(settings, data=request.data, partial=False)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def partial_update(self, request, pk=None):
        """Partially update work settings"""
        settings = self.get_object()
        if not settings:
            return Response(
                {"error": "Work settings not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current work settings"""
        settings = self.get_object()
        if not settings:
            return Response(
                {"error": "Work settings not configured"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(settings)
        return Response(serializer.data)


class HolidayViewSet(viewsets.ModelViewSet):
    """Holiday management ViewSet"""
    queryset = Holiday.objects.all()
    serializer_class = HolidaySerializer
    permission_classes = [IsAdminOrReadOnly]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return HolidayAdminSerializer
        else:
            return HolidayPublicSerializer
    
    def get_queryset(self):
        """Filter holidays based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return Holiday.objects.all()
        else:
            # Other users can see all holidays (read-only)
            return Holiday.objects.all()
    
    @action(detail=False, methods=['get'])
    def check_date(self, request):
        """Check if a specific date is a holiday"""
        date_str = request.query_params.get('date')
        if not date_str:
            return Response(
                {"error": "Date parameter is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from datetime import datetime
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
            is_holiday = Holiday.is_holiday_date(date)
            
            if is_holiday:
                holiday = Holiday.objects.get(date=date)
                serializer = self.get_serializer(holiday)
                return Response({
                    "is_holiday": True,
                    "holiday": serializer.data
                })
            else:
                return Response({
                    "is_holiday": False,
                    "holiday": None
                })
                
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# Role-specific ViewSets for backward compatibility
class AdminWorkSettingsViewSet(WorkSettingsViewSet):
    """Admin-specific work settings ViewSet"""
    permission_classes = [IsAdmin]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return WorkSettingsCreateUpdateSerializer
        return WorkSettingsAdminSerializer


class AdminHolidayViewSet(HolidayViewSet):
    """Admin-specific holiday ViewSet"""
    permission_classes = [IsAdmin]
    
    def get_serializer_class(self):
        return HolidayAdminSerializer


class SupervisorWorkSettingsViewSet(WorkSettingsViewSet):
    """Supervisor-specific work settings ViewSet (read-only)"""
    permission_classes = [IsSupervisor]
    
    def get_serializer_class(self):
        return WorkSettingsSupervisorSerializer


class SupervisorHolidayViewSet(viewsets.ReadOnlyModelViewSet):
    """Supervisor-specific holiday ViewSet (read-only)"""
    queryset = Holiday.objects.all()
    serializer_class = HolidayPublicSerializer
    permission_classes = [IsSupervisor]


class EmployeeHolidayViewSet(viewsets.ReadOnlyModelViewSet):
    """Employee-specific holiday ViewSet (read-only)"""
    queryset = Holiday.objects.all()
    serializer_class = HolidayPublicSerializer
    permission_classes = [IsEmployee]
