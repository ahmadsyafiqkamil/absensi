# Role Serializers - Simplified for unified Role model

from rest_framework import serializers
from .models import Role, RoleTemplate


class RoleSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Role - Basic read/write operations
    """
    approval_level_display = serializers.CharField(source='get_approval_level_display', read_only=True)
    category_display = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()
    can_assign_more_users = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = [
            'id', 'name', 'display_name', 'description', 'role_category', 'category_display',
            'approval_level', 'approval_level_display', 'is_active', 'sort_order',
            'is_system_role', 'max_users', 'role_priority',
            'parent_role', 'inherit_permissions',  # Phase 2 fields yang ada di model
            'permissions', 'user_count', 'can_assign_more_users', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_name(self, value):
        # Ensure name is lowercase and valid
        value = value.lower().strip()
        if not value.replace('_', '').isalnum():
            raise serializers.ValidationError("Role name must contain only letters, numbers, and underscores")
        return value

    def get_user_count(self, obj):
        """Get count of active users with this role"""
        return obj.employee_assignments.filter(is_active=True).count()

    def get_can_assign_more_users(self, obj):
        """Check if more users can be assigned to this role"""
        if not obj.max_users:
            return True
        return obj.get_active_user_count() < obj.max_users

    def get_category_display(self, obj):
        """Get human readable category display"""
        return obj.get_category_display() if hasattr(obj, 'get_category_display') else obj.role_category


class RoleCreateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk create Role dengan field-field lengkap
    """
    class Meta:
        model = Role
        fields = [
            'name', 'display_name', 'description', 'role_category',
            'approval_level', 'is_active', 'sort_order', 'is_system_role',
            'max_users', 'role_priority', 'permissions'
        ]

    def validate_permissions(self, value):
        """Validate permissions structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Permissions must be a dictionary")
        return value

    def create(self, validated_data):
        # Auto-create Django Group
        from django.contrib.auth.models import Group
        Group.objects.get_or_create(name=validated_data['name'])
        return super().create(validated_data)


class RoleUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk update Role dengan field-field lengkap
    """
    class Meta:
        model = Role
        fields = [
            'display_name', 'description', 'role_category',
            'approval_level', 'is_active', 'sort_order', 'is_system_role',
            'max_users', 'role_priority', 'permissions'
        ]
        read_only_fields = ['name']  # name cannot be changed after creation

    def validate_is_system_role(self, value):
        """Prevent changing system role status once set"""
        if self.instance and self.instance.is_system_role and not value:
            raise serializers.ValidationError("Cannot remove system role status")
        return value

    def validate_permissions(self, value):
        """Validate permissions structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Permissions must be a dictionary")
        return value


class RoleDetailSerializer(serializers.ModelSerializer):
    """
    Serializer untuk detail Role dengan informasi tambahan
    """
    approval_level_display = serializers.CharField(source='get_approval_level_display', read_only=True)
    user_count = serializers.SerializerMethodField()
    is_used = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = [
            'id', 'name', 'display_name', 'description', 'role_category',
            'approval_level', 'approval_level_display', 'is_active', 'sort_order',
            'is_system_role', 'max_users', 'role_priority',
            'permissions', 'user_count', 'is_used', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'name', 'created_at', 'updated_at']

    def get_user_count(self, obj):
        """Get count of users with this role"""
        return obj.employee_assignments.filter(is_active=True).count()

    def get_is_used(self, obj):
        """Check if role is being used"""
        return self.get_user_count(obj) > 0


# Phase 2: Role Template Serializers
class RoleTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk RoleTemplate - Basic read/write operations
    """
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = RoleTemplate
        fields = [
            'id', 'name', 'display_name', 'description', 'category', 'category_display',
            'base_role_category', 'base_approval_level', 'base_permissions',
            'base_max_users', 'base_role_priority', 'is_system_template',
            'is_active', 'usage_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'usage_count', 'created_at', 'updated_at']

    def validate_name(self, value):
        """Ensure template name is valid"""
        value = value.lower().strip()
        if not value.replace('_', '').isalnum():
            raise serializers.ValidationError("Template name must contain only letters, numbers, and underscores")
        return value

    def validate_base_permissions(self, value):
        """Validate permissions structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Base permissions must be a dictionary")
        return value


class RoleTemplateCreateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk create RoleTemplate
    """
    class Meta:
        model = RoleTemplate
        fields = [
            'name', 'display_name', 'description', 'category',
            'base_role_category', 'base_approval_level', 'base_permissions',
            'base_max_users', 'base_role_priority', 'is_system_template', 'is_active'
        ]

    def validate_base_permissions(self, value):
        """Validate permissions structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Base permissions must be a dictionary")
        return value


class RoleTemplateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer untuk update RoleTemplate
    """
    class Meta:
        model = RoleTemplate
        fields = [
            'display_name', 'description', 'category',
            'base_role_category', 'base_approval_level', 'base_permissions',
            'base_max_users', 'base_role_priority', 'is_active'
        ]
        read_only_fields = ['name', 'is_system_template']  # Cannot change name or system status

    def validate_is_system_template(self, value):
        """Prevent changing system template status once set"""
        if self.instance and self.instance.is_system_template and not value:
            raise serializers.ValidationError("Cannot remove system template status")
        return value

    def validate_base_permissions(self, value):
        """Validate permissions structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Base permissions must be a dictionary")
        return value
