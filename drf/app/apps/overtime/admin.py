from django.contrib import admin
from .models import OvertimeRequest, MonthlySummaryRequest
from django.utils import timezone


@admin.register(OvertimeRequest)
class OvertimeRequestAdmin(admin.ModelAdmin):
    """Admin interface for Overtime Request management"""
    list_display = [
        'id', 'user', 'employee', 'request_type', 'date', 'total_hours',
        'status', 'requested_at'
    ]
    list_filter = [
        'request_type', 'status', 'date', 'requested_at', 'created_at', 'updated_at'
    ]
    search_fields = [
        'user__username', 'user__first_name', 'user__last_name', 
        'employee__nip', 'employee__fullname', 'purpose'
    ]
    readonly_fields = [
        'created_at', 'updated_at', 'requested_at', 'total_hours'
    ]
    ordering = ['-requested_at', '-created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'employee', 'attendance', 'request_type')
        }),
        ('Time Details', {
            'fields': ('date', 'start_time', 'end_time', 'total_hours')
        }),
        ('Purpose & Description', {
            'fields': ('purpose', 'work_description')
        }),
        ('Approval Workflow', {
            'fields': (
                'status', 'approved_by', 'approved_at', 'rejection_reason'
            )
        }),
        ('Financial Details', {
            'fields': ('hourly_rate', 'total_amount'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('requested_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'user', 'employee', 'attendance', 'approved_by'
        )
    
    def has_add_permission(self, request):
        """Allow adding overtime request records"""
        return True
    
    def has_delete_permission(self, request, obj=None):
        """Allow deleting overtime request records"""
        return True
    
    actions = ['approve_overtime', 'reject_overtime', 'cancel_overtime']
    
    def approve_overtime(self, request, queryset):
        """Approve selected overtime requests"""
        updated = queryset.update(
            status='approved',
            approved_by=request.user,
            approved_at=timezone.now()
        )
        self.message_user(
            request, 
            f"Successfully approved {updated} overtime request(s)"
        )
    approve_overtime.short_description = "Approve selected overtime requests"
    
    def reject_overtime(self, request, queryset):
        """Reject selected overtime requests"""
        updated = queryset.update(status='rejected')
        self.message_user(
            request, 
            f"Successfully rejected {updated} overtime request(s)"
        )
    reject_overtime.short_description = "Reject selected overtime requests"
    
    def cancel_overtime(self, request, queryset):
        """Cancel selected overtime requests"""
        updated = queryset.update(status='cancelled')
        self.message_user(
            request, 
            f"Successfully cancelled {updated} overtime request(s)"
        )
    cancel_overtime.short_description = "Cancel selected overtime requests"


@admin.register(MonthlySummaryRequest)
class MonthlySummaryRequestAdmin(admin.ModelAdmin):
    """Admin interface for Monthly Summary Request management"""
    list_display = [
        'id', 'user', 'employee', 'month', 'year', 'month_name', 
        'status', 'requested_at'
    ]
    list_filter = [
        'month', 'year', 'status', 'requested_at', 'created_at', 'updated_at'
    ]
    search_fields = [
        'user__username', 'user__first_name', 'user__last_name', 
        'employee__nip', 'employee__fullname', 'purpose'
    ]
    readonly_fields = [
        'created_at', 'updated_at', 'requested_at', 'month_name'
    ]
    ordering = ['-year', '-month', '-requested_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'employee', 'month', 'year', 'month_name')
        }),
        ('Request Details', {
            'fields': ('purpose',)
        }),
        ('Approval Workflow', {
            'fields': (
                'status', 'approved_by', 'approved_at', 'rejection_reason'
            )
        }),
        ('Timestamps', {
            'fields': ('requested_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'user', 'employee', 'approved_by'
        )
    
    def month_name(self, obj):
        """Display month name"""
        return obj.month_name
    month_name.short_description = 'Month Name'
    
    def has_add_permission(self, request):
        """Allow adding monthly summary request records"""
        return True
    
    def has_delete_permission(self, request, obj=None):
        """Allow deleting monthly summary request records"""
        return True
    
    actions = ['approve_summaries', 'reject_summaries']
    
    def approve_summaries(self, request, queryset):
        """Approve selected monthly summary requests"""
        updated = queryset.update(
            status='approved',
            approved_by=request.user,
            approved_at=timezone.now()
        )
        self.message_user(
            request, 
            f"Successfully approved {updated} monthly summary request(s)"
        )
    approve_summaries.short_description = "Approve selected monthly summary requests"
    
    def reject_summaries(self, request, queryset):
        """Reject selected monthly summary requests"""
        updated = queryset.update(status='rejected')
        self.message_user(
            request, 
            f"Successfully rejected {updated} monthly summary request(s)"
        )
    reject_summaries.short_description = "Reject selected monthly summary requests"
