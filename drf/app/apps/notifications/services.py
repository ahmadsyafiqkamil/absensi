from django.utils import timezone
from django.db.models import Q
from django.contrib.auth.models import User
from datetime import timedelta
from .models import Notification, NotificationRead
from .permissions import NotificationPermissionMixin


class NotificationService:
    """Service layer untuk business logic notifications"""
    
    @staticmethod
    def create_notification(notification_data, created_by):
        """Create notification with proper targeting and auto-expire setup"""
        
        # Validate permissions for targets
        if not NotificationPermissionMixin.can_create_notification(created_by):
            raise PermissionError("User tidak memiliki permission untuk membuat notifikasi")
        
        # Auto-set expiry based on mode
        if notification_data.get('expiry_mode') == Notification.ExpiryMode.TIME_BASED:
            if not notification_data.get('expires_at'):
                hours = notification_data.get('expire_after_hours', 24)
                notification_data['expires_at'] = timezone.now() + timedelta(hours=hours)
        
        # Extract many-to-many fields
        target_groups = notification_data.pop('target_groups', [])
        target_divisions = notification_data.pop('target_divisions', [])
        target_positions = notification_data.pop('target_positions', [])
        target_specific_users = notification_data.pop('target_specific_users', [])
        
        # Create notification
        notification = Notification.objects.create(
            **notification_data,
            created_by=created_by
        )
        
        # Set many-to-many relationships
        if target_groups:
            notification.target_groups.set(target_groups)
        if target_divisions:
            notification.target_divisions.set(target_divisions)
        if target_positions:
            notification.target_positions.set(target_positions)
        if target_specific_users:
            notification.target_specific_users.set(target_specific_users)
        
        # Determine target users and create read tracking
        target_users = NotificationService._get_target_users(notification)
        
        # Create read tracking records
        read_records = []
        for user in target_users:
            read_records.append(
                NotificationRead(notification=notification, user=user)
            )
        NotificationRead.objects.bulk_create(read_records)
        
        return notification
    
    @staticmethod
    def get_user_notifications(user, status='published', unread_only=False, include_expired=False):
        """Get notifications for specific user with auto-expire filtering"""
        
        # Get base queryset
        notifications = Notification.objects.filter(
            status=status,
            reads__user=user
        ).select_related('created_by').prefetch_related(
            'target_groups', 'target_divisions', 'target_positions'
        )
        
        # Filter expired notifications
        if not include_expired:
            # Exclude time-based expired notifications
            notifications = notifications.exclude(
                Q(expiry_mode=Notification.ExpiryMode.TIME_BASED) &
                Q(expires_at__lt=timezone.now())
            )
            
            # Exclude read-based expired notifications
            notifications = notifications.exclude(
                Q(expiry_mode__in=[Notification.ExpiryMode.READ_BASED, Notification.ExpiryMode.HYBRID]) &
                Q(expire_when_all_read=True)
            ).annotate(
                # This is a complex query that checks if all target users have read
                # For now, we'll handle this in the view level
            )
        
        # Filter unread
        if unread_only:
            notifications = notifications.filter(
                reads__user=user,
                reads__read_at__isnull=True
            )
        
        return notifications.order_by('-is_sticky', '-created_at')
    
    @staticmethod
    def mark_notification_read(notification, user):
        """Mark notification as read and check for auto-expire"""
        read_record, created = NotificationRead.objects.get_or_create(
            notification=notification,
            user=user
        )
        
        if not read_record.read_at:
            read_record.mark_as_read()
            
            # Check if notification should auto-expire
            NotificationService._check_read_based_expiry(notification)
    
    @staticmethod
    def mark_notification_acknowledged(notification, user):
        """Mark notification as acknowledged"""
        read_record, created = NotificationRead.objects.get_or_create(
            notification=notification,
            user=user
        )
        
        read_record.mark_as_acknowledged()
        
        # Check if notification should auto-expire
        NotificationService._check_read_based_expiry(notification)
    
    @staticmethod
    def get_notification_stats(notification):
        """Get statistics for a notification"""
        target_users = NotificationService._get_target_users(notification)
        total_target_users = target_users.count()
        
        read_count = notification.reads.filter(read_at__isnull=False).count()
        unread_count = total_target_users - read_count
        
        return {
            'total_target_users': total_target_users,
            'read_count': read_count,
            'unread_count': unread_count,
            'is_expired': notification.is_expired(),
            'expiry_mode': notification.get_expiry_mode_display(),
            'expires_at': notification.expires_at,
        }
    
    @staticmethod
    def publish_notification(notification):
        """Publish a notification"""
        if notification.status != Notification.Status.DRAFT:
            raise ValueError("Hanya notifikasi draft yang dapat dipublikasikan")
        
        notification.status = Notification.Status.PUBLISHED
        if not notification.publish_at:
            notification.publish_at = timezone.now()
        notification.save()
        
        return notification
    
    @staticmethod
    def archive_notification(notification):
        """Archive a notification"""
        notification.status = Notification.Status.ARCHIVED
        notification.save()
        
        return notification
    
    @staticmethod
    def cleanup_expired_notifications():
        """Cleanup expired notifications"""
        processed_count = 0
        
        # Mark time-based expired notifications
        time_expired = Notification.objects.filter(
            status=Notification.Status.PUBLISHED,
            expiry_mode=Notification.ExpiryMode.TIME_BASED,
            expires_at__lt=timezone.now()
        )
        
        for notification in time_expired:
            notification.status = Notification.Status.EXPIRED
            notification.save()
            processed_count += 1
        
        # Mark hybrid time-based expired notifications
        hybrid_time_expired = Notification.objects.filter(
            status=Notification.Status.PUBLISHED,
            expiry_mode=Notification.ExpiryMode.HYBRID,
            expires_at__lt=timezone.now()
        )
        
        for notification in hybrid_time_expired:
            notification.status = Notification.Status.EXPIRED
            notification.save()
            processed_count += 1
        
        # Mark read-based expired notifications
        read_based_notifications = Notification.objects.filter(
            status=Notification.Status.PUBLISHED,
            expiry_mode__in=[Notification.ExpiryMode.READ_BASED, Notification.ExpiryMode.HYBRID],
            expire_when_all_read=True
        )
        
        for notification in read_based_notifications:
            if NotificationService._check_read_based_expiry(notification):
                processed_count += 1
        
        return f"Processed {processed_count} expired notifications"
    
    @staticmethod
    def _get_target_users(notification):
        """Get all target users for this notification"""
        users = set()
        
        # Add users from target groups
        for group in notification.target_groups.all():
            users.update(group.user_set.all())
        
        # Add users from target divisions
        for division in notification.target_divisions.all():
            users.update(User.objects.filter(employee_profile__division=division))
        
        # Add users from target positions
        for position in notification.target_positions.all():
            users.update(User.objects.filter(employee_profile__positions=position))
        
        # Add specific users
        users.update(notification.target_specific_users.all())
        
        return User.objects.filter(id__in=[u.id for u in users])
    
    @staticmethod
    def _check_read_based_expiry(notification):
        """Check if notification should expire based on read status"""
        if notification.expiry_mode not in [Notification.ExpiryMode.READ_BASED, Notification.ExpiryMode.HYBRID]:
            return False
        
        if not notification.expire_when_all_read:
            return False
        
        target_users = NotificationService._get_target_users(notification)
        total_target_users = target_users.count()
        
        if total_target_users == 0:
            notification.status = Notification.Status.EXPIRED
            notification.save()
            return True
        
        read_count = notification.reads.filter(read_at__isnull=False).count()
        
        if read_count >= total_target_users:
            notification.status = Notification.Status.EXPIRED
            notification.save()
            return True
        
        return False
    
    @staticmethod
    def get_user_unread_count(user):
        """Get count of unread notifications for user"""
        notifications = Notification.objects.filter(
            status=Notification.Status.PUBLISHED,
            reads__user=user,
            reads__read_at__isnull=True
        )
        
        # Filter out expired notifications
        unexpired_notifications = []
        for notification in notifications:
            if not notification.is_expired():
                unexpired_notifications.append(notification.id)
        
        return len(unexpired_notifications)
    
    @staticmethod
    def get_user_notification_summary(user):
        """Get summary of user notifications"""
        notifications = NotificationService.get_user_notifications(user)
        
        summary = {
            'total': notifications.count(),
            'unread': 0,
            'urgent': 0,
            'requires_acknowledgment': 0
        }
        
        for notification in notifications:
            # Check if unread
            read_record = notification.reads.filter(user=user).first()
            if not read_record or not read_record.read_at:
                summary['unread'] += 1
            
            # Check if urgent
            if notification.priority == Notification.Priority.URGENT:
                summary['urgent'] += 1
            
            # Check if requires acknowledgment
            if notification.requires_acknowledgment:
                if not read_record or not read_record.acknowledged_at:
                    summary['requires_acknowledgment'] += 1
        
        return summary


# Management command functions for cleanup
def cleanup_expired_notifications_command():
    """Command function for Django management command"""
    return NotificationService.cleanup_expired_notifications()
