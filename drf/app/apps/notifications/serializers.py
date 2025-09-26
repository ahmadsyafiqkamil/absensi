from rest_framework import serializers
from django.contrib.auth.models import User, Group
from apps.employees.models import Division, Position
from .models import Notification, NotificationRead


class NotificationTargetSerializer(serializers.Serializer):
    """Serializer untuk target options yang diizinkan"""
    groups = serializers.ListField(child=serializers.DictField(), required=False)
    divisions = serializers.ListField(child=serializers.DictField(), required=False)
    positions = serializers.ListField(child=serializers.DictField(), required=False)
    organization_wide = serializers.BooleanField(required=False)
    division_wide = serializers.BooleanField(required=False)


class NotificationReadSerializer(serializers.ModelSerializer):
    """Serializer untuk NotificationRead"""
    user = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = NotificationRead
        fields = ['id', 'user', 'read_at', 'acknowledged_at', 'created_at']


class NotificationStatsSerializer(serializers.Serializer):
    """Serializer untuk statistik notifikasi"""
    total_target_users = serializers.IntegerField()
    read_count = serializers.IntegerField()
    unread_count = serializers.IntegerField()
    is_expired = serializers.BooleanField()
    expiry_mode = serializers.CharField()
    expires_at = serializers.DateTimeField(allow_null=True)


class NotificationListSerializer(serializers.ModelSerializer):
    """Serializer untuk list notifications (read-only, optimized)"""
    created_by = serializers.StringRelatedField(read_only=True)
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    expiry_mode_display = serializers.CharField(source='get_expiry_mode_display', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    target_users_count = serializers.IntegerField(source='get_target_users_count', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'content', 'notification_type', 'notification_type_display',
            'priority', 'priority_display', 'status', 'status_display',
            'expiry_mode', 'expiry_mode_display', 'expires_at', 'expire_after_hours',
            'expire_when_all_read', 'publish_at', 'created_by', 'created_at',
            'updated_at', 'is_sticky', 'requires_acknowledgment', 'is_expired',
            'target_users_count'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class NotificationDetailSerializer(serializers.ModelSerializer):
    """Serializer untuk detail notification dengan full data"""
    created_by = serializers.StringRelatedField(read_only=True)
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    expiry_mode_display = serializers.CharField(source='get_expiry_mode_display', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    target_users_count = serializers.IntegerField(source='get_target_users_count', read_only=True)
    read_count = serializers.IntegerField(source='get_read_count', read_only=True)
    unread_count = serializers.IntegerField(source='get_unread_count', read_only=True)
    
    # Target relationships
    target_groups = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.all(), 
        many=True, 
        required=False,
        write_only=True
    )
    target_divisions = serializers.PrimaryKeyRelatedField(
        queryset=Division.objects.all(), 
        many=True, 
        required=False,
        write_only=True
    )
    target_positions = serializers.PrimaryKeyRelatedField(
        queryset=Position.objects.all(), 
        many=True, 
        required=False,
        write_only=True
    )
    target_specific_users = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), 
        many=True, 
        required=False,
        write_only=True
    )
    
    # Target display fields (read-only)
    target_groups_display = serializers.StringRelatedField(
        source='target_groups', 
        many=True, 
        read_only=True
    )
    target_divisions_display = serializers.StringRelatedField(
        source='target_divisions', 
        many=True, 
        read_only=True
    )
    target_positions_display = serializers.StringRelatedField(
        source='target_positions', 
        many=True, 
        read_only=True
    )
    target_specific_users_display = serializers.StringRelatedField(
        source='target_specific_users', 
        many=True, 
        read_only=True
    )
    
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'content', 'notification_type', 'notification_type_display',
            'priority', 'priority_display', 'status', 'status_display',
            'expiry_mode', 'expiry_mode_display', 'expires_at', 'expire_after_hours',
            'expire_when_all_read', 'publish_at', 'created_by', 'created_at',
            'updated_at', 'attachment', 'is_sticky', 'requires_acknowledgment',
            'is_expired', 'target_users_count', 'read_count', 'unread_count',
            'target_groups', 'target_divisions', 'target_positions', 'target_specific_users',
            'target_groups_display', 'target_divisions_display', 
            'target_positions_display', 'target_specific_users_display'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate notification data"""
        # Validate expiry settings
        if data.get('expiry_mode') == Notification.ExpiryMode.READ_BASED:
            if not data.get('expire_when_all_read'):
                raise serializers.ValidationError({
                    'expire_when_all_read': 'Must be True for read_based expiry mode'
                })
        
        # Validate targeting
        has_targets = (
            data.get('target_groups') or 
            data.get('target_divisions') or 
            data.get('target_positions') or 
            data.get('target_specific_users')
        )
        
        if not has_targets:
            raise serializers.ValidationError(
                'At least one target must be specified'
            )
        
        return data


class UserNotificationSerializer(serializers.ModelSerializer):
    """Serializer untuk user notifications (untuk endpoint user)"""
    created_by = serializers.StringRelatedField(read_only=True)
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    is_read = serializers.SerializerMethodField()
    read_at = serializers.SerializerMethodField()
    acknowledged_at = serializers.SerializerMethodField()
    attachment_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'content', 'notification_type', 'notification_type_display',
            'priority', 'priority_display', 'publish_at', 'created_by', 
            'is_sticky', 'requires_acknowledgment', 'is_expired',
            'is_read', 'read_at', 'acknowledged_at', 'attachment_url'
        ]
    
    def get_is_read(self, obj):
        """Check if current user has read this notification"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            read_record = obj.reads.filter(user=request.user).first()
            return read_record and read_record.read_at is not None
        return False
    
    def get_read_at(self, obj):
        """Get when user read this notification"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            read_record = obj.reads.filter(user=request.user).first()
            return read_record.read_at if read_record else None
        return None
    
    def get_acknowledged_at(self, obj):
        """Get when user acknowledged this notification"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            read_record = obj.reads.filter(user=request.user).first()
            return read_record.acknowledged_at if read_record else None
        return None
    
    def get_attachment_url(self, obj):
        """Get attachment URL if exists"""
        if obj.attachment:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.attachment.url)
        return None


