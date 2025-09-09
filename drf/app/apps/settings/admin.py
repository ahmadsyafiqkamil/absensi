from django.contrib import admin
from .models import WorkSettings, Holiday


@admin.register(WorkSettings)
class WorkSettingsAdmin(admin.ModelAdmin):
    """Admin interface for WorkSettings (singleton)"""
    list_display = ['timezone', 'start_time', 'end_time', 'required_minutes', 'created_at']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Settings', {
            'fields': ('timezone', 'start_time', 'end_time', 'required_minutes', 'grace_minutes')
        }),
        ('Workdays', {
            'fields': ('workdays',),
            'description': 'List of workdays (0=Monday, 6=Sunday)'
        }),
        ('Friday Settings', {
            'fields': ('friday_start_time', 'friday_end_time', 'friday_required_minutes', 'friday_grace_minutes'),
            'description': 'Special settings for Fridays (shorter workday)'
        }),
        ('Office Location', {
            'fields': ('office_latitude', 'office_longitude', 'office_radius_meters'),
            'description': 'Geofence settings for office location'
        }),
        ('Overtime Settings', {
            'fields': ('overtime_rate_workday', 'overtime_rate_holiday', 'overtime_threshold_minutes'),
            'description': 'Overtime calculation settings'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        """Only allow one instance of WorkSettings"""
        return not WorkSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of WorkSettings"""
        return False


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    """Admin interface for Holiday management"""
    list_display = ['date', 'note', 'created_at']
    list_filter = ['date', 'created_at']
    search_fields = ['note']
    ordering = ['date']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Holiday Information', {
            'fields': ('date', 'note')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).order_by('date')
