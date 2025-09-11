from django.urls import path, include

# Only v2 endpoints are exposed; legacy routes disabled
urlpatterns = [
    path('v2/', include([
        path('employees/', include('apps.employees.urls')),
        path('settings/', include('apps.settings.urls')),
        path('attendance/', include('apps.attendance.urls')),
        path('corrections/', include('apps.corrections.urls')),
        path('overtime/', include('apps.overtime.urls')),
        path('reporting/', include('apps.reporting.urls')),
        path('core/', include('apps.core.urls')),
        path('users/', include('apps.users.urls')),
    ])),
]
