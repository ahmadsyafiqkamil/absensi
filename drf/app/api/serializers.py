from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Division, Position, Employee


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
        ]


