from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
from apps.employees.models import Employee
from apps.settings.models import WorkSettings, Holiday


class Attendance(TimeStampedModel):
    """Attendance model for tracking employee check-in/out"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="attendance_records"
    )
    employee = models.ForeignKey(
        Employee, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name="attendances"
    )
    date_local = models.DateField()
    timezone = models.CharField(max_length=64)

    # Check-in fields
    check_in_at_utc = models.DateTimeField(null=True, blank=True)
    check_in_lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    check_in_lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    check_in_accuracy_m = models.PositiveIntegerField(null=True, blank=True)
    check_in_ip = models.GenericIPAddressField(null=True, blank=True, verbose_name="Check-in IP Address")

    # Check-out fields
    check_out_at_utc = models.DateTimeField(null=True, blank=True)
    check_out_lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    check_out_lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    check_out_accuracy_m = models.PositiveIntegerField(null=True, blank=True)
    check_out_ip = models.GenericIPAddressField(null=True, blank=True, verbose_name="Check-out IP Address")

    # Status fields
    is_holiday = models.BooleanField(default=False)
    within_geofence = models.BooleanField(default=False)
    minutes_late = models.IntegerField(default=0)
    total_work_minutes = models.IntegerField(default=0)
    note = models.CharField(max_length=200, null=True, blank=True)
    employee_note = models.TextField(null=True, blank=True)

    # Overtime fields
    overtime_minutes = models.PositiveIntegerField(
        default=0,
        verbose_name="Overtime Minutes",
        help_text="Minutes worked beyond required work hours"
    )
    overtime_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Overtime Amount",
        help_text="Calculated overtime pay amount"
    )
    overtime_approved = models.BooleanField(
        default=False,
        verbose_name="Overtime Approved",
        help_text="Whether overtime has been approved by supervisor"
    )
    overtime_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_attendance_overtimes",
        verbose_name="Overtime Approved By"
    )
    overtime_approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Overtime Approved At"
    )

    class Meta:
        ordering = ["-date_local", "-created_at"]
        unique_together = ("user", "date_local")
        verbose_name = "Attendance"
        verbose_name_plural = "Attendances"

    def __str__(self) -> str:
        return f"Attendance {self.user_id} {self.date_local}"
    
    def save(self, *args, **kwargs):
        """Auto-calculate fields before saving"""
        # Check if it's a holiday
        if not self.is_holiday:
            self.is_holiday = Holiday.is_holiday_date(self.date_local)
        
        # Calculate work minutes if both check-in and check-out exist
        if self.check_in_at_utc and self.check_out_at_utc:
            from datetime import timedelta
            duration = self.check_out_at_utc - self.check_in_at_utc
            self.total_work_minutes = int(duration.total_seconds() / 60)
        
        super().save(*args, **kwargs)
    
    @property
    def status(self):
        """Get attendance status"""
        if not self.check_in_at_utc:
            return "no_check_in"
        elif not self.check_out_at_utc:
            return "no_check_out"
        elif self.minutes_late > 0:
            return "late"
        else:
            return "on_time"
    
    @property
    def is_complete(self):
        """Check if attendance is complete (both check-in and check-out)"""
        return bool(self.check_in_at_utc and self.check_out_at_utc)
    
    def calculate_overtime(self):
        """Calculate overtime minutes and amount"""
        # Prefer explicitly linked employee; fallback to user's employee_profile
        employee = self.employee or getattr(self.user, 'employee_profile', None)
        if not self.total_work_minutes or not employee or not getattr(employee, 'gaji_pokok', None):
            return 0, 0
        
        try:
            work_settings = WorkSettings.objects.first()
            if not work_settings:
                return 0, 0
            
            # Get required minutes for this date
            work_hours = work_settings.get_work_hours_for_date(self.date_local)
            required_minutes = work_hours['required_minutes']
            
            # Get overtime threshold
            overtime_threshold = int(work_settings.overtime_threshold_minutes or 60)
            
            # Calculate overtime with threshold buffer (same logic as v1)
            if self.total_work_minutes > (required_minutes + overtime_threshold):
                overtime_minutes = self.total_work_minutes - required_minutes - overtime_threshold
                
                # Calculate overtime amount
                monthly_hours = 22 * 8  # 22 workdays * 8 hours per day
                hourly_wage = float(employee.gaji_pokok) / monthly_hours
                
                # Determine rate
                if self.is_holiday:
                    rate = float(work_settings.overtime_rate_holiday or 0.75)
                else:
                    rate = float(work_settings.overtime_rate_workday or 0.50)
                
                overtime_amount = (overtime_minutes / 60) * hourly_wage * rate
                return overtime_minutes, round(overtime_amount, 2)
            
            return 0, 0
            
        except Exception:
            return 0, 0
