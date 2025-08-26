from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Main settings router
router = DefaultRouter()
router.register(r'work', views.WorkSettingsViewSet, basename='work-settings')
router.register(r'holidays', views.HolidayViewSet, basename='holiday')

# Admin-specific router
admin_router = DefaultRouter()
admin_router.register(r'work', views.AdminWorkSettingsViewSet, basename='admin-work-settings')
admin_router.register(r'holidays', views.AdminHolidayViewSet, basename='admin-holiday')

# Supervisor-specific router
supervisor_router = DefaultRouter()
supervisor_router.register(r'work', views.SupervisorWorkSettingsViewSet, basename='supervisor-work-settings')
supervisor_router.register(r'holidays', views.SupervisorHolidayViewSet, basename='supervisor-holiday')

# Employee-specific router
employee_router = DefaultRouter()
employee_router.register(r'holidays', views.EmployeeHolidayViewSet, basename='employee-holiday')

urlpatterns = [
    # Main endpoints
    path('', include(router.urls)),
    
    # Role-specific endpoints
    path('admin/', include((admin_router.urls, 'admin'), namespace='admin')),
    path('supervisor/', include((supervisor_router.urls, 'supervisor'), namespace='supervisor')),
    path('employee/', include((employee_router.urls, 'employee'), namespace='employee')),
]
