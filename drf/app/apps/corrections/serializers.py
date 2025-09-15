from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import AttendanceCorrection
from apps.attendance.serializers import AttendanceSerializer
from apps.employees.serializers import EmployeeSerializer
from datetime import datetime, time
from django.utils import timezone

User = get_user_model()


class TimeToDateTimeField(serializers.Field):
    """Custom field that converts time strings to datetime objects"""
    
    def to_internal_value(self, data):
        if isinstance(data, str):
            # Parse time string (HH:MM format)
            try:
                time_obj = datetime.strptime(data, '%H:%M').time()
                return time_obj
            except ValueError:
                raise serializers.ValidationError(f"Invalid time format: {data}. Expected HH:MM")
        elif isinstance(data, time):
            return data
        elif isinstance(data, datetime):
            return data.time()
        else:
            raise serializers.ValidationError(f"Invalid time value: {data}")
    
    def to_representation(self, value):
        if isinstance(value, datetime):
            return value.time().strftime('%H:%M')
        elif isinstance(value, time):
            return value.strftime('%H:%M')
        return value


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user serializer for nested relationships"""
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email"]


class AttendanceCorrectionSerializer(serializers.ModelSerializer):
    """Base attendance correction serializer"""
    user = UserBasicSerializer(read_only=True)
    employee = EmployeeSerializer(read_only=True)
    attendance = AttendanceSerializer(read_only=True)
    
    # Computed fields for frontend compatibility
    type = serializers.CharField(source='correction_type', read_only=True)
    attachment = serializers.CharField(source='supporting_document', read_only=True)
    
    class Meta:
        model = AttendanceCorrection
        fields = [
            "id", "correction_type", "type", "requested_check_in", "requested_check_out",
            "requested_note", "reason", "status", "requested_at", "date_local",
            "supporting_document", "attachment", "created_at", "user", "employee", "attendance"
        ]
        read_only_fields = ["id", "status", "requested_at", "created_at", "type", "attachment"]
    
    def to_representation(self, instance):
        """Custom representation to include computed fields for frontend"""
        data = super().to_representation(instance)
        
        # Add computed fields for frontend compatibility
        if instance.date_local:
            # Return date in ISO format that can be parsed by JavaScript Date
            data['date_local'] = instance.date_local.isoformat() + 'T00:00:00Z'
        elif instance.attendance and instance.attendance.date_local:
            # Fallback to attendance date if correction date is not set
            data['date_local'] = instance.attendance.date_local.isoformat() + 'T00:00:00Z'
        
        # Add proposed times in local format (same as requested times for now)
        if instance.requested_check_in:
            data['proposed_check_in_local'] = instance.requested_check_in.isoformat()
        if instance.requested_check_out:
            data['proposed_check_out_local'] = instance.requested_check_out.isoformat()
        
        return data


class AttendanceCorrectionAdminSerializer(AttendanceCorrectionSerializer):
    """Admin attendance correction serializer with full access"""
    class Meta(AttendanceCorrectionSerializer.Meta):
        fields = AttendanceCorrectionSerializer.Meta.fields + [
            "supporting_document", "approved_by", "approved_at", "rejection_reason",
            "created_at", "updated_at"
        ]


class AttendanceCorrectionSupervisorSerializer(AttendanceCorrectionSerializer):
    """Supervisor attendance correction serializer with limited access"""
    class Meta(AttendanceCorrectionSerializer.Meta):
        fields = AttendanceCorrectionSerializer.Meta.fields + [
            "supporting_document", "approved_by", "approved_at", "rejection_reason"
        ]


class AttendanceCorrectionEmployeeSerializer(AttendanceCorrectionSerializer):
    """Employee attendance correction serializer with minimal access"""
    class Meta(AttendanceCorrectionSerializer.Meta):
        fields = [
            "id", "correction_type", "requested_check_in", "requested_check_out",
            "requested_note", "reason", "status", "requested_at"
        ]


class AttendanceCorrectionCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating attendance corrections"""
    date_local = serializers.DateField(required=False, write_only=True)
    requested_check_in = TimeToDateTimeField(required=False)
    requested_check_out = TimeToDateTimeField(required=False)
    
    class Meta:
        model = AttendanceCorrection
        fields = [
            "attendance", "date_local", "correction_type", "requested_check_in", 
            "requested_check_out", "requested_note", "reason", "supporting_document"
        ]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make attendance field optional for manual corrections
        self.fields['attendance'].required = False
    
    def validate(self, data):
        """Validate correction data"""
        correction_type = data.get('correction_type')
        requested_check_in = data.get('requested_check_in')
        requested_check_out = data.get('requested_check_out')
        requested_note = data.get('requested_note')
        attendance = data.get('attendance')
        date_local = data.get('date_local')
        
        # Either attendance or date_local must be provided
        if not attendance and not date_local:
            raise serializers.ValidationError(
                "Either attendance record or date_local is required"
            )
        
        # Validate based on correction type
        if correction_type == 'check_in':
            if not requested_check_in:
                raise serializers.ValidationError(
                    "Check-in time is required for check-in corrections"
                )
        elif correction_type == 'check_out':
            if not requested_check_out:
                raise serializers.ValidationError(
                    "Check-out time is required for check-out corrections"
                )
        elif correction_type == 'both':
            if not requested_check_in or not requested_check_out:
                raise serializers.ValidationError(
                    "Both check-in and check-out times are required for both corrections"
                )
        elif correction_type == 'note':
            if not requested_note:
                raise serializers.ValidationError(
                    "Note is required for note corrections"
                )
        
        return data
    
    def create(self, validated_data):
        """Create correction with proper datetime conversion"""
        # Convert time fields to datetime if provided
        date_local = validated_data.get('date_local')
        requested_check_in_time = validated_data.get('requested_check_in')
        requested_check_out_time = validated_data.get('requested_check_out')
        
        if date_local:
            if requested_check_in_time:
                # Combine date and time to create datetime
                check_in_datetime = datetime.combine(date_local, requested_check_in_time)
                validated_data['requested_check_in'] = timezone.make_aware(check_in_datetime)
            
            if requested_check_out_time:
                # Combine date and time to create datetime
                check_out_datetime = datetime.combine(date_local, requested_check_out_time)
                validated_data['requested_check_out'] = timezone.make_aware(check_out_datetime)
        
        return super().create(validated_data)


class AttendanceCorrectionApprovalSerializer(serializers.Serializer):
    """Serializer for approving/rejecting corrections"""
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        """Validate approval data"""
        action = data.get('action')
        reason = data.get('reason')
        
        if action == 'reject' and not reason:
            raise serializers.ValidationError(
                "Rejection reason is required when rejecting a correction"
            )
        
        return data


class AttendanceCorrectionListSerializer(serializers.ModelSerializer):
    """Serializer for listing corrections with basic info"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    employee_name = serializers.CharField(source='employee.fullname', read_only=True)
    attendance_date = serializers.DateField(source='attendance.date_local', read_only=True)
    
    class Meta:
        model = AttendanceCorrection
        fields = [
            "id", "user_name", "employee_name", "attendance_date", 
            "correction_type", "status", "requested_at"
        ]

