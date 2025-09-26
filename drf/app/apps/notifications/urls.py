from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create routers
admin_router = DefaultRouter()
admin_router.register(r'notifications', views.AdminNotificationViewSet, basename='admin-notification')

user_router = DefaultRouter()
user_router.register(r'notifications', views.UserNotificationViewSet, basename='user-notification')

urlpatterns = [
    # Admin endpoints
    path('admin/', include(admin_router.urls)),
    
    # User endpoints
    path('', include(user_router.urls)),
]
