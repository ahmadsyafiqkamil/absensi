from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
from apps.attendance.models import Attendance
from apps.employees.models import Employee
from django.utils import timezone


class AttendanceCorrection(TimeStampedModel):
    """Model for attendance correction requests"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    CORRECTION_TYPE_CHOICES = [
        ('check_in', 'Check-in Time'),
        ('check_out', 'Check-out Time'),
        ('both', 'Both Check-in and Check-out'),
        ('note', 'Add/Update Note'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="correction_requests"
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="correction_requests"
    )
    attendance = models.ForeignKey(
        Attendance,
        on_delete=models.CASCADE,
        related_name="corrections",
        verbose_name="Original Attendance Record",
        null=True,
        blank=True
    )
    date_local = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date for Manual Correction",
        help_text="Required for manual corrections when no attendance record exists"
    )
    
    # Correction details
    correction_type = models.CharField(
        max_length=20,
        choices=CORRECTION_TYPE_CHOICES,
        verbose_name="Type of Correction"
    )
    requested_check_in = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Requested Check-in Time"
    )
    requested_check_out = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Requested Check-out Time"
    )
    requested_note = models.TextField(
        null=True,
        blank=True,
        verbose_name="Requested Note"
    )
    
    # Request details
    reason = models.TextField(
        verbose_name="Reason for Correction",
        help_text="Explain why this correction is needed"
    )
    supporting_document = models.FileField(
        upload_to='corrections/',
        null=True,
        blank=True,
        verbose_name="Supporting Document"
    )
    
    # Approval workflow
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Status"
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_corrections",
        verbose_name="Approved By"
    )
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Approved At"
    )
    rejection_reason = models.TextField(
        null=True,
        blank=True,
        verbose_name="Rejection Reason"
    )
    
    # Timestamps
    requested_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Requested At"
    )
    
    class Meta:
        ordering = ['-requested_at']
        verbose_name = "Attendance Correction"
        verbose_name_plural = "Attendance Corrections"
    
    def __str__(self) -> str:
        date_str = self.attendance.date_local if self.attendance else self.date_local
        return f"Correction {self.id} - {self.user.username} - {date_str}"
    
    def save(self, *args, **kwargs):
        """Auto-set employee if not provided"""
        if not self.employee and self.user:
            try:
                self.employee = self.user.employee_profile
            except:
                pass
        super().save(*args, **kwargs)
    
    @property
    def is_pending(self):
        """Check if correction is pending approval"""
        return self.status == 'pending'
    
    @property
    def is_approved(self):
        """Check if correction is approved"""
        return self.status == 'approved'
    
    @property
    def is_rejected(self):
        """Check if correction is rejected"""
        return self.status == 'rejected'
    
    def approve(self, approved_by):
        """Approve the correction request"""
        self.status = 'approved'
        self.approved_by = approved_by
        self.approved_at = timezone.now()
        self.save()
        
        # Apply correction to attendance record
        self._apply_correction()
    
    def reject(self, rejected_by, reason):
        """Reject the correction request"""
        self.status = 'rejected'
        self.rejection_reason = reason
        self.save()
    
    def _apply_correction(self):
        """Apply the approved correction to the attendance record"""
        if not self.is_approved:
            return
        
        # Get or create attendance record
        attendance = self.attendance
        if not attendance and self.date_local:
            # Create new attendance record for manual correction
            from apps.settings.models import WorkSettings
            from django.utils import timezone as dj_timezone
            
            ws = WorkSettings.objects.first()
            tzname = ws.timezone if ws else dj_timezone.get_current_timezone_name()
            
            attendance = Attendance.objects.create(
                user=self.user,
                date_local=self.date_local,
                timezone=tzname,
                employee=self.employee
            )
            # Link the correction to the new attendance record
            self.attendance = attendance
            self.save()
        
        if not attendance:
            return
        
        # Apply correction changes
        if self.correction_type in ['check_in', 'both'] and self.requested_check_in:
            attendance.check_in_at_utc = self.requested_check_in
        
        if self.correction_type in ['check_out', 'both'] and self.requested_check_out:
            attendance.check_out_at_utc = self.requested_check_out
        
        if self.correction_type == 'note' and self.requested_note:
            attendance.employee_note = self.requested_note
        
        # Recalculate fields
        if attendance.check_in_at_utc and attendance.check_out_at_utc:
            from datetime import timedelta
            duration = attendance.check_out_at_utc - attendance.check_in_at_utc
            attendance.total_work_minutes = int(duration.total_seconds() / 60)
        
        # Recalculate overtime
        overtime_minutes, overtime_amount = attendance.calculate_overtime()
        attendance.overtime_minutes = overtime_minutes
        attendance.overtime_amount = overtime_amount
        
        attendance.save()
