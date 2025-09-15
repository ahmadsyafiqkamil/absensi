from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api import views

router = DefaultRouter()
router.register(r'divisions', views.DivisionViewSet)
router.register(r'positions', views.PositionViewSet)


urlpatterns = [
    path('', include(router.urls)),
]
