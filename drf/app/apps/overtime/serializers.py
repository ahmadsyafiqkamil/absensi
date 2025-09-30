from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import OvertimeRequest, MonthlySummaryRequest
from apps.attendance.serializers import AttendanceSerializer
from apps.employees.serializers import EmployeeSerializer

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user serializer for nested relationships"""
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email"]


# Overtime Request Serializers
class OvertimeRequestSerializer(serializers.ModelSerializer):
    """Base overtime request serializer"""
    user = UserBasicSerializer(read_only=True)
    employee = EmployeeSerializer(read_only=True)
    attendance = AttendanceSerializer(read_only=True)
    
    class Meta:
        model = OvertimeRequest
        fields = [
            "id", "user", "employee", "attendance",
            "request_type", "date", "start_time", "end_time", "total_hours",
            "purpose", "work_description", "status", "requested_at"
        ]
        read_only_fields = ["id", "total_hours", "status", "requested_at"]


class OvertimeRequestAdminSerializer(OvertimeRequestSerializer):
    """Admin overtime request serializer with full access"""
    class Meta(OvertimeRequestSerializer.Meta):
        fields = OvertimeRequestSerializer.Meta.fields + [
            "hourly_rate", "total_amount", "approved_by", "approved_at", 
            "rejection_reason", "created_at", "updated_at"
        ]


class OvertimeRequestSupervisorSerializer(OvertimeRequestSerializer):
    """Supervisor overtime request serializer with limited access"""
    def to_representation(self, instance):
        """Ensure financial fields are present for supervisor view.
        If not approved yet, compute an estimated amount based on settings.
        """
        data = super().to_representation(instance)
        try:
            hourly_rate = getattr(instance, 'hourly_rate', None)
            total_amount = getattr(instance, 'total_amount', None)
            if hourly_rate is None or total_amount is None:
                from apps.settings.models import WorkSettings
                ws = WorkSettings.objects.first()
                employee = getattr(instance, 'employee', None)
                total_hours = float(getattr(instance, 'total_hours', 0) or 0)
                if ws and employee and getattr(employee, 'gaji_pokok', None) and total_hours > 0:
                    monthly_hours = 22 * 8
                    base_hourly = float(employee.gaji_pokok) / monthly_hours
                    req_type = getattr(instance, 'request_type', 'regular') or 'regular'
                    if req_type == 'holiday':
                        rate_multiplier = float(getattr(ws, 'overtime_rate_holiday', 0.75) or 0.75)
                    else:
                        rate_multiplier = float(getattr(ws, 'overtime_rate_workday', 0.50) or 0.50)
                    est_hourly = base_hourly * rate_multiplier
                    est_total = est_hourly * total_hours
                    data['hourly_rate'] = round(est_hourly, 2)
                    data['total_amount'] = round(est_total, 2)
                else:
                    if hourly_rate is not None:
                        data['hourly_rate'] = float(hourly_rate)
                    if total_amount is not None:
                        data['total_amount'] = float(total_amount)
            else:
                data['hourly_rate'] = float(hourly_rate)
                data['total_amount'] = float(total_amount)
        except Exception:
            pass
        return data
    class Meta(OvertimeRequestSerializer.Meta):
        fields = OvertimeRequestSerializer.Meta.fields + [
            "hourly_rate", "total_amount", "approved_by", "approved_at", 
            "rejection_reason"
        ]


class OvertimeRequestEmployeeSerializer(OvertimeRequestSerializer):
    """Employee overtime request serializer with minimal access"""
    def to_representation(self, instance):
        """Ensure financial fields are present for employee view.
        If not approved yet, compute an estimated amount based on settings.
        """
        data = super().to_representation(instance)
        try:
            # Prefer stored values when available
            hourly_rate = getattr(instance, 'hourly_rate', None)
            total_amount = getattr(instance, 'total_amount', None)
            if hourly_rate is None or total_amount is None:
                from apps.settings.models import WorkSettings
                from decimal import Decimal
                ws = WorkSettings.objects.first()
                employee = getattr(instance, 'employee', None)
                total_hours = float(getattr(instance, 'total_hours', 0) or 0)
                if ws and employee and getattr(employee, 'gaji_pokok', None) and total_hours > 0:
                    monthly_hours = 22 * 8
                    base_hourly = float(employee.gaji_pokok) / monthly_hours
                    # Determine rate by request type
                    req_type = getattr(instance, 'request_type', 'regular') or 'regular'
                    if req_type == 'holiday':
                        rate_multiplier = float(getattr(ws, 'overtime_rate_holiday', 0.75) or 0.75)
                    else:
                        rate_multiplier = float(getattr(ws, 'overtime_rate_workday', 0.50) or 0.50)
                    est_hourly = base_hourly * rate_multiplier
                    est_total = est_hourly * total_hours
                    data['hourly_rate'] = round(est_hourly, 2)
                    data['total_amount'] = round(est_total, 2)
                else:
                    if hourly_rate is not None:
                        data['hourly_rate'] = float(hourly_rate)
                    if total_amount is not None:
                        data['total_amount'] = float(total_amount)
            else:
                data['hourly_rate'] = float(hourly_rate)
                data['total_amount'] = float(total_amount)
        except Exception:
            # Best-effort; leave fields absent on error
            pass
        return data
    class Meta(OvertimeRequestSerializer.Meta):
        fields = [
            "id", "user", "employee", "request_type", "date", "start_time", "end_time", "total_hours",
            "purpose", "work_description", "status", "requested_at", "hourly_rate", "total_amount"
        ]


class OvertimeRequestCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating overtime requests"""
    attendance_id = serializers.IntegerField(required=False, allow_null=True)
    
    class Meta:
        model = OvertimeRequest
        fields = [
            "attendance_id", "request_type", "date", "start_time", "end_time",
            "purpose", "work_description", "total_hours"
        ]
        extra_kwargs = {
            'attendance': {'required': False, 'allow_null': True}
        }
    
    def validate(self, data):
        """Validate overtime request data"""
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        date = data.get('date')
        
        if start_time and end_time:
            # Allow overnight overtime (end_time can be earlier than start_time)
            # Only reject when times are exactly equal (zero duration)
            if start_time == end_time:
                raise serializers.ValidationError(
                    "End time must be different from start time"
                )
        
        # Check if date is not in the future
        from datetime import date as date_type
        if date and date > date_type.today():
            raise serializers.ValidationError(
                "Overtime date cannot be in the future"
            )
        
        # Validasi waktu pengajuan lembur manual (hanya 12 malam - 6 pagi)
        from django.utils import timezone
        current_time = timezone.now()
        current_hour = current_time.hour
        
        # Untuk manual overtime request, hanya izinkan pengajuan dari jam 0-6 (12 malam - 6 pagi)
        if current_hour < 0 or current_hour > 6:
            raise serializers.ValidationError(
                "Pengajuan lembur manual hanya dapat dilakukan dari jam 00:00 (12 malam) hingga jam 06:00 (6 pagi). "
                f"Waktu saat ini: {current_time.strftime('%H:%M')}"
            )
        
        return data
    
    def create(self, validated_data):
        """Create overtime request with attendance handling"""
        from apps.attendance.models import Attendance
        from apps.settings.models import WorkSettings
        from django.utils import timezone as dj_timezone
        
        # Handle attendance field
        attendance_id = validated_data.pop('attendance_id', None)
        attendance = None
        
        if attendance_id:
            try:
                attendance = Attendance.objects.get(id=attendance_id)
            except Attendance.DoesNotExist:
                pass
        
        if not attendance:
            # Find or create attendance record for the date
            request = self.context.get('request')
            user = request.user if request else None
            if not user:
                # Fallback: try to get user from validated_data if available
                user = validated_data.get('user')
            
            date = validated_data.get('date')
            
            if user and date:
                # Try to find existing attendance record
                attendance = Attendance.objects.filter(
                    user=user,
                    date_local=date
                ).first()
                
                if not attendance:
                    # Create new attendance record for overtime
                    ws = WorkSettings.objects.first()
                    tzname = ws.timezone if ws else dj_timezone.get_current_timezone_name()
                    
                    attendance = Attendance.objects.create(
                        user=user,
                        date_local=date,
                        timezone=tzname,
                        employee=user.employee_profile if hasattr(user, 'employee_profile') else None
                    )
        
        if attendance:
            validated_data['attendance'] = attendance
        
        return super().create(validated_data)


