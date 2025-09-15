from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Attendance
from apps.employees.serializers import EmployeeSerializer, DivisionSerializer
from apps.settings.serializers import WorkSettingsSerializer

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user serializer for nested relationships"""
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email"]


class AttendanceSerializer(serializers.ModelSerializer):
    """Base attendance serializer"""
    user = UserBasicSerializer(read_only=True)
    employee = EmployeeSerializer(read_only=True)
    
    class Meta:
        model = Attendance
        fields = [
            "id", "date_local", "timezone", "check_in_at_utc", "check_out_at_utc",
            "total_work_minutes", "minutes_late", "status", "is_holiday", "within_geofence"
        ]
        read_only_fields = ["id", "total_work_minutes", "minutes_late", "status", "is_holiday"]


class AttendanceAdminSerializer(AttendanceSerializer):
    """Admin attendance serializer with full access"""
    class Meta(AttendanceSerializer.Meta):
        fields = AttendanceSerializer.Meta.fields + [
            "check_in_lat", "check_in_lng", "check_in_accuracy_m", "check_in_ip",
            "check_out_lat", "check_out_lng", "check_out_accuracy_m", "check_out_ip",
            "overtime_minutes", "overtime_amount", "overtime_approved", 
            "overtime_approved_by", "overtime_approved_at", "note", "employee_note",
            "created_at", "updated_at"
        ]


class AttendanceSupervisorSerializer(AttendanceSerializer):
    """Supervisor attendance serializer with limited access"""
    class Meta(AttendanceSerializer.Meta):
        fields = AttendanceSerializer.Meta.fields + [
            "check_in_lat", "check_in_lng", "check_in_accuracy_m", "check_in_ip",
            "check_out_lat", "check_out_lng", "check_out_accuracy_m", "check_out_ip",
            "overtime_minutes", "overtime_amount", "overtime_approved", 
            "overtime_approved_by", "overtime_approved_at", "note", "employee_note"
        ]


class AttendanceEmployeeSerializer(AttendanceSerializer):
    """Employee attendance serializer with minimal access"""
    class Meta(AttendanceSerializer.Meta):
        fields = [
            "id", "date_local", "timezone", "check_in_at_utc", "check_out_at_utc",
            "check_in_lat", "check_in_lng", "check_out_lat", "check_out_lng",
            "total_work_minutes", "minutes_late", "status", "is_holiday", "within_geofence",
            "note", "employee_note"
        ]


class AttendanceCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating attendance"""
    class Meta:
        model = Attendance
        fields = [
            "date_local", "timezone", "check_in_at_utc", "check_in_lat", "check_in_lng",
            "check_in_accuracy_m", "check_in_ip", "check_out_at_utc", "check_out_lat",
            "check_out_lng", "check_out_accuracy_m", "check_out_ip", "note", "employee_note"
        ]
    
    def validate(self, data):
        """Validate attendance data"""
        # Check if attendance already exists for this user and date
        user = self.context['request'].user
        date_local = data.get('date_local')
        
        if date_local:
            existing_attendance = Attendance.objects.filter(
                user=user, 
                date_local=date_local
            ).first()
            
            if existing_attendance and self.instance != existing_attendance:
                raise serializers.ValidationError(
                    "Attendance record already exists for this date"
                )
        
        return data


class AttendanceCheckInSerializer(serializers.Serializer):
    """Serializer for check-in operation"""
    latitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False)
    longitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False)
    accuracy = serializers.IntegerField(required=False)
    ip_address = serializers.IPAddressField(required=False)
    timezone = serializers.CharField(max_length=64, default="Asia/Dubai")
    note = serializers.CharField(max_length=200, required=False)


class AttendanceCheckOutSerializer(serializers.Serializer):
    """Serializer for check-out operation"""
    latitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False)
    longitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False)
    accuracy = serializers.IntegerField(required=False)
    ip_address = serializers.IPAddressField(required=False)
    note = serializers.CharField(max_length=200, required=False)


class AttendancePrecheckSerializer(serializers.Serializer):
    """Serializer for attendance precheck"""
    date = serializers.DateField(required=False)
    timezone = serializers.CharField(max_length=64, default="Asia/Dubai")
    
    def validate_date(self, value):
        """Validate date"""
        from datetime import date as date_type
        if value and value > date_type.today():
            raise serializers.ValidationError("Date cannot be in the future")
        return value


class AttendanceReportSerializer(serializers.Serializer):
    """Serializer for attendance report"""
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    employee_id = serializers.IntegerField(required=False)
    division_id = serializers.IntegerField(required=False)
    include_overtime = serializers.BooleanField(default=True)
    format = serializers.ChoiceField(choices=['json', 'pdf'], default='json')
    
    def validate(self, data):
        """Validate report parameters"""
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError("Start date cannot be after end date")
        return data
