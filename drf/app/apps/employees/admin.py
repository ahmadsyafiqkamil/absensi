from django.contrib import admin
from .models import Division, Position, Employee, EmployeePosition


@admin.register(Division)
class DivisionAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at', 'updated_at']
    search_fields = ['name']
    ordering = ['name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display = ['name', 'approval_level', 'can_approve_overtime_org_wide', 'created_at']
    list_filter = ['approval_level', 'can_approve_overtime_org_wide']
    search_fields = ['name']
    ordering = ['name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name',)
        }),
        ('Approval Permissions', {
            'fields': ('can_approve_overtime_org_wide', 'approval_level'),
            'description': 'Configure approval permissions for this position'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class EmployeePositionInline(admin.TabularInline):
    """Inline admin for managing employee positions"""
    model = EmployeePosition
    extra = 0
    fields = ['position', 'is_primary', 'is_active', 'effective_from', 'effective_until', 'assignment_notes']
    autocomplete_fields = ['position']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('position').order_by('-is_primary', '-is_active', '-effective_from')


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ['nip', 'display_name', 'division', 'get_primary_position_name', 'user', 'created_at']
    list_filter = ['division', 'position', 'created_at']
    search_fields = ['nip', 'fullname', 'user__username', 'user__first_name', 'user__last_name']
    autocomplete_fields = ['user', 'division', 'position']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [EmployeePositionInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'nip', 'fullname')
        }),
        ('Organization', {
            'fields': ('division',)
        }),
        ('Legacy Position (Deprecated)', {
            'fields': ('position',),
            'classes': ('collapse',),
            'description': 'This field is deprecated. Use the Positions section below to manage employee positions.'
        }),
        ('Personal Information', {
            'fields': ('gaji_pokok', 'tmt_kerja', 'tempat_lahir', 'tanggal_lahir'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def display_name(self, obj):
        return obj.display_name
    display_name.short_description = 'Display Name'
    
    def get_primary_position_name(self, obj):
        primary_pos = obj.get_primary_position()
        return primary_pos.name if primary_pos else obj.get_position_name()
    get_primary_position_name.short_description = 'Primary Position'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'division', 'position')


@admin.register(EmployeePosition)
class EmployeePositionAdmin(admin.ModelAdmin):
    list_display = ['employee', 'position', 'is_primary', 'is_active', 'effective_from', 'effective_until', 'assigned_by']
    list_filter = ['is_primary', 'is_active', 'effective_from', 'position__approval_level']
    search_fields = ['employee__nip', 'employee__fullname', 'employee__user__username', 'position__name']
    autocomplete_fields = ['employee', 'position', 'assigned_by']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'effective_from'
    
    fieldsets = (
        ('Assignment Details', {
            'fields': ('employee', 'position', 'is_primary', 'is_active')
        }),
        ('Effective Period', {
            'fields': ('effective_from', 'effective_until')
        }),
        ('Assignment Info', {
            'fields': ('assigned_by', 'assignment_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('employee', 'position', 'assigned_by')