class OvertimeRequestApprovalSerializer(serializers.Serializer):
    """Serializer for approving/rejecting overtime requests"""
    action = serializers.ChoiceField(choices=['approve', 'reject', 'cancel'])
    reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        """Validate approval data"""
        action = data.get('action')
        reason = data.get('reason')
        
        if action == 'reject' and not reason:
            raise serializers.ValidationError(
                "Rejection reason is required when rejecting an overtime request"
            )
        
        return data


# Monthly Summary Request Serializers
class MonthlySummaryRequestSerializer(serializers.ModelSerializer):
    """Base monthly summary request serializer"""
    user = UserBasicSerializer(read_only=True)
    employee = EmployeeSerializer(read_only=True)
    level1_approved_by = UserBasicSerializer(read_only=True)
    approved_by = UserBasicSerializer(read_only=True)
    request_period = serializers.ReadOnlyField()
    
    class Meta:
        model = MonthlySummaryRequest
        fields = [
            "id", "user", "employee", "month", "year", "request_period", "purpose", "status",
            "level1_approved_by", "level1_approved_at",
            "approved_by", "approved_at", "rejection_reason",
            "requested_at"
        ]
        read_only_fields = ["id", "status", "requested_at", "level1_approved_by", "level1_approved_at", "approved_by", "approved_at", "rejection_reason"]


