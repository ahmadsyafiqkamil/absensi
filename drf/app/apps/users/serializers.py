from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from .models import GroupPermission, GroupPermissionTemplate


class GroupPermissionSerializer(serializers.ModelSerializer):
    permission_type_display = serializers.CharField(source='get_permission_type_display', read_only=True)
    permission_action_display = serializers.CharField(source='get_permission_action_display', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)

    class Meta:
        model = GroupPermission
        fields = [
            'id', 'group', 'group_name', 'permission_type', 'permission_type_display',
            'permission_action', 'permission_action_display', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class GroupPermissionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupPermission
        fields = ['group', 'permission_type', 'permission_action', 'is_active']

    def validate(self, data):
        if GroupPermission.objects.filter(
            group=data['group'],
            permission_type=data['permission_type'],
            permission_action=data['permission_action']
        ).exists():
            raise serializers.ValidationError(
                'Permission already exists for this group, type, and action combination.'
            )
        return data


class GroupPermissionUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupPermission
        fields = ['permission_type', 'permission_action', 'is_active']

    def validate(self, data):
        instance = self.instance
        if instance:
            if GroupPermission.objects.filter(
                group=instance.group,
                permission_type=data.get('permission_type', instance.permission_type),
                permission_action=data.get('permission_action', instance.permission_action)
            ).exclude(id=instance.id).exists():
                raise serializers.ValidationError(
                    'Permission already exists for this group, type, and action combination.'
                )
        return data


class GroupPermissionTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupPermissionTemplate
        fields = ['id', 'name', 'description', 'permissions', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class GroupPermissionTemplateCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupPermissionTemplate
        fields = ['name', 'description', 'permissions', 'is_active']

    def validate_permissions(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('Permissions must be a list')
        valid_types = [choice[0] for choice in GroupPermission.PERMISSION_TYPES]
        valid_actions = [choice[0] for choice in GroupPermission.PERMISSION_ACTIONS]
        for perm in value:
            if not isinstance(perm, dict):
                raise serializers.ValidationError('Each permission must be a dictionary')
            if 'type' not in perm or 'action' not in perm:
                raise serializers.ValidationError("Each permission must have 'type' and 'action' keys")
            if perm['type'] not in valid_types:
                raise serializers.ValidationError(f"Invalid permission type: {perm['type']}")
            if perm['action'] not in valid_actions:
                raise serializers.ValidationError(f"Invalid permission action: {perm['action']}")
        return value


class GroupPermissionTemplateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupPermissionTemplate
        fields = ['name', 'description', 'permissions', 'is_active']


class GroupWithPermissionsSerializer(serializers.ModelSerializer):
    permissions = GroupPermissionSerializer(source='v2_custom_permissions', many=True, read_only=True)
    permission_count = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ['id', 'name', 'permissions', 'permission_count']
        read_only_fields = ['id']

    def get_permission_count(self, obj):
        return obj.v2_custom_permissions.filter(is_active=True).count()


class PermissionSummarySerializer(serializers.Serializer):
    group_id = serializers.IntegerField()
    group_name = serializers.CharField()
    total_permissions = serializers.IntegerField()
    active_permissions = serializers.IntegerField()
    permission_types = serializers.ListField(child=serializers.CharField())
    permission_actions = serializers.ListField(child=serializers.CharField())


class BulkPermissionUpdateSerializer(serializers.Serializer):
    """Serializer untuk bulk update permissions (ported from legacy)"""
    group_id = serializers.IntegerField()
    permissions = serializers.ListField(child=serializers.DictField())

    def validate_permissions(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('Permissions must be a list')

        valid_types = [choice[0] for choice in GroupPermission.PERMISSION_TYPES]
        valid_actions = [choice[0] for choice in GroupPermission.PERMISSION_ACTIONS]

        for perm in value:
            if not isinstance(perm, dict):
                raise serializers.ValidationError('Each permission must be a dictionary')
            if 'permission_type' not in perm or 'permission_action' not in perm:
                raise serializers.ValidationError("Each permission must have 'permission_type' and 'permission_action' keys")
            if perm['permission_type'] not in valid_types:
                raise serializers.ValidationError(f"Invalid permission type: {perm['permission_type']}")
            if perm['permission_action'] not in valid_actions:
                raise serializers.ValidationError(f"Invalid permission action: {perm['permission_action']}")
        return value


# ===== Group basic/admin/create/update/detail serializers =====

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']
        read_only_fields = ['id']


class GroupAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']
        read_only_fields = ['id']


class GroupCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['name']

    def validate_name(self, value):
        if Group.objects.filter(name=value).exists():
            raise serializers.ValidationError('Group with this name already exists.')
        return value


class GroupUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['name']

    def validate_name(self, value):
        instance = self.instance
        if instance and Group.objects.filter(name=value).exclude(id=instance.id).exists():
            raise serializers.ValidationError('Group with this name already exists.')
        return value


class GroupDetailSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    user_set = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ['id', 'name', 'user_count', 'permissions', 'user_set']
        read_only_fields = ['id', 'user_count', 'permissions', 'user_set']

    def get_user_count(self, obj):
        return obj.user_set.count()

    def get_permissions(self, obj):
        perms = GroupPermission.objects.filter(group=obj, is_active=True)
        return [{
            'id': perm.id,
            'permission_type': perm.permission_type,
            'permission_action': perm.permission_action,
            'is_active': perm.is_active,
            'created_at': perm.created_at,
            'updated_at': perm.updated_at,
        } for perm in perms]

    def get_user_set(self, obj):
        UserModel = get_user_model()
        return [{
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name or '',
            'last_name': user.last_name or '',
            'is_active': user.is_active,
            'date_joined': user.date_joined,
            'last_login': user.last_login,
        } for user in obj.user_set.all()]


