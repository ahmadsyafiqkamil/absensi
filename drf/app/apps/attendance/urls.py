from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Main attendance router
router = DefaultRouter()
router.register(r'attendance', views.AttendanceViewSet, basename='attendance')

# Admin-specific router
admin_router = DefaultRouter()
admin_router.register(r'attendance', views.AdminAttendanceViewSet, basename='admin-attendance')

# Supervisor-specific router
supervisor_router = DefaultRouter()
supervisor_router.register(r'attendance', views.SupervisorAttendanceViewSet, basename='supervisor-attendance')

# Employee-specific router
employee_router = DefaultRouter()
employee_router.register(r'attendance', views.EmployeeAttendanceViewSet, basename='employee-attendance')

urlpatterns = [
    # Main endpoints
    path('', include(router.urls)),
    
    # Role-specific endpoints
    path('admin/', include((admin_router.urls, 'admin'), namespace='attendance-admin')),
    path('supervisor/', include((supervisor_router.urls, 'supervisor'), namespace='attendance-supervisor')),
    path('employee/', include((employee_router.urls, 'employee'), namespace='attendance-employee')),
]
