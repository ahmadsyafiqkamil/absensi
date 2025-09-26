from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from .models import Notification, NotificationRead
from .serializers import (
    NotificationListSerializer, NotificationDetailSerializer, 
    NotificationCreateSerializer, NotificationUpdateSerializer,
    UserNotificationSerializer, NotificationStatsSerializer,
    NotificationTargetSerializer
)
from .permissions import (
    IsNotificationCreator, IsNotificationTargetValidator, IsNotificationOwnerOrAdmin,
    IsNotificationManager, IsNotificationViewer, CanPublishNotification,
    CanArchiveNotification, NotificationPermissionMixin
)
from .services import NotificationService


class AdminNotificationViewSet(viewsets.ModelViewSet):
    """ViewSet untuk admin notification management"""
    permission_classes = [IsNotificationManager, IsNotificationTargetValidator]
    
    def get_queryset(self):
        user = self.request.user
        
        # Admin can see all
        if user.is_superuser or user.groups.filter(name='admin').exists():
            return Notification.objects.all().select_related('created_by').prefetch_related(
                'target_groups', 'target_divisions', 'target_positions', 'target_specific_users'
            )
        
        # Others can only see their own
        return Notification.objects.filter(created_by=user).select_related('created_by').prefetch_related(
            'target_groups', 'target_divisions', 'target_positions', 'target_specific_users'
        )
    
    def get_serializer_class(self):
        if self.action == 'list':
            return NotificationListSerializer
        elif self.action == 'create':
            return NotificationCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return NotificationUpdateSerializer
        else:
            return NotificationDetailSerializer
    
    def create(self, request, *args, **kwargs):
        # Validate targets based on user permissions
        data = request.data.copy()
        
        # Get allowed targets for user
        allowed_targets = NotificationPermissionMixin.get_allowed_targets(request.user)
        
        # Validate organization-wide targeting
        target_divisions = data.get('target_divisions', [])
        target_groups = data.get('target_groups', [])
        
        # Multiple divisions = organization-wide
        if len(target_divisions) > 1:
            if not allowed_targets['organization_wide']:
                return Response({
                    'error': 'Anda tidak memiliki permission untuk mengirim notifikasi ke seluruh organisasi'
                }, status=status.HTTP_403_FORBIDDEN)
        
        # Multiple groups could also be organization-wide
        elif len(target_groups) > 1:
            if not allowed_targets['organization_wide']:
                return Response({
                    'error': 'Anda tidak memiliki permission untuk mengirim notifikasi ke seluruh organisasi'
                }, status=status.HTTP_403_FORBIDDEN)
        
        # Validate division targeting for supervisors
        elif target_divisions:
            user_division_id = None
            try:
                user_division_id = request.user.employee_profile.division.id
            except:
                pass
            
            # Check if user is trying to target divisions they don't have access to
            if not allowed_targets['organization_wide']:
                for division_id in target_divisions:
                    if division_id != user_division_id:
                        return Response({
                            'error': 'Anda hanya dapat mengirim notifikasi ke divisi Anda sendiri'
                        }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            notification = NotificationService.create_notification(data, request.user)
            serializer = self.get_serializer(notification)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def perform_update(self, serializer):
        # Only allow update if user owns the notification or is admin
        notification = self.get_object()
        if (not (self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists()) 
            and notification.created_by != self.request.user):
            return Response({'error': 'Anda hanya dapat mengedit notifikasi yang Anda buat'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        serializer.save()
    
    @action(detail=False, methods=['get'])
    def allowed_targets(self, request):
        """Get allowed targets for current user"""
        targets = NotificationPermissionMixin.get_allowed_targets(request.user)
        serializer = NotificationTargetSerializer(targets)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish notification"""
        notification = self.get_object()
        
        if notification.status != Notification.Status.DRAFT:
            return Response({
                'error': 'Hanya notifikasi draft yang dapat dipublikasikan'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            NotificationService.publish_notification(notification)
            return Response({'message': 'Notifikasi berhasil dipublikasikan'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive notification"""
        notification = self.get_object()
        
        if notification.status not in [Notification.Status.PUBLISHED, Notification.Status.EXPIRED]:
            return Response({
                'error': 'Hanya notifikasi yang dipublikasikan atau kedaluwarsa yang dapat diarsipkan'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            NotificationService.archive_notification(notification)
            return Response({'message': 'Notifikasi berhasil diarsipkan'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get notification statistics"""
        notification = self.get_object()
        stats = NotificationService.get_notification_stats(notification)
        serializer = NotificationStatsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def cleanup_expired(self, request):
        """Manually cleanup expired notifications"""
        if not (request.user.is_superuser or request.user.groups.filter(name='admin').exists()):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            result = NotificationService.cleanup_expired_notifications()
            return Response({'message': result})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet untuk user notifications (read-only)"""
    permission_classes = [IsNotificationViewer]
    serializer_class = UserNotificationSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        # Get user notifications with proper filtering
        notifications = NotificationService.get_user_notifications(
            user, 
            status=Notification.Status.PUBLISHED,
            include_expired=False
        )
        
        # Additional filtering based on query parameters
        unread_only = self.request.query_params.get('unread_only', 'false').lower() == 'true'
        if unread_only:
            notifications = notifications.filter(
                reads__user=user,
                reads__read_at__isnull=True
            )
        
        notification_type = self.request.query_params.get('type')
        if notification_type:
            notifications = notifications.filter(notification_type=notification_type)
        
        priority = self.request.query_params.get('priority')
        if priority:
            notifications = notifications.filter(priority=priority)
        
        return notifications
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        
        try:
            NotificationService.mark_notification_read(notification, request.user)
            return Response({'message': 'Notifikasi telah ditandai sebagai dibaca'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Acknowledge notification (if required)"""
        notification = self.get_object()
        
        if not notification.requires_acknowledgment:
            return Response({
                'error': 'Notifikasi ini tidak memerlukan konfirmasi'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            NotificationService.mark_notification_acknowledged(notification, request.user)
            return Response({'message': 'Notifikasi telah dikonfirmasi'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        try:
            count = NotificationService.get_user_unread_count(request.user)
            return Response({'unread_count': count})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get notification summary for user"""
        try:
            summary = NotificationService.get_user_notification_summary(request.user)
            return Response(summary)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
