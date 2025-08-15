from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Division, Position, Employee, WorkSettings, Holiday, Attendance


class DivisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Division
        fields = ["id", "name"]


class PositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Position
        fields = ["id", "name"]


class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ["id", "username", "email"]


class EmployeeSerializer(serializers.ModelSerializer):
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
        ]


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = ["id", "date", "note"]


class AttendanceSerializer(serializers.ModelSerializer):
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
            "created_at",
            "updated_at",
        ]

