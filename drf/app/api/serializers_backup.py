from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from .models import Division, Position, Employee, WorkSettings, Holiday, Attendance, AttendanceCorrection, OvertimeRequest, MonthlySummaryRequest, GroupPermission, GroupPermissionTemplate, EmployeeRole, Role
from .role_serializers import RoleSerializer, RoleCreateSerializer, RoleUpdateSerializer, RoleDetailSerializer


# ============================================================================
# BASE SERIALIZERS (Common fields for all roles)
# ============================================================================

class DivisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Division
        fields = ["id", "name"]


class PositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Position
        fields = ["id", "name", "can_approve_overtime_org_wide", "approval_level"]


class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ["id", "username", "first_name", "last_name", "email"]


# ============================================================================
# EMPLOYEE SERIALIZERS (Role-based access)
# ============================================================================

class EmployeeAdminSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Admin - Full access ke semua field Employee
    """
    user = UserBasicSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source="user", queryset=get_user_model().objects.all(), write_only=True
    )
    division = DivisionSerializer(read_only=True)
    division_id = serializers.PrimaryKeyRelatedField(
        source="division", queryset=Division.objects.all(), write_only=True, allow_null=True, required=False
    )
    position = PositionSerializer(read_only=True)
    position_id = serializers.PrimaryKeyRelatedField(
        source="position", queryset=Position.objects.all(), write_only=True, allow_null=True, required=False
    )

    class Meta:
        model = Employee
        fields = [
            "id",
            "nip",
            "fullname",
            "user",
            "user_id",
            "division",
            "division_id",
            "position",
            "position_id",
            "gaji_pokok",
            "tmt_kerja",
            "tempat_lahir",
            "tanggal_lahir",
        ]


class EmployeeSupervisorSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Supervisor - Limited access (tidak include data personal)
    """
    user = UserBasicSerializer(read_only=True)
    division = DivisionSerializer(read_only=True)
    position = PositionSerializer(read_only=True)

    class Meta:
        model = Employee
        fields = [
            "id",
            "nip",
            "fullname",
            "user",
            "division",
            "position",
            "gaji_pokok",
            "tmt_kerja",
            # Tidak include: tempat_lahir, tanggal_lahir (data personal)
        ]


class EmployeeEmployeeSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Employee - Minimal access (hanya data dasar)
    """
    user = UserBasicSerializer(read_only=True)
    division = DivisionSerializer(read_only=True)
    position = PositionSerializer(read_only=True)

    class Meta:
        model = Employee
        fields = [
            "id",
            "nip",
            "fullname",
            "user",
            "division",
            "position",
            # Tidak include: gaji_pokok, tmt_kerja, data personal
        ]


# ============================================================================
# WORK SETTINGS SERIALIZERS (Role-based access)
# ============================================================================

class WorkSettingsAdminSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Admin - Full access ke semua field WorkSettings
    """
    class Meta:
        model = WorkSettings
        fields = [
            "id",
            "timezone",
            "start_time",
            "end_time",
            "required_minutes",
            "grace_minutes",
            "workdays",
            "earliest_check_in_enabled",
            "earliest_check_in_time",
            "latest_check_out_enabled",
            "latest_check_out_time",
            "friday_start_time",
            "friday_end_time",
            "friday_required_minutes",
            "friday_grace_minutes",
            "office_latitude",
            "office_longitude",
            "office_radius_meters",
            "overtime_rate_workday",
            "overtime_rate_holiday",
            "overtime_threshold_minutes",
        ]


class WorkSettingsSupervisorSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Supervisor - Read-only access ke WorkSettings
    """
    class Meta:
        model = WorkSettings
        fields = [
            "id",
            "timezone",
            "start_time",
            "end_time",
            "required_minutes",
            "grace_minutes",
            "workdays",
            "earliest_check_in_enabled",
            "earliest_check_in_time",
            "latest_check_out_enabled",
            "latest_check_out_time",
            "friday_start_time",
            "friday_end_time",
            "friday_required_minutes",
            "friday_grace_minutes",
            "office_latitude",
            "office_longitude",
            "office_radius_meters",
            "overtime_rate_workday",
            "overtime_rate_holiday",
            "overtime_threshold_minutes",
        ]
        read_only_fields = fields  # Semua field read-only untuk supervisor


# ============================================================================
# ATTENDANCE SERIALIZERS (Role-based access)
# ============================================================================

class AttendanceAdminSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Admin - Full access ke semua field Attendance
    """
    class Meta:
        model = Attendance
        fields = [
            "id",
            "user",
            "employee",
            "date_local",
            "timezone",
            "check_in_at_utc",
            "check_in_lat",
            "check_in_lng",
            "check_in_accuracy_m",
            "check_out_at_utc",
            "check_out_lat",
            "check_out_lng",
            "check_out_accuracy_m",
            "is_holiday",
            "within_geofence",
            "minutes_late",
            "total_work_minutes",
            "note",
            "employee_note",
            "overtime_minutes",
            "overtime_amount",
            "overtime_approved",
            "overtime_approved_by",
            "overtime_approved_at",
            "created_at",
            "updated_at",
        ]


class AttendanceSupervisorSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Supervisor - Access ke data tim se-divisi
    """
    user = UserBasicSerializer(read_only=True)
    employee = EmployeeSupervisorSerializer(read_only=True)

    class Meta:
        model = Attendance
        fields = [
            "id",
            "user",
            "employee",
            "date_local",
            "timezone",
            "check_in_at_utc",
            "check_in_lat",
            "check_in_lng",
            "check_out_at_utc",
            "check_out_lat",
            "check_out_lng",
            "is_holiday",
            "within_geofence",
            "minutes_late",
            "total_work_minutes",
            "note",
            "employee_note",
            "overtime_minutes",
            "overtime_amount",
            "overtime_approved",
            "overtime_approved_by",
            "overtime_approved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "user",
            "employee",
            "date_local",
            "timezone",
            "check_in_at_utc",
            "check_out_at_utc",
            "is_holiday",
            "within_geofence",
            "minutes_late",
            "total_work_minutes",
            "employee_note",
            "overtime_minutes",
            "overtime_amount",
            "overtime_approved",
            "overtime_approved_by",
            "overtime_approved_at",
            "created_at",
            "updated_at",
        ]


class AttendanceEmployeeSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Employee - Access hanya ke data milik sendiri
    """
    class Meta:
        model = Attendance
        fields = [
            "id",
            "date_local",
            "timezone",
            "check_in_at_utc",
            "check_in_lat",
            "check_in_lng",
            "check_in_accuracy_m",
            "check_out_at_utc",
            "check_out_lat",
            "check_out_lng",
            "check_out_accuracy_m",
            "is_holiday",
            "within_geofence",
            "minutes_late",
            "total_work_minutes",
            "note",
            "employee_note",
            "overtime_minutes",
            "overtime_amount",
            "overtime_approved",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "user",
            "employee",
            "date_local",
            "timezone",
            "check_in_at_utc",
            "check_out_at_utc",
            "is_holiday",
            "within_geofence",
            "minutes_late",
            "total_work_minutes",
            "employee_note",
            "overtime_minutes",
            "overtime_amount",
            "overtime_approved",
            "created_at",
            "updated_at",
        ]


# ============================================================================
# ATTENDANCE CORRECTION SERIALIZERS (Role-based access)
# ============================================================================

class AttendanceCorrectionAdminSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Admin - Full access ke semua field AttendanceCorrection
    """
    user = UserBasicSerializer(read_only=True)
    reviewed_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = AttendanceCorrection
        fields = [
            "id",
            "user",
            "date_local",
            "type",
            "proposed_check_in_local",
            "proposed_check_out_local",
            "reason",
            "attachment",
            "status",
            "reviewed_by",
            "reviewed_at",
            "decision_note",
            "created_at",
            "updated_at",
        ]


class AttendanceCorrectionSupervisorSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Supervisor - Access ke koreksi tim se-divisi
    """
    user = UserBasicSerializer(read_only=True)
    reviewed_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = AttendanceCorrection
        fields = [
            "id",
            "user",
            "date_local",
            "type",
            "proposed_check_in_local",
            "proposed_check_out_local",
            "reason",
            "attachment",
            "status",
            "reviewed_by",
            "reviewed_at",
            "decision_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "user",
            "status",
            "reviewed_by",
            "reviewed_at",
            "decision_note",
            "created_at",
            "updated_at",
        ]


class AttendanceCorrectionEmployeeSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Employee - Access hanya ke koreksi milik sendiri
    """
    user = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = AttendanceCorrection
        fields = [
            "id",
            "user",
            "date_local",
            "type",
            "proposed_check_in_local",
            "proposed_check_out_local",
            "reason",
            "attachment",
            "status",
            "reviewed_by",
            "reviewed_at",
            "decision_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "user",
            "status",
            "reviewed_by",
            "reviewed_at",
            "decision_note",
            "created_at",
            "updated_at",
        ]


# ============================================================================
# HOLIDAY SERIALIZERS (Role-based access)
# ============================================================================

class HolidayAdminSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Admin - Full access ke Holiday
    """
    class Meta:
        model = Holiday
        fields = ["id", "date", "note"]


class HolidayPublicSerializer(serializers.ModelSerializer):
    """
    Serializer untuk semua user - Read-only access ke Holiday
    """
    class Meta:
        model = Holiday
        fields = ["id", "date", "note"]
        read_only_fields = fields


# ============================================================================
# SUPERVISOR TEAM SERIALIZERS
# ============================================================================

class SupervisorTeamAttendanceSerializer(serializers.ModelSerializer):
    """
    Serializer untuk supervisor team attendance overview.
    """
    user = UserBasicSerializer(read_only=True)
    division = DivisionSerializer(read_only=True)
    position = PositionSerializer(read_only=True)
    
    class Meta:
        model = Employee
        fields = [
            "id",
            "nip",
            "user",
            "division",
            "position",
        ]


class SupervisorAttendanceDetailSerializer(serializers.ModelSerializer):
    """
    Serializer untuk detailed attendance records.
    """
    user = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = Attendance
        fields = [
            "id",
            "date_local",
            "check_in_at_utc",
            "check_out_at_utc",
            "check_in_lat",
            "check_in_lng",
            "check_out_lat",
            "check_out_lng",
            "minutes_late",
            "total_work_minutes",
            "is_holiday",
            "within_geofence",
            "note",
            "employee_note",
            "created_at",
            "updated_at",
        ]


# ============================================================================
# LEGACY SERIALIZERS (for backward compatibility)
# ============================================================================

class EmployeeSerializer(serializers.ModelSerializer):
    """
    Legacy serializer - use role-specific serializers instead
    """
    user = UserBasicSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source="user", queryset=get_user_model().objects.all(), write_only=True
    )
    division = DivisionSerializer(read_only=True)
    division_id = serializers.PrimaryKeyRelatedField(
        source="division", queryset=Division.objects.all(), write_only=True, allow_null=True, required=False
    )
    position = PositionSerializer(read_only=True)
    position_id = serializers.PrimaryKeyRelatedField(
        source="position", queryset=Position.objects.all(), write_only=True, allow_null=True, required=False
    )

    class Meta:
        model = Employee
        fields = [
            "id",
            "nip",
            "fullname",
            "user",
            "user_id",
            "division",
            "division_id",
            "position",
            "position_id",
            "gaji_pokok",
            "tmt_kerja",
            "tempat_lahir",
            "tanggal_lahir",
        ]


class WorkSettingsSerializer(serializers.ModelSerializer):
    """
    Legacy serializer - use role-specific serializers instead
    """
    class Meta:
        model = WorkSettings
        fields = [
            "id",
            "timezone",
            "start_time",
            "end_time",
            "required_minutes",
            "grace_minutes",
            "workdays",
            "earliest_check_in_enabled",
            "earliest_check_in_time",
            "latest_check_out_enabled",
            "latest_check_out_time",
            "friday_start_time",
            "friday_end_time",
            "friday_required_minutes",
            "friday_grace_minutes",
            "office_latitude",
            "office_longitude",
            "office_radius_meters",
            "overtime_rate_workday",
            "overtime_rate_holiday",
            "overtime_threshold_minutes",
        ]


class AttendanceSerializer(serializers.ModelSerializer):
    """
    Legacy serializer - use role-specific serializers instead
    """
    class Meta:
        model = Attendance
        fields = [
            "id",
            "user",
            "employee",
            "date_local",
            "timezone",
            "check_in_at_utc",
            "check_in_lat",
            "check_in_lng",
            "check_in_accuracy_m",
            "check_out_at_utc",
            "check_out_lat",
            "check_out_lng",
            "check_out_accuracy_m",
            "is_holiday",
            "within_geofence",
            "minutes_late",
            "total_work_minutes",
            "note",
            "employee_note",
            "overtime_minutes",
            "overtime_amount",
            "overtime_approved",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "user",
            "employee",
            "date_local",
            "timezone",
            "check_in_at_utc",
            "check_out_at_utc",
            "is_holiday",
            "within_geofence",
            "minutes_late",
            "total_work_minutes",
            "employee_note",
            "overtime_minutes",
            "overtime_amount",
            "overtime_approved",
            "created_at",
            "updated_at",
        ]


class AttendanceCorrectionSerializer(serializers.ModelSerializer):
    """
    Legacy serializer - use role-specific serializers instead
    """
    user = UserBasicSerializer(read_only=True)
    reviewed_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = AttendanceCorrection
        fields = [
            "id",
            "user",
            "date_local",
            "type",
            "proposed_check_in_local",
            "proposed_check_out_local",
            "reason",
            "attachment",
            "status",
            "reviewed_by",
            "reviewed_at",
            "decision_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "user",
            "status",
            "reviewed_by",
            "reviewed_at",
            "decision_note",
            "created_at",
            "updated_at",
        ]


class HolidaySerializer(serializers.ModelSerializer):
    """
    Legacy serializer - use role-specific serializers instead
    """
    class Meta:
        model = Holiday
        fields = ["id", "date", "note"]


# ===== OVERTIME REQUEST SERIALIZERS =====

class OvertimeRequestAdminSerializer(serializers.ModelSerializer):
    """
    Admin serializer for overtime requests - full access
    """
    user = UserBasicSerializer(read_only=True)
    employee = EmployeeSerializer(read_only=True)
    approved_by = UserBasicSerializer(read_only=True)
    level1_approved_by = UserBasicSerializer(read_only=True)
    level1_rejected_by = UserBasicSerializer(read_only=True)
    final_approved_by = UserBasicSerializer(read_only=True)
    final_rejected_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = OvertimeRequest
        fields = [
            "id",
            "employee",
            "user",
            "date_requested",
            "overtime_hours",
            "work_description",
            "status",
            "level1_approved_by",
            "level1_approved_at",
            "level1_rejected_by",
            "level1_rejected_at",
            "final_approved_by",
            "final_approved_at",
            "final_rejected_by",
            "final_rejected_at",
            "approved_by",
            "approved_at",
            "rejection_reason",
            "overtime_amount",
            "created_at",
            "updated_at",
        ]


class OvertimeRequestSupervisorSerializer(serializers.ModelSerializer):
    """
    Supervisor serializer for overtime requests - can approve/reject
    """
    user = UserBasicSerializer(read_only=True)
    employee = EmployeeSerializer(read_only=True)
    approved_by = UserBasicSerializer(read_only=True)
    level1_approved_by = UserBasicSerializer(read_only=True)
    level1_rejected_by = UserBasicSerializer(read_only=True)
    final_approved_by = UserBasicSerializer(read_only=True)
    final_rejected_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = OvertimeRequest
        fields = [
            "id",
            "employee",
            "user",
            "date_requested",
            "overtime_hours",
            "work_description",
            "status",
            "level1_approved_by",
            "level1_approved_at",
            "level1_rejected_by",
            "level1_rejected_at",
            "final_approved_by",
            "final_approved_at",
            "final_rejected_by",
            "final_rejected_at",
            "approved_by",
            "approved_at",
            "rejection_reason",
            "overtime_amount",
            "created_at",
            "updated_at",
        ]


class OvertimeRequestEmployeeSerializer(serializers.ModelSerializer):
    """
    Employee serializer for overtime requests - can create and view own requests
    """
    user = UserBasicSerializer(read_only=True)
    employee = EmployeeSerializer(read_only=True)
    approved_by = UserBasicSerializer(read_only=True)
    level1_approved_by = UserBasicSerializer(read_only=True)
    level1_rejected_by = UserBasicSerializer(read_only=True)
    final_approved_by = UserBasicSerializer(read_only=True)
    final_rejected_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = OvertimeRequest
        fields = [
            "id",
            "employee",
            "user",
            "date_requested",
            "overtime_hours",
            "work_description",
            "status",
            "level1_approved_by",
            "level1_approved_at",
            "level1_rejected_by",
            "level1_rejected_at",
            "final_approved_by",
            "final_approved_at",
            "final_rejected_by",
            "final_rejected_at",
            "approved_by",
            "approved_at",
            "rejection_reason",
            "overtime_amount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "employee",
            "user",
            "status",
            "level1_approved_by",
            "level1_approved_at",
            "level1_rejected_by",
            "level1_rejected_at",
            "final_approved_by",
            "final_approved_at",
            "final_rejected_by",
            "final_rejected_at",
            "approved_by",
            "approved_at",
            "rejection_reason",
            "overtime_amount",
            "created_at",
            "updated_at",
        ]


class OvertimeRequestCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating overtime requests by employees
    """
    class Meta:
        model = OvertimeRequest
        fields = [
            "date_requested",
            "overtime_hours",
            "work_description",
        ]
    
    def validate_date_requested(self, value):
        """Validate that the date is not in the future beyond reasonable limit"""
        from datetime import date, timedelta
        today = date.today()
        
        # Allow any date in the past and up to 1 day in the future
        if value > today + timedelta(days=1):
            raise serializers.ValidationError("Tanggal tidak boleh lebih dari 1 hari ke depan")
        # Removed 7-day restriction - now allows any past date
            
        return value
    
    def validate_overtime_hours(self, value):
        """Validate overtime hours"""
        if value <= 0:
            raise serializers.ValidationError("Jam lembur harus lebih dari 0")
        if value > 12:  # Maximum 12 hours overtime per day
            raise serializers.ValidationError("Jam lembur maksimal 12 jam per hari")
        return value


# ============================================================================
# MONTHLY SUMMARY REQUEST SERIALIZERS
# ============================================================================

class MonthlySummaryRequestAdminSerializer(serializers.ModelSerializer):
    """
    Admin serializer for monthly summary requests - full access
    """
    user = UserBasicSerializer(read_only=True)
    employee = EmployeeSerializer(read_only=True)
    level1_approved_by = UserBasicSerializer(read_only=True)
    final_approved_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = MonthlySummaryRequest
        fields = [
            "id",
            "employee",
            "user",
            "request_period",
            "report_type",
            "request_title",
            "request_description",
            "include_attendance",
            "include_overtime",
            "include_corrections",
            "include_summary_stats",
            "priority",
            "expected_completion_date",
            "status",
            "level1_approved_by",
            "level1_approved_at",
            "final_approved_by",
            "final_approved_at",
            "rejection_reason",
            "completed_at",
            "completion_notes",
            "created_at",
            "updated_at",
        ]


class MonthlySummaryRequestSupervisorSerializer(serializers.ModelSerializer):
    """
    Supervisor serializer for monthly summary requests - can approve/reject
    """
    user = UserBasicSerializer(read_only=True)
    employee = EmployeeSerializer(read_only=True)
    level1_approved_by = UserBasicSerializer(read_only=True)
    final_approved_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = MonthlySummaryRequest
        fields = [
            "id",
            "employee",
            "user",
            "request_period",
            "report_type",
            "request_title",
            "request_description",
            "include_attendance",
            "include_overtime",
            "include_corrections",
            "include_summary_stats",
            "priority",
            "expected_completion_date",
            "status",
            "level1_approved_by",
            "level1_approved_at",
            "final_approved_by",
            "final_approved_at",
            "rejection_reason",
            "completed_at",
            "completion_notes",
            "created_at",
            "updated_at",
        ]


class MonthlySummaryRequestEmployeeSerializer(serializers.ModelSerializer):
    """
    Employee serializer for monthly summary requests - can create and view own requests
    """
    user = UserBasicSerializer(read_only=True)
    employee = EmployeeSerializer(read_only=True)
    level1_approved_by = UserBasicSerializer(read_only=True)
    final_approved_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = MonthlySummaryRequest
        fields = [
            "id",
            "employee",
            "user",
            "request_period",
            "report_type",
            "request_title",
            "request_description",
            "include_attendance",
            "include_overtime",
            "include_corrections",
            "include_summary_stats",
            "priority",
            "expected_completion_date",
            "status",
            "level1_approved_by",
            "level1_approved_at",
            "final_approved_by",
            "final_approved_at",
            "rejection_reason",
            "completed_at",
            "completion_notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "employee",
            "user",
            "status",
            "level1_approved_by",
            "level1_approved_at",
            "final_approved_by",
            "final_approved_at",
            "rejection_reason",
            "completed_at",
            "completion_notes",
            "created_at",
            "updated_at",
        ]


class MonthlySummaryRequestCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating monthly summary requests by employees
    """
    class Meta:
        model = MonthlySummaryRequest
        fields = [
            "request_period",
            "report_type",
            "request_title",
            "request_description",
            "include_attendance",
            "include_overtime",
            "include_corrections",
            "include_summary_stats",
            "priority",
            "expected_completion_date",
        ]
    
    def validate_request_period(self, value):
        """Validate request period format (YYYY-MM)"""
        from datetime import datetime
        try:
            datetime.strptime(value, '%Y-%m')
        except ValueError:
            raise serializers.ValidationError("Format periode harus YYYY-MM (contoh: 2024-01)")
        return value
    
    def validate_expected_completion_date(self, value):
        """Validate expected completion date is not in the past"""
        from datetime import date
        if value and value < date.today():
            raise serializers.ValidationError("Tanggal target selesai tidak boleh di masa lalu")
        return value


# ============================================================================
# GROUP SERIALIZERS
# ============================================================================

class GroupSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Group - Basic access untuk semua role
    """
    class Meta:
        model = Group
        fields = ["id", "name"]
        read_only_fields = ["id"]


class GroupAdminSerializer(serializers.ModelSerializer):
    """
    Admin serializer untuk Group - Full access
    """
    class Meta:
        model = Group
        fields = ["id", "name"]
        read_only_fields = ["id"]


class GroupCreateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk membuat Group baru
    """
    class Meta:
        model = Group
        fields = ["name"]

    def validate_name(self, value):
        # Check if group name already exists
        if Group.objects.filter(name=value).exists():
            raise serializers.ValidationError("Group with this name already exists.")
        return value


class GroupUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk update Group
    """
    class Meta:
        model = Group
        fields = ["name"]

    def validate_name(self, value):
        # Check if group name already exists (excluding current instance)
        instance = self.instance
        if instance and Group.objects.filter(name=value).exclude(id=instance.id).exists():
            raise serializers.ValidationError("Group with this name already exists.")
        return value


class GroupDetailSerializer(serializers.ModelSerializer):
    """
    Serializer untuk detail Group dengan informasi user dan permissions
    """
    user_count = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    user_set = serializers.SerializerMethodField()
    
    class Meta:
        model = Group
        fields = ["id", "name", "user_count", "permissions", "user_set"]
        read_only_fields = ["id", "user_count", "permissions", "user_set"]
    
    def get_user_count(self, obj):
        return obj.user_set.count()
    
    def get_permissions(self, obj):
        """Get custom permissions for this group"""
        from .models import GroupPermission
        permissions = GroupPermission.objects.filter(group=obj, is_active=True)
        return [{
            'id': perm.id,
            'permission_type': perm.permission_type,
            'permission_action': perm.permission_action,
            'is_active': perm.is_active,
            'created_at': perm.created_at,
            'updated_at': perm.updated_at,
        } for perm in permissions]
    
    def get_user_set(self, obj):
        """Get users in this group"""
        return [{
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name or '',
            'last_name': user.last_name or '',
            'is_active': user.is_active,
            'date_joined': user.date_joined,
            'last_login': user.last_login
        } for user in obj.user_set.all()]


# ============================================================================
# PERMISSION SERIALIZERS
# ============================================================================

class BulkPermissionUpdateSerializer(serializers.Serializer):
    """
    Serializer untuk bulk update permissions
    """
    group_id = serializers.IntegerField()
    permissions = serializers.ListField(
        child=serializers.DictField()
    )
    
    def validate_permissions(self, value):
        """Validate permissions format"""
        for perm in value:
            if 'permission_type' not in perm or 'permission_action' not in perm:
                raise serializers.ValidationError(
                    "Each permission must have 'permission_type' and 'permission_action' keys"
                )
            
            # Validate permission type and action values
            valid_types = [choice[0] for choice in GroupPermission.PERMISSION_TYPES]
            valid_actions = [choice[0] for choice in GroupPermission.PERMISSION_ACTIONS]
            
            if perm['permission_type'] not in valid_types:
                raise serializers.ValidationError(f"Invalid permission type: {perm['permission_type']}")
            
            if perm['permission_action'] not in valid_actions:
                raise serializers.ValidationError(f"Invalid permission action: {perm['permission_action']}")
        
        return value


# ============================================================================
# PERMISSION SERIALIZERS
# ============================================================================

class GroupPermissionSerializer(serializers.ModelSerializer):
    """
    Serializer untuk GroupPermission - Basic access
    """
    permission_type_display = serializers.CharField(source='get_permission_type_display', read_only=True)
    permission_action_display = serializers.CharField(source='get_permission_action_display', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)
    
    class Meta:
        model = GroupPermission
        fields = [
            "id", "group", "group_name", "permission_type", "permission_type_display",
            "permission_action", "permission_action_display", "is_active",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class GroupPermissionCreateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk membuat GroupPermission baru
    """
    class Meta:
        model = GroupPermission
        fields = ["group", "permission_type", "permission_action", "is_active"]
    
    def validate(self, data):
        # Check if permission already exists for this group
        if GroupPermission.objects.filter(
            group=data['group'],
            permission_type=data['permission_type'],
            permission_action=data['permission_action']
        ).exists():
            raise serializers.ValidationError(
                "Permission already exists for this group, type, and action combination."
            )
        return data


class GroupPermissionUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk update GroupPermission
    """
    class Meta:
        model = GroupPermission
        fields = ["permission_type", "permission_action", "is_active"]
    
    def validate(self, data):
        instance = self.instance
        if instance:
            # Check if updated combination already exists (excluding current instance)
            if GroupPermission.objects.filter(
                group=instance.group,
                permission_type=data.get('permission_type', instance.permission_type),
                permission_action=data.get('permission_action', instance.permission_action)
            ).exclude(id=instance.id).exists():
                raise serializers.ValidationError(
                    "Permission already exists for this group, type, and action combination."
                )
        return data


class GroupPermissionDetailSerializer(serializers.ModelSerializer):
    """
    Serializer untuk detail GroupPermission
    """
    permission_type_display = serializers.CharField(source='get_permission_type_display', read_only=True)
    permission_action_display = serializers.CharField(source='get_permission_action_display', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)
    
    class Meta:
        model = GroupPermission
        fields = [
            "id", "group", "group_name", "permission_type", "permission_type_display",
            "permission_action", "permission_action_display", "is_active",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class GroupPermissionTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk GroupPermissionTemplate
    """
    class Meta:
        model = GroupPermissionTemplate
        fields = [
            "id", "name", "description", "permissions", "is_active",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class GroupPermissionTemplateCreateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk membuat GroupPermissionTemplate baru
    """
    class Meta:
        model = GroupPermissionTemplate
        fields = ["name", "description", "permissions", "is_active"]
    
    def validate_permissions(self, value):
        """Validate permissions format"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Permissions must be a list")
        
        for perm in value:
            if not isinstance(perm, dict):
                raise serializers.ValidationError("Each permission must be a dictionary")
            
            if 'type' not in perm or 'action' not in perm:
                raise serializers.ValidationError("Each permission must have 'type' and 'action' keys")
            
            # Validate permission type and action values
            valid_types = [choice[0] for choice in GroupPermission.PERMISSION_TYPES]
            valid_actions = [choice[0] for choice in GroupPermission.PERMISSION_ACTIONS]
            
            if perm['type'] not in valid_types:
                raise serializers.ValidationError(f"Invalid permission type: {perm['type']}")
            
            if perm['action'] not in valid_actions:
                raise serializers.ValidationError(f"Invalid permission action: {perm['action']}")
        
        return value


class GroupPermissionTemplateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk update GroupPermissionTemplate
    """
    class Meta:
        model = GroupPermissionTemplate
        fields = ["name", "description", "permissions", "is_active"]


class GroupWithPermissionsSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Group dengan permissions detail
    """
    permissions = GroupPermissionSerializer(source='custom_permissions', many=True, read_only=True)
    permission_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Group
        fields = ["id", "name", "permissions", "permission_count"]
        read_only_fields = ["id"]
    
    def get_permission_count(self, obj):
        return obj.custom_permissions.filter(is_active=True).count()


class PermissionSummarySerializer(serializers.Serializer):
    """
    Serializer untuk summary permissions
    """
    group_id = serializers.IntegerField()
    group_name = serializers.CharField()
    total_permissions = serializers.IntegerField()
    active_permissions = serializers.IntegerField()
    permission_types = serializers.ListField(child=serializers.CharField())
    permission_actions = serializers.ListField(child=serializers.CharField())


