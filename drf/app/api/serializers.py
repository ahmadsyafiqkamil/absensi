from rest_framework import serializers
from django.contrib.auth.models import Group
from .models import Division, Position, Employee, WorkSettings, Holiday, Attendance, AttendanceCorrection
from apps.core.models import GroupPermission, GroupPermissionTemplate

class DivisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Division
        fields = '__all__'

class PositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Position
        fields = '__all__'
