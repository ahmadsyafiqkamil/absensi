from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import date
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


class EmployeePosition(TimeStampedModel):
    """Many-to-many relationship between Employee and Position with additional fields"""
    employee = models.ForeignKey(
        'Employee', 
        on_delete=models.CASCADE, 
        related_name="employee_positions"
    )
    position = models.ForeignKey(
        Position, 
        on_delete=models.CASCADE, 
        related_name="position_employees"
    )
    
    # Position metadata
    is_primary = models.BooleanField(
        default=False, 
        verbose_name="Is Primary Position",
        help_text="Primary position for the employee"
    )
    is_active = models.BooleanField(
        default=True, 
        verbose_name="Is Active",
        help_text="Whether this position assignment is active"
    )
    
    # Assignment details
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name="assigned_positions",
        verbose_name="Assigned By"
    )
    effective_from = models.DateField(
        default=date.today,
        verbose_name="Effective From",
        help_text="When this position becomes effective"
    )
    effective_until = models.DateField(
        null=True, 
        blank=True, 
        verbose_name="Effective Until",
        help_text="When this position expires (optional)"
    )
    
    # Notes and context
    assignment_notes = models.TextField(
        blank=True, 
        verbose_name="Assignment Notes",
        help_text="Reason or notes for this position assignment"
    )

    class Meta:
        unique_together = [('employee', 'position')]
        ordering = ['-is_primary', '-is_active', '-effective_from']
        verbose_name = "Employee Position"
        verbose_name_plural = "Employee Positions"

    def __str__(self):
        primary_text = " (Primary)" if self.is_primary else ""
        active_text = " (Inactive)" if not self.is_active else ""
        return f"{self.employee.display_name} - {self.position.name}{primary_text}{active_text}"

    def clean(self):
        """Validate the employee position assignment"""
        from django.core.exceptions import ValidationError
        
        # Ensure effective_until is after effective_from
        if self.effective_until and self.effective_from:
            if self.effective_until <= self.effective_from:
                raise ValidationError("Effective until date must be after effective from date")

    def is_currently_effective(self):
        """Check if this position assignment is currently effective"""
        today = date.today()
        if not self.is_active:
            return False
        if self.effective_from > today:
            return False
        if self.effective_until and self.effective_until < today:
            return False
        return True


