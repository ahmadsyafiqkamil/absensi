from django.contrib import admin
from .models import Division, Position, Employee


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


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ['nip', 'display_name', 'division', 'position', 'user', 'created_at']
    list_filter = ['division', 'position', 'created_at']
    search_fields = ['nip', 'fullname', 'user__username', 'user__first_name', 'user__last_name']
    autocomplete_fields = ['user', 'division', 'position']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'nip', 'fullname')
        }),
        ('Organization', {
            'fields': ('division', 'position')
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
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'division', 'position')
