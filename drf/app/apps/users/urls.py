from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Main user router
router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'groups', views.GroupViewSet, basename='group')
router.register(r'profiles', views.UserProfileViewSet, basename='profile')

# Admin-specific router
admin_router = DefaultRouter()
admin_router.register(r'users', views.AdminUserViewSet, basename='admin-user')
admin_router.register(r'groups', views.AdminGroupViewSet, basename='admin-group')

urlpatterns = [
    # Main endpoints
    path('', include(router.urls)),
    
    # Role-specific endpoints
    path('admin/', include((admin_router.urls, 'admin'), namespace='users-admin')),
]
