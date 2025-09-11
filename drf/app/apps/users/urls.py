from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

router = DefaultRouter()
router.register(r'groups', views.GroupViewSet, basename='group')
router.register(r'group-permissions', views.GroupPermissionViewSet, basename='group-permission')
router.register(r'permission-templates', views.GroupPermissionTemplateViewSet, basename='permission-template')
router.register(r'permission-management', views.PermissionManagementViewSet, basename='permission-management')
router.register(r'groups-with-permissions', views.AdminGroupWithPermissionsViewSet, basename='group-with-permissions')

urlpatterns = [
    # Auth (JWT)
    path('auth/login', TokenObtainPairView.as_view(), name='token_obtain_pair_v2'),
    path('auth/refresh', TokenRefreshView.as_view(), name='token_refresh_v2'),
    path('auth/verify', TokenVerifyView.as_view(), name='token_verify_v2'),
    # Function-based endpoints
    path('me', views.me, name='users-me'),
    path('logout', views.logout, name='users-logout'),
    path('check', views.check_user, name='users-check'),
    path('provision', views.provision_user, name='users-provision'),
    path('csrf-token', views.csrf_token_view, name='csrf-token'),
    path('public-permissions', views.public_permissions_view, name='public-permissions'),
    path('', views.users_list, name='users-list'),
    # ViewSet-based endpoints
    path('', include(router.urls)),
]


