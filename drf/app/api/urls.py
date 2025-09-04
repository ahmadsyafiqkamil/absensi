from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    path('health', views.health, name='health'),
    path('users/check', views.check_user, name='check-user'),
    path('users/provision', views.provision_user, name='provision-user'),
    path('users', views.users_list, name='users-list'),
    # Auth
    path('auth/login', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/verify', TokenVerifyView.as_view(), name='token_verify'),
    path('auth/me', views.me, name='auth-me'),
    path('auth/logout', views.logout, name='auth-logout'),
    path('employees/me', views.employee_me, name='employee-me'),
    # Attendance (legacy/common)
    path('attendance/precheck', views.attendance_precheck, name='attendance-precheck'),
    path('attendance/check-in', views.attendance_check_in, name='attendance-check-in'),
    path('attendance/check-out', views.attendance_check_out, name='attendance-check-out'),
    path('attendance/report', views.attendance_report, name='attendance-report'),
    path('attendance/report/pdf', views.attendance_report_pdf, name='attendance-report-pdf'),
    path('attendance/corrections', views.attendance_corrections, name='attendance-corrections'),
    path('attendance/corrections/request', views.attendance_correction_request, name='attendance-correction-request'),
]

# Legacy router (kept for backward compatibility)
router = DefaultRouter()
router.register(r'divisions', views.DivisionViewSet, basename='division')
router.register(r'positions', views.PositionViewSet, basename='position')
router.register(r'employees', views.EmployeeViewSet, basename='employee')
router.register(r'groups', views.GroupViewSet, basename='group')
router.register(r'group-permissions', views.GroupPermissionViewSet, basename='group-permission')
# router.register(r'permission-templates', views.GroupPermissionTemplateViewSet, basename='permission-template')
router.register(r'permission-management', views.PermissionManagementViewSet, basename='permission-management')
router.register(r'settings/work', views.WorkSettingsViewSet, basename='work-settings')
router.register(r'settings/holidays', views.HolidayViewSet, basename='holiday')
router.register(r'attendance', views.AttendanceViewSet, basename='attendance')
router.register(r'attendance-corrections', views.AttendanceCorrectionViewSet, basename='attendance-correction')
router.register(r'overtime-requests', views.OvertimeRequestViewSet, basename='overtime-request')
router.register(r'monthly-summary-requests', views.MonthlySummaryRequestViewSet, basename='monthly-summary-request')

# Role-specific routers
admin_router = DefaultRouter()
admin_router.register(r'divisions', views.AdminDivisionViewSet, basename='admin-division')
admin_router.register(r'positions', views.AdminPositionViewSet, basename='admin-position')
admin_router.register(r'employees', views.AdminEmployeeViewSet, basename='admin-employee')
admin_router.register(r'groups', views.AdminGroupViewSet, basename='admin-group')
admin_router.register(r'groups-with-permissions', views.AdminGroupWithPermissionsViewSet, basename='admin-group-with-permissions')
admin_router.register(r'employee-roles', views.EmployeeRoleViewSet, basename='admin-employee-role')
admin_router.register(r'employees-with-roles', views.EmployeeWithRolesViewSet, basename='admin-employees-with-roles')
admin_router.register(r'multi-role-management', views.MultiRoleManagementViewSet, basename='admin-multi-role-management')
# DEPRECATED: Use 'roles' endpoint instead
admin_router.register(r'role-configurations', views.RoleConfigurationViewSet, basename='admin-role-configuration')

# NEW: Unified Role management endpoint
admin_router.register(r'roles', views.RoleViewSet, basename='admin-role')
admin_router.register(r'role-templates', views.RoleTemplateViewSet, basename='admin-role-template')
admin_router.register(r'group-permissions', views.GroupPermissionViewSet, basename='admin-group-permission')
# admin_router.register(r'permission-templates', views.GroupPermissionTemplateViewSet, basename='admin-permission-template')
admin_router.register(r'permission-management', views.PermissionManagementViewSet, basename='admin-permission-management')
admin_router.register(r'settings/work', views.AdminWorkSettingsViewSet, basename='admin-work-settings')
admin_router.register(r'settings/holidays', views.AdminHolidayViewSet, basename='admin-holiday')
admin_router.register(r'monthly-summary-requests', views.MonthlySummaryRequestViewSet, basename='admin-monthly-summary-request')

supervisor_router = DefaultRouter()
supervisor_router.register(r'divisions', views.SupervisorDivisionViewSet, basename='supervisor-division')
supervisor_router.register(r'positions', views.SupervisorPositionViewSet, basename='supervisor-position')
supervisor_router.register(r'employees', views.SupervisorEmployeeViewSet, basename='supervisor-employee')
supervisor_router.register(r'employees-with-roles', views.EmployeeWithRolesViewSet, basename='supervisor-employees-with-roles')
supervisor_router.register(r'groups', views.SupervisorGroupViewSet, basename='supervisor-group')
supervisor_router.register(r'settings/work', views.SupervisorWorkSettingsViewSet, basename='supervisor-work-settings')
supervisor_router.register(r'settings/holidays', views.SupervisorHolidayViewSet, basename='supervisor-holiday')
supervisor_router.register(r'monthly-summary-requests', views.MonthlySummaryRequestViewSet, basename='supervisor-monthly-summary-request')
# Map attendance corrections under supervisor prefix (scoped by ViewSet logic)
supervisor_router.register(r'attendance-corrections', views.AttendanceCorrectionViewSet, basename='supervisor-attendance-correction')

