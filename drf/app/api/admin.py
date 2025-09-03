from django.contrib import admin
from django.contrib.auth.models import Group
from .models import Division, Position, Employee, WorkSettings, Holiday, Attendance, AttendanceCorrection, OvertimeRequest, MonthlySummaryRequest, GroupPermission, GroupPermissionTemplate, RoleConfiguration, EmployeeRole

# Unregister the default Group admin and register our custom one
admin.site.unregister(Group)

@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "user_count")
    search_fields = ("name",)
    ordering = ("name",)
    
    def user_count(self, obj):
        return obj.user_set.count()
    user_count.short_description = "Number of Users"
    
    def has_delete_permission(self, request, obj=None):
        if obj and obj.user_set.exists():
            return False  # Prevent deletion of groups with users
        return super().has_delete_permission(request, obj)
    
    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('user_set')


@admin.register(Division)
class DivisionAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "approval_level", "can_approve_overtime_org_wide")
    search_fields = ("name",)
    list_filter = ("approval_level", "can_approve_overtime_org_wide")
    fieldsets = (
        ('Basic Information', {
            'fields': ('name',)
        }),
        ('Approval Permissions', {
            'fields': ('approval_level', 'can_approve_overtime_org_wide'),
            'description': 'Set approval level and organization-wide approval permission'
        }),
    )


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("id", "nip", "fullname", "user", "division", "position")
    search_fields = ("nip", "fullname", "user__username", "user__email")
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
        ('Check-in Restrictions', {
            'fields': ('earliest_check_in_enabled', 'earliest_check_in_time'),
            'description': 'Restrict when employees can start checking in'
        }),
        ('Check-out Restrictions', {
            'fields': ('latest_check_out_enabled', 'latest_check_out_time'),
            'description': 'Restrict when employees can check out (latest time)'
        }),
        ('Friday Special Hours', {
            'fields': ('friday_start_time', 'friday_end_time', 'friday_required_minutes', 'friday_grace_minutes'),
            'description': 'Special working hours for Fridays (9:00-13:00)'
        }),
        ('Office Location', {
            'fields': ('office_latitude', 'office_longitude', 'office_radius_meters')
        }),
        ('Overtime Settings', {
            'fields': ('overtime_rate_workday', 'overtime_rate_holiday', 'overtime_threshold_minutes'),
            'description': 'Overtime rates as multipliers of hourly base wage and threshold settings'
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
    list_display = ("user", "date_local", "check_in_at_utc", "check_out_at_utc", "is_holiday", "minutes_late", "overtime_minutes", "overtime_approved")
    list_filter = ("date_local", "is_holiday", "within_geofence", "overtime_approved")
    search_fields = ("user__username", "user__email")
    date_hierarchy = "date_local"
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'employee', 'date_local', 'timezone')
        }),
        ('Check-in Details', {
            'fields': ('check_in_at_utc', 'check_in_lat', 'check_in_lng', 'check_in_accuracy_m')
        }),
        ('Check-out Details', {
            'fields': ('check_out_at_utc', 'check_out_lat', 'check_out_lng', 'check_out_accuracy_m')
        }),
        ('Work Status', {
            'fields': ('is_holiday', 'within_geofence', 'minutes_late', 'total_work_minutes')
        }),
        ('Overtime Information', {
            'fields': ('overtime_minutes', 'overtime_amount', 'overtime_approved', 'overtime_approved_by', 'overtime_approved_at')
        }),
        ('Notes', {
            'fields': ('note', 'employee_note')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(OvertimeRequest)
class OvertimeRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "employee", "date_requested", "overtime_hours", "status", "level1_approved_by", "final_approved_by", "level1_rejected_by", "final_rejected_by", "overtime_amount", "created_at")
    list_filter = ("status", "date_requested", "created_at", "level1_approved_by", "final_approved_by", "level1_rejected_by", "final_rejected_by")
    search_fields = ("employee__user__username", "employee__user__first_name", "employee__user__last_name", "work_description", "level1_approved_by__username", "final_approved_by__username", "level1_rejected_by__username", "final_rejected_by__username")
    readonly_fields = ("overtime_amount", "created_at", "updated_at", "level1_approved_at", "level1_rejected_at", "final_approved_at", "final_rejected_at")
    
    fieldsets = (
        ('Request Information', {
            'fields': ('employee', 'user', 'date_requested', 'overtime_hours', 'work_description')
        }),
        ('Status', {
            'fields': ('status', 'rejection_reason')
        }),
        ('Level 1 Approval (Division)', {
            'fields': ('level1_approved_by', 'level1_approved_at', 'level1_rejected_by', 'level1_rejected_at')
        }),
        ('Final Approval (Organization)', {
            'fields': ('final_approved_by', 'final_approved_at', 'final_rejected_by', 'final_rejected_at')
        }),
        ('Legacy Fields', {
            'fields': ('approved_by', 'approved_at'),
            'classes': ('collapse',)
        }),
        ('Amount', {
            'fields': ('overtime_amount',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def save_model(self, request, obj, form, change):
        # Auto-set approval/rejection fields when status changes
        from django.utils import timezone
        now = timezone.now()
        
        # Handle approval
        if obj.status == 'level1_approved' and not obj.level1_approved_by:
            obj.level1_approved_by = request.user
            obj.level1_approved_at = now
        elif obj.status == 'approved' and not obj.final_approved_by:
            obj.final_approved_by = request.user
            obj.final_approved_at = now
            # Also set legacy fields for backward compatibility
            if not obj.approved_by:
                obj.approved_by = request.user
                obj.approved_at = now
        
        # Handle rejection
        elif obj.status == 'rejected':
            # Check if it's level 1 rejection (pending -> rejected)
            if obj.level1_rejected_by is None and obj.final_rejected_by is None:
                # Determine if it's level 1 or final rejection based on current approval state
                if obj.level1_approved_by is None:
                    # Level 1 rejection
                    obj.level1_rejected_by = request.user
                    obj.level1_rejected_at = now
                else:
                    # Final rejection
                    obj.final_rejected_by = request.user
                    obj.final_rejected_at = now
        
        super().save_model(request, obj, form, change)


@admin.register(MonthlySummaryRequest)
class MonthlySummaryRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "employee", "request_period", "report_type", "status", "priority", "created_at")
    list_filter = ("status", "report_type", "request_period", "priority", "created_at")
    search_fields = ("employee__user__username", "employee__user__first_name", "employee__user__last_name", "request_title")
    readonly_fields = ("created_at", "updated_at")
    
    fieldsets = (
        ('Request Information', {
            'fields': ('employee', 'user', 'request_period', 'report_type', 'request_title', 'request_description')
        }),
        ('Data Scope', {
            'fields': ('include_attendance', 'include_overtime', 'include_corrections', 'include_summary_stats')
        }),
        ('Priority & Timeline', {
            'fields': ('priority', 'expected_completion_date')
        }),
        ('Status and Approval', {
            'fields': ('status', 'level1_approved_by', 'level1_approved_at', 'final_approved_by', 'final_approved_at', 'rejection_reason')
        }),
        ('Completion', {
            'fields': ('completed_at', 'completion_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def save_model(self, request, obj, form, change):
        # Auto-set approvers when status changes
        if obj.status == 'level1_approved' and not obj.level1_approved_by:
            obj.level1_approved_by = request.user
            from django.utils import timezone
            obj.level1_approved_at = timezone.now()
        elif obj.status == 'approved' and not obj.final_approved_by:
            obj.final_approved_by = request.user
            from django.utils import timezone
            obj.final_approved_at = timezone.now()
        elif obj.status == 'completed' and not obj.completed_at:
            from django.utils import timezone
            obj.completed_at = timezone.now()
        super().save_model(request, obj, form, change)


@admin.register(GroupPermission)
class GroupPermissionAdmin(admin.ModelAdmin):
    list_display = ("id", "group", "permission_type", "permission_action", "is_active", "created_at")
    list_filter = ("group", "permission_type", "permission_action", "is_active", "created_at")
    search_fields = ("group__name", "permission_type", "permission_action")
    ordering = ("group__name", "permission_type", "permission_action")
    readonly_fields = ("created_at", "updated_at")
    
    fieldsets = (
        ('Permission Information', {
            'fields': ('group', 'permission_type', 'permission_action', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('group')


@admin.register(GroupPermissionTemplate)
class GroupPermissionTemplateAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "description", "permission_count", "is_active", "created_at")
    list_filter = ("is_active", "created_at")
    search_fields = ("name", "description")
    ordering = ("name",)
    readonly_fields = ("created_at", "updated_at")
    
    fieldsets = (
        ('Template Information', {
            'fields': ('name', 'description', 'is_active')
        }),
        ('Permissions', {
            'fields': ('permissions',),
            'description': 'Format: [{"type": "attendance", "action": "view"}, {"type": "employee", "action": "create"}]'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def permission_count(self, obj):
        if isinstance(obj.permissions, list):
            return len(obj.permissions)
        return 0
    permission_count.short_description = "Permission Count"

    def get_queryset(self, request):
        return super().get_queryset(request)


@admin.register(RoleConfiguration)
class RoleConfigurationAdmin(admin.ModelAdmin):
    list_display = ("name", "display_name", "role_type", "approval_level", "group", "is_active", "sort_order", "user_count", "created_at")
    list_filter = ("role_type", "approval_level", "group", "is_active", "created_at")
    search_fields = ("name", "display_name", "description")
    ordering = ("sort_order", "name")
    readonly_fields = ("created_at", "updated_at")

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'display_name', 'role_type', 'group', 'description')
        }),
        ('Approval Configuration', {
            'fields': ('approval_level',),
            'description': 'Set approval level: 0=No Approval, 1=Division Level, 2=Organization Level (KJRI)'
        }),
        ('Settings', {
            'fields': ('is_active', 'sort_order')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def user_count(self, obj):
        """Count users with this role"""
        try:
            group = Group.objects.get(name=obj.name)
            return group.user_set.count()
        except Group.DoesNotExist:
            return 0
    user_count.short_description = "User Count"

    def get_queryset(self, request):
        return super().get_queryset(request)

    def save_model(self, request, obj, form, change):
        """Override save to create Django Group automatically"""
        super().save_model(request, obj, form, change)

        # Create corresponding Django Group if it doesn't exist
        Group.objects.get_or_create(name=obj.name)


@admin.register(EmployeeRole)
class EmployeeRoleAdmin(admin.ModelAdmin):
    list_display = ("employee", "group", "role_display", "is_primary", "is_active", "assigned_by", "assigned_at")
    list_filter = ("group", "is_primary", "is_active", "assigned_at")
    search_fields = ("employee__user__username", "employee__fullname", "group__name")
    ordering = ("-is_primary", "group__name", "-assigned_at")
    readonly_fields = ("assigned_at", "assigned_by")
    raw_id_fields = ("employee", "assigned_by")

    fieldsets = (
        ('Role Assignment', {
            'fields': ('employee', 'group', 'is_primary', 'is_active')
        }),
        ('Assignment Information', {
            'fields': ('assigned_by', 'assigned_at'),
            'classes': ('collapse',)
        }),
    )

    def role_display(self, obj):
        """Display role configuration information"""
        try:
            role_config = RoleConfiguration.objects.get(name=obj.group.name)
            return f"{role_config.display_name} (Level {role_config.approval_level})"
        except RoleConfiguration.DoesNotExist:
            return obj.group.name
    role_display.short_description = "Role Info"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'employee', 'employee__user', 'group', 'assigned_by'
        )

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "employee":
            # Only show employees with users
            kwargs["queryset"] = Employee.objects.select_related('user').filter(user__isnull=False)
        elif db_field.name == "group":
            # Only show groups that have role configurations
            role_names = RoleConfiguration.objects.values_list('name', flat=True)
            kwargs["queryset"] = Group.objects.filter(name__in=role_names)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        """Set assigned_by when creating"""
        if not change:  # Only on creation
            obj.assigned_by = request.user
        super().save_model(request, obj, form, change)
