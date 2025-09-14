from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

# Import legacy views for backward compatibility
from api import views

# Legacy router (kept for backward compatibility during migration)
router = DefaultRouter()
router.register(r'divisions', views.DivisionViewSet, basename='division')
router.register(r'positions', views.PositionViewSet, basename='position')
router.register(r'employees', views.EmployeeViewSet, basename='employee')
router.register(r'settings/work', views.WorkSettingsViewSet, basename='work-settings')
router.register(r'settings/holidays', views.HolidayViewSet, basename='holiday')
router.register(r'attendance', views.AttendanceViewSet, basename='attendance')
router.register(r'attendance-corrections', views.AttendanceCorrectionViewSet, basename='attendance-correction')
router.register(r'overtime-requests', views.OvertimeRequestViewSet, basename='overtime-request')
router.register(r'monthly-summary-requests', views.OvertimeSummaryRequestViewSet, basename='monthly-summary-request')

# Role-specific routers (legacy)
admin_router = DefaultRouter()
admin_router.register(r'divisions', views.AdminDivisionViewSet, basename='admin-division')
admin_router.register(r'positions', views.AdminPositionViewSet, basename='admin-position')
admin_router.register(r'employees', views.AdminEmployeeViewSet, basename='admin-employee')
admin_router.register(r'settings/work', views.AdminWorkSettingsViewSet, basename='admin-work-settings')
admin_router.register(r'settings/holidays', views.AdminHolidayViewSet, basename='admin-holiday')
admin_router.register(r'monthly-summary-requests', views.OvertimeSummaryRequestViewSet, basename='admin-monthly-summary-request')

supervisor_router = DefaultRouter()
supervisor_router.register(r'divisions', views.SupervisorDivisionViewSet, basename='supervisor-division')
supervisor_router.register(r'positions', views.SupervisorPositionViewSet, basename='supervisor-position')
supervisor_router.register(r'employees', views.SupervisorEmployeeViewSet, basename='supervisor-employee')
supervisor_router.register(r'settings/work', views.SupervisorWorkSettingsViewSet, basename='supervisor-work-settings')
supervisor_router.register(r'settings/holidays', views.SupervisorHolidayViewSet, basename='supervisor-holiday')
supervisor_router.register(r'monthly-summary-requests', views.OvertimeSummaryRequestViewSet, basename='supervisor-monthly-summary-request')

employee_router = DefaultRouter()
employee_router.register(r'divisions', views.EmployeeDivisionViewSet, basename='employee-division')
employee_router.register(r'positions', views.EmployeePositionViewSet, basename='employee-position')
employee_router.register(r'employees', views.EmployeeEmployeeViewSet, basename='employee-employee')
employee_router.register(r'settings/holidays', views.EmployeeHolidayViewSet, basename='employee-holiday')
employee_router.register(r'attendance', views.AttendanceViewSet, basename='employee-attendance')
employee_router.register(r'attendance-corrections', views.AttendanceCorrectionViewSet, basename='employee-attendance-correction')
employee_router.register(r'monthly-summary-requests', views.OvertimeSummaryRequestViewSet, basename='employee-monthly-summary-request')

urlpatterns = [
    # Legacy endpoints (for backward compatibility)
    path('health', views.health, name='health'),
    path('users/check', views.check_user, name='check-user'),
    path('users/provision', views.provision_user, name='provision-user'),
    path('users', views.users_list, name='users-list'),
    
    # Auth endpoints (JWT)
    path('auth/login', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/verify', TokenVerifyView.as_view(), name='token_verify'),
    
    # Auth endpoints (legacy)
    path('auth/me', views.me, name='auth-me'),
    path('auth/logout', views.logout, name='auth-logout'),
    
    # Attendance endpoints (legacy)
    path('attendance/precheck', views.attendance_precheck, name='attendance-precheck'),
    path('attendance/check-in', views.attendance_check_in, name='attendance-check-in'),
    path('attendance/check-out', views.attendance_check_out, name='attendance-check-out'),
    path('attendance/report', views.attendance_report, name='attendance-report'),
    path('attendance/report/pdf', views.attendance_report_pdf, name='attendance-report-pdf'),
    
    # Legacy router
    path('', include(router.urls)),
    
    # Role-specific endpoints (legacy)
    path('admin/', include((admin_router.urls, 'admin'), namespace='legacy-admin')),
    path('supervisor/', include((supervisor_router.urls, 'supervisor'), namespace='legacy-supervisor')),
    path('employee/', include((employee_router.urls, 'employee'), namespace='legacy-employee')),
    
    # Legacy custom actions
    path('attendance-corrections/<int:pk>/approve', views.AttendanceCorrectionViewSet.as_view({'post': 'approve'}), name='attendance-correction-approve'),
    path('attendance-corrections/<int:pk>/reject', views.AttendanceCorrectionViewSet.as_view({'post': 'reject'}), name='attendance-correction-reject'),
    
    # Legacy supervisor endpoints
    path('supervisor/team-attendance', views.supervisor_team_attendance, name='supervisor-team-attendance'),
    path('supervisor/team-attendance/pdf', views.supervisor_team_attendance_pdf, name='supervisor-team-attendance-pdf'),
    path('supervisor/team-attendance/pdf-alt', views.supervisor_team_attendance_pdf_alt, name='supervisor-team-attendance-pdf-alt'),
    path('supervisor/attendance-detail/<int:employee_id>', views.supervisor_attendance_detail, name='supervisor-attendance-detail'),
    
    # Legacy employee endpoints
    path('employee/attendance/precheck', views.attendance_precheck, name='employee-attendance-precheck'),
    path('employee/attendance/check-in', views.attendance_check_in, name='employee-attendance-check-in'),
    path('employee/attendance/check-out', views.attendance_check_out, name='employee-attendance-check-out'),
    path('employee/attendance/report', views.attendance_report, name='employee-attendance-report'),
    path('employee/attendance/report/pdf', views.attendance_report_pdf, name='employee-attendance-report-pdf'),
    
    # Legacy overtime endpoints
    path('overtime/<int:attendance_id>/approve', views.approve_overtime, name='approve-overtime'),
    path('overtime/report', views.overtime_report, name='overtime-report'),
    
    # Legacy export endpoints
    path('overtime-requests/export-monthly-docx', views.OvertimeRequestViewSet.as_view({'get': 'export_monthly_docx'}), name='overtime-export-monthly-docx'),
    path('overtime-requests/upload-monthly-export-template', views.OvertimeRequestViewSet.as_view({'post': 'upload_monthly_export_template'}), name='overtime-upload-monthly-export-template'),
    path('overtime-requests/reload-monthly-export-template', views.OvertimeRequestViewSet.as_view({'post': 'reload_monthly_export_template'}), name='overtime-reload-monthly-export-template'),
    
    # Legacy employee work settings
    path('employee/settings/work', views.employee_work_settings, name='employee-work-settings'),
    
    # Legacy supervisor approvals summary
    path('supervisor/approvals/summary', views.supervisor_approvals_summary, name='supervisor-approvals-summary'),
    
    # New modular app endpoints
            path('v2/', include([
            path('auth/', include('apps.auth.urls')),
            path('users/', include('apps.users.urls')),
            path('employees/', include('apps.employees.urls')),
            path('settings/', include('apps.settings.urls')),
            path('attendance/', include('apps.attendance.urls')),
            path('corrections/', include('apps.corrections.urls')),
            path('overtime/', include('apps.overtime.urls')),
            path('reporting/', include('apps.reporting.urls')),
        ])),
]