employee_router = DefaultRouter()
employee_router.register(r'divisions', views.EmployeeDivisionViewSet, basename='employee-division')
employee_router.register(r'positions', views.EmployeePositionViewSet, basename='employee-position')
employee_router.register(r'employees', views.EmployeeEmployeeViewSet, basename='employee-employee')
employee_router.register(r'groups', views.EmployeeGroupViewSet, basename='employee-group')
employee_router.register(r'settings/holidays', views.EmployeeHolidayViewSet, basename='employee-holiday')
# Map my attendance list under employee prefix
employee_router.register(r'attendance', views.AttendanceViewSet, basename='employee-attendance')
# Map my attendance corrections under employee prefix
employee_router.register(r'attendance-corrections', views.AttendanceCorrectionViewSet, basename='employee-attendance-correction')
employee_router.register(r'monthly-summary-requests', views.MonthlySummaryRequestViewSet, basename='employee-monthly-summary-request')

urlpatterns += [
    path('', include(router.urls)),
    # Admin role-specific endpoints (namespaced)
    path('admin/', include((admin_router.urls, 'api'), namespace='api-admin')),
    # Supervisor role-specific endpoints (namespaced)
    path('supervisor/', include((supervisor_router.urls, 'supervisor'), namespace='supervisor')),
    # Employee role-specific endpoints (namespaced)
    path('employee/', include((employee_router.urls, 'employee'), namespace='employee')),
    # Custom actions for corrections approval
    path('attendance-corrections/<int:pk>/approve', views.AttendanceCorrectionViewSet.as_view({'post': 'approve'}), name='attendance-correction-approve'),
    path('attendance-corrections/<int:pk>/reject', views.AttendanceCorrectionViewSet.as_view({'post': 'reject'}), name='attendance-correction-reject'),
    # Supervisor attendance endpoints (function-based)
    path('supervisor/team-attendance', views.supervisor_team_attendance, name='supervisor-team-attendance'),
    path('supervisor/team-attendance/pdf', views.supervisor_team_attendance_pdf, name='supervisor-team-attendance-pdf'),
    path('supervisor/team-attendance/pdf-alt', views.supervisor_team_attendance_pdf_alt, name='supervisor-team-attendance-pdf-alt'),
    path('supervisor/attendance-detail/<int:employee_id>', views.supervisor_attendance_detail, name='supervisor-attendance-detail'),
    # Employee convenience routes duplicating common attendance endpoints
    path('employee/attendance/precheck', views.attendance_precheck, name='employee-attendance-precheck'),
    path('employee/attendance/check-in', views.attendance_check_in, name='employee-attendance-check-in'),
    path('employee/attendance/check-out', views.attendance_check_out, name='employee-attendance-check-out'),
    path('employee/attendance/report', views.attendance_report, name='employee-attendance-report'),
    path('employee/attendance/report/pdf', views.attendance_report_pdf, name='employee-attendance-report-pdf'),
    
    # Overtime endpoints (legacy attendance-based)
    path('overtime/<int:attendance_id>/approve', views.approve_overtime, name='approve-overtime'),
    path('overtime/report', views.overtime_report, name='overtime-report'),
    
    # Export monthly overtime to DOCX
    path('overtime-requests/export-monthly-docx', 
         views.OvertimeRequestViewSet.as_view({'get': 'export_monthly_docx'}), 
         name='overtime-export-monthly-docx'),
    
    # Monthly export template management
    path('overtime-requests/upload-monthly-export-template', 
         views.OvertimeRequestViewSet.as_view({'post': 'upload_monthly_export_template'}), 
         name='overtime-upload-monthly-export-template'),
    path('overtime-requests/reload-monthly-export-template', 
         views.OvertimeRequestViewSet.as_view({'post': 'reload_monthly_export_template'}), 
         name='overtime-reload-monthly-export-template'),
    
    # Employee work settings endpoint
    path('employee/settings/work', views.employee_work_settings, name='employee-work-settings'),
    
    # Supervisor approvals summary endpoint for dashboard card
    path('supervisor/approvals/summary', views.supervisor_approvals_summary, name='supervisor-approvals-summary'),
    
    # CSRF token endpoint
    path('csrf-token/', views.csrf_token_view, name='csrf-token'),
    
    # Public permissions endpoint (development only)
    path('public-permissions/', views.public_permissions_view, name='public-permissions'),
]


