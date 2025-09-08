from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Main employee router
router = DefaultRouter()
router.register(r'divisions', views.DivisionViewSet, basename='division')
router.register(r'positions', views.PositionViewSet, basename='position')
router.register(r'employees', views.EmployeeViewSet, basename='employee')

# Admin-specific router
admin_router = DefaultRouter()
admin_router.register(r'divisions', views.AdminDivisionViewSet, basename='admin-division')
admin_router.register(r'positions', views.AdminPositionViewSet, basename='admin-position')
admin_router.register(r'employees', views.AdminEmployeeViewSet, basename='admin-employee')

# Supervisor-specific router
supervisor_router = DefaultRouter()
supervisor_router.register(r'divisions', views.SupervisorDivisionViewSet, basename='supervisor-division')
supervisor_router.register(r'positions', views.SupervisorPositionViewSet, basename='supervisor-position')
supervisor_router.register(r'employees', views.SupervisorEmployeeViewSet, basename='supervisor-employee')

# Employee-specific router
employee_router = DefaultRouter()
employee_router.register(r'divisions', views.EmployeeDivisionViewSet, basename='employee-division')
employee_router.register(r'positions', views.EmployeePositionViewSet, basename='employee-position')
employee_router.register(r'employees', views.EmployeeEmployeeViewSet, basename='employee-employee')

urlpatterns = [
    # Main endpoints
    path('', include(router.urls)),
    
    # Employee-specific endpoints
    path('me/', views.EmployeeViewSet.as_view({'get': 'me'}), name='employee-me'),
    
    # Role-specific endpoints
    path('admin/', include((admin_router.urls, 'admin'), namespace='employees-admin')),
    path('supervisor/', include((supervisor_router.urls, 'supervisor'), namespace='employees-supervisor')),
    path('employee/', include((employee_router.urls, 'employee'), namespace='employees-employee')),
]
