from django.contrib import admin
from .models import Attendance


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    """Admin interface for Attendance management"""
    list_display = [
        'user', 'date_local', 'check_in_at_utc', 'check_out_at_utc', 
        'total_work_minutes', 'minutes_late', 'status', 'is_holiday', 'within_geofence'
    ]
    list_filter = [
        'date_local', 'is_holiday', 'within_geofence', 'overtime_approved',
        'created_at', 'updated_at'
    ]
    search_fields = [
        'user__username', 'user__first_name', 'user__last_name', 
        'employee__nip', 'employee__fullname'
    ]
    readonly_fields = [
        'created_at', 'updated_at', 'total_work_minutes', 'status', 'is_holiday'
    ]
    ordering = ['-date_local', '-created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'employee', 'date_local', 'timezone')
        }),
        ('Check-in Details', {
            'fields': (
                'check_in_at_utc', 'check_in_lat', 'check_in_lng', 
                'check_in_accuracy_m', 'check_in_ip'
            ),
            'classes': ('collapse',)
        }),
        ('Check-out Details', {
            'fields': (
                'check_out_at_utc', 'check_out_lat', 'check_out_lng', 
                'check_out_accuracy_m', 'check_out_ip'
            ),
            'classes': ('collapse',)
        }),
        ('Status & Calculations', {
            'fields': (
                'is_holiday', 'within_geofence', 'minutes_late', 
                'total_work_minutes', 'status'
            )
        }),
        ('Overtime Information', {
            'fields': (
                'overtime_minutes', 'overtime_amount', 'overtime_approved',
                'overtime_approved_by', 'overtime_approved_at'
            ),
            'classes': ('collapse',)
        }),
        ('Notes', {
            'fields': ('note', 'employee_note'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'user', 'employee', 'overtime_approved_by'
        )
    
    def status(self, obj):
        """Display attendance status with color coding"""
        status_map = {
            'no_check_in': '🔴 No Check-in',
            'no_check_out': '🟡 No Check-out',
            'late': '🟠 Late',
            'on_time': '🟢 On Time'
        }
        return status_map.get(obj.status, obj.status)
    status.short_description = 'Status'
    
    def has_add_permission(self, request):
        """Allow adding attendance records"""
        return True
    
    def has_delete_permission(self, request, obj=None):
        """Allow deleting attendance records"""
        return True