class EmployeeRoleSerializer(serializers.ModelSerializer):
    """
    Serializer untuk EmployeeRole - Basic read/write operations
    """
    group_name = serializers.CharField(source='group.name', read_only=True)
    employee_name = serializers.CharField(source='employee.fullname', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.username', read_only=True)

    class Meta:
        model = EmployeeRole
        fields = [
            'id', 'employee', 'employee_name', 'group', 'group_name',
            'is_primary', 'is_active', 'assigned_by', 'assigned_by_name',
            'assigned_at'
        ]
        read_only_fields = ['id', 'assigned_at', 'assigned_by_name']

    def validate(self, data):
        """
        Validate that an employee doesn't get duplicate roles and ensure primary role logic
        """
        employee = data.get('employee')
        group = data.get('group')
        is_primary = data.get('is_primary', False)

        # Check for duplicate role assignment
        existing_role = EmployeeRole.objects.filter(
            employee=employee,
            group=group
        ).exclude(pk=getattr(self.instance, 'pk', None))

        if existing_role.exists():
            raise serializers.ValidationError("Employee already has this role assigned.")

        return data


class EmployeeRoleCreateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk membuat EmployeeRole baru
    """
    class Meta:
        model = EmployeeRole
        fields = ['employee', 'group', 'is_primary', 'is_active']

    def create(self, validated_data):
        # Set assigned_by to current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['assigned_by'] = request.user

        return super().create(validated_data)


class EmployeeRoleUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk update EmployeeRole
    """
    class Meta:
        model = EmployeeRole
        fields = ['is_primary', 'is_active']


class EmployeeWithRolesSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Employee yang include roles nya
    """
    user = UserBasicSerializer(read_only=True)
    division = DivisionSerializer(read_only=True)
    position = PositionSerializer(read_only=True)
    roles = serializers.SerializerMethodField()
    primary_role = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id', 'user', 'nip', 'fullname', 'division', 'position',
            'gaji_pokok', 'tmt_kerja', 'tempat_lahir', 'tanggal_lahir',
            'roles', 'primary_role'
        ]

    def get_roles(self, obj):
        """Get all active roles for this employee"""
        roles = obj.employee_roles.filter(is_active=True)
        return EmployeeRoleSerializer(roles, many=True).data

    def get_primary_role(self, obj):
        """Get the primary role for this employee"""
        primary_role = obj.employee_roles.filter(is_active=True, is_primary=True).first()
        if primary_role:
            return EmployeeRoleSerializer(primary_role).data
        return None
    
    def get_primary_role(self, obj):
        """Get the primary role for this employee"""
        primary_role = obj.employee_roles.filter(is_active=True, is_primary=True).first()
        if primary_role:
            return EmployeeRoleSerializer(primary_role).data
        return None


# Role serializers moved to role_serializers.py
    """
    Serializer untuk Role - Basic read/write operations
    """
    role_type_display = serializers.CharField(source='get_role_type_display', read_only=True)
    
    class Meta:
        model = Role
        fields = [
            'id', 'name', 'display_name', 'role_type', 'role_type_display',
            'approval_level', 'group', 'description', 'is_active', 'sort_order',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_name(self, value):
        # Ensure name is lowercase and valid
        value = value.lower().strip()
        if not value.replace('_', '').isalnum():
            raise serializers.ValidationError("Role name must contain only letters, numbers, and underscores")
        return value

    def validate(self, data):
        # Ensure only one primary role per type
        if data.get('role_type') == 'primary':
            existing_primary = Role.objects.filter(
                role_type='primary',
                is_active=True
            ).exclude(pk=self.instance.pk if self.instance else None)
            
            if existing_primary.exists():
                raise serializers.ValidationError("Only one primary role is allowed")
        
        return data


class RoleCreateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk create Role
    """
    class Meta:
        model = Role
        fields = [
            'name', 'display_name', 'role_type', 'approval_level',
            'group', 'description', 'is_active', 'sort_order'
        ]

    def create(self, validated_data):
        # Auto-create Django Group
        from django.contrib.auth.models import Group
        Group.objects.get_or_create(name=validated_data['name'])
        return super().create(validated_data)


class RoleUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk update Role
    """
    class Meta:
        model = Role
        fields = [
            'display_name', 'role_type', 'approval_level',
            'group', 'description', 'is_active', 'sort_order'
        ]


class RoleDetailSerializer(serializers.ModelSerializer):
    """
    Serializer untuk detail Role dengan informasi tambahan
    """
    role_type_display = serializers.CharField(source='get_role_type_display', read_only=True)
    user_count = serializers.SerializerMethodField()
    is_used = serializers.SerializerMethodField()
    
    class Meta:
        model = Role
        fields = [
            'id', 'name', 'display_name', 'role_type', 'role_type_display',
            'approval_level', 'group', 'description', 'is_active', 'sort_order',
            'user_count', 'is_used', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'name', 'created_at', 'updated_at']

    def get_user_count(self, obj):
        """Get count of users with this role"""
        from django.contrib.auth.models import Group
        try:
            group = Group.objects.get(name=obj.name)
            return group.user_set.count()
        except Group.DoesNotExist:
            return 0

    def get_is_used(self, obj):
        """Check if this role is currently being used"""
        from django.contrib.auth.models import Group
        try:
            group = Group.objects.get(name=obj.name)
            return group.user_set.exists()
        except Group.DoesNotExist:
            return False


class WorkSettingsAdminSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Admin - Full access ke WorkSettings
    """
    class Meta:
        model = WorkSettings
        fields = [
            "id",
            "timezone",
            "start_time",
            "end_time",
            "required_minutes",
            "grace_minutes",
            "workdays",
            "earliest_check_in_enabled",
            "earliest_check_in_time",
            "latest_check_out_enabled",
            "latest_check_out_time",
            "friday_start_time",
            "friday_end_time",
            "friday_required_minutes",
            "friday_grace_minutes",
            "office_latitude",
            "office_longitude",
            "office_radius_meters",
            "overtime_rate_workday",
            "overtime_rate_holiday",
            "overtime_threshold_minutes",
        ]


class WorkSettingsSupervisorSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Supervisor - Read-only access ke WorkSettings
    """
    class Meta:
        model = WorkSettings
        fields = [
            "id",
            "timezone",
            "start_time",
            "end_time",
            "required_minutes",
            "grace_minutes",
            "workdays",
            "earliest_check_in_enabled",
            "earliest_check_in_time",
            "latest_check_out_enabled",
            "latest_check_out_time",
            "friday_start_time",
            "friday_end_time",
            "friday_required_minutes",
            "friday_grace_minutes",
            "office_latitude",
            "office_longitude",
            "office_radius_meters",
            "overtime_rate_workday",
            "overtime_rate_holiday",
            "overtime_threshold_minutes",
        ]
        read_only_fields = fields  # Semua field read-only untuk supervisor


# ============================================================================
# ATTENDANCE SERIALIZERS (Role-based access)
# ============================================================================

class AttendanceAdminSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Admin - Full access ke semua field Attendance
    """
    class Meta:
        model = Attendance
        fields = [
            "id",
            "user",
            "employee",
            "date_local",
            "timezone",
            "check_in_at_utc",
            "check_in_lat",
            "check_in_lng",
            "check_in_accuracy_m",
            "check_out_at_utc",
            "check_out_lat",
            "check_out_lng",
            "check_out_accuracy_m",
            "is_holiday",
            "within_geofence",
            "minutes_late",
            "total_work_minutes",
            "note",
            "employee_note",
            "overtime_minutes",
            "overtime_amount",
            "overtime_approved",
            "overtime_approved_by",
            "overtime_approved_at",
            "created_at",
            "updated_at",
        ]


class AttendanceSupervisorSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Supervisor - Access ke data tim se-divisi
    """
    user = UserBasicSerializer(read_only=True)
    employee = EmployeeSupervisorSerializer(read_only=True)

    class Meta:
        model = Attendance
        fields = [
            "id",
            "user",
            "employee",
            "date_local",
            "timezone",
            "check_in_at_utc",
            "check_in_lat",
            "check_in_lng",
            "check_out_at_utc",
            "check_out_lat",
            "check_out_lng",
            "is_holiday",
            "within_geofence",
            "minutes_late",
            "total_work_minutes",
            "note",
            "employee_note",
            "overtime_minutes",
            "overtime_amount",
            "overtime_approved",
            "overtime_approved_by",
            "overtime_approved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "user",
            "employee",
            "date_local",
            "timezone",
            "check_in_at_utc",
            "check_out_at_utc",
            "is_holiday",
            "within_geofence",
            "minutes_late",
            "total_work_minutes",
            "employee_note",
            "overtime_minutes",
            "overtime_amount",
            "overtime_approved",
            "overtime_approved_by",
            "overtime_approved_at",
            "created_at",
            "updated_at",
        ]


class AttendanceEmployeeSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Employee - Access hanya ke data milik sendiri
    """
    class Meta:
        model = Attendance
        fields = [
            "id",
            "date_local",
            "timezone",
            "check_in_at_utc",
            "check_in_lat",
            "check_in_lng",
            "check_in_accuracy_m",
            "check_out_at_utc",
            "check_out_lat",
            "check_out_lng",
            "check_out_accuracy_m",
            "is_holiday",
            "within_geofence",
            "minutes_late",
            "total_work_minutes",
            "note",
            "employee_note",
            "overtime_minutes",
            "overtime_amount",
            "overtime_approved",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "user",
            "employee",
            "date_local",
            "timezone",
            "check_in_at_utc",
            "check_out_at_utc",
            "is_holiday",
            "within_geofence",
            "minutes_late",
            "total_work_minutes",
            "employee_note",
            "overtime_minutes",
            "overtime_amount",
            "overtime_approved",
            "created_at",
            "updated_at",
        ]


# ============================================================================
# ATTENDANCE CORRECTION SERIALIZERS (Role-based access)
# ============================================================================

class AttendanceCorrectionAdminSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Admin - Full access ke semua field AttendanceCorrection
    """
    user = UserBasicSerializer(read_only=True)
    reviewed_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = AttendanceCorrection
        fields = [
            "id",
            "user",
            "date_local",
            "type",
            "proposed_check_in_local",
            "proposed_check_out_local",
            "reason",
            "attachment",
            "status",
            "reviewed_by",
            "reviewed_at",
            "decision_note",
            "created_at",
            "updated_at",
        ]


class AttendanceCorrectionSupervisorSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Supervisor - Access ke koreksi tim se-divisi
    """
    user = UserBasicSerializer(read_only=True)
    reviewed_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = AttendanceCorrection
        fields = [
            "id",
            "user",
            "date_local",
            "type",
            "proposed_check_in_local",
            "proposed_check_out_local",
            "reason",
            "attachment",
            "status",
            "reviewed_by",
            "reviewed_at",
            "decision_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "user",
            "status",
            "reviewed_by",
            "reviewed_at",
            "decision_note",
            "created_at",
            "updated_at",
        ]


class AttendanceCorrectionEmployeeSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Employee - Access hanya ke koreksi milik sendiri
    """
    user = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = AttendanceCorrection
        fields = [
            "id",
            "user",
            "date_local",
            "type",
            "proposed_check_in_local",
            "proposed_check_out_local",
            "reason",
            "attachment",
            "status",
            "reviewed_by",
            "reviewed_at",
            "decision_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "user",
            "status",
            "reviewed_by",
            "reviewed_at",
            "decision_note",
            "created_at",
            "updated_at",
        ]


# ============================================================================
# HOLIDAY SERIALIZERS (Role-based access)
# ============================================================================

class HolidayAdminSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Admin - Full access ke Holiday
    """
    class Meta:
        model = Holiday
        fields = ["id", "date", "note"]


class HolidayPublicSerializer(serializers.ModelSerializer):
    """
    Serializer untuk semua user - Read-only access ke Holiday
    """
    class Meta:
        model = Holiday
        fields = ["id", "date", "note"]
        read_only_fields = fields


# ============================================================================
# SUPERVISOR TEAM SERIALIZERS
# ============================================================================

class SupervisorTeamAttendanceSerializer(serializers.ModelSerializer):
    """
    Serializer untuk supervisor team attendance overview.
    """
    user = UserBasicSerializer(read_only=True)
    division = DivisionSerializer(read_only=True)
    position = PositionSerializer(read_only=True)
    
    class Meta:
        model = Employee
        fields = [
            "id",
            "nip",
            "user",
            "division",
            "position",
        ]


class SupervisorAttendanceDetailSerializer(serializers.ModelSerializer):
    """
    Serializer untuk detailed attendance records.
    """
    user = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = Attendance
        fields = [
            "id",
            "date_local",
            "check_in_at_utc",
            "check_out_at_utc",
            "check_in_lat",
            "check_in_lng",
            "check_out_lat",
            "check_out_lng",
            "minutes_late",
            "total_work_minutes",
            "is_holiday",
            "within_geofence",
            "note",
            "employee_note",
            "created_at",
            "updated_at",
        ]


# ============================================================================
# LEGACY SERIALIZERS (for backward compatibility)
# ============================================================================

class EmployeeSerializer(serializers.ModelSerializer):
    """
    Legacy serializer - use role-specific serializers instead
    """
    user = UserBasicSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source="user", queryset=get_user_model().objects.all(), write_only=True
    )
    division = DivisionSerializer(read_only=True)
    division_id = serializers.PrimaryKeyRelatedField(
        source="division", queryset=Division.objects.all(), write_only=True, allow_null=True, required=False
    )
    position = PositionSerializer(read_only=True)
    position_id = serializers.PrimaryKeyRelatedField(
        source="position", queryset=Position.objects.all(), write_only=True, allow_null=True, required=False
    )

    class Meta:
        model = Employee
        fields = [
            "id",
            "nip",
            "fullname",
            "user",
            "user_id",
            "division",
            "division_id",
            "position",
            "position_id",
            "gaji_pokok",
            "tmt_kerja",
            "tempat_lahir",
            "tanggal_lahir",
        ]