class Employee(TimeStampedModel):
    """Employee model linking user to division and position(s)"""
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
    
    # Legacy position field - kept for backward compatibility during migration
    position = models.ForeignKey(
        Position, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL, 
        related_name="legacy_employees",
        verbose_name="Legacy Position",
        help_text="DEPRECATED: Use positions many-to-many relationship instead"
    )
    
    # New many-to-many relationship through EmployeePosition
    positions = models.ManyToManyField(
        Position, 
        through='EmployeePosition', 
        related_name="employees",
        verbose_name="Positions"
    )
    
    # Active position tracking for position switching
    active_position = models.ForeignKey(
        'EmployeePosition',
        null=True, 
        blank=True,
        on_delete=models.SET_NULL,
        related_name='active_for_employees',
        verbose_name="Active Position",
        help_text="Currently active position context for this employee"
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
        primary_pos = self.get_primary_position()
        if primary_pos:
            return primary_pos.name
        return self.position.name if self.position else "Tidak Ada Posisi"
    
    def get_primary_position(self):
        """Get the primary position for this employee"""
        try:
            primary_assignment = self.employee_positions.filter(
                is_primary=True, 
                is_active=True
            ).select_related('position').first()
            return primary_assignment.position if primary_assignment else None
        except Exception:
            # Fallback to legacy field
            return self.position
    
    def get_active_positions(self):
        """Get all currently active positions for this employee"""
        active_assignments = self.get_active_position_assignments()
        return [assignment.position for assignment in active_assignments]
    
    def get_active_position_assignments(self):
        """Get all currently active EmployeePosition objects for this employee"""
        today = date.today()
        return self.employee_positions.filter(
            is_active=True,
            effective_from__lte=today
        ).filter(
            models.Q(effective_until__isnull=True) |
            models.Q(effective_until__gte=today)
        ).select_related('position')
    
    def get_approval_capabilities(self):
        """Get combined approval capabilities from all active positions"""
        active_positions = self.get_active_positions()
        
        if not active_positions:
            # Fallback to legacy position
            if self.position:
                return {
                    'approval_level': self.position.approval_level,
                    'can_approve_overtime_org_wide': self.position.can_approve_overtime_org_wide,
                    'active_positions': [{
                        'id': self.position.id,
                        'name': self.position.name,
                        'approval_level': self.position.approval_level,
                        'can_approve_overtime_org_wide': self.position.can_approve_overtime_org_wide
                    }]
                }
            else:
                return {
                    'approval_level': 0,
                    'can_approve_overtime_org_wide': False,
                    'active_positions': []
                }
        
        max_approval_level = 0
        can_approve_org_wide = False
        positions_data = []
        
        for pos in active_positions:
            max_approval_level = max(max_approval_level, pos.approval_level or 0)
            can_approve_org_wide = can_approve_org_wide or pos.can_approve_overtime_org_wide
            positions_data.append({
                'id': pos.id,
                'name': pos.name,
                'approval_level': pos.approval_level,
                'can_approve_overtime_org_wide': pos.can_approve_overtime_org_wide
            })
        
        return {
            'approval_level': max_approval_level,
            'can_approve_overtime_org_wide': can_approve_org_wide,
            'active_positions': positions_data
        }
    
    def has_position(self, position_id):
        """Check if employee has a specific position (active or inactive)"""
        return self.employee_positions.filter(position_id=position_id).exists()
    
    def has_active_position(self, position_id):
        """Check if employee has a specific active position"""
        today = date.today()
        return self.employee_positions.filter(
            position_id=position_id,
            is_active=True,
            effective_from__lte=today
        ).filter(
            models.Q(effective_until__isnull=True) |
            models.Q(effective_until__gte=today)
        ).exists()
    
    def assign_position(self, position, is_primary=False, assigned_by=None, effective_from=None, effective_until=None, notes=""):
        """Assign a new position to this employee"""
        if effective_from is None:
            effective_from = date.today()
        
        # If this is being set as primary, unset other primary positions
        if is_primary:
            self.employee_positions.filter(is_primary=True).update(is_primary=False)
        
        # Create or update the position assignment
        assignment, created = EmployeePosition.objects.get_or_create(
            employee=self,
            position=position,
            defaults={
                'is_primary': is_primary,
                'is_active': True,
                'assigned_by': assigned_by,
                'effective_from': effective_from,
                'effective_until': effective_until,
                'assignment_notes': notes
            }
        )
        
        if not created:
            # Update existing assignment
            assignment.is_primary = is_primary
            assignment.is_active = True
            assignment.assigned_by = assigned_by or assignment.assigned_by
            assignment.effective_from = effective_from
            assignment.effective_until = effective_until
            assignment.assignment_notes = notes
            assignment.save()
        
        return assignment
    
    def set_primary_position(self, position):
        """Set a position as the primary position for this employee"""
        # First, unset all primary positions
        self.employee_positions.update(is_primary=False)
        
        # Then set the specified position as primary
        assignment = self.employee_positions.filter(position=position).first()
        if assignment:
            assignment.is_primary = True
            assignment.save()
            return assignment
        return None
    
    def deactivate_position(self, position):
        """Deactivate a position assignment"""
        assignment = self.employee_positions.filter(position=position).first()
        if assignment:
            assignment.is_active = False
            assignment.save()
            return assignment
        return None
    
    # ==================== POSITION SWITCHING METHODS ====================
    
    def get_switchable_positions(self):
        """Get all positions that user can switch to"""
        return self.get_active_position_assignments()
    
    def get_current_active_position(self):
        """Get currently active position for this employee"""
        if self.active_position and self.active_position.is_currently_effective():
            return self.active_position
        
        # Fallback to primary position
        primary_assignment = self.employee_positions.filter(
            is_primary=True, 
            is_active=True
        ).select_related('position').first()
        
        if primary_assignment:
            return primary_assignment
        
        # Fallback to first active position
        return self.get_active_position_assignments().first()
    
    def switch_to_position(self, assignment_id):
        """Switch to a specific position assignment"""
        # Validate that user has this assignment
        assignment = self.employee_positions.filter(
            id=assignment_id,
            is_active=True
        ).select_related('position').first()
        
        if not assignment or not assignment.is_currently_effective():
            return {
                'success': False,
                'error': 'Position not available or not effective'
            }
        
        # Set as active position
        self.active_position = assignment
        self.save()
        
        return {
            'success': True,
            'active_position': {
                'id': assignment.id,
                'position': {
                    'id': assignment.position.id,
                    'name': assignment.position.name,
                    'approval_level': assignment.position.approval_level,
                    'can_approve_overtime_org_wide': assignment.position.can_approve_overtime_org_wide
                },
                'is_primary': assignment.is_primary
            }
        }
    
    def get_current_context_capabilities(self):
        """Get approval capabilities based on currently active position"""
        current_assignment = self.get_current_active_position()
        
        if current_assignment:
            pos = current_assignment.position
            return {
                'approval_level': pos.approval_level,
                'can_approve_overtime_org_wide': pos.can_approve_overtime_org_wide,
                'active_position': {
                    'id': pos.id,
                    'name': pos.name,
                    'approval_level': pos.approval_level,
                    'can_approve_overtime_org_wide': pos.can_approve_overtime_org_wide
                },
                'context': 'active_position'
            }
        
        # Fallback to primary position if no active position set
        primary_assignment = self.employee_positions.filter(
            is_primary=True, 
            is_active=True
        ).select_related('position').first()
        
        if primary_assignment:
            pos = primary_assignment.position
            return {
                'approval_level': pos.approval_level,
                'can_approve_overtime_org_wide': pos.can_approve_overtime_org_wide,
                'active_position': {
                    'id': pos.id,
                    'name': pos.name,
                    'approval_level': pos.approval_level,
                    'can_approve_overtime_org_wide': pos.can_approve_overtime_org_wide
                },
                'context': 'primary_position'
            }
        
        # Final fallback to first active position
        first_assignment = self.get_active_position_assignments().first()
        if first_assignment:
            pos = first_assignment.position
            return {
                'approval_level': pos.approval_level,
                'can_approve_overtime_org_wide': pos.can_approve_overtime_org_wide,
                'active_position': {
                    'id': pos.id,
                    'name': pos.name,
                    'approval_level': pos.approval_level,
                    'can_approve_overtime_org_wide': pos.can_approve_overtime_org_wide
                },
                'context': 'first_active_position'
            }
        
        # No positions available
        return {
            'approval_level': 0,
            'can_approve_overtime_org_wide': False,
            'active_position': None,
            'context': 'no_positions'
        }
    
    def get_available_position_contexts(self):
        """Get all available position contexts for switching"""
        active_assignments = self.get_active_position_assignments()
        contexts = []
        
        for assignment in active_assignments:
            pos = assignment.position
            contexts.append({
                'assignment_id': assignment.id,
                'position_id': pos.id,
                'position_name': pos.name,
                'approval_level': pos.approval_level,
                'can_approve_overtime_org_wide': pos.can_approve_overtime_org_wide,
                'is_primary': assignment.is_primary,
                'is_current': self.active_position == assignment,
                'effective_from': assignment.effective_from.isoformat(),
                'effective_until': assignment.effective_until.isoformat() if assignment.effective_until else None
            })
        
        
        return contexts
    
    def reset_to_primary_context(self):
        """Reset to primary position context"""
        primary_assignment = self.employee_positions.filter(
            is_primary=True, 
            is_active=True
        ).first()
        
        if primary_assignment:
            self.active_position = primary_assignment
            self.save()
        else:
            # If no primary, use first active position
            first_assignment = self.get_active_position_assignments().first()
            if first_assignment:
                self.active_position = first_assignment
                self.save()
