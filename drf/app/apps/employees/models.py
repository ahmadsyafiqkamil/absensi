from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel


class Division(TimeStampedModel):
    """Division/Department model"""
    name = models.CharField(max_length=100, unique=True)
    
    class Meta:
        ordering = ["name"]
        verbose_name = "Division"
        verbose_name_plural = "Divisions"

    def __str__(self) -> str:
        return self.name


class Position(TimeStampedModel):
    """Position/Job Title model with approval permissions"""
    name = models.CharField(max_length=100, unique=True)
    
    # Approval permissions for overtime requests
    can_approve_overtime_org_wide = models.BooleanField(
        default=False,
        verbose_name="Can Approve Overtime Organization-Wide",
        help_text="If true, supervisors with this position can approve overtime requests from all divisions (final approval)"
    )
    approval_level = models.PositiveSmallIntegerField(
        default=1,
        choices=[(0, 'No Approval'), (1, 'Division Level'), (2, 'Organization Level')],
        verbose_name="Approval Level",
        help_text="0 = No approval permission, 1 = Division-level approval, 2 = Organization-level (final) approval"
    )

    class Meta:
        ordering = ["name"]
        verbose_name = "Position"
        verbose_name_plural = "Positions"

    def __str__(self) -> str:
        return self.name


class Employee(TimeStampedModel):
    """Employee model linking user to division and position"""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="employee_profile",
    )
    nip = models.CharField(max_length=32, unique=True, verbose_name="NIP")
    division = models.ForeignKey(
        Division, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL, 
        related_name="employees"
    )
    position = models.ForeignKey(
        Position, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL, 
        related_name="employees"
    )
    
    # Personal information
    gaji_pokok = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Gaji Pokok"
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
        verbose_name="Tempat Lahir"
    )
    tanggal_lahir = models.DateField(
        null=True,
        blank=True,
        verbose_name="Tanggal Lahir"
    )
    fullname = models.TextField(
        verbose_name="Full Name",
        null=True,
        blank=True,
        help_text="Full name of the employee"
    )

    class Meta:
        ordering = ["nip"]
        verbose_name = "Employee"
        verbose_name_plural = "Employees"

    def __str__(self) -> str:
        return f"{self.nip} - {self.user.username}"
    
    @property
    def display_name(self):
        """Get display name for the employee"""
        if self.fullname:
            return self.fullname
        return f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username
    
    def get_division_name(self):
        """Get division name or return default"""
        return self.division.name if self.division else "Tidak Ada Divisi"
    
    def get_position_name(self):
        """Get position name or return default"""
        return self.position.name if self.position else "Tidak Ada Posisi"