class MonthlySummaryRequestAdminSerializer(MonthlySummaryRequestSerializer):
    """Admin monthly summary request serializer with full access"""
    class Meta(MonthlySummaryRequestSerializer.Meta):
        fields = MonthlySummaryRequestSerializer.Meta.fields + ["created_at", "updated_at"]


class MonthlySummaryRequestSupervisorSerializer(MonthlySummaryRequestSerializer):
    """Supervisor monthly summary request serializer with limited access"""
    class Meta(MonthlySummaryRequestSerializer.Meta):
        fields = MonthlySummaryRequestSerializer.Meta.fields


class MonthlySummaryRequestEmployeeSerializer(MonthlySummaryRequestSerializer):
    """Employee monthly summary request serializer with minimal access"""
    class Meta(MonthlySummaryRequestSerializer.Meta):
        fields = [
            "id", "user", "employee", "month", "year", "purpose", "status",
            "level1_approved_by", "level1_approved_at",
            "approved_by", "approved_at", "rejection_reason",
            "requested_at"
        ]


class MonthlySummaryRequestCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating monthly summary requests"""
    class Meta:
        model = MonthlySummaryRequest
        fields = ["month", "year", "purpose"]
    
    def validate(self, data):
        """Validate monthly summary request data"""
        month = data.get('month')
        year = data.get('year')
        
        if month and (month < 1 or month > 12):
            raise serializers.ValidationError(
                "Month must be between 1 and 12"
            )
        
        if year:
            from datetime import date
            current_year = date.today().year
            if year > current_year:
                raise serializers.ValidationError(
                    "Year cannot be in the future"
                )
        
        return data


class MonthlySummaryRequestApprovalSerializer(serializers.Serializer):
    """Serializer for approving/rejecting monthly summary requests"""
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    approval_level = serializers.ChoiceField(choices=[1, 2], required=False)
    reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        """Validate approval data"""
        action = data.get('action')
        reason = data.get('reason')
        approval_level = data.get('approval_level')
        
        if action == 'reject' and not reason:
            raise serializers.ValidationError(
                "Rejection reason is required when rejecting a monthly summary request"
            )
        if action == 'approve' and approval_level not in [1, 2]:
            raise serializers.ValidationError(
                "approval_level must be 1 or 2 when approving"
            )
        
        return data


# List Serializers for efficient listing
class OvertimeRequestListSerializer(serializers.ModelSerializer):
    """Serializer for listing overtime requests with basic info"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    employee_name = serializers.CharField(source='employee.fullname', read_only=True)
    
    class Meta:
        model = OvertimeRequest
        fields = [
            "id", "user_name", "employee_name", "request_type", "date", 
            "total_hours", "status", "requested_at"
        ]


class MonthlySummaryRequestListSerializer(serializers.ModelSerializer):
    """Serializer for listing monthly summary requests with basic info"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    employee_name = serializers.CharField(source='employee.fullname', read_only=True)
    month_name = serializers.CharField(source='month_name', read_only=True)
    
    class Meta:
        model = MonthlySummaryRequest
        fields = [
            "id", "user_name", "employee_name", "month", "month_name", 
            "year", "status", "requested_at"
        ]
