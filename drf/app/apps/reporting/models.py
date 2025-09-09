from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
from apps.employees.models import Employee, Division
from apps.attendance.models import Attendance
from apps.overtime.models import OvertimeRequest
from apps.settings.models import WorkSettings


class ReportTemplate(TimeStampedModel):
    """Model for storing report templates"""
    TEMPLATE_TYPE_CHOICES = [
        ('attendance', 'Attendance Report'),
        ('overtime', 'Overtime Report'),
        ('summary', 'Summary Report'),
        ('custom', 'Custom Report'),
    ]
    
    FORMAT_CHOICES = [
        ('pdf', 'PDF'),
        ('excel', 'Excel'),
        ('csv', 'CSV'),
        ('json', 'JSON'),
    ]
    
    name = models.CharField(max_length=100, verbose_name="Template Name")
    description = models.TextField(blank=True, verbose_name="Description")
    template_type = models.CharField(
        max_length=20,
        choices=TEMPLATE_TYPE_CHOICES,
        verbose_name="Report Type"
    )
    format = models.CharField(
        max_length=10,
        choices=FORMAT_CHOICES,
        default='pdf',
        verbose_name="Output Format"
    )
    
    # Template configuration
    template_file = models.FileField(
        upload_to='report_templates/',
        null=True,
        blank=True,
        verbose_name="Template File"
    )
    config_json = models.JSONField(
        default=dict,
        verbose_name="Template Configuration"
    )
    
    # Access control
    is_active = models.BooleanField(default=True, verbose_name="Active")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_report_templates",
        verbose_name="Created By"
    )
    
    class Meta:
        ordering = ['name']
        verbose_name = "Report Template"
        verbose_name_plural = "Report Templates"
    
    def __str__(self) -> str:
        return f"{self.name} ({self.get_template_type_display()})"


class GeneratedReport(TimeStampedModel):
    """Model for tracking generated reports"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    REPORT_TYPE_CHOICES = [
        ('attendance', 'Attendance Report'),
        ('overtime', 'Overtime Report'),
        ('summary', 'Summary Report'),
        ('custom', 'Custom Report'),
    ]
    
    # Report identification
    name = models.CharField(max_length=200, verbose_name="Report Name")
    report_type = models.CharField(
        max_length=20,
        choices=REPORT_TYPE_CHOICES,
        verbose_name="Report Type"
    )
    template = models.ForeignKey(
        ReportTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_reports",
        verbose_name="Template Used"
    )
    
    # Report parameters
    parameters = models.JSONField(
        default=dict,
        verbose_name="Report Parameters"
    )
    
    # Output details
    output_file = models.FileField(
        upload_to='generated_reports/',
        null=True,
        blank=True,
        verbose_name="Generated Report File"
    )
    file_size = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="File Size (bytes)"
    )
    mime_type = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name="MIME Type"
    )
    
    # Status and metadata
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Status"
    )
    error_message = models.TextField(
        blank=True,
        verbose_name="Error Message"
    )
    
    # Access control
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="requested_reports",
        verbose_name="Requested By"
    )
    is_public = models.BooleanField(
        default=False,
        verbose_name="Public Report"
    )
    
    # Expiration
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Expires At"
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Generated Report"
        verbose_name_plural = "Generated Reports"
    
    def __str__(self) -> str:
        return f"{self.name} - {self.get_status_display()}"
    
    @property
    def is_expired(self):
        """Check if report has expired"""
        if not self.expires_at:
            return False
        from django.utils import timezone
        return timezone.now() > self.expires_at
    
    @property
    def download_url(self):
        """Get download URL for the report"""
        if self.output_file and self.status == 'completed':
            return self.output_file.url
        return None


class ReportSchedule(TimeStampedModel):
    """Model for scheduling recurring reports"""
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]
    
    name = models.CharField(max_length=200, verbose_name="Schedule Name")
    description = models.TextField(blank=True, verbose_name="Description")
    
    # Schedule configuration
    template = models.ForeignKey(
        ReportTemplate,
        on_delete=models.CASCADE,
        related_name="schedules",
        verbose_name="Report Template"
    )
    frequency = models.CharField(
        max_length=20,
        choices=FREQUENCY_CHOICES,
        verbose_name="Frequency"
    )
    
    # Timing details
    start_date = models.DateField(verbose_name="Start Date")
    end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="End Date"
    )
    next_run = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Next Run"
    )
    
    # Parameters for each run
    base_parameters = models.JSONField(
        default=dict,
        verbose_name="Base Parameters"
    )
    
    # Status and control
    is_active = models.BooleanField(default=True, verbose_name="Active")
    last_run = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Last Run"
    )
    last_run_status = models.CharField(
        max_length=20,
        choices=GeneratedReport.STATUS_CHOICES,
        null=True,
        blank=True,
        verbose_name="Last Run Status"
    )
    
    # Access control
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_schedules",
        verbose_name="Created By"
    )
    
    class Meta:
        ordering = ['name']
        verbose_name = "Report Schedule"
        verbose_name_plural = "Report Schedules"
    
    def __str__(self) -> str:
        return f"{self.name} ({self.get_frequency_display()})"
    
    @property
    def is_expired(self):
        """Check if schedule has expired"""
        if not self.end_date:
            return False
        from datetime import date
        return date.today() > self.end_date


class ReportAccessLog(TimeStampedModel):
    """Model for tracking report access and usage"""
    ACTION_CHOICES = [
        ('viewed', 'Viewed'),
        ('downloaded', 'Downloaded'),
        ('shared', 'Shared'),
        ('deleted', 'Deleted'),
    ]
    
    report = models.ForeignKey(
        GeneratedReport,
        on_delete=models.CASCADE,
        related_name="access_logs",
        verbose_name="Report"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="report_access_logs",
        verbose_name="User"
    )
    action = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES,
        verbose_name="Action"
    )
    
    # Additional context
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="IP Address"
    )
    user_agent = models.TextField(
        blank=True,
        verbose_name="User Agent"
    )
    session_id = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Session ID"
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Report Access Log"
        verbose_name_plural = "Report Access Logs"
    
    def __str__(self) -> str:
        return f"{self.user.username} {self.action} {self.report.name}"
