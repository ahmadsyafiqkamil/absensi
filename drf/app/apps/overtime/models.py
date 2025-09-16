from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
from apps.attendance.models import Attendance
from apps.employees.models import Employee
from django.utils import timezone


class OvertimeRequest(TimeStampedModel):
    """Model for overtime request management"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('level1_approved', 'Level 1 Approved'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    
    REQUEST_TYPE_CHOICES = [
        ('regular', 'Regular Overtime'),
        ('holiday', 'Holiday Overtime'),
        ('weekend', 'Weekend Overtime'),
        ('emergency', 'Emergency Overtime'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="overtime_request_records"
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="overtime_requests"
    )
    attendance = models.ForeignKey(
        Attendance,
        on_delete=models.CASCADE,
        related_name="overtime_requests",
        verbose_name="Related Attendance Record"
    )
    
    # Request details
    request_type = models.CharField(
        max_length=20,
        choices=REQUEST_TYPE_CHOICES,
        default='regular',
        verbose_name="Type of Overtime"
    )
    date = models.DateField(verbose_name="Overtime Date")
    start_time = models.TimeField(verbose_name="Start Time")
    end_time = models.TimeField(verbose_name="End Time")
    total_hours = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        verbose_name="Total Hours"
    )
    
    # Purpose and justification
    purpose = models.TextField(
        verbose_name="Purpose of Overtime",
        help_text="Explain why overtime is needed"
    )
    work_description = models.TextField(
        verbose_name="Work Description",
        help_text="Describe the work to be done during overtime"
    )
    
    # Approval workflow
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Status"
    )
    
    # Level 1 Approval (e.g., Head of Division)
    level1_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="level1_approved_overtime_requests",
        verbose_name="Level 1 Approved By"
    )
    level1_approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Level 1 Approved At"
    )

    # Final Approval (e.g., KSDM)
    final_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="final_approved_overtime_requests",
        verbose_name="Final Approved By"
    )
    final_approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Final Approved At"
    )

    rejection_reason = models.TextField(
        null=True,
        blank=True,
        verbose_name="Rejection Reason"
    )
    
    # Deprecated fields (to be removed later)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_overtime_request_records",
        verbose_name="Approved By (deprecated)"
    )
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Approved At (deprecated)"
    )

    # Financial details
    hourly_rate = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Hourly Rate"
    )
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Total Amount"
    )
    
    # Timestamps
    requested_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Requested At"
    )
    
    class Meta:
        ordering = ['-requested_at']
        verbose_name = "Overtime Request"
        verbose_name_plural = "Overtime Requests"
    
    def __str__(self) -> str:
        return f"Overtime {self.id} - {self.user.username} - {self.date}"
    
    def save(self, *args, **kwargs):
        """Auto-calculate fields before saving"""
        # Auto-set employee if not provided
        if not self.employee and self.user:
            try:
                self.employee = self.user.employee_profile
            except:
                pass
        
        # Calculate total hours if start and end time are provided
        if self.start_time and self.end_time:
            from datetime import datetime, timedelta
            start_dt = datetime.combine(self.date, self.start_time)
            end_dt = datetime.combine(self.date, self.end_time)
            
            # Handle overnight overtime
            if end_dt < start_dt:
                end_dt += timedelta(days=1)
            
            duration = end_dt - start_dt
            self.total_hours = round(duration.total_seconds() / 3600, 2)
        
        # Calculate financial details if approved
        if self.status == 'approved' and self.employee and self.employee.gaji_pokok:
            self._calculate_financial_details()
        
        super().save(*args, **kwargs)
    
    @property
    def is_pending(self):
        """Check if request is pending approval"""
        return self.status == 'pending'
    
    @property
    def is_approved(self):
        """Check if request is approved"""
        return self.status == 'approved'
    
    @property
    def is_rejected(self):
        """Check if request is rejected"""
        return self.status == 'rejected'
    
    @property
    def is_cancelled(self):
        """Check if request is cancelled"""
        return self.status == 'cancelled'
    
    def approve(self, approved_by):
        """Approve the overtime request"""
        self.status = 'approved'
        self.final_approved_by = approved_by
        self.final_approved_at = timezone.now()
        # For backward compatibility, fill old fields too
        self.approved_by = approved_by
        self.approved_at = timezone.now()
        self.save()
        
        # Calculate financial details
        self._calculate_financial_details()
        self.save()
    
    def reject(self, rejected_by, reason):
        """Reject the overtime request"""
        self.status = 'rejected'
        self.rejection_reason = reason
        self.save()
    
    def cancel(self, cancelled_by):
        """Cancel the overtime request"""
        self.status = 'cancelled'
        self.save()
    
    def _calculate_financial_details(self):
        """Calculate hourly rate and total amount"""
        if not self.employee or not self.employee.gaji_pokok:
            return
        
        try:
            # Get work settings for overtime rates
            from apps.settings.models import WorkSettings
            work_settings = WorkSettings.objects.first()
            
            if work_settings:
                # Determine rate based on request type
                if self.request_type == 'holiday':
                    rate_multiplier = work_settings.overtime_rate_holiday or 0.75
                else:
                    rate_multiplier = work_settings.overtime_rate_workday or 0.50
                
                # Calculate hourly rate
                monthly_hours = 22 * 8  # 22 workdays * 8 hours per day
                base_hourly_rate = float(self.employee.gaji_pokok) / monthly_hours
                self.hourly_rate = base_hourly_rate * rate_multiplier
                
                # Calculate total amount
                self.total_amount = self.hourly_rate * float(self.total_hours)
                
        except Exception:
            pass


class MonthlySummaryRequest(TimeStampedModel):
    """Model for monthly summary requests"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('level1_approved', 'Level 1 Approved'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="monthly_summary_request_records"
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="monthly_summary_requests"
    )
    
    # Request details
    month = models.PositiveIntegerField(verbose_name="Month (1-12)")
    year = models.PositiveIntegerField(verbose_name="Year")
    purpose = models.TextField(
        verbose_name="Purpose of Request",
        help_text="Explain why this monthly summary is needed"
    )
    
    # Approval workflow
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Status"
    )
    # Level 1 Approval (e.g., Head of Division)
    level1_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="level1_approved_monthly_summary_records",
        verbose_name="Level 1 Approved By"
    )
    level1_approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Level 1 Approved At"
    )

    # Final Approval (e.g., KSDM)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_monthly_summary_records",
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
        ordering = ['-year', '-month', '-requested_at']
        verbose_name = "Monthly Summary Request"
        verbose_name_plural = "Monthly Summary Requests"
        unique_together = ('user', 'month', 'year')
    
    def __str__(self) -> str:
        return f"Monthly Summary {self.month}/{self.year} - {self.user.username}"
    
    def save(self, *args, **kwargs):
        """Auto-set employee if not provided"""
        if not self.employee and self.user:
            try:
                self.employee = self.user.employee_profile
            except:
                pass
        super().save(*args, **kwargs)
    
    @property
    def month_name(self):
        """Get month name"""
        from datetime import datetime
        return datetime(self.year, self.month, 1).strftime('%B')
    
    @property
    def is_pending(self):
        """Check if request is pending approval"""
        return self.status == 'pending'
    
    @property
    def is_approved(self):
        """Check if request is approved"""
        return self.status == 'approved'
    
    @property
    def is_rejected(self):
        """Check if request is rejected"""
        return self.status == 'rejected'
    
    def approve_level1(self, approved_by):
        """Perform level 1 approval"""
        self.status = 'level1_approved'
        self.level1_approved_by = approved_by
        self.level1_approved_at = timezone.now()
        self.save()

    def approve_final(self, approved_by):
        """Perform final approval. If level1 not set, fill it too."""
        if not self.level1_approved_by:
            self.level1_approved_by = approved_by
            self.level1_approved_at = timezone.now()
        self.status = 'approved'
        self.approved_by = approved_by
        self.approved_at = timezone.now()
        self.save()
    
    def reject(self, rejected_by, reason):
        """Reject the monthly summary request"""
        self.status = 'rejected'
        self.rejection_reason = reason
        self.save()
