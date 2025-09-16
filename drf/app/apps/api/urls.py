from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api import views
from apps.authentication.views import health_check

router = DefaultRouter()
router.register(r'divisions', views.DivisionViewSet)
router.register(r'positions', views.PositionViewSet)


urlpatterns = [
    path('', include(router.urls)),
    # Health check endpoint for backward compatibility
    path('health', health_check, name='health'),
]
