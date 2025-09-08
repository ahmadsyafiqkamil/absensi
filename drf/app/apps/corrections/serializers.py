from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import AttendanceCorrection
from apps.attendance.serializers import AttendanceSerializer
from apps.employees.serializers import EmployeeSerializer

User = get_user_model()


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
    
    class Meta:
        model = AttendanceCorrection
        fields = [
            "id", "correction_type", "requested_check_in", "requested_check_out",
            "requested_note", "reason", "status", "requested_at"
        ]
        read_only_fields = ["id", "status", "requested_at"]


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
    class Meta:
        model = AttendanceCorrection
        fields = [
            "attendance", "correction_type", "requested_check_in", 
            "requested_check_out", "requested_note", "reason", "supporting_document"
        ]
    
    def validate(self, data):
        """Validate correction data"""
        correction_type = data.get('correction_type')
        requested_check_in = data.get('requested_check_in')
        requested_check_out = data.get('requested_check_out')
        requested_note = data.get('requested_note')
        
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

