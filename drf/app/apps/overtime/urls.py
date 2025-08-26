from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Main overtime router
router = DefaultRouter()
router.register(r'overtime', views.OvertimeRequestViewSet, basename='overtime')
router.register(r'monthly-summary', views.MonthlySummaryRequestViewSet, basename='monthly-summary')

# Admin-specific router
admin_router = DefaultRouter()
admin_router.register(r'overtime', views.AdminOvertimeRequestViewSet, basename='admin-overtime')
admin_router.register(r'monthly-summary', views.MonthlySummaryRequestViewSet, basename='admin-monthly-summary')

# Supervisor-specific router
supervisor_router = DefaultRouter()
supervisor_router.register(r'overtime', views.SupervisorOvertimeRequestViewSet, basename='supervisor-overtime')
supervisor_router.register(r'monthly-summary', views.MonthlySummaryRequestViewSet, basename='supervisor-monthly-summary')

# Employee-specific router
employee_router = DefaultRouter()
employee_router.register(r'overtime', views.EmployeeOvertimeRequestViewSet, basename='employee-overtime')
employee_router.register(r'monthly-summary', views.MonthlySummaryRequestViewSet, basename='employee-monthly-summary')

urlpatterns = [
    # Main endpoints
    path('', include(router.urls)),
    
    # Role-specific endpoints
    path('admin/', include((admin_router.urls, 'admin'), namespace='admin')),
    path('supervisor/', include((supervisor_router.urls, 'supervisor'), namespace='supervisor')),
    path('employee/', include((employee_router.urls, 'employee'), namespace='employee')),
]
