from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Main corrections router
router = DefaultRouter()
router.register(r'corrections', views.AttendanceCorrectionViewSet, basename='correction')

# Admin-specific router
admin_router = DefaultRouter()
admin_router.register(r'corrections', views.AdminAttendanceCorrectionViewSet, basename='admin-correction')

# Supervisor-specific router
supervisor_router = DefaultRouter()
supervisor_router.register(r'corrections', views.SupervisorAttendanceCorrectionViewSet, basename='supervisor-correction')

# Employee-specific router
employee_router = DefaultRouter()
employee_router.register(r'corrections', views.EmployeeAttendanceCorrectionViewSet, basename='employee-correction')

urlpatterns = [
    # Main endpoints
    path('', include(router.urls)),
    
    # Role-specific endpoints
    path('admin/', include((admin_router.urls, 'admin'), namespace='corrections-admin')),
    path('supervisor/', include((supervisor_router.urls, 'supervisor'), namespace='corrections-supervisor')),
    path('employee/', include((employee_router.urls, 'employee'), namespace='corrections-employee')),
]
