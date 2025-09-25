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
    
    # Approval permissions for overtime requests
    can_approve_overtime_org_wide = models.BooleanField(
        default=False,
        verbose_name="Dapat Menyetujui Lembur Seluruh Organisasi",
        help_text="Jika benar, supervisor dengan posisi ini dapat menyetujui permintaan lembur dari semua divisi (persetujuan akhir)"
    )
    approval_level = models.PositiveSmallIntegerField(
        default=1,
        choices=[(0, 'Tidak Ada Persetujuan'), (1, 'Level Divisi'), (2, 'Level Organisasi')],
        verbose_name="Level Persetujuan",
        help_text="0 = Tidak ada izin persetujuan, 1 = Persetujuan level divisi, 2 = Persetujuan level organisasi (final)"
    )

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
    
    fullname = models.TextField(
        verbose_name="Nama Lengkap",
        null=True,
        blank=True,
        help_text="Nama lengkap pegawai"
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
    
    # Friday-specific settings
    friday_start_time = models.TimeField(default=time(9, 0), verbose_name="Waktu Mulai Jumat")
    friday_end_time = models.TimeField(default=time(13, 0), verbose_name="Waktu Selesai Jumat")
    friday_required_minutes = models.PositiveIntegerField(default=240, verbose_name="Menit Wajib Jumat")  # 4 hours (9:00-13:00)
    friday_grace_minutes = models.PositiveIntegerField(default=0, verbose_name="Menit Toleransi Jumat")
    
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
        verbose_name="Tarif Lembur (Hari Kerja)",
        help_text="Pengali gaji pokok per jam untuk lembur pada hari kerja (misalnya, 0.50 = 2/4)",
    )
    overtime_rate_holiday = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.75,
        verbose_name="Tarif Lembur (Hari Libur)",
        help_text="Pengali gaji pokok per jam untuk lembur pada hari libur (misalnya, 0.75 = 3/4)",
    )
    overtime_threshold_minutes = models.PositiveIntegerField(
        default=60,
        verbose_name="Ambang Lembur (Menit)",
        help_text="Menit ekstra minimum sebelum lembur mulai dihitung (misalnya, 60 = buffer 1 jam)",
    )
    
    # Early check-in restriction settings
    earliest_check_in_time = models.TimeField(
        default=time(6, 0),  # Default: 06:00
        verbose_name="Waktu Check-in Terawal",
        help_text="Waktu terawal pegawai dapat check-in (misalnya, 06:00)"
    )
    earliest_check_in_enabled = models.BooleanField(
        default=True,
        verbose_name="Aktifkan Pembatasan Check-in Awal",
        help_text="Apakah akan menerapkan pembatasan waktu check-in terawal"
    )

    # Early check-out restriction settings
    latest_check_out_time = models.TimeField(
        default=time(22, 0),  # Default: 22:00
        verbose_name="Waktu Check-out Terakhir",
        help_text="Waktu terakhir pegawai dapat check-out (misalnya, 22:00)"
    )
    latest_check_out_enabled = models.BooleanField(
        default=True,
        verbose_name="Aktifkan Pembatasan Check-out Terakhir",
        help_text="Apakah akan menerapkan pembatasan waktu check-out terakhir"
    )

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
    employee = models.ForeignKey('api.Employee', on_delete=models.CASCADE, null=True, blank=True, related_name="attendances")
    date_local = models.DateField()
    timezone = models.CharField(max_length=64)

    check_in_at_utc = models.DateTimeField(null=True, blank=True)
    check_in_lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    check_in_lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    check_in_accuracy_m = models.PositiveIntegerField(null=True, blank=True)
    check_in_ip = models.GenericIPAddressField(null=True, blank=True, verbose_name="Alamat IP Check-in")

    check_out_at_utc = models.DateTimeField(null=True, blank=True)
    check_out_lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    check_out_lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    check_out_accuracy_m = models.PositiveIntegerField(null=True, blank=True)
    check_out_ip = models.GenericIPAddressField(null=True, blank=True, verbose_name="Alamat IP Check-out")

    is_holiday = models.BooleanField(default=False)
    within_geofence = models.BooleanField(default=False)
    minutes_late = models.IntegerField(default=0)
    total_work_minutes = models.IntegerField(default=0)
    note = models.CharField(max_length=200, null=True, blank=True)
    employee_note = models.TextField(null=True, blank=True)

    # Overtime fields
    overtime_minutes = models.PositiveIntegerField(
        default=0,
        verbose_name="Menit Lembur",
        help_text="Menit bekerja di luar jam kerja yang diperlukan"
    )
    overtime_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Jumlah Lembur",
        help_text="Jumlah pembayaran lembur yang dihitung"
    )
    overtime_approved = models.BooleanField(
        default=False,
        verbose_name="Lembur Disetujui",
        help_text="Apakah lembur telah disetujui oleh supervisor"
    )
    overtime_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_overtimes",
        verbose_name="Lembur Disetujui Oleh"
    )
    overtime_approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Lembur Disetujui Pada"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date_local", "-created_at"]
        unique_together = ("user", "date_local")

    def __str__(self) -> str:  # pragma: no cover
        return f"Attendance {self.user_id} {self.date_local}"


class AttendanceCorrection(models.Model):
    class CorrectionType(models.TextChoices):
        MISSING_CHECK_IN = "missing_check_in", "Missing Check-in"
        MISSING_CHECK_OUT = "missing_check_out", "Missing Check-out"
        EDIT = "edit", "Edit"

    class CorrectionStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="attendance_corrections")
    date_local = models.DateField()
    type = models.CharField(max_length=32, choices=CorrectionType.choices)
    proposed_check_in_local = models.DateTimeField(null=True, blank=True)
    proposed_check_out_local = models.DateTimeField(null=True, blank=True)
    reason = models.TextField()
    attachment = models.FileField(upload_to='corrections/', null=True, blank=True, verbose_name="Surat Pendukung")
    status = models.CharField(max_length=16, choices=CorrectionStatus.choices, default=CorrectionStatus.PENDING)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="reviewed_corrections")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    decision_note = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:  # pragma: no cover
        return f"Correction {self.user_id} {self.date_local} {self.type} {self.status}"
