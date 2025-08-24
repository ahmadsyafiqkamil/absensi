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
        verbose_name="Can Approve Overtime Organization-Wide",
        help_text="If true, supervisors with this position can approve overtime requests from all divisions (final approval)"
    )
    approval_level = models.PositiveSmallIntegerField(
        default=1,
        choices=[(1, 'Division Level'), (2, 'Organization Level')],
        verbose_name="Approval Level",
        help_text="1 = Division-level approval, 2 = Organization-level (final) approval"
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
        verbose_name="Full Name",
        null=True,
        blank=True,
        help_text="Full name of the employee"
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
    check_in_ip = models.GenericIPAddressField(null=True, blank=True, verbose_name="Check-in IP Address")

    check_out_at_utc = models.DateTimeField(null=True, blank=True)
    check_out_lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    check_out_lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    check_out_accuracy_m = models.PositiveIntegerField(null=True, blank=True)
    check_out_ip = models.GenericIPAddressField(null=True, blank=True, verbose_name="Check-out IP Address")

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
        related_name="approved_overtimes",
        verbose_name="Overtime Approved By"
    )
    overtime_approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Overtime Approved At"
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


class OvertimeRequest(models.Model):
    """
    Model untuk pengajuan lembur manual oleh pegawai.
    Terpisah dari sistem attendance otomatis.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('level1_approved', 'Level 1 Approved (Division)'),
        ('approved', 'Final Approved'),
        ('rejected', 'Rejected'),
    ]
    
    employee = models.ForeignKey(
        'Employee',
        on_delete=models.CASCADE,
        related_name='overtime_requests',
        verbose_name="Employee"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='overtime_requests',
        verbose_name="User"
    )
    
    # Request details
    date_requested = models.DateField(verbose_name="Date Requested")
    overtime_hours = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        verbose_name="Overtime Hours",
        help_text="Number of overtime hours requested (e.g., 2.5)"
    )
    work_description = models.TextField(
        verbose_name="Work Description",
        help_text="Description of work performed during overtime"
    )
    
    # Status and approval
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Status"
    )
    
    # Level 1 approval (division supervisor)
    level1_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='level1_approved_overtime_requests',
        verbose_name="Level 1 Approved By"
    )
    level1_approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Level 1 Approved At"
    )
    
    # Final approval (organization-wide supervisor)
    final_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='final_approved_overtime_requests',
        verbose_name="Final Approved By"
    )
    final_approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Final Approved At"
    )
    
    # Legacy fields (untuk backward compatibility)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='approved_overtime_requests',
        verbose_name="Approved By (Legacy)"
    )
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Approved At (Legacy)"
    )
    
    rejection_reason = models.TextField(
        null=True,
        blank=True,
        verbose_name="Rejection Reason"
    )
    
    # Calculated amount
    overtime_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Overtime Amount",
        help_text="Calculated overtime pay amount"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Overtime Request - {self.employee.user.username} - {self.date_requested}"
    
    def calculate_overtime_amount(self):
        """Calculate overtime amount based on employee salary and work settings"""
        if not self.employee.gaji_pokok:
            return 0
            
        try:
            # Get work settings
            ws = WorkSettings.objects.first()
            if not ws:
                return 0
            
            # Check if the date is a holiday
            is_holiday = Holiday.objects.filter(date=self.date_requested).exists()
            
            # Calculate hourly wage (assuming monthly salary)
            monthly_hours = 22 * 8  # 22 workdays * 8 hours per day
            hourly_wage = float(self.employee.gaji_pokok) / monthly_hours
            
            # Determine overtime rate
            if is_holiday:
                rate = float(ws.overtime_rate_holiday or 0.75)
            else:
                rate = float(ws.overtime_rate_workday or 0.50)
            
            # Calculate overtime amount
            overtime_amount = float(self.overtime_hours) * hourly_wage * rate
            return round(overtime_amount, 2)
            
        except Exception:
            return 0
    
    def save(self, *args, **kwargs):
        # Auto-calculate overtime amount when saving
        self.overtime_amount = self.calculate_overtime_amount()
        super().save(*args, **kwargs)
    
    class Meta:
        verbose_name = "Overtime Request"
        verbose_name_plural = "Overtime Requests"
        ordering = ['-created_at']


class MonthlySummaryRequest(models.Model):
    """
    Model untuk pengajuan rekap bulanan dengan approval 2 level.
    Memungkinkan audit trail dan monitoring pengajuan laporan.
    """
    REQUEST_STATUS_CHOICES = [
        ('pending', 'Menunggu Approval'),
        ('level1_approved', 'Level 1 Disetujui'),
        ('approved', 'Final Disetujui'),
        ('rejected', 'Ditolak'),
        ('completed', 'Selesai'),
        ('cancelled', 'Dibatalkan'),
    ]
    
    employee = models.ForeignKey(
        'Employee',
        on_delete=models.CASCADE,
        related_name='overtime_exports',
        verbose_name="Employee"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='overtime_exports',
        verbose_name="User Requesting Export"
    )
    
    # Request details
    request_period = models.CharField(
        max_length=7,
        verbose_name="Periode Laporan",
        help_text="Format: YYYY-MM (e.g., 2024-01)"
    )
    report_type = models.CharField(
        max_length=20,
        choices=[
            ('monthly_summary', 'Rekap Bulanan'),
            ('attendance_summary', 'Rekap Absensi'),
            ('overtime_summary', 'Rekap Lembur'),
            ('custom_report', 'Laporan Kustom'),
        ],
        default='monthly_summary',
        verbose_name="Jenis Laporan"
    )
    
    # Request details (untuk pengajuan rekap bulanan)
    request_title = models.CharField(
        max_length=200,
        verbose_name="Judul Laporan",
        help_text="Judul laporan yang diminta (e.g., 'Rekap Absensi Januari 2024')",
        null=True,
        blank=True
    )
    request_description = models.TextField(
        verbose_name="Deskripsi Laporan",
        help_text="Deskripsi detail laporan yang diminta",
        null=True,
        blank=True
    )
    
    # Data scope untuk rekap bulanan
    include_attendance = models.BooleanField(
        default=True,
        verbose_name="Include Attendance Data",
        help_text="Apakah data absensi harian dimasukkan dalam rekap"
    )
    include_overtime = models.BooleanField(
        default=True,
        verbose_name="Include Overtime Data",
        help_text="Apakah data lembur dimasukkan dalam rekap"
    )
    include_corrections = models.BooleanField(
        default=False,
        verbose_name="Include Corrections Data",
        help_text="Apakah data perbaikan absensi dimasukkan dalam rekap"
    )
    include_summary_stats = models.BooleanField(
        default=True,
        verbose_name="Include Summary Statistics",
        help_text="Apakah statistik ringkasan dimasukkan dalam rekap"
    )
    
    # Additional request details
    priority = models.CharField(
        max_length=20,
        choices=[
            ('low', 'Rendah'),
            ('medium', 'Sedang'),
            ('high', 'Tinggi'),
            ('urgent', 'Urgent'),
        ],
        default='medium',
        verbose_name="Prioritas"
    )
    
    expected_completion_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Tanggal Target Selesai",
        help_text="Tanggal target penyelesaian laporan"
    )
    
    # Status and approval
    status = models.CharField(
        max_length=20,
        choices=REQUEST_STATUS_CHOICES,
        default='pending',
        verbose_name="Status"
    )
    
    # Level 1 approval (division supervisor)
    level1_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='level1_approved_summary_requests',
        verbose_name="Level 1 Disetujui Oleh"
    )
    level1_approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Level 1 Disetujui Pada"
    )
    
    # Final approval (organization-wide supervisor)
    final_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='final_approved_summary_requests',
        verbose_name="Final Disetujui Oleh"
    )
    final_approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Final Disetujui Pada"
    )
    
    rejection_reason = models.TextField(
        null=True,
        blank=True,
        verbose_name="Alasan Penolakan"
    )
    
    # Request result
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Selesai Pada"
    )
    completion_notes = models.TextField(
        null=True,
        blank=True,
        verbose_name="Catatan Penyelesaian"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Pengajuan Rekap - {self.employee.user.username} - {self.request_period} - {self.get_report_type_display()}"
    
    def get_request_title_display(self):
        """Get display title for the request"""
        if self.request_title:
            return self.request_title
        return f"Rekap {self.get_report_type_display()} - {self.request_period}"
    
    def can_be_approved_by(self, user):
        """Check if user can approve this summary request"""
        if user.is_superuser or user.groups.filter(name='admin').exists():
            return True
        
        if user.groups.filter(name='supervisor').exists():
            try:
                supervisor_employee = user.employee
                # Check if supervisor has org-wide approval permission
                if (supervisor_employee.position and 
                    supervisor_employee.position.can_approve_overtime_org_wide):
                    return True
                # Check if supervisor is in same division
                if (supervisor_employee.division and 
                    supervisor_employee.division == self.employee.division):
                    return True
            except:
                pass
        
        return False
    
    def can_be_final_approved_by(self, user):
        """Check if user can give final approval"""
        if user.is_superuser or user.groups.filter(name='admin').exists():
            return True
        
        if user.groups.filter(name='supervisor').exists():
            try:
                supervisor_employee = user.employee
                # Only org-wide supervisors can give final approval
                if (supervisor_employee.position and 
                    supervisor_employee.position.can_approve_overtime_org_wide):
                    return True
            except:
                pass
        
        return False
    
    class Meta:
        verbose_name = "Pengajuan Rekap Bulanan"
        verbose_name_plural = "Pengajuan Rekap Bulanan"
        ordering = ['-created_at']
        unique_together = ("employee", "request_period", "report_type")