class NotificationCreateSerializer(serializers.ModelSerializer):
    """Serializer untuk create notification (admin only)"""
    
    class Meta:
        model = Notification
        fields = [
            'title', 'content', 'notification_type', 'priority', 'expiry_mode',
            'expire_after_hours', 'expire_when_all_read', 'publish_at',
            'attachment', 'is_sticky', 'requires_acknowledgment',
            'target_groups', 'target_divisions', 'target_positions', 'target_specific_users'
        ]
    
    def validate(self, data):
        """Validate notification creation data"""
        # Validate expiry settings
        if data.get('expiry_mode') == Notification.ExpiryMode.READ_BASED:
            if not data.get('expire_when_all_read'):
                raise serializers.ValidationError({
                    'expire_when_all_read': 'Must be True for read_based expiry mode'
                })
        
        # Validate targeting
        has_targets = (
            data.get('target_groups') or 
            data.get('target_divisions') or 
            data.get('target_positions') or 
            data.get('target_specific_users')
        )
        
        if not has_targets:
            raise serializers.ValidationError(
                'At least one target must be specified'
            )
        
        return data


class NotificationUpdateSerializer(serializers.ModelSerializer):
    """Serializer untuk update notification (admin only)"""
    
    class Meta:
        model = Notification
        fields = [
            'title', 'content', 'notification_type', 'priority', 'status',
            'expiry_mode', 'expire_after_hours', 'expire_when_all_read', 
            'publish_at', 'attachment', 'is_sticky', 'requires_acknowledgment',
            'target_groups', 'target_divisions', 'target_positions', 'target_specific_users'
        ]
    
    def validate_status(self, value):
        """Validate status transitions"""
        instance = self.instance
        if instance and instance.status == Notification.Status.PUBLISHED:
            if value in [Notification.Status.DRAFT]:
                raise serializers.ValidationError(
                    'Cannot change published notification back to draft'
                )
        return value
