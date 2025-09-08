from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ReportTemplate, GeneratedReport, ReportSchedule, ReportAccessLog
from apps.employees.serializers import EmployeeSerializer, DivisionSerializer

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user serializer for nested relationships"""
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email"]


# Report Template Serializers
class ReportTemplateSerializer(serializers.ModelSerializer):
    """Base report template serializer"""
    created_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = ReportTemplate
        fields = [
            "id", "name", "description", "template_type", "format", 
            "is_active", "created_by", "created_at"
        ]
        read_only_fields = ["id", "created_by", "created_at"]


class ReportTemplateAdminSerializer(ReportTemplateSerializer):
    """Admin report template serializer with full access"""
    class Meta(ReportTemplateSerializer.Meta):
        fields = ReportTemplateSerializer.Meta.fields + [
            "template_file", "config_json", "updated_at"
        ]


class ReportTemplateCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating report templates"""
    class Meta:
        model = ReportTemplate
        fields = [
            "name", "description", "template_type", "format", 
            "template_file", "config_json", "is_active"
        ]
    
    def validate(self, data):
        """Validate template data"""
        name = data.get('name')
        template_type = data.get('template_type')
        
        # Check if template with same name and type already exists
        existing_template = ReportTemplate.objects.filter(
            name=name,
            template_type=template_type
        ).first()
        
        if existing_template and self.instance != existing_template:
            raise serializers.ValidationError(
                "Template with this name and type already exists"
            )
        
        return data


# Generated Report Serializers
class GeneratedReportSerializer(serializers.ModelSerializer):
    """Base generated report serializer"""
    requested_by = UserBasicSerializer(read_only=True)
    template = ReportTemplateSerializer(read_only=True)
    
    class Meta:
        model = GeneratedReport
        fields = [
            "id", "name", "report_type", "status", "created_at", 
            "requested_by", "template"
        ]
        read_only_fields = ["id", "status", "created_at", "requested_by"]


class GeneratedReportAdminSerializer(GeneratedReportSerializer):
    """Admin generated report serializer with full access"""
    class Meta(GeneratedReportSerializer.Meta):
        fields = GeneratedReportSerializer.Meta.fields + [
            "parameters", "output_file", "file_size", "mime_type",
            "error_message", "is_public", "expires_at", "updated_at"
        ]


class GeneratedReportCreateSerializer(serializers.Serializer):
    """Serializer for creating report generation requests"""
    report_type = serializers.ChoiceField(choices=GeneratedReport.REPORT_TYPE_CHOICES)
    template_id = serializers.IntegerField(required=False)
    parameters = serializers.JSONField(default=dict)
    format = serializers.ChoiceField(choices=['pdf', 'excel', 'csv', 'json'], default='pdf')
    is_public = serializers.BooleanField(default=False)
    expires_in_days = serializers.IntegerField(min_value=1, max_value=365, required=False)


# Report Schedule Serializers
class ReportScheduleSerializer(serializers.ModelSerializer):
    """Base report schedule serializer"""
    created_by = UserBasicSerializer(read_only=True)
    template = ReportTemplateSerializer(read_only=True)
    
    class Meta:
        model = ReportSchedule
        fields = [
            "id", "name", "description", "template", "frequency", 
            "start_date", "end_date", "next_run", "is_active", 
            "last_run", "last_run_status", "created_by", "created_at"
        ]
        read_only_fields = ["id", "next_run", "last_run", "last_run_status", "created_by", "created_at"]


class ReportScheduleAdminSerializer(ReportScheduleSerializer):
    """Admin report schedule serializer with full access"""
    class Meta(ReportScheduleSerializer.Meta):
        fields = ReportScheduleSerializer.Meta.fields + [
            "base_parameters", "updated_at"
        ]


class ReportScheduleCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating report schedules"""
    class Meta:
        model = ReportSchedule
        fields = [
            "name", "description", "template", "frequency", 
            "start_date", "end_date", "base_parameters", "is_active"
        ]
    
    def validate(self, data):
        """Validate schedule data"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError(
                "Start date cannot be after end date"
            )
        
        return data


# Report Access Log Serializers
class ReportAccessLogSerializer(serializers.ModelSerializer):
    """Report access log serializer"""
    user = UserBasicSerializer(read_only=True)
    report = GeneratedReportSerializer(read_only=True)
    
    class Meta:
        model = ReportAccessLog
        fields = [
            "id", "report", "user", "action", "ip_address", 
            "user_agent", "created_at"
        ]
        read_only_fields = ["id", "created_at"]


# Report Generation Request Serializers
class AttendanceReportRequestSerializer(serializers.Serializer):
    """Serializer for attendance report requests"""
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    employee_id = serializers.IntegerField(required=False)
    division_id = serializers.IntegerField(required=False)
    include_overtime = serializers.BooleanField(default=True)
    format = serializers.ChoiceField(choices=['pdf', 'excel', 'csv', 'json'], default='json')
    
    def validate(self, data):
        """Validate attendance report parameters"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date > end_date:
            raise serializers.ValidationError(
                "Start date cannot be after end date"
            )
        
        return data


class OvertimeReportRequestSerializer(serializers.Serializer):
    """Serializer for overtime report requests"""
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    employee_id = serializers.IntegerField(required=False)
    division_id = serializers.IntegerField(required=False)
    status = serializers.ChoiceField(
        choices=['pending', 'approved', 'rejected', 'cancelled'], 
        required=False
    )
    request_type = serializers.ChoiceField(
        choices=['regular', 'holiday', 'weekend', 'emergency'], 
        required=False
    )
    format = serializers.ChoiceField(choices=['pdf', 'excel', 'csv', 'json'], default='json')
    
    def validate(self, data):
        """Validate overtime report parameters"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date > end_date:
            raise serializers.ValidationError(
                "Start date cannot be after end date"
            )
        
        return data


class SummaryReportRequestSerializer(serializers.Serializer):
    """Serializer for summary report requests"""
    month = serializers.IntegerField(min_value=1, max_value=12, required=False)
    year = serializers.IntegerField(required=False)
    division_id = serializers.IntegerField(required=False)
    include_details = serializers.BooleanField(default=False)
    format = serializers.ChoiceField(choices=['pdf', 'excel', 'csv', 'json'], default='json')
    
    def validate(self, data):
        """Validate summary report parameters"""
        month = data.get('month')
        year = data.get('year')
        
        if month and not year:
            raise serializers.ValidationError(
                "Year is required when month is specified"
            )
        
        if year:
            from datetime import date
            current_year = date.today().year
            if year > current_year:
                raise serializers.ValidationError(
                    "Year cannot be in the future"
                )
        
        return data


# Report Download Serializers
class ReportDownloadSerializer(serializers.Serializer):
    """Serializer for report download requests"""
    report_id = serializers.IntegerField()
    
    def validate_report_id(self, value):
        """Validate report ID"""
        try:
            report = GeneratedReport.objects.get(id=value)
            if report.status != 'completed':
                raise serializers.ValidationError(
                    "Report is not ready for download"
                )
            if report.is_expired:
                raise serializers.ValidationError(
                    "Report has expired"
                )
        except GeneratedReport.DoesNotExist:
            raise serializers.ValidationError(
                "Report not found"
            )
        return value


# Report Statistics Serializers
class ReportStatisticsSerializer(serializers.Serializer):
    """Serializer for report statistics"""
    total_templates = serializers.IntegerField()
    total_reports = serializers.IntegerField()
    total_schedules = serializers.IntegerField()
    reports_by_status = serializers.DictField()
    reports_by_type = serializers.DictField()
    recent_activity = serializers.ListField()
