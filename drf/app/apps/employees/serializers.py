from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Division, Position, Employee

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user serializer for nested relationships"""
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email"]


class DivisionSerializer(serializers.ModelSerializer):
    """Division serializer for read operations"""
    class Meta:
        model = Division
        fields = ["id", "name"]


class PositionSerializer(serializers.ModelSerializer):
    """Position serializer for read operations"""
    class Meta:
        model = Position
        fields = ["id", "name", "can_approve_overtime_org_wide", "approval_level"]


class EmployeeSerializer(serializers.ModelSerializer):
    """Base employee serializer with common fields"""
    user = UserBasicSerializer(read_only=True)
    division = DivisionSerializer(read_only=True)
    position = PositionSerializer(read_only=True)
    
    class Meta:
        model = Employee
        fields = ["id", "nip", "fullname", "user", "division", "position"]


class EmployeeAdminSerializer(EmployeeSerializer):
    """Full access serializer for Admin users"""
    user_id = serializers.PrimaryKeyRelatedField(
        source="user", 
        queryset=User.objects.all(), 
        write_only=True
    )
    division_id = serializers.PrimaryKeyRelatedField(
        source="division", 
        queryset=Division.objects.all(), 
        write_only=True, 
        allow_null=True, 
        required=False
    )
    position_id = serializers.PrimaryKeyRelatedField(
        source="position", 
        queryset=Position.objects.all(), 
        write_only=True, 
        allow_null=True, 
        required=False
    )
    
    class Meta(EmployeeSerializer.Meta):
        fields = EmployeeSerializer.Meta.fields + [
            "gaji_pokok", "tmt_kerja", "tempat_lahir", "tanggal_lahir",
            "user_id", "division_id", "position_id"
        ]


class EmployeeSupervisorSerializer(EmployeeSerializer):
    """Limited access serializer for Supervisor users"""
    class Meta(EmployeeSerializer.Meta):
        fields = EmployeeSerializer.Meta.fields + [
            "gaji_pokok", "tmt_kerja"
            # Excludes: tempat_lahir, tanggal_lahir (personal data)
        ]


class EmployeeEmployeeSerializer(EmployeeSerializer):
    """Minimal access serializer for Employee users"""
    class Meta(EmployeeSerializer.Meta):
        fields = ["id", "nip", "fullname", "division", "position"]


class DivisionCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating divisions"""
    class Meta:
        model = Division
        fields = ["name"]


class PositionCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating positions"""
    class Meta:
        model = Position
        fields = ["name", "can_approve_overtime_org_wide", "approval_level"]


class EmployeeCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating employees"""
    user_id = serializers.PrimaryKeyRelatedField(
        source="user", 
        queryset=User.objects.all()
    )
    division_id = serializers.PrimaryKeyRelatedField(
        source="division", 
        queryset=Division.objects.all(), 
        allow_null=True, 
        required=False
    )
    position_id = serializers.PrimaryKeyRelatedField(
        source="position", 
        queryset=Position.objects.all(), 
        allow_null=True, 
        required=False
    )
    
    class Meta:
        model = Employee
        fields = [
            "user_id", "nip", "fullname", "division_id", "position_id",
            "gaji_pokok", "tmt_kerja", "tempat_lahir", "tanggal_lahir"
        ]
