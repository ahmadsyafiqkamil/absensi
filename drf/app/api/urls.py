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
    # Attendance
    path('attendance/precheck', views.attendance_precheck, name='attendance-precheck'),
    path('attendance/check-in', views.attendance_check_in, name='attendance-check-in'),
    path('attendance/check-out', views.attendance_check_out, name='attendance-check-out'),
]

router = DefaultRouter()
router.register(r'divisions', views.DivisionViewSet, basename='division')
router.register(r'positions', views.PositionViewSet, basename='position')
router.register(r'employees', views.EmployeeViewSet, basename='employee')
router.register(r'settings/work', views.WorkSettingsViewSet, basename='work-settings')
router.register(r'settings/holidays', views.HolidayViewSet, basename='holiday')
router.register(r'attendance', views.AttendanceViewSet, basename='attendance')
router.register(r'attendance-corrections', views.AttendanceCorrectionViewSet, basename='attendance-correction')

urlpatterns += [
    path('', include(router.urls)),
    # Custom actions for corrections approval
    path('attendance-corrections/<int:pk>/approve', views.AttendanceCorrectionViewSet.as_view({'post': 'approve'}), name='attendance-correction-approve'),
    path('attendance-corrections/<int:pk>/reject', views.AttendanceCorrectionViewSet.as_view({'post': 'reject'}), name='attendance-correction-reject'),
    # Supervisor attendance endpoints
    path('supervisor/team-attendance', views.supervisor_team_attendance, name='supervisor-team-attendance'),
    path('supervisor/attendance-detail/<int:employee_id>', views.supervisor_attendance_detail, name='supervisor-attendance-detail'),
]


