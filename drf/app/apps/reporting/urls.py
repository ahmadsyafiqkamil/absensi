from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Main reporting router
router = DefaultRouter()
router.register(r'templates', views.ReportTemplateViewSet, basename='template')
router.register(r'reports', views.GeneratedReportViewSet, basename='report')
router.register(r'schedules', views.ReportScheduleViewSet, basename='schedule')
router.register(r'generate', views.ReportGenerationViewSet, basename='generation')

# Admin-specific router
admin_router = DefaultRouter()
admin_router.register(r'templates', views.AdminReportTemplateViewSet, basename='admin-template')
admin_router.register(r'reports', views.AdminGeneratedReportViewSet, basename='admin-report')
admin_router.register(r'schedules', views.AdminReportScheduleViewSet, basename='admin-schedule')

# Supervisor-specific router (inherits from main router)
supervisor_router = DefaultRouter()
supervisor_router.register(r'templates', views.ReportTemplateViewSet, basename='supervisor-template')
supervisor_router.register(r'reports', views.GeneratedReportViewSet, basename='supervisor-report')
supervisor_router.register(r'schedules', views.ReportScheduleViewSet, basename='supervisor-schedule')
supervisor_router.register(r'generate', views.ReportGenerationViewSet, basename='supervisor-generation')

# Employee-specific router (inherits from main router)
employee_router = DefaultRouter()
employee_router.register(r'templates', views.ReportTemplateViewSet, basename='employee-template')
employee_router.register(r'reports', views.GeneratedReportViewSet, basename='employee-report')
employee_router.register(r'schedules', views.ReportScheduleViewSet, basename='employee-schedule')
employee_router.register(r'generate', views.ReportGenerationViewSet, basename='employee-generation')

urlpatterns = [
    # Main endpoints
    path('', include(router.urls)),
    
    # Role-specific endpoints
    path('admin/', include((admin_router.urls, 'admin'), namespace='reporting-admin')),
    path('supervisor/', include((supervisor_router.urls, 'supervisor'), namespace='reporting-supervisor')),
    path('employee/', include((employee_router.urls, 'employee'), namespace='reporting-employee')),
]
