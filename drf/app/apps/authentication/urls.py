from django.urls import path
from . import views

urlpatterns = [
    # Authentication endpoints
    path('login/', views.CustomTokenObtainPairView.as_view(), name='login'),
    path('refresh/', views.CustomTokenRefreshView.as_view(), name='refresh'),
    path('logout/', views.logout_view, name='logout'),
    path('me/', views.me, name='me'),
    
    # Employee info endpoint
    path('employee/me/', views.employee_me, name='employee-me'),
    
    # Health check
    path('health/', views.health_check, name='health'),
]
