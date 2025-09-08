from django.contrib import admin
from .models import AttendanceCorrection
from django.utils import timezone


@admin.register(AttendanceCorrection)
class AttendanceCorrectionAdmin(admin.ModelAdmin):
    """Admin interface for Attendance Correction management"""
    list_display = [
        'id', 'user', 'employee', 'correction_type', 'attendance_date', 
        'status', 'requested_at'
    ]
    list_filter = [
        'correction_type', 'status', 'requested_at', 'created_at', 'updated_at'
    ]
    search_fields = [
        'user__username', 'user__first_name', 'user__last_name', 
        'employee__nip', 'employee__fullname', 'reason'
    ]
    readonly_fields = [
        'created_at', 'updated_at', 'requested_at'
    ]
    ordering = ['-requested_at', '-created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'employee', 'attendance', 'correction_type')
        }),
        ('Correction Details', {
            'fields': (
                'requested_check_in', 'requested_check_out', 'requested_note'
            )
        }),
        ('Request Information', {
            'fields': ('reason', 'supporting_document')
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
            'user', 'employee', 'attendance', 'approved_by'
        )
    
    def attendance_date(self, obj):
        """Display attendance date"""
        return obj.attendance.date_local if obj.attendance else '-'
    attendance_date.short_description = 'Attendance Date'
    
    def has_add_permission(self, request):
        """Allow adding correction records"""
        return True
    
    def has_delete_permission(self, request, obj=None):
        """Allow deleting correction records"""
        return True
    
    actions = ['approve_corrections', 'reject_corrections']
    
    def approve_corrections(self, request, queryset):
        """Approve selected corrections"""
        updated = queryset.update(
            status='approved',
            approved_by=request.user,
            approved_at=timezone.now()
        )
        self.message_user(
            request, 
            f"Successfully approved {updated} correction(s)"
        )
    approve_corrections.short_description = "Approve selected corrections"
    
    def reject_corrections(self, request, queryset):
        """Reject selected corrections"""
        updated = queryset.update(status='rejected')
        self.message_user(
            request, 
            f"Successfully rejected {updated} correction(s)"
        )
    reject_corrections.short_description = "Reject selected corrections"