class WorkSettingsSerializer(serializers.ModelSerializer):
    """
    Legacy serializer - use role-specific serializers instead
    """
    class Meta:
        model = WorkSettings
        fields = [
            "id",
            "timezone",
            "start_time",
            "end_time",
            "required_minutes",
            "grace_minutes",
            "workdays",
            "earliest_check_in_enabled",
            "earliest_check_in_time",
            "latest_check_out_enabled",
            "latest_check_out_time",
            "friday_start_time",
            "friday_end_time",
            "friday_required_minutes",
            "friday_grace_minutes",
            "office_latitude",
            "office_longitude",
            "office_radius_meters",
            "overtime_rate_workday",
            "overtime_rate_holiday",
            "overtime_threshold_minutes",
        ]


class AttendanceSerializer(serializers.ModelSerializer):
    """
    Legacy serializer - use role-specific serializers instead
    """
    class Meta:
        model = Attendance
        fields = [
            "id",
            "user",
            "employee",
            "date_local",
            "timezone",
            "check_in_at_utc",
            "check_in_lat",
            "check_in_lng",
            "check_in_accuracy_m",
            "check_out_at_utc",
            "check_out_lat",
            "check_out_lng",
            "check_out_accuracy_m",
            "is_holiday",
            "within_geofence",
            "minutes_late",
            "total_work_minutes",
            "note",
            "employee_note",
            "overtime_minutes",
            "overtime_amount",
            "overtime_approved",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "user",
            "employee",
            "date_local",
            "timezone",
            "check_in_at_utc",
            "check_out_at_utc",
            "is_holiday",
            "within_geofence",
            "minutes_late",
            "total_work_minutes",
            "employee_note",
            "overtime_minutes",
            "overtime_amount",
            "overtime_approved",
            "created_at",
            "updated_at",
        ]


class AttendanceCorrectionSerializer(serializers.ModelSerializer):
    """
    Legacy serializer - use role-specific serializers instead
    """
    user = UserBasicSerializer(read_only=True)
    reviewed_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = AttendanceCorrection
        fields = [
            "id",
            "user",
            "date_local",
            "type",
            "proposed_check_in_local",
            "proposed_check_out_local",
            "reason",
            "attachment",
            "status",
            "reviewed_by",
            "reviewed_at",
            "decision_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "user",
            "status",
            "reviewed_by",
            "reviewed_at",
            "decision_note",
            "created_at",
            "updated_at",
        ]


class HolidaySerializer(serializers.ModelSerializer):
    """
    Legacy serializer - use role-specific serializers instead
    """
    class Meta:
        model = Holiday
        fields = ["id", "date", "note"]


# ===== OVERTIME REQUEST SERIALIZERS =====

class OvertimeRequestAdminSerializer(serializers.ModelSerializer):
    """
    Admin serializer for overtime requests - full access
    """
    user = UserBasicSerializer(read_only=True)
    employee = EmployeeSerializer(read_only=True)
    approved_by = UserBasicSerializer(read_only=True)
    level1_approved_by = UserBasicSerializer(read_only=True)
    level1_rejected_by = UserBasicSerializer(read_only=True)
    final_approved_by = UserBasicSerializer(read_only=True)
    final_rejected_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = OvertimeRequest
        fields = [
            "id",
            "employee",
            "user",
            "date_requested",
            "overtime_hours",
            "work_description",
            "status",
            "level1_approved_by",
            "level1_approved_at",
            "level1_rejected_by",
            "level1_rejected_at",
            "final_approved_by",
            "final_approved_at",
            "final_rejected_by",
            "final_rejected_at",
            "approved_by",
            "approved_at",
            "rejection_reason",
            "overtime_amount",
            "created_at",
            "updated_at",
        ]


class OvertimeRequestSupervisorSerializer(serializers.ModelSerializer):
    """
    Supervisor serializer for overtime requests - can approve/reject
    """
    user = UserBasicSerializer(read_only=True)
    employee = EmployeeSerializer(read_only=True)
    approved_by = UserBasicSerializer(read_only=True)
    level1_approved_by = UserBasicSerializer(read_only=True)
    level1_rejected_by = UserBasicSerializer(read_only=True)
    final_approved_by = UserBasicSerializer(read_only=True)
    final_rejected_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = OvertimeRequest
        fields = [
            "id",
            "employee",
            "user",
            "date_requested",
            "overtime_hours",
            "work_description",
            "status",
            "level1_approved_by",
            "level1_approved_at",
            "level1_rejected_by",
            "level1_rejected_at",
            "final_approved_by",
            "final_approved_at",
            "final_rejected_by",
            "final_rejected_at",
            "approved_by",
            "approved_at",
            "rejection_reason",
            "overtime_amount",
            "created_at",
            "updated_at",
        ]


class OvertimeRequestEmployeeSerializer(serializers.ModelSerializer):
    """
    Employee serializer for overtime requests - can create and view own requests
    """
    user = UserBasicSerializer(read_only=True)
    employee = EmployeeSerializer(read_only=True)
    approved_by = UserBasicSerializer(read_only=True)
    level1_approved_by = UserBasicSerializer(read_only=True)
    level1_rejected_by = UserBasicSerializer(read_only=True)
    final_approved_by = UserBasicSerializer(read_only=True)
    final_rejected_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = OvertimeRequest
        fields = [
            "id",
            "employee",
            "user",
            "date_requested",
            "overtime_hours",
            "work_description",
            "status",
            "level1_approved_by",
            "level1_approved_at",
            "level1_rejected_by",
            "level1_rejected_at",
            "final_approved_by",
            "final_approved_at",
            "final_rejected_by",
            "final_rejected_at",
            "approved_by",
            "approved_at",
            "rejection_reason",
            "overtime_amount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "employee",
            "user",
            "status",
            "level1_approved_by",
            "level1_approved_at",
            "level1_rejected_by",
            "level1_rejected_at",
            "final_approved_by",
            "final_approved_at",
            "final_rejected_by",
            "final_rejected_at",
            "approved_by",
            "approved_at",
            "rejection_reason",
            "overtime_amount",
            "created_at",
            "updated_at",
        ]


class OvertimeRequestCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating overtime requests by employees
    """
    class Meta:
        model = OvertimeRequest
        fields = [
            "date_requested",
            "overtime_hours",
            "work_description",
        ]
    
    def validate_date_requested(self, value):
        """Validate that the date is not in the future beyond reasonable limit"""
        from datetime import date, timedelta
        today = date.today()
        
        # Allow any date in the past and up to 1 day in the future
        if value > today + timedelta(days=1):
            raise serializers.ValidationError("Tanggal tidak boleh lebih dari 1 hari ke depan")
        # Removed 7-day restriction - now allows any past date
            
        return value
    
    def validate_overtime_hours(self, value):
        """Validate overtime hours"""
        if value <= 0:
            raise serializers.ValidationError("Jam lembur harus lebih dari 0")
        if value > 12:  # Maximum 12 hours overtime per day
            raise serializers.ValidationError("Jam lembur maksimal 12 jam per hari")
        return value


# ============================================================================
# MONTHLY SUMMARY REQUEST SERIALIZERS
# ============================================================================

class MonthlySummaryRequestAdminSerializer(serializers.ModelSerializer):
    """
    Admin serializer for monthly summary requests - full access
    """
    user = UserBasicSerializer(read_only=True)
    employee = EmployeeSerializer(read_only=True)
    level1_approved_by = UserBasicSerializer(read_only=True)
    final_approved_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = MonthlySummaryRequest
        fields = [
            "id",
            "employee",
            "user",
            "request_period",
            "report_type",
            "request_title",
            "request_description",
            "include_attendance",
            "include_overtime",
            "include_corrections",
            "include_summary_stats",
            "priority",
            "expected_completion_date",
            "status",
            "level1_approved_by",
            "level1_approved_at",
            "final_approved_by",
            "final_approved_at",
            "rejection_reason",
            "completed_at",
            "completion_notes",
            "created_at",
            "updated_at",
        ]


class MonthlySummaryRequestSupervisorSerializer(serializers.ModelSerializer):
    """
    Supervisor serializer for monthly summary requests - can approve/reject
    """
    user = UserBasicSerializer(read_only=True)
    employee = EmployeeSerializer(read_only=True)
    level1_approved_by = UserBasicSerializer(read_only=True)
    final_approved_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = MonthlySummaryRequest
        fields = [
            "id",
            "employee",
            "user",
            "request_period",
            "report_type",
            "request_title",
            "request_description",
            "include_attendance",
            "include_overtime",
            "include_corrections",
            "include_summary_stats",
            "priority",
            "expected_completion_date",
            "status",
            "level1_approved_by",
            "level1_approved_at",
            "final_approved_by",
            "final_approved_at",
            "rejection_reason",
            "completed_at",
            "completion_notes",
            "created_at",
            "updated_at",
        ]


class MonthlySummaryRequestEmployeeSerializer(serializers.ModelSerializer):
    """
    Employee serializer for monthly summary requests - can create and view own requests
    """
    user = UserBasicSerializer(read_only=True)
    employee = EmployeeSerializer(read_only=True)
    level1_approved_by = UserBasicSerializer(read_only=True)
    final_approved_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = MonthlySummaryRequest
        fields = [
            "id",
            "employee",
            "user",
            "request_period",
            "report_type",
            "request_title",
            "request_description",
            "include_attendance",
            "include_overtime",
            "include_corrections",
            "include_summary_stats",
            "priority",
            "expected_completion_date",
            "status",
            "level1_approved_by",
            "level1_approved_at",
            "final_approved_by",
            "final_approved_at",
            "rejection_reason",
            "completed_at",
            "completion_notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "employee",
            "user",
            "status",
            "level1_approved_by",
            "level1_approved_at",
            "final_approved_by",
            "final_approved_at",
            "rejection_reason",
            "completed_at",
            "completion_notes",
            "created_at",
            "updated_at",
        ]


class MonthlySummaryRequestCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating monthly summary requests by employees
    """
    class Meta:
        model = MonthlySummaryRequest
        fields = [
            "request_period",
            "report_type",
            "request_title",
            "request_description",
            "include_attendance",
            "include_overtime",
            "include_corrections",
            "include_summary_stats",
            "priority",
            "expected_completion_date",
        ]
    
    def validate_request_period(self, value):
        """Validate request period format (YYYY-MM)"""
        from datetime import datetime
        try:
            datetime.strptime(value, '%Y-%m')
        except ValueError:
            raise serializers.ValidationError("Format periode harus YYYY-MM (contoh: 2024-01)")
        return value
    
    def validate_expected_completion_date(self, value):
        """Validate expected completion date is not in the past"""
        from datetime import date
        if value and value < date.today():
            raise serializers.ValidationError("Tanggal target selesai tidak boleh di masa lalu")
        return value


# ============================================================================
# GROUP SERIALIZERS
# ============================================================================

class GroupSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Group - Basic access untuk semua role
    """
    class Meta:
        model = Group
        fields = ["id", "name"]
        read_only_fields = ["id"]


class GroupAdminSerializer(serializers.ModelSerializer):
    """
    Admin serializer untuk Group - Full access
    """
    class Meta:
        model = Group
        fields = ["id", "name"]
        read_only_fields = ["id"]


class GroupCreateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk membuat Group baru
    """
    class Meta:
        model = Group
        fields = ["name"]

    def validate_name(self, value):
        # Check if group name already exists
        if Group.objects.filter(name=value).exists():
            raise serializers.ValidationError("Group with this name already exists.")
        return value


class GroupUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk update Group
    """
    class Meta:
        model = Group
        fields = ["name"]

    def validate_name(self, value):
        # Check if group name already exists (excluding current instance)
        instance = self.instance
        if instance and Group.objects.filter(name=value).exclude(id=instance.id).exists():
            raise serializers.ValidationError("Group with this name already exists.")
        return value


class GroupDetailSerializer(serializers.ModelSerializer):
    """
    Serializer untuk detail Group dengan informasi user dan permissions
    """
    user_count = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    user_set = serializers.SerializerMethodField()
    
    class Meta:
        model = Group
        fields = ["id", "name", "user_count", "permissions", "user_set"]
        read_only_fields = ["id", "user_count", "permissions", "user_set"]
    
    def get_user_count(self, obj):
        return obj.user_set.count()
    
    def get_permissions(self, obj):
        """Get custom permissions for this group"""
        from .models import GroupPermission
        permissions = GroupPermission.objects.filter(group=obj, is_active=True)
        return [{
            'id': perm.id,
            'permission_type': perm.permission_type,
            'permission_action': perm.permission_action,
            'is_active': perm.is_active,
            'created_at': perm.created_at,
            'updated_at': perm.updated_at,
        } for perm in permissions]
    
    def get_user_set(self, obj):
        """Get users in this group"""
        return [{
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name or '',
            'last_name': user.last_name or '',
            'is_active': user.is_active,
            'date_joined': user.date_joined,
            'last_login': user.last_login
        } for user in obj.user_set.all()]


# ============================================================================
# PERMISSION SERIALIZERS
# ============================================================================

class BulkPermissionUpdateSerializer(serializers.Serializer):
    """
    Serializer untuk bulk update permissions
    """
    group_id = serializers.IntegerField()
    permissions = serializers.ListField(
        child=serializers.DictField()
    )
    
    def validate_permissions(self, value):
        """Validate permissions format"""
        for perm in value:
            if 'permission_type' not in perm or 'permission_action' not in perm:
                raise serializers.ValidationError(
                    "Each permission must have 'permission_type' and 'permission_action' keys"
                )
            
            # Validate permission type and action values
            valid_types = [choice[0] for choice in GroupPermission.PERMISSION_TYPES]
            valid_actions = [choice[0] for choice in GroupPermission.PERMISSION_ACTIONS]
            
            if perm['permission_type'] not in valid_types:
                raise serializers.ValidationError(f"Invalid permission type: {perm['permission_type']}")
            
            if perm['permission_action'] not in valid_actions:
                raise serializers.ValidationError(f"Invalid permission action: {perm['permission_action']}")
        
        return value


# ============================================================================
# PERMISSION SERIALIZERS
# ============================================================================

class GroupPermissionSerializer(serializers.ModelSerializer):
    """
    Serializer untuk GroupPermission - Basic access
    """
    permission_type_display = serializers.CharField(source='get_permission_type_display', read_only=True)
    permission_action_display = serializers.CharField(source='get_permission_action_display', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)
    
    class Meta:
        model = GroupPermission
        fields = [
            "id", "group", "group_name", "permission_type", "permission_type_display",
            "permission_action", "permission_action_display", "is_active",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class GroupPermissionCreateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk membuat GroupPermission baru
    """
    class Meta:
        model = GroupPermission
        fields = ["group", "permission_type", "permission_action", "is_active"]
    
    def validate(self, data):
        # Check if permission already exists for this group
        if GroupPermission.objects.filter(
            group=data['group'],
            permission_type=data['permission_type'],
            permission_action=data['permission_action']
        ).exists():
            raise serializers.ValidationError(
                "Permission already exists for this group, type, and action combination."
            )
        return data


class GroupPermissionUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk update GroupPermission
    """
    class Meta:
        model = GroupPermission
        fields = ["permission_type", "permission_action", "is_active"]
    
    def validate(self, data):
        instance = self.instance
        if instance:
            # Check if updated combination already exists (excluding current instance)
            if GroupPermission.objects.filter(
                group=instance.group,
                permission_type=data.get('permission_type', instance.permission_type),
                permission_action=data.get('permission_action', instance.permission_action)
            ).exclude(id=instance.id).exists():
                raise serializers.ValidationError(
                    "Permission already exists for this group, type, and action combination."
                )
        return data


class GroupPermissionDetailSerializer(serializers.ModelSerializer):
    """
    Serializer untuk detail GroupPermission
    """
    permission_type_display = serializers.CharField(source='get_permission_type_display', read_only=True)
    permission_action_display = serializers.CharField(source='get_permission_action_display', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)
    
    class Meta:
        model = GroupPermission
        fields = [
            "id", "group", "group_name", "permission_type", "permission_type_display",
            "permission_action", "permission_action_display", "is_active",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class GroupPermissionTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk GroupPermissionTemplate
    """
    class Meta:
        model = GroupPermissionTemplate
        fields = [
            "id", "name", "description", "permissions", "is_active",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class GroupPermissionTemplateCreateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk membuat GroupPermissionTemplate baru
    """
    class Meta:
        model = GroupPermissionTemplate
        fields = ["name", "description", "permissions", "is_active"]
    
    def validate_permissions(self, value):
        """Validate permissions format"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Permissions must be a list")
        
        for perm in value:
            if not isinstance(perm, dict):
                raise serializers.ValidationError("Each permission must be a dictionary")
            
            if 'type' not in perm or 'action' not in perm:
                raise serializers.ValidationError("Each permission must have 'type' and 'action' keys")
            
            # Validate permission type and action values
            valid_types = [choice[0] for choice in GroupPermission.PERMISSION_TYPES]
            valid_actions = [choice[0] for choice in GroupPermission.PERMISSION_ACTIONS]
            
            if perm['type'] not in valid_types:
                raise serializers.ValidationError(f"Invalid permission type: {perm['type']}")
            
            if perm['action'] not in valid_actions:
                raise serializers.ValidationError(f"Invalid permission action: {perm['action']}")
        
        return value


class GroupPermissionTemplateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk update GroupPermissionTemplate
    """
    class Meta:
        model = GroupPermissionTemplate
        fields = ["name", "description", "permissions", "is_active"]


class GroupWithPermissionsSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Group dengan permissions detail
    """
    permissions = GroupPermissionSerializer(source='custom_permissions', many=True, read_only=True)
    permission_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Group
        fields = ["id", "name", "permissions", "permission_count"]
        read_only_fields = ["id"]
    
    def get_permission_count(self, obj):
        return obj.custom_permissions.filter(is_active=True).count()


class PermissionSummarySerializer(serializers.Serializer):
    """
    Serializer untuk summary permissions
    """
    group_id = serializers.IntegerField()
    group_name = serializers.CharField()
    total_permissions = serializers.IntegerField()
    active_permissions = serializers.IntegerField()
    permission_types = serializers.ListField(child=serializers.CharField())
    permission_actions = serializers.ListField(child=serializers.CharField())


class EmployeeRoleSerializer(serializers.ModelSerializer):
    """
    Serializer untuk EmployeeRole - Basic read/write operations
    """
    group_name = serializers.CharField(source='group.name', read_only=True)
    employee_name = serializers.CharField(source='employee.fullname', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.username', read_only=True)

    class Meta:
        model = EmployeeRole
        fields = [
            'id', 'employee', 'employee_name', 'group', 'group_name',
            'is_primary', 'is_active', 'assigned_by', 'assigned_by_name',
            'assigned_at'
        ]
        read_only_fields = ['id', 'assigned_at', 'assigned_by_name']

    def validate(self, data):
        """
        Validate that an employee doesn't get duplicate roles and ensure primary role logic
        """
        employee = data.get('employee')
        group = data.get('group')
        is_primary = data.get('is_primary', False)

        # Check for duplicate role assignment
        existing_role = EmployeeRole.objects.filter(
            employee=employee,
            group=group
        ).exclude(pk=getattr(self.instance, 'pk', None))

        if existing_role.exists():
            raise serializers.ValidationError("Employee already has this role assigned.")

        return data


class EmployeeRoleCreateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk membuat EmployeeRole baru
    """
    class Meta:
        model = EmployeeRole
        fields = ['employee', 'group', 'is_primary', 'is_active']

    def create(self, validated_data):
        # Set assigned_by to current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['assigned_by'] = request.user

        return super().create(validated_data)


class EmployeeRoleUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk update EmployeeRole
    """
    class Meta:
        model = EmployeeRole
        fields = ['is_primary', 'is_active']


class EmployeeWithRolesSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Employee yang include roles nya
    """
    user = UserBasicSerializer(read_only=True)
    division = DivisionSerializer(read_only=True)
    position = PositionSerializer(read_only=True)
    roles = serializers.SerializerMethodField()
    primary_role = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id', 'user', 'nip', 'fullname', 'division', 'position',
            'gaji_pokok', 'tmt_kerja', 'tempat_lahir', 'tanggal_lahir',
            'roles', 'primary_role'
        ]

    def get_roles(self, obj):
        """Get all active roles for this employee"""
        roles = obj.employee_roles.filter(is_active=True)
        return EmployeeRoleSerializer(roles, many=True).data

    def get_primary_role(self, obj):
        """Get the primary role for this employee"""
        primary_role = obj.employee_roles.filter(is_active=True, is_primary=True).first()
        if primary_role:
            return EmployeeRoleSerializer(primary_role).data
        return None


# Role serializers moved to role_serializers.py
    """
    Serializer untuk Role - Basic read/write operations
    """
    role_type_display = serializers.CharField(source='get_role_type_display', read_only=True)
    
    class Meta:
        model = Role
        fields = [
            'id', 'name', 'display_name', 'role_type', 'role_type_display',
            'approval_level', 'group', 'description', 'is_active', 'sort_order',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_name(self, value):
        # Ensure name is lowercase and valid
        value = value.lower().strip()
        if not value.replace('_', '').isalnum():
            raise serializers.ValidationError("Role name must contain only letters, numbers, and underscores")
        return value

    def validate(self, data):
        # Ensure only one primary role per type
        if data.get('role_type') == 'primary':
            existing_primary = Role.objects.filter(
                role_type='primary',
                is_active=True
            ).exclude(pk=self.instance.pk if self.instance else None)
            
            if existing_primary.exists():
                raise serializers.ValidationError("Only one primary role is allowed")
        
        return data


class RoleCreateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk create Role
    """
    class Meta:
        model = Role
        fields = [
            'name', 'display_name', 'role_type', 'approval_level',
            'group', 'description', 'is_active', 'sort_order'
        ]

    def create(self, validated_data):
        # Auto-create Django Group
        from django.contrib.auth.models import Group
        Group.objects.get_or_create(name=validated_data['name'])
        return super().create(validated_data)


class RoleUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk update Role
    """
    class Meta:
        model = Role
        fields = [
            'display_name', 'role_type', 'approval_level',
            'group', 'description', 'is_active', 'sort_order'
        ]


class RoleDetailSerializer(serializers.ModelSerializer):
    """
    Serializer untuk detail Role dengan informasi tambahan
    """
    role_type_display = serializers.CharField(source='get_role_type_display', read_only=True)
    user_count = serializers.SerializerMethodField()
    is_used = serializers.SerializerMethodField()
    
    class Meta:
        model = Role
        fields = [
            'id', 'name', 'display_name', 'role_type', 'role_type_display',
            'approval_level', 'group', 'description', 'is_active', 'sort_order',
            'user_count', 'is_used', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'name', 'created_at', 'updated_at']

    def get_user_count(self, obj):
        """Get count of users with this role"""
        from django.contrib.auth.models import Group
        try:
            group = Group.objects.get(name=obj.name)
            return group.user_set.count()
        except Group.DoesNotExist:
            return 0

    def get_is_used(self, obj):
        """Check if this role is currently being used"""
        from django.contrib.auth.models import Group
        try:
            group = Group.objects.get(name=obj.name)
            return group.user_set.exists()
        except Group.DoesNotExist:
            return False