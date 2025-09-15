from django.db import models
from django.utils import timezone
from django.conf import settings
from datetime import time


class TimeStampedModel(models.Model):
    """Abstract base model with timestamp fields"""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True


class SoftDeleteModel(TimeStampedModel):
    """Abstract base model with soft delete capability"""
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        abstract = True
    
    def soft_delete(self):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save()
    
    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.save()
    
    class Meta:
        abstract = True


class GroupPermission(models.Model):
    """
    Model untuk menyimpan permission detail per group
    """
    PERMISSION_TYPES = [
        ('attendance', 'Attendance Management'),
        ('overtime', 'Overtime Management'),
        ('employee', 'Employee Management'),
        ('division', 'Division Management'),
        ('position', 'Position Management'),
        ('settings', 'System Settings'),
        ('reports', 'Reports & Analytics'),
        ('admin', 'Admin Functions'),
        # Django built-in permissions
        ('session', 'Session Management'),
        ('logentry', 'Log Entry Management'),
        ('contenttype', 'Content Type Management'),
        ('permission', 'Permission Management'),
        ('group', 'Group Management'),
        ('user', 'User Management'),
        ('holiday', 'Holiday Management'),
        ('worksettings', 'Work Settings Management'),
        ('overtimesummaryrequest', 'Overtime Summary Request Management'),
        ('overtimerequest', 'Overtime Request Management'),
        ('overtimeexporthistory', 'Overtime Export History Management'),
        ('attendancecorrection', 'Attendance Correction Management'),
        ('grouppermission', 'Group Permission Management'),
        ('grouppermissiontemplate', 'Group Permission Template Management'),
        ('generatedreport', 'Generated Report Management'),
        ('reportaccesslog', 'Report Access Log Management'),
        ('reportschedule', 'Report Schedule Management'),
        ('reporttemplate', 'Report Template Management'),
    ]
    
    PERMISSION_ACTIONS = [
        ('view', 'View'),
        ('create', 'Create'),
        ('edit', 'Edit'),
        ('delete', 'Delete'),
        ('approve', 'Approve'),
        ('reject', 'Reject'),
        ('export', 'Export'),
        ('import', 'Import'),
    ]
    
    group = models.ForeignKey(
        'auth.Group',
        on_delete=models.CASCADE,
        related_name='custom_permissions',
        verbose_name="Group"
    )
    permission_type = models.CharField(
        max_length=30,
        choices=PERMISSION_TYPES,
        verbose_name="Permission Type"
    )
    permission_action = models.CharField(
        max_length=20,
        choices=PERMISSION_ACTIONS,
        verbose_name="Permission Action"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Is Active"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Group Permission"
        verbose_name_plural = "Group Permissions"
        unique_together = ("group", "permission_type", "permission_action")
        ordering = ["group__name", "permission_type", "permission_action"]
    
    def __str__(self):
        return f"{self.group.name} - {self.get_permission_type_display()} - {self.get_permission_action_display()}"
    
    @classmethod
    def get_permission_string(cls, permission_type, permission_action):
        """Generate permission string in format: app.action_model"""
        return f"{permission_type}.{permission_action}"
    
    @classmethod
    def has_permission(cls, user, permission_type, permission_action):
        """Check if user has specific permission through their groups"""
        if user.is_superuser:
            return True
        
        user_groups = user.groups.all()
        return cls.objects.filter(
            group__in=user_groups,
            permission_type=permission_type,
            permission_action=permission_action,
            is_active=True
        ).exists()


class GroupPermissionTemplate(models.Model):
    """
    Template untuk permission yang bisa diaplikasikan ke group
    """
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Template Name"
    )
    description = models.TextField(
        blank=True,
        verbose_name="Description"
    )
    permissions = models.JSONField(
        default=list,
        verbose_name="Permissions List",
        help_text="List of permission strings in format: [{'type': 'attendance', 'action': 'view'}]"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Is Active"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Permission Template"
        verbose_name_plural = "Permission Templates"
        ordering = ["name"]
    
    def __str__(self):
        return self.name
    
    def apply_to_group(self, group):
        """Apply template permissions to a group"""
        from django.contrib.auth.models import Permission
        from django.contrib.contenttypes.models import ContentType

        # Clear existing custom permissions for this group
        GroupPermission.objects.filter(group=group).delete()

        # Create new permissions based on template
        for perm_data in self.permissions:
            perm_type = perm_data.get('type')
            perm_action = perm_data.get('action')

            if perm_type and perm_action:
                GroupPermission.objects.create(
                    group=group,
                    permission_type=perm_type,
                    permission_action=perm_action,
                    is_active=True
                )
