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
]

router = DefaultRouter()
router.register(r'divisions', views.DivisionViewSet, basename='division')
router.register(r'positions', views.PositionViewSet, basename='position')
router.register(r'employees', views.EmployeeViewSet, basename='employee')
router.register(r'settings/work', views.WorkSettingsViewSet, basename='work-settings')
router.register(r'settings/holidays', views.HolidayViewSet, basename='holiday')

urlpatterns += [
    path('', include(router.urls)),
]


