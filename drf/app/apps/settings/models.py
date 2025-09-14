from django.db import models
from datetime import time
from apps.core.models import TimeStampedModel


class WorkSettings(TimeStampedModel):
    """Global working hours settings (singleton)"""
    timezone = models.CharField(max_length=64, default="Asia/Dubai")
    start_time = models.TimeField(default=time(9, 0))
    end_time = models.TimeField(default=time(17, 0))
    required_minutes = models.PositiveIntegerField(default=480)  # 8 hours
    grace_minutes = models.PositiveIntegerField(default=0)
    
    # Weekdays using Python's Monday=0..Sunday=6. Default: Mon-Fri -> [0..4]
    def _default_workdays():
        return [0, 1, 2, 3, 4]

    workdays = models.JSONField(default=_default_workdays)
    
    # Friday-specific settings
    friday_start_time = models.TimeField(default=time(9, 0), verbose_name="Friday Start Time")
    friday_end_time = models.TimeField(default=time(13, 0), verbose_name="Friday End Time")
    friday_required_minutes = models.PositiveIntegerField(default=240, verbose_name="Friday Required Minutes")  # 4 hours (9:00-13:00)
    friday_grace_minutes = models.PositiveIntegerField(default=0, verbose_name="Friday Grace Minutes")
    
    # Office geofence settings (single office)
    office_latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    office_longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    office_radius_meters = models.PositiveIntegerField(default=100)

    # Overtime settings (multipliers of hourly base wage)
    # Default: workday 2/4 (=0.50), holiday 3/4 (=0.75)
    overtime_rate_workday = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.50,
        verbose_name="Overtime Rate (Workday)",
        help_text="Multiplier of hourly base wage for overtime on workdays (e.g., 0.50 = 2/4)",
    )
    overtime_rate_holiday = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.75,
        verbose_name="Overtime Rate (Holiday)",
        help_text="Multiplier of hourly base wage for overtime on holidays (e.g., 0.75 = 3/4)",
    )
    overtime_threshold_minutes = models.PositiveIntegerField(
        default=60,
        verbose_name="Overtime Threshold (Minutes)",
        help_text="Minimum extra minutes before overtime starts counting (e.g., 60 = 1 hour buffer)",
    )
    
    # Check-in/out time restrictions
    earliest_check_in_enabled = models.BooleanField(
        default=False,
        verbose_name="Enable Earliest Check-in",
        help_text="If enabled, restrict check-in to after specified time"
    )
    earliest_check_in_time = models.TimeField(
        default=time(6, 0),
        verbose_name="Earliest Check-in Time",
        help_text="Earliest allowed check-in time"
    )
    latest_check_out_enabled = models.BooleanField(
        default=False,
        verbose_name="Enable Latest Check-out",
        help_text="If enabled, restrict check-out to before specified time"
    )
    latest_check_out_time = models.TimeField(
        default=time(22, 0),
        verbose_name="Latest Check-out Time",
        help_text="Latest allowed check-out time"
    )

    class Meta:
        verbose_name = "Work Settings"
        verbose_name_plural = "Work Settings"

    def __str__(self) -> str:
        return "WorkSettings"
    
    def get_work_hours_for_date(self, date):
        """Get work hours for a specific date"""
        if date.weekday() == 4:  # Friday
            return {
                'start_time': self.friday_start_time,
                'end_time': self.friday_end_time,
                'required_minutes': self.friday_required_minutes,
                'grace_minutes': self.friday_grace_minutes
            }
        else:
            return {
                'start_time': self.start_time,
                'end_time': self.end_time,
                'required_minutes': self.required_minutes,
                'grace_minutes': self.grace_minutes
            }
    
    def is_workday(self, date):
        """Check if a date is a workday"""
        return date.weekday() in self.workdays


class Holiday(TimeStampedModel):
    """Holiday model for managing public holidays"""
    date = models.DateField(unique=True)
    note = models.CharField(max_length=200, null=True, blank=True)
    
    class Meta:
        ordering = ["date"]
        verbose_name = "Holiday"
        verbose_name_plural = "Holidays"

    def __str__(self) -> str:
        return f"Holiday {self.date}"
    
    @classmethod
    def is_holiday_date(cls, date):
        """Check if a specific date is a holiday"""
        return cls.objects.filter(date=date).exists()
