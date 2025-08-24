from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Division, Position, Employee, WorkSettings, Holiday, Attendance, AttendanceCorrection, OvertimeRequest, MonthlySummaryRequest


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
            "approved_by",
            "approved_at",
            "overtime_amount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "employee",
            "user",
            "status",
            "approved_by",
            "approved_at",
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
        
        # Allow up to 7 days in the past and 1 day in the future
        if value > today + timedelta(days=1):
            raise serializers.ValidationError("Tanggal tidak boleh lebih dari 1 hari ke depan")
        if value < today - timedelta(days=7):
            raise serializers.ValidationError("Tanggal tidak boleh lebih dari 7 hari ke belakang")
            
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