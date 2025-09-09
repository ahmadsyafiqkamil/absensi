from rest_framework import serializers
from .models import WorkSettings, Holiday


class HolidaySerializer(serializers.ModelSerializer):
    """Base holiday serializer"""
    class Meta:
        model = Holiday
        fields = ["id", "date", "note"]


class HolidayAdminSerializer(HolidaySerializer):
    """Admin holiday serializer with full access"""
    class Meta(HolidaySerializer.Meta):
        fields = HolidaySerializer.Meta.fields + ["created_at", "updated_at"]


class HolidayPublicSerializer(HolidaySerializer):
    """Public holiday serializer for read-only access"""
    class Meta(HolidaySerializer.Meta):
        fields = ["id", "date", "note"]


class WorkSettingsSerializer(serializers.ModelSerializer):
    """Base work settings serializer"""
    class Meta:
        model = WorkSettings
        fields = [
            "id", "timezone", "start_time", "end_time", "required_minutes", "grace_minutes",
            "workdays", "friday_start_time", "friday_end_time", "friday_required_minutes",
            "friday_grace_minutes", "office_latitude", "office_longitude", "office_radius_meters"
        ]
        read_only_fields = ["id"]


class WorkSettingsAdminSerializer(WorkSettingsSerializer):
    """Admin work settings serializer with full access"""
    class Meta(WorkSettingsSerializer.Meta):
        fields = WorkSettingsSerializer.Meta.fields + [
            "overtime_rate_workday", "overtime_rate_holiday", "overtime_threshold_minutes",
            "created_at", "updated_at"
        ]


class WorkSettingsSupervisorSerializer(WorkSettingsSerializer):
    """Supervisor work settings serializer with limited access"""
    class Meta(WorkSettingsSerializer.Meta):
        fields = WorkSettingsSerializer.Meta.fields + [
            "overtime_rate_workday", "overtime_rate_holiday", "overtime_threshold_minutes"
        ]


class WorkSettingsEmployeeSerializer(WorkSettingsSerializer):
    """Employee work settings serializer with read-only access"""
    class Meta(WorkSettingsSerializer.Meta):
        fields = [
            "id", "timezone", "start_time", "end_time", "required_minutes", "grace_minutes",
            "workdays", "friday_start_time", "friday_end_time", "friday_required_minutes",
            "friday_grace_minutes", "office_latitude", "office_longitude", "office_radius_meters"
        ]
        read_only_fields = fields


class WorkSettingsCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating work settings"""
    class Meta:
        model = WorkSettings
        fields = [
            "timezone", "start_time", "end_time", "required_minutes", "grace_minutes",
            "workdays", "friday_start_time", "friday_end_time", "friday_required_minutes",
            "friday_grace_minutes", "office_latitude", "office_longitude", "office_radius_meters",
            "overtime_rate_workday", "overtime_rate_holiday", "overtime_threshold_minutes"
        ]
    
    def validate_workdays(self, value):
        """Validate workdays list"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Workdays must be a list")
        
        for day in value:
            if not isinstance(day, int) or day < 0 or day > 6:
                raise serializers.ValidationError("Workdays must be integers between 0-6")
        
        return value
    
    def validate_office_radius_meters(self, value):
        """Validate office radius"""
        if value and value <= 0:
            raise serializers.ValidationError("Office radius must be positive")
        return value
    
    def validate_overtime_rates(self, data):
        """Validate overtime rates"""
        workday_rate = data.get('overtime_rate_workday')
        holiday_rate = data.get('overtime_rate_holiday')
        
        if workday_rate and workday_rate < 0:
            raise serializers.ValidationError("Overtime workday rate cannot be negative")
        
        if holiday_rate and holiday_rate < 0:
            raise serializers.ValidationError("Overtime holiday rate cannot be negative")
        
        return data
