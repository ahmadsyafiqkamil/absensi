from django.contrib import admin
from django.utils import timezone
from .models import ReportTemplate, GeneratedReport, ReportSchedule, ReportAccessLog


@admin.register(ReportTemplate)
class ReportTemplateAdmin(admin.ModelAdmin):
    """Admin interface for Report Template management"""
    list_display = [
        'name', 'template_type', 'format', 'is_active', 'created_by', 'created_at'
    ]
    list_filter = [
        'template_type', 'format', 'is_active', 'created_at', 'updated_at'
    ]
    search_fields = [
        'name', 'description', 'created_by__username', 'created_by__first_name'
    ]
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'template_type', 'format')
        }),
        ('Template Configuration', {
            'fields': ('template_file', 'config_json')
        }),
        ('Access Control', {
            'fields': ('is_active', 'created_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('created_by')
    
    def has_add_permission(self, request):
        """Allow adding report templates"""
        return True
    
    def has_delete_permission(self, request, obj=None):
        """Allow deleting report templates"""
        return True
    
    actions = ['activate_templates', 'deactivate_templates']
    
    def activate_templates(self, request, queryset):
        """Activate selected templates"""
        updated = queryset.update(is_active=True)
        self.message_user(
            request, 
            f"Successfully activated {updated} template(s)"
        )
    activate_templates.short_description = "Activate selected templates"
    
    def deactivate_templates(self, request, queryset):
        """Deactivate selected templates"""
        updated = queryset.update(is_active=False)
        self.message_user(
            request, 
            f"Successfully deactivated {updated} template(s)"
        )
    deactivate_templates.short_description = "Deactivate selected templates"


@admin.register(GeneratedReport)
class GeneratedReportAdmin(admin.ModelAdmin):
    """Admin interface for Generated Report management"""
    list_display = [
        'name', 'report_type', 'status', 'requested_by', 'file_size_display', 
        'created_at', 'is_expired_display'
    ]
    list_filter = [
        'report_type', 'status', 'is_public', 'created_at', 'updated_at'
    ]
    search_fields = [
        'name', 'requested_by__username', 'requested_by__first_name'
    ]
    readonly_fields = [
        'created_at', 'updated_at', 'file_size', 'mime_type'
    ]
    ordering = ['-created_at']
    
    fieldsets = (
        ('Report Information', {
            'fields': ('name', 'report_type', 'template', 'status')
        }),
        ('Parameters & Output', {
            'fields': ('parameters', 'output_file', 'file_size', 'mime_type')
        }),
        ('Status & Error', {
            'fields': ('error_message',)
        }),
        ('Access Control', {
            'fields': ('requested_by', 'is_public', 'expires_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'requested_by', 'template'
        )
    
    def file_size_display(self, obj):
        """Display file size in human readable format"""
        if obj.file_size:
            if obj.file_size < 1024:
                return f"{obj.file_size} B"
            elif obj.file_size < 1024 * 1024:
                return f"{obj.file_size / 1024:.1f} KB"
            else:
                return f"{obj.file_size / (1024 * 1024):.1f} MB"
        return '-'
    file_size_display.short_description = 'File Size'
    
    def is_expired_display(self, obj):
        """Display expiration status"""
        if obj.is_expired:
            return 'Expired'
        elif obj.expires_at:
            return 'Active'
        return 'No Expiry'
    is_expired_display.short_description = 'Expiration'
    
    def has_add_permission(self, request):
        """Allow adding generated reports"""
        return True
    
    def has_delete_permission(self, request, obj=None):
        """Allow deleting generated reports"""
        return True
    
    actions = ['mark_completed', 'mark_failed', 'make_public', 'make_private']
    
    def mark_completed(self, request, queryset):
        """Mark selected reports as completed"""
        updated = queryset.update(status='completed')
        self.message_user(
            request, 
            f"Successfully marked {updated} report(s) as completed"
        )
    mark_completed.short_description = "Mark as completed"
    
    def mark_failed(self, request, queryset):
        """Mark selected reports as failed"""
        updated = queryset.update(status='failed')
        self.message_user(
            request, 
            f"Successfully marked {updated} report(s) as failed"
        )
    mark_failed.short_description = "Mark as failed"
    
    def make_public(self, request, queryset):
        """Make selected reports public"""
        updated = queryset.update(is_public=True)
        self.message_user(
            request, 
            f"Successfully made {updated} report(s) public"
        )
    make_public.short_description = "Make public"
    
    def make_private(self, request, queryset):
        """Make selected reports private"""
        updated = queryset.update(is_public=False)
        self.message_user(
            request, 
            f"Successfully made {updated} report(s) private"
        )
    make_private.short_description = "Make private"


@admin.register(ReportSchedule)
class ReportScheduleAdmin(admin.ModelAdmin):
    """Admin interface for Report Schedule management"""
    list_display = [
        'name', 'template', 'frequency', 'start_date', 'end_date', 
        'is_active', 'next_run', 'last_run_status'
    ]
    list_filter = [
        'frequency', 'is_active', 'start_date', 'end_date', 'created_at'
    ]
    search_fields = [
        'name', 'description', 'created_by__username', 'created_by__first_name'
    ]
    readonly_fields = [
        'next_run', 'last_run', 'last_run_status', 'created_at', 'updated_at'
    ]
    ordering = ['name']
    
    fieldsets = (
        ('Schedule Information', {
            'fields': ('name', 'description', 'template', 'frequency')
        }),
        ('Timing', {
            'fields': ('start_date', 'end_date', 'next_run')
        }),
        ('Configuration', {
            'fields': ('base_parameters',)
        }),
        ('Status & Control', {
            'fields': ('is_active', 'last_run', 'last_run_status')
        }),
        ('Access Control', {
            'fields': ('created_by',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'template', 'created_by'
        )
    
    def has_add_permission(self, request):
        """Allow adding report schedules"""
        return True
    
    def has_delete_permission(self, request, obj=None):
        """Allow deleting report schedules"""
        return True
    
    actions = ['activate_schedules', 'deactivate_schedules', 'reset_next_run']
    
    def activate_schedules(self, request, queryset):
        """Activate selected schedules"""
        updated = queryset.update(is_active=True)
        self.message_user(
            request, 
            f"Successfully activated {updated} schedule(s)"
        )
    activate_schedules.short_description = "Activate selected schedules"
    
    def deactivate_schedules(self, request, queryset):
        """Deactivate selected schedules"""
        updated = queryset.update(is_active=False)
        self.message_user(
            request, 
            f"Successfully deactivated {updated} schedule(s)"
        )
    deactivate_schedules.short_description = "Deactivate selected schedules"
    
    def reset_next_run(self, request, queryset):
        """Reset next run for selected schedules"""
        from datetime import datetime, timedelta
        
        for schedule in queryset:
            if schedule.is_active:
                # Calculate next run based on frequency
                if schedule.frequency == 'daily':
                    schedule.next_run = timezone.now() + timedelta(days=1)
                elif schedule.frequency == 'weekly':
                    schedule.next_run = timezone.now() + timedelta(weeks=1)
                elif schedule.frequency == 'monthly':
                    schedule.next_run = timezone.now() + timedelta(days=30)
                elif schedule.frequency == 'quarterly':
                    schedule.next_run = timezone.now() + timedelta(days=90)
                elif schedule.frequency == 'yearly':
                    schedule.next_run = timezone.now() + timedelta(days=365)
                schedule.save()
        
        self.message_user(
            request, 
            f"Successfully reset next run for {queryset.count()} schedule(s)"
        )
    reset_next_run.short_description = "Reset next run"


@admin.register(ReportAccessLog)
class ReportAccessLogAdmin(admin.ModelAdmin):
    """Admin interface for Report Access Log management"""
    list_display = [
        'user', 'report', 'action', 'ip_address', 'created_at'
    ]
    list_filter = [
        'action', 'created_at'
    ]
    search_fields = [
        'user__username', 'user__first_name', 'report__name', 'ip_address'
    ]
    readonly_fields = ['created_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Access Information', {
            'fields': ('report', 'user', 'action')
        }),
        ('Context', {
            'fields': ('ip_address', 'user_agent', 'session_id')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'report')
    
    def has_add_permission(self, request):
        """Prevent manual addition of access logs"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Prevent editing of access logs"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Allow deleting access logs for cleanup"""
        return True
