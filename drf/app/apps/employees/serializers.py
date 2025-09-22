from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Division, Position, Employee, EmployeePosition

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


class EmployeePositionSerializer(serializers.ModelSerializer):
    """Serializer for EmployeePosition through model"""
    position = PositionSerializer(read_only=True)
    position_id = serializers.PrimaryKeyRelatedField(
        source="position", 
        queryset=Position.objects.all(), 
        write_only=True
    )
    assigned_by = UserBasicSerializer(read_only=True)
    assigned_by_id = serializers.PrimaryKeyRelatedField(
        source="assigned_by", 
        queryset=User.objects.all(), 
        write_only=True, 
        required=False, 
        allow_null=True
    )
    
    class Meta:
        model = EmployeePosition
        fields = [
            "id", "position", "position_id", "is_primary", "is_active",
            "effective_from", "effective_until", "assignment_notes",
            "assigned_by", "assigned_by_id", "created_at", "updated_at"
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, data):
        """Validate the employee position assignment"""
        effective_from = data.get('effective_from')
        effective_until = data.get('effective_until')
        
        if effective_until and effective_from:
            if effective_until <= effective_from:
                raise serializers.ValidationError(
                    "Effective until date must be after effective from date"
                )
        
        return data


class EmployeePositionCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating employee position assignments"""
    class Meta:
        model = EmployeePosition
        fields = [
            "employee", "position", "is_primary", "is_active",
            "effective_from", "effective_until", "assignment_notes"
        ]

    def validate(self, data):
        """Validate the employee position assignment"""
        effective_from = data.get('effective_from')
        effective_until = data.get('effective_until')
        
        if effective_until and effective_from:
            if effective_until <= effective_from:
                raise serializers.ValidationError(
                    "Effective until date must be after effective from date"
                )
        
        return data

    def create(self, validated_data):
        """Create new employee position assignment"""
        # Set assigned_by to current user if available in context
        request = self.context.get('request')
        if request and request.user:
            validated_data['assigned_by'] = request.user
        
        return super().create(validated_data)


class EmployeeSerializer(serializers.ModelSerializer):
    """Base employee serializer with common fields"""
    user = UserBasicSerializer(read_only=True)
    division = DivisionSerializer(read_only=True)
    position = PositionSerializer(read_only=True)  # Legacy field for backward compatibility
    employee_positions = EmployeePositionSerializer(many=True, read_only=True)
    active_employee_positions = serializers.SerializerMethodField()
    primary_position = serializers.SerializerMethodField()
    approval_capabilities = serializers.SerializerMethodField()
    
    class Meta:
        model = Employee
        fields = [
            "id", "nip", "fullname", "user", "division", "position",
            "employee_positions", "active_employee_positions", "primary_position", "approval_capabilities"
        ]

    def get_primary_position(self, obj):
        """Get the primary position for this employee"""
        primary_pos = obj.get_primary_position()
        return PositionSerializer(primary_pos).data if primary_pos else None

    def get_active_employee_positions(self, obj):
        """Get only active employee positions"""
        active_assignments = obj.get_active_position_assignments()
        return EmployeePositionSerializer(active_assignments, many=True).data

    def get_approval_capabilities(self, obj):
        """Get approval capabilities from all active positions"""
        return obj.get_approval_capabilities()


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
        fields = [
            "id", "nip", "fullname", "division", "position",
            "employee_positions", "primary_position", "approval_capabilities"
        ]


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
    
    def create(self, validated_data):
        """Create employee and handle position assignment"""
        # Extract position_id before creating employee
        position_id = validated_data.pop('position', None)
        
        # Create employee
        employee = super().create(validated_data)
        
        # Handle position assignment
        if position_id:
            # Set legacy position field for backward compatibility
            employee.position = position_id
            employee.save()
            
            # Also create EmployeePosition record for multi-position system
            from datetime import date
            EmployeePosition.objects.get_or_create(
                employee=employee,
                position=position_id,
                defaults={
                    'is_primary': True,
                    'is_active': True,
                    'effective_from': date.today(),
                    'assigned_by': self.context.get('request').user if self.context.get('request') else None,
                    'assignment_notes': 'Assigned during employee creation'
                }
            )
        
        return employee
    
    def update(self, instance, validated_data):
        """Update employee and handle position assignment"""
        # Extract position_id before updating employee
        position_id = validated_data.pop('position', None)
        
        # Update employee
        employee = super().update(instance, validated_data)
        
        # Handle position assignment
        if position_id is not None:
            # Update legacy position field
            employee.position = position_id
            employee.save()
            
            # Update or create EmployeePosition record
            from datetime import date
            assignment, created = EmployeePosition.objects.get_or_create(
                employee=employee,
                position=position_id,
                defaults={
                    'is_primary': True,
                    'is_active': True,
                    'effective_from': date.today(),
                    'assigned_by': self.context.get('request').user if self.context.get('request') else None,
                    'assignment_notes': 'Updated during employee update'
                }
            )
            
            if not created:
                # Update existing assignment
                assignment.is_primary = True
                assignment.is_active = True
                assignment.assigned_by = self.context.get('request').user if self.context.get('request') else assignment.assigned_by
                assignment.save()
        
        return employee


class PositionAssignmentSerializer(serializers.Serializer):
    """Serializer for assigning positions to employees"""
    employee_id = serializers.IntegerField()
    position_id = serializers.IntegerField()
    is_primary = serializers.BooleanField(default=False)
    is_active = serializers.BooleanField(default=True)
    effective_from = serializers.DateField(required=False)
    effective_until = serializers.DateField(required=False, allow_null=True)
    assignment_notes = serializers.CharField(required=False, allow_blank=True)

    def validate_employee_id(self, value):
        """Validate that employee exists"""
        if not Employee.objects.filter(id=value).exists():
            raise serializers.ValidationError("Employee not found")
        return value

    def validate_position_id(self, value):
        """Validate that position exists"""
        if not Position.objects.filter(id=value).exists():
            raise serializers.ValidationError("Position not found")
        return value

    def validate(self, data):
        """Validate the position assignment"""
        effective_from = data.get('effective_from')
        effective_until = data.get('effective_until')
        
        if effective_until and effective_from:
            if effective_until <= effective_from:
                raise serializers.ValidationError(
                    "Effective until date must be after effective from date"
                )
        
        return data


class BulkPositionAssignmentSerializer(serializers.Serializer):
    """Serializer for bulk position assignments"""
    employee_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1
    )
    position_id = serializers.IntegerField()
    is_primary = serializers.BooleanField(default=False)
    is_active = serializers.BooleanField(default=True)
    effective_from = serializers.DateField(required=False)
    effective_until = serializers.DateField(required=False, allow_null=True)
    assignment_notes = serializers.CharField(required=False, allow_blank=True)

    def validate_employee_ids(self, value):
        """Validate that all employees exist"""
        existing_ids = set(Employee.objects.filter(id__in=value).values_list('id', flat=True))
        missing_ids = set(value) - existing_ids
        if missing_ids:
            raise serializers.ValidationError(f"Employees not found: {list(missing_ids)}")
        return value

    def validate_position_id(self, value):
        """Validate that position exists"""
        if not Position.objects.filter(id=value).exists():
            raise serializers.ValidationError("Position not found")
        return value

    def validate(self, data):
        """Validate the bulk assignment"""
        effective_from = data.get('effective_from')
        effective_until = data.get('effective_until')
        
        if effective_until and effective_from:
            if effective_until <= effective_from:
                raise serializers.ValidationError(
                    "Effective until date must be after effective from date"
                )
        
        return data


class SetPrimaryPositionSerializer(serializers.Serializer):
    """Serializer for setting primary position"""
    employee_id = serializers.IntegerField()
    position_id = serializers.IntegerField()

    def validate_employee_id(self, value):
        """Validate that employee exists"""
        if not Employee.objects.filter(id=value).exists():
            raise serializers.ValidationError("Employee not found")
        return value

    def validate_position_id(self, value):
        """Validate that position exists"""
        if not Position.objects.filter(id=value).exists():
            raise serializers.ValidationError("Position not found")
        return value

    def validate(self, data):
        """Validate that employee has this position"""
        employee_id = data['employee_id']
        position_id = data['position_id']
        
        if not EmployeePosition.objects.filter(
            employee_id=employee_id, 
            position_id=position_id
        ).exists():
            raise serializers.ValidationError(
                "Employee does not have this position assigned"
            )
        
        return data
