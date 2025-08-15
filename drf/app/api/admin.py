from django.contrib import admin
from .models import Division, Position, Employee, WorkSettings, Holiday, Attendance

@admin.register(Division)
class DivisionAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("id", "nip", "user", "division", "position")
    search_fields = ("nip", "user__username", "user__email")
    list_filter = ("division", "position")


@admin.register(WorkSettings)
class WorkSettingsAdmin(admin.ModelAdmin):
    list_display = ("id", "timezone", "start_time", "end_time", "friday_start_time", "friday_end_time")
    fieldsets = (
        ('General Settings', {
            'fields': ('timezone', 'workdays')
        }),
        ('Regular Work Hours', {
            'fields': ('start_time', 'end_time', 'required_minutes', 'grace_minutes')
        }),
        ('Friday Special Hours', {
            'fields': ('friday_start_time', 'friday_end_time', 'friday_required_minutes', 'friday_grace_minutes'),
            'description': 'Special working hours for Fridays (9:00-13:00)'
        }),
        ('Office Location', {
            'fields': ('office_latitude', 'office_longitude', 'office_radius_meters')
        }),
    )
    
    def has_add_permission(self, request):
        # Only allow one instance
        return not WorkSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Prevent deletion of work settings
        return False


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ("date", "note")
    list_filter = ("date",)
    search_fields = ("note",)
    date_hierarchy = "date"


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ("user", "date_local", "check_in_at_utc", "check_out_at_utc", "is_holiday", "minutes_late")
    list_filter = ("date_local", "is_holiday", "within_geofence")
    search_fields = ("user__username", "user__email")
    date_hierarchy = "date_local"
    readonly_fields = ("created_at", "updated_at")
