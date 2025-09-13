from django.urls import path, include
from django.http import HttpResponseRedirect

# Legacy health endpoint redirect to v2
def health_redirect(request):
    return HttpResponseRedirect('/api/v2/core/health')

# Only v2 endpoints are exposed; legacy routes disabled
urlpatterns = [
    # Legacy health endpoint redirect
    path('health', health_redirect, name='legacy-health-redirect'),
    
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
