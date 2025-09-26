from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from apps.core.models import TimeStampedModel


class Notification(TimeStampedModel):
    """Model untuk menyimpan notifikasi admin ke pengguna"""
    
    class NotificationType(models.TextChoices):
        ANNOUNCEMENT = "announcement", "Pengumuman"
        SYSTEM_ALERT = "system_alert", "Peringatan Sistem"
        ATTENDANCE_REMINDER = "attendance_reminder", "Pengingat Absensi"
        POLICY_UPDATE = "policy_update", "Update Kebijakan"
        MAINTENANCE = "maintenance", "Pemeliharaan Sistem"
        DIVISION_NOTICE = "division_notice", "Pemberitahuan Divisi"
        ORGANIZATION_WIDE = "organization_wide", "Pemberitahuan Organisasi"
    
    class Priority(models.TextChoices):
        LOW = "low", "Rendah"
        MEDIUM = "medium", "Sedang"
        HIGH = "high", "Tinggi"
        URGENT = "urgent", "Mendesak"
    
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Dipublikasikan"
        ARCHIVED = "archived", "Diarsipkan"
        EXPIRED = "expired", "Kedaluwarsa"
    
    class ExpiryMode(models.TextChoices):
        MANUAL = "manual", "Manual (Admin Archive)"
        TIME_BASED = "time_based", "Berdasarkan Waktu"
        READ_BASED = "read_based", "Setelah Semua User Membaca"
        HYBRID = "hybrid", "Waktu atau Setelah Dibaca (mana yang lebih dulu)"
    
    # Basic fields
    title = models.CharField(max_length=200, verbose_name="Judul")
    content = models.TextField(verbose_name="Isi Notifikasi")
    notification_type = models.CharField(
        max_length=20, 
        choices=NotificationType.choices,
        default=NotificationType.ANNOUNCEMENT,
        verbose_name="Tipe Notifikasi"
    )
    priority = models.CharField(
        max_length=10, 
        choices=Priority.choices, 
        default=Priority.MEDIUM,
        verbose_name="Prioritas"
    )
    status = models.CharField(
        max_length=10, 
        choices=Status.choices, 
        default=Status.DRAFT,
        verbose_name="Status"
    )
    
    # Auto-expire configuration
    expiry_mode = models.CharField(
        max_length=15, 
        choices=ExpiryMode.choices, 
        default=ExpiryMode.TIME_BASED,
        verbose_name="Mode Kedaluwarsa",
        help_text="Cara notifikasi akan expired"
    )
    expires_at = models.DateTimeField(
        null=True, 
        blank=True, 
        verbose_name="Kedaluwarsa Pada",
        help_text="Auto-expire pada waktu tertentu (untuk time_based/hybrid)"
    )
    expire_after_hours = models.PositiveIntegerField(
        default=24,
        verbose_name="Kedaluwarsa Setelah (Jam)",
        help_text="Expire setelah berapa jam (default: 24 jam = 1 hari)"
    )
    expire_when_all_read = models.BooleanField(
        default=False,
        verbose_name="Kedaluwarsa Setelah Semua Membaca",
        help_text="Expire ketika semua target user sudah membaca (untuk read_based/hybrid)"
    )
    
    # Targeting
    target_groups = models.ManyToManyField(
        'auth.Group', 
        blank=True, 
        verbose_name="Target Groups",
        help_text="Target groups"
    )
    target_divisions = models.ManyToManyField(
        'employees.Division', 
        blank=True, 
        verbose_name="Target Divisi",
        help_text="Target divisions"
    )
    target_positions = models.ManyToManyField(
        'employees.Position', 
        blank=True, 
        verbose_name="Target Posisi",
        help_text="Target positions"
    )
    target_specific_users = models.ManyToManyField(
        'auth.User', 
        blank=True, 
        verbose_name="Target User Spesifik",
        help_text="Specific users"
    )
    
    # Scheduling
    publish_at = models.DateTimeField(
        null=True, 
        blank=True, 
        verbose_name="Publikasi Pada",
        help_text="Schedule publication"
    )
    
    # Metadata
    created_by = models.ForeignKey(
        'auth.User', 
        on_delete=models.CASCADE, 
        related_name='created_notifications',
        verbose_name="Dibuat Oleh"
    )
    
    # Rich content
    attachment = models.FileField(
        upload_to='notifications/', 
        null=True, 
        blank=True,
        verbose_name="Lampiran"
    )
    is_sticky = models.BooleanField(
        default=False, 
        verbose_name="Sticky",
        help_text="Always show at top"
    )
    requires_acknowledgment = models.BooleanField(
        default=False, 
        verbose_name="Perlu Konfirmasi",
        help_text="User must acknowledge"
    )
    
    class Meta:
        ordering = ['-is_sticky', '-created_at']
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        indexes = [
            models.Index(fields=['status', 'expires_at']),
            models.Index(fields=['created_at']),
            models.Index(fields=['notification_type']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"
    
    def save(self, *args, **kwargs):
        # Auto-set expires_at based on expiry_mode
        if self.expiry_mode in [self.ExpiryMode.TIME_BASED, self.ExpiryMode.HYBRID]:
            if not self.expires_at and self.publish_at:
                self.expires_at = self.publish_at + timedelta(hours=self.expire_after_hours)
            elif not self.expires_at and not self.publish_at:
                self.expires_at = timezone.now() + timedelta(hours=self.expire_after_hours)
        
        super().save(*args, **kwargs)
    
    def is_expired(self):
        """Check if notification is expired based on expiry_mode"""
        if self.status == self.Status.EXPIRED:
            return True
        
        if self.expiry_mode == self.ExpiryMode.TIME_BASED:
            return self.expires_at and timezone.now() > self.expires_at
        
        elif self.expiry_mode == self.ExpiryMode.READ_BASED:
            if not self.expire_when_all_read:
                return False
            
            target_users = self._get_target_users()
            total_target_users = target_users.count()
            
            if total_target_users == 0:
                return True  # No target users, consider expired
            
            read_count = self.reads.filter(read_at__isnull=False).count()
            return read_count >= total_target_users
        
        elif self.expiry_mode == self.ExpiryMode.HYBRID:
            # Check both time and read conditions
            time_expired = self.expires_at and timezone.now() > self.expires_at
            read_expired = False
            
            if self.expire_when_all_read:
                target_users = self._get_target_users()
                total_target_users = target_users.count()
                if total_target_users > 0:
                    read_count = self.reads.filter(read_at__isnull=False).count()
                    read_expired = read_count >= total_target_users
                else:
                    read_expired = True
            
            return time_expired or read_expired
        
        return False
    
    def _get_target_users(self):
        """Get all target users for this notification"""
        from django.contrib.auth.models import User
        
        users = set()
        
        # Add users from target groups
        for group in self.target_groups.all():
            users.update(group.user_set.all())
        
        # Add users from target divisions
        for division in self.target_divisions.all():
            users.update(User.objects.filter(employee_profile__division=division))
        
        # Add users from target positions
        for position in self.target_positions.all():
            users.update(User.objects.filter(employee_profile__positions=position))
        
        # Add specific users
        users.update(self.target_specific_users.all())
        
        return User.objects.filter(id__in=[u.id for u in users])
    
    def get_target_users_count(self):
        """Get count of target users"""
        return self._get_target_users().count()
    
    def get_read_count(self):
        """Get count of users who have read this notification"""
        return self.reads.filter(read_at__isnull=False).count()
    
    def get_unread_count(self):
        """Get count of users who haven't read this notification"""
        return self.get_target_users_count() - self.get_read_count()


class NotificationRead(TimeStampedModel):
    """Track which users have read/acknowledged notifications"""
    notification = models.ForeignKey(
        Notification, 
        on_delete=models.CASCADE, 
        related_name='reads',
        verbose_name="Notification"
    )
    user = models.ForeignKey(
        'auth.User', 
        on_delete=models.CASCADE, 
        related_name='notification_reads',
        verbose_name="User"
    )
    read_at = models.DateTimeField(
        null=True, 
        blank=True,
        verbose_name="Dibaca Pada"
    )
    acknowledged_at = models.DateTimeField(
        null=True, 
        blank=True,
        verbose_name="Dikonfirmasi Pada"
    )
    
    class Meta:
        unique_together = ('notification', 'user')
        verbose_name = "Notification Read"
        verbose_name_plural = "Notification Reads"
        indexes = [
            models.Index(fields=['user', 'read_at']),
            models.Index(fields=['notification', 'read_at']),
        ]
    
    def __str__(self):
        status = "Read" if self.read_at else "Unread"
        return f"{self.user.username} - {self.notification.title} ({status})"
    
    def mark_as_read(self):
        """Mark notification as read"""
        if not self.read_at:
            self.read_at = timezone.now()
            self.save()
    
    def mark_as_acknowledged(self):
        """Mark notification as acknowledged"""
        self.mark_as_read()
        if not self.acknowledged_at:
            self.acknowledged_at = timezone.now()
            self.save()
