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
            "id", "request_type", "date", "start_time", "end_time", "total_hours",
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
    class Meta(OvertimeRequestSerializer.Meta):
        fields = OvertimeRequestSerializer.Meta.fields + [
            "hourly_rate", "total_amount", "approved_by", "approved_at", 
            "rejection_reason"
        ]


class OvertimeRequestEmployeeSerializer(OvertimeRequestSerializer):
    """Employee overtime request serializer with minimal access"""
    class Meta(OvertimeRequestSerializer.Meta):
        fields = [
            "id", "request_type", "date", "start_time", "end_time", "total_hours",
            "purpose", "work_description", "status", "requested_at"
        ]


class OvertimeRequestCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating overtime requests"""
    class Meta:
        model = OvertimeRequest
        fields = [
            "attendance", "request_type", "date", "start_time", "end_time",
            "purpose", "work_description"
        ]
    
    def validate(self, data):
        """Validate overtime request data"""
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        date = data.get('date')
        
        if start_time and end_time:
            if start_time >= end_time:
                raise serializers.ValidationError(
                    "End time must be after start time"
                )
        
        # Check if date is not in the future
        from datetime import date as date_type
        if date and date > date_type.today():
            raise serializers.ValidationError(
                "Overtime date cannot be in the future"
            )
        
        return data


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
    
    class Meta:
        model = MonthlySummaryRequest
        fields = [
            "id", "month", "year", "purpose", "status", "requested_at"
        ]
        read_only_fields = ["id", "status", "requested_at"]


class MonthlySummaryRequestAdminSerializer(MonthlySummaryRequestSerializer):
    """Admin monthly summary request serializer with full access"""
    class Meta(MonthlySummaryRequestSerializer.Meta):
        fields = MonthlySummaryRequestSerializer.Meta.fields + [
            "approved_by", "approved_at", "rejection_reason", 
            "created_at", "updated_at"
        ]


class MonthlySummaryRequestSupervisorSerializer(MonthlySummaryRequestSerializer):
    """Supervisor monthly summary request serializer with limited access"""
    class Meta(MonthlySummaryRequestSerializer.Meta):
        fields = MonthlySummaryRequestSerializer.Meta.fields + [
            "approved_by", "approved_at", "rejection_reason"
        ]


class MonthlySummaryRequestEmployeeSerializer(MonthlySummaryRequestSerializer):
    """Employee monthly summary request serializer with minimal access"""
    class Meta(MonthlySummaryRequestSerializer.Meta):
        fields = [
            "id", "month", "year", "purpose", "status", "requested_at"
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
    reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        """Validate approval data"""
        action = data.get('action')
        reason = data.get('reason')
        
        if action == 'reject' and not reason:
            raise serializers.ValidationError(
                "Rejection reason is required when rejecting a monthly summary request"
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
