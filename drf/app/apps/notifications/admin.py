from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import Notification, NotificationRead


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'notification_type', 'priority', 'status', 
        'created_by', 'created_at', 'expires_at', 'is_expired_display',
        'target_summary', 'read_stats'
    ]
    list_filter = [
        'notification_type', 'priority', 'status', 'expiry_mode',
        'created_at', 'expires_at', 'is_sticky', 'requires_acknowledgment'
    ]
    search_fields = ['title', 'content', 'created_by__username']
    readonly_fields = [
        'created_by', 'created_at', 'updated_at', 'is_expired_display',
        'target_users_count_display', 'read_count_display', 'unread_count_display'
    ]
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'content', 'notification_type', 'priority', 'status')
        }),
        ('Expiry Settings', {
            'fields': ('expiry_mode', 'expire_after_hours', 'expire_when_all_read', 'expires_at')
        }),
        ('Targeting', {
            'fields': ('target_groups', 'target_divisions', 'target_positions', 'target_specific_users')
        }),
        ('Settings', {
            'fields': ('publish_at', 'is_sticky', 'requires_acknowledgment', 'attachment')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Statistics', {
            'fields': ('is_expired_display', 'target_users_count_display', 'read_count_display', 'unread_count_display'),
            'classes': ('collapse',)
        }),
    )
    filter_horizontal = ['target_groups', 'target_divisions', 'target_positions', 'target_specific_users']
    
    def is_expired_display(self, obj):
        """Display if notification is expired"""
        if obj.is_expired():
            return format_html('<span style="color: red;">✓ Expired</span>')
        return format_html('<span style="color: green;">- Active</span>')
    is_expired_display.short_description = 'Expired'
    
    def target_summary(self, obj):
        """Display target summary"""
        targets = []
        if obj.target_groups.exists():
            targets.append(f"Groups: {obj.target_groups.count()}")
        if obj.target_divisions.exists():
            targets.append(f"Divisions: {obj.target_divisions.count()}")
        if obj.target_positions.exists():
            targets.append(f"Positions: {obj.target_positions.count()}")
        if obj.target_specific_users.exists():
            targets.append(f"Users: {obj.target_specific_users.count()}")
        
        return ", ".join(targets) if targets else "No targets"
    target_summary.short_description = 'Targets'
    
    def read_stats(self, obj):
        """Display read statistics"""
        read_count = obj.get_read_count()
        total_count = obj.get_target_users_count()
        percentage = (read_count / total_count * 100) if total_count > 0 else 0
        
        return format_html(
            '{} / {} ({:.1f}%)',
            read_count, total_count, percentage
        )
    read_stats.short_description = 'Read Stats'
    
    def target_users_count_display(self, obj):
        """Display target users count"""
        return obj.get_target_users_count()
    target_users_count_display.short_description = 'Target Users'
    
    def read_count_display(self, obj):
        """Display read count"""
        return obj.get_read_count()
    read_count_display.short_description = 'Read Count'
    
    def unread_count_display(self, obj):
        """Display unread count"""
        return obj.get_unread_count()
    unread_count_display.short_description = 'Unread Count'
    
    def save_model(self, request, obj, form, change):
        """Set created_by when creating new notification"""
        if not change:  # Creating new object
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(NotificationRead)
class NotificationReadAdmin(admin.ModelAdmin):
    list_display = [
        'notification', 'user', 'read_at', 'acknowledged_at', 'created_at'
    ]
    list_filter = [
        'read_at', 'acknowledged_at', 'created_at',
        'notification__notification_type', 'notification__priority'
    ]
    search_fields = [
        'notification__title', 'user__username', 'user__first_name', 'user__last_name'
    ]
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'notification', 'user'
        )
