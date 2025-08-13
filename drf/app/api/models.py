from django.db import models
from django.conf import settings
from datetime import time


class Division(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class Position(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class Employee(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="employee",
    )
    nip = models.CharField(max_length=32, unique=True)
    division = models.ForeignKey(
        Division, null=True, blank=True, on_delete=models.SET_NULL, related_name="employees"
    )
    position = models.ForeignKey(
        Position, null=True, blank=True, on_delete=models.SET_NULL, related_name="employees"
    )
    gaji_pokok = models.DecimalField(
        max_digits=12,  # misal maksimal 999.999.999,99
        decimal_places=2,
        null=True,
        blank=True,
    )
    tmt_kerja = models.DateField(
        verbose_name="Terhitung Mulai Tanggal Kerja",
        null=True,
        blank=True,
    )

    tempat_lahir = models.CharField(
        max_length=100,
        null=True,
        blank=True,
    )
    tanggal_lahir = models.DateField(
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["nip"]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.nip} - {self.user.username}"


class WorkSettings(models.Model):
    """Global working hours settings (singleton)."""
    timezone = models.CharField(max_length=64, default="Asia/Dubai")
    start_time = models.TimeField(default=time(9, 0))
    end_time = models.TimeField(default=time(17, 0))
    required_minutes = models.PositiveIntegerField(default=480)  # 8 hours
    grace_minutes = models.PositiveIntegerField(default=0)
    # Weekdays using Python's Monday=0..Sunday=6. Default: Mon-Fri -> [0..4]
    # But per requirement: Senin-Jumat; in Python Monday=0, ..., Friday=5? Actually Friday=4.
    # We'll store [0,1,2,3,4]
    def _default_workdays():  # type: ignore[misc]
        return [0, 1, 2, 3, 4]

    workdays = models.JSONField(default=_default_workdays)
    # Office geofence settings (single office)
    office_latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    office_longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    office_radius_meters = models.PositiveIntegerField(default=100)

    class Meta:
        verbose_name = "Work Settings"
        verbose_name_plural = "Work Settings"

    def __str__(self) -> str:  # pragma: no cover
        return "WorkSettings"


class Holiday(models.Model):
    date = models.DateField(unique=True)
    note = models.CharField(max_length=200, null=True, blank=True)

    class Meta:
        ordering = ["date"]

    def __str__(self) -> str:  # pragma: no cover
        return f"Holiday {self.date}"


class Attendance(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="attendances")
    employee = models.ForeignKey('api.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name="attendances")
    date_local = models.DateField()
    timezone = models.CharField(max_length=64)

    check_in_at_utc = models.DateTimeField(null=True, blank=True)
    check_in_lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    check_in_lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    check_in_accuracy_m = models.PositiveIntegerField(null=True, blank=True)

    check_out_at_utc = models.DateTimeField(null=True, blank=True)
    check_out_lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    check_out_lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    check_out_accuracy_m = models.PositiveIntegerField(null=True, blank=True)

    is_holiday = models.BooleanField(default=False)
    within_geofence = models.BooleanField(default=False)
    minutes_late = models.IntegerField(default=0)
    total_work_minutes = models.IntegerField(default=0)
    note = models.CharField(max_length=200, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date_local", "-created_at"]
        unique_together = ("user", "date_local")

    def __str__(self) -> str:  # pragma: no cover
        return f"Attendance {self.user_id} {self.date_local}"
