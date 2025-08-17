from django.http import JsonResponse
from django.contrib.auth.models import User
from django.views.decorators.http import require_GET
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Division, Position, Employee, WorkSettings, Holiday, Attendance, AttendanceCorrection
from .serializers import (
    DivisionSerializer,
    PositionSerializer,
    EmployeeSerializer,
    WorkSettingsSerializer,
    HolidaySerializer,
    AttendanceSerializer,
    AttendanceCorrectionSerializer,
)
from .pagination import DefaultPagination
from .utils import evaluate_lateness_as_dict, haversine_meters
from zoneinfo import ZoneInfo
from django.utils import timezone as dj_timezone
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import models
from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from io import BytesIO
import datetime

def format_work_hours(minutes, use_indonesian=True):
    """Format work hours from minutes to human-readable format"""
    if not minutes or minutes <= 0:
        return '-'
    
    hours = int(minutes // 60)
    mins = round(minutes % 60)
    
    # Handle edge case where minutes rounds up to 60
    if mins == 60:
        hours += 1
        mins = 0
    
    # Format based on whether we have hours and/or minutes
    hour_symbol = 'j' if use_indonesian else 'h'
    
    if hours > 0 and mins > 0:
        return f"{hours}{hour_symbol} {mins}m"
    elif hours > 0:
        return f"{hours}{hour_symbol}"
    elif mins > 0:
        return f"{mins}m"
    else:
        return '0m'

def health(request):
    return JsonResponse({"status": "ok"})


@extend_schema(
    parameters=[
        OpenApiParameter(name='username', type=str, required=True, description='Username to check'),
    ],
    responses={200: dict},
)
@require_GET
def check_user(request):
    username = request.GET.get('username')
    if not username:
        return JsonResponse({"detail": "username is required"}, status=400)
    exists = User.objects.filter(username=username).exists()
    return JsonResponse({"username": username, "exists": exists})


@extend_schema(
    responses={200: dict},
    auth=[{"BearerAuth": []}],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    data = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_superuser": user.is_superuser,
        "groups": list(user.groups.values_list('name', flat=True)),
    }
    return JsonResponse(data)


@extend_schema(
    responses={200: list},
    auth=[{"BearerAuth": []}],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def users_list(request):
    # Only allow admin or superuser to view the list of users
    user = request.user
    is_admin = bool(user.is_superuser or user.groups.filter(name='admin').exists())
    if not is_admin:
        return JsonResponse({"detail": "forbidden"}, status=403)

    User = get_user_model()
    users = User.objects.all().prefetch_related('groups')
    data = [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "is_superuser": u.is_superuser,
            "groups": list(u.groups.values_list('name', flat=True)),
        }
        for u in users
    ]
    return JsonResponse(data, safe=False)


@extend_schema(
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'username': {'type': 'string'},
                'password': {'type': 'string'},
                'email': {'type': 'string'},
                'group': {'type': 'string', 'enum': ['admin', 'supervisor', 'pegawai']},
            },
            'required': ['username', 'group'],
        }
    },
    responses={200: dict},
    description='Provision user baru dan assign ke grup supervisor/pegawai (mendukung legacy HS/LS). Dev-only.',
)
@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def provision_user(request):
    data = request.data if hasattr(request, 'data') else {}
    username = data.get('username')
    password = data.get('password') or '1'
    email = data.get('email') or ''
    group_name = (data.get('group') or '').strip()
    alias = {'hs': 'supervisor', 'ls': 'pegawai', 'localstaff': 'pegawai'}
    mapped = alias.get(group_name.lower(), group_name)
    if not username or mapped not in {'admin', 'supervisor', 'pegawai'}:
        return JsonResponse({'detail': 'username dan group (admin/supervisor/pegawai) wajib.'}, status=400)

    User = get_user_model()
    user, created = User.objects.get_or_create(username=username, defaults={'email': email})
    if not created and email and user.email != email:
        user.email = email
    user.is_active = True
    user.set_password(password)
    user.save()

    group, _ = Group.objects.get_or_create(name=mapped)
    user.groups.add(group)

    return JsonResponse({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'groups': list(user.groups.values_list('name', flat=True)),
        'created': created,
    })


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        # Allow superuser or users in 'admin' group
        return bool(user.is_superuser or user.groups.filter(name='admin').exists())


class IsSupervisorOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(
            user.is_superuser or user.groups.filter(name__in=['admin', 'supervisor']).exists()
        )


class IsAdminOrSupervisorReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Allow read access for admin and supervisor
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return bool(
                user.is_superuser or 
                user.groups.filter(name__in=['admin', 'supervisor']).exists()
            )
        
        # Only admin can modify
        return bool(
            user.is_superuser or 
            user.groups.filter(name='admin').exists()
        )


class DivisionViewSet(viewsets.ModelViewSet):
    queryset = Division.objects.all()
    serializer_class = DivisionSerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = DefaultPagination


class PositionViewSet(viewsets.ModelViewSet):
    queryset = Position.objects.all()
    serializer_class = PositionSerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = DefaultPagination


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related('user', 'division', 'position').all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsAdmin]
    pagination_class = DefaultPagination


class WorkSettingsViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrSupervisorReadOnly]

    def list(self, request):
        obj, _ = WorkSettings.objects.get_or_create()
        return JsonResponse(WorkSettingsSerializer(obj).data, safe=False)

    def update(self, request, pk=None):
        obj, _ = WorkSettings.objects.get_or_create()
        serializer = WorkSettingsSerializer(obj, data=request.data, partial=False)
        if serializer.is_valid():
            # Basic validation: start < end (no overnight for now)
            start = serializer.validated_data.get("start_time", obj.start_time)
            end = serializer.validated_data.get("end_time", obj.end_time)
            if start >= end:
                return JsonResponse({"detail": "start_time must be earlier than end_time"}, status=400)
            
            # Friday-specific validation
            friday_start = serializer.validated_data.get("friday_start_time", obj.friday_start_time)
            friday_end = serializer.validated_data.get("friday_end_time", obj.friday_end_time)
            if friday_start >= friday_end:
                return JsonResponse({"detail": "friday_start_time must be earlier than friday_end_time"}, status=400)
            
            workdays = serializer.validated_data.get("workdays", obj.workdays)
            if not isinstance(workdays, list) or not all(isinstance(x, int) and 0 <= x <= 6 for x in workdays):
                return JsonResponse({"detail": "workdays must be a list of integers 0..6"}, status=400)
            serializer.save()
            return JsonResponse(serializer.data)
        return JsonResponse(serializer.errors, status=400)


class HolidayViewSet(viewsets.ModelViewSet):
    queryset = Holiday.objects.all()
    serializer_class = HolidaySerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = DefaultPagination


class AttendanceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DefaultPagination

    def get_queryset(self):
        user = self.request.user
        qs = Attendance.objects.select_related('employee').filter(user=user)
        start = self.request.query_params.get('start')
        end = self.request.query_params.get('end')
        month = self.request.query_params.get('month')
        
        if start:
            qs = qs.filter(date_local__gte=start)
        if end:
            qs = qs.filter(date_local__lte=end)
        if month:
            # Parse month and filter by year-month
            try:
                year, month_num = month.split('-')
                qs = qs.filter(
                    date_local__year=year,
                    date_local__month=month_num
                )
            except ValueError:
                pass  # Ignore invalid month format
        
        return qs.order_by('-date_local')


class AttendanceCorrectionViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceCorrectionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DefaultPagination
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        qs = AttendanceCorrection.objects.select_related('user', 'user__employee__division').all()
        # Scope by role:
        # - admin/superuser: see all
        # - supervisor: only corrections of users within same division
        # - employee: only own corrections
        if user.is_superuser or user.groups.filter(name='admin').exists():
            pass
        elif user.groups.filter(name='supervisor').exists():
            try:
                supervisor_division_id = user.employee.division_id  # type: ignore[attr-defined]
            except Exception:
                supervisor_division_id = None
            if supervisor_division_id is None:
                qs = qs.none()
            else:
                qs = qs.filter(user__employee__division_id=supervisor_division_id)
        else:
            qs = qs.filter(user=user)
        status_ = self.request.query_params.get('status')
        if status_:
            qs = qs.filter(status=status_)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        # Force owner to current user
        serializer.save(user=self.request.user)

    @extend_schema(request=None, responses={200: AttendanceCorrectionSerializer})
    def approve(self, request, pk=None):
        """Approve a pending correction (supervisor/admin only). Applies changes to Attendance."""
        if not IsSupervisorOrAdmin().has_permission(request, self):
            return Response({"detail": "forbidden"}, status=status.HTTP_403_FORBIDDEN)
        try:
            corr = AttendanceCorrection.objects.get(pk=pk)
        except AttendanceCorrection.DoesNotExist:
            return Response({"detail": "not_found"}, status=status.HTTP_404_NOT_FOUND)
        if corr.status != AttendanceCorrection.CorrectionStatus.PENDING:
            return Response({"detail": "invalid_status"}, status=status.HTTP_400_BAD_REQUEST)

        # Division-based authorization for supervisors: must match division of the correction's user
        user = request.user
        if (not (user.is_superuser or user.groups.filter(name='admin').exists())) and user.groups.filter(name='supervisor').exists():
            try:
                supervisor_division_id = user.employee.division_id  # type: ignore[attr-defined]
                employee_division_id = corr.user.employee.division_id  # type: ignore[attr-defined]
            except Exception:
                return Response({"detail": "division_not_configured"}, status=status.HTTP_403_FORBIDDEN)
            if not supervisor_division_id or not employee_division_id or supervisor_division_id != employee_division_id:
                return Response({"detail": "forbidden_division_scope"}, status=status.HTTP_403_FORBIDDEN)

        ws, _ = WorkSettings.objects.get_or_create()
        tzname = ws.timezone or dj_timezone.get_current_timezone_name()
        tz = ZoneInfo(tzname)

        # Prepare target Attendance record
        att, _ = Attendance.objects.get_or_create(
            user=corr.user,
            date_local=corr.date_local,
            defaults={"timezone": tzname},
        )

        # Convert proposed local datetimes to UTC
        def to_utc(local_dt):
            if not local_dt:
                return None
            # Treat stored value as naive local time
            aware_local = local_dt.replace(tzinfo=tz)
            return aware_local.astimezone(ZoneInfo("UTC"))

        cin_utc = to_utc(corr.proposed_check_in_local)
        cout_utc = to_utc(corr.proposed_check_out_local)

        # Apply based on type
        if corr.type == AttendanceCorrection.CorrectionType.MISSING_CHECK_IN:
            if not cin_utc:
                return Response({"detail": "proposed_check_in_local_required"}, status=status.HTTP_400_BAD_REQUEST)
            att.check_in_at_utc = att.check_in_at_utc or cin_utc
        elif corr.type == AttendanceCorrection.CorrectionType.MISSING_CHECK_OUT:
            if not cout_utc:
                return Response({"detail": "proposed_check_out_local_required"}, status=status.HTTP_400_BAD_REQUEST)
            att.check_out_at_utc = att.check_out_at_utc or cout_utc
        else:  # EDIT
            if not cin_utc and not cout_utc:
                return Response({"detail": "one_of_check_in_or_out_required"}, status=status.HTTP_400_BAD_REQUEST)
            if cin_utc:
                att.check_in_at_utc = cin_utc
            if cout_utc:
                att.check_out_at_utc = cout_utc

        # Recompute is_holiday and lateness
        is_holiday = Holiday.objects.filter(date=corr.date_local).exists()
        att.is_holiday = is_holiday
        if att.check_in_at_utc:
            late_res = evaluate_lateness_as_dict(att.check_in_at_utc)
            att.minutes_late = int(late_res.get("minutes_late") or 0)

        # Recompute total_work_minutes when possible
        if att.check_in_at_utc and att.check_out_at_utc and att.check_out_at_utc > att.check_in_at_utc:
            delta = att.check_out_at_utc - att.check_in_at_utc
            att.total_work_minutes = max(0, int(delta.total_seconds() // 60))

        # Mark manual and attach reason into employee_note (append)
        try:
            reason = (corr.reason or "").strip()
            if reason:
                att.employee_note = ((att.employee_note or "").strip() + ("\n" if att.employee_note else "") + f"[Correction]: {reason}")
        except Exception:
            pass

        att.save()

        # Close correction
        corr.status = AttendanceCorrection.CorrectionStatus.APPROVED
        corr.reviewed_by = request.user
        corr.reviewed_at = dj_timezone.now()
        corr.decision_note = (request.data.get("decision_note") or corr.decision_note)
        corr.save(update_fields=["status", "reviewed_by", "reviewed_at", "decision_note"])

        return Response(AttendanceCorrectionSerializer(corr).data)

    @extend_schema(request=None, responses={200: AttendanceCorrectionSerializer})
    def reject(self, request, pk=None):
        """Reject a pending correction (supervisor/admin only)."""
        if not IsSupervisorOrAdmin().has_permission(request, self):
            return Response({"detail": "forbidden"}, status=status.HTTP_403_FORBIDDEN)
        try:
            corr = AttendanceCorrection.objects.get(pk=pk)
        except AttendanceCorrection.DoesNotExist:
            return Response({"detail": "not_found"}, status=status.HTTP_404_NOT_FOUND)
        if corr.status != AttendanceCorrection.CorrectionStatus.PENDING:
            return Response({"detail": "invalid_status"}, status=status.HTTP_400_BAD_REQUEST)
        corr.status = AttendanceCorrection.CorrectionStatus.REJECTED
        corr.reviewed_by = request.user
        corr.reviewed_at = dj_timezone.now()
        corr.decision_note = request.data.get("decision_note")
        corr.save(update_fields=["status", "reviewed_by", "reviewed_at", "decision_note"])
        return Response(AttendanceCorrectionSerializer(corr).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def supervisor_team_attendance(request):
    """Get attendance data for supervisor's team members."""
    user = request.user
    
    # Check if user is supervisor or admin
    if not (user.is_superuser or user.groups.filter(name__in=['admin', 'supervisor']).exists()):
        return JsonResponse({"detail": "forbidden"}, status=403)
    
    # Get supervisor's division
    try:
        supervisor_division_id = user.employee.division_id
        if not supervisor_division_id:
            return JsonResponse({"detail": "supervisor_division_not_configured"}, status=400)
    except Exception:
        return JsonResponse({"detail": "supervisor_employee_record_not_found"}, status=400)
    
    # Get query parameters
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    employee_id = request.GET.get('employee_id')
    
    # Build base queryset for team members in same division
    team_employees = Employee.objects.filter(
        division_id=supervisor_division_id
    ).select_related('user', 'division', 'position')
    
    # Filter by specific employee if requested
    if employee_id:
        team_employees = team_employees.filter(id=employee_id)
    
    # Get attendance data for team members
    attendance_data = []
    
    for employee in team_employees:
        # Get attendance records for this employee
        attendance_qs = Attendance.objects.filter(
            user=employee.user
        ).select_related('user', 'user__employee', 'user__employee__division', 'user__employee__position')
        
        # Apply date filters
        if start_date:
            attendance_qs = attendance_qs.filter(date_local__gte=start_date)
        if end_date:
            attendance_qs = attendance_qs.filter(date_local__lte=end_date)
        
        # Get attendance records
        attendances = attendance_qs.order_by('-date_local')
        
        # Calculate summary statistics
        total_days = attendances.count()
        present_days = attendances.filter(check_in_at_utc__isnull=False).count()
        late_days = attendances.filter(minutes_late__gt=0).count()
        absent_days = total_days - present_days
        
        # Get recent attendance (last 7 days)
        recent_attendance = attendances[:7]
        
        employee_data = {
            "employee": {
                "id": employee.id,
                "nip": employee.nip,
                "user": {
                    "id": employee.user.id,
                    "username": employee.user.username,
                    "first_name": employee.user.first_name,
                    "last_name": employee.user.last_name,
                    "email": employee.user.email,
                },
                "division": {
                    "id": employee.division.id,
                    "name": employee.division.name
                } if employee.division else None,
                "position": {
                    "id": employee.position.id,
                    "name": employee.position.name
                } if employee.position else None,
            },
            "summary": {
                "total_days": total_days,
                "present_days": present_days,
                "late_days": late_days,
                "absent_days": absent_days,
                "attendance_rate": round((present_days / total_days * 100) if total_days > 0 else 0, 2)
            },
            "recent_attendance": [
                {
                    "id": att.id,
                    "date_local": str(att.date_local),
                    "check_in_at_utc": att.check_in_at_utc.isoformat() if att.check_in_at_utc else None,
                    "check_out_at_utc": att.check_out_at_utc.isoformat() if att.check_out_at_utc else None,
                    "minutes_late": att.minutes_late,
                    "total_work_minutes": att.total_work_minutes,
                    "is_holiday": att.is_holiday,
                    "within_geofence": att.within_geofence,
                    "note": att.note,
                    "employee_note": att.employee_note,
                }
                for att in recent_attendance
            ]
        }
        
        attendance_data.append(employee_data)
    
    return JsonResponse({
        "team_attendance": attendance_data,
        "filters": {
            "start_date": start_date,
            "end_date": end_date,
            "employee_id": employee_id,
            "division_id": supervisor_division_id
        }
    }, safe=False)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def supervisor_attendance_detail(request, employee_id):
    """Get detailed attendance data for a specific team member."""
    user = request.user
    
    # Check if user is supervisor or admin
    if not (user.is_superuser or user.groups.filter(name__in=['admin', 'supervisor']).exists()):
        return JsonResponse({"detail": "forbidden"}, status=403)
    
    # Get supervisor's division
    try:
        supervisor_division_id = user.employee.division_id
        if not supervisor_division_id:
            return JsonResponse({"detail": "supervisor_division_not_configured"}, status=400)
    except Exception:
        return JsonResponse({"detail": "supervisor_employee_record_not_found"}, status=400)
    
    # Get query parameters
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    month = request.GET.get('month')  # Format: YYYY-MM
    
    # Get the employee and verify they're in supervisor's division
    try:
        employee = Employee.objects.select_related(
            'user', 'division', 'position'
        ).get(
            id=employee_id,
            division_id=supervisor_division_id
        )
    except Employee.DoesNotExist:
        return JsonResponse({"detail": "employee_not_found_or_not_in_team"}, status=404)
    
    # Build attendance queryset
    attendance_qs = Attendance.objects.filter(
        user=employee.user
    ).select_related('user', 'user__employee', 'user__employee__division', 'user__employee__position')
    
    # Apply date filters
    if start_date:
        attendance_qs = attendance_qs.filter(date_local__gte=start_date)
    if end_date:
        attendance_qs = attendance_qs.filter(date_local__lte=end_date)
    if month:
        # Parse month and filter by year-month
        try:
            year, month_num = month.split('-')
            attendance_qs = attendance_qs.filter(
                date_local__year=year,
                date_local__month=month_num
            )
        except ValueError:
            return JsonResponse({"detail": "invalid_month_format_use_yyyy_mm"}, status=400)
    
    # Get attendance records
    attendances = attendance_qs.order_by('-date_local')
    
    # Calculate detailed statistics
    total_days = attendances.count()
    present_days = attendances.filter(check_in_at_utc__isnull=False).count()
    late_days = attendances.filter(minutes_late__gt=0).count()
    absent_days = total_days - present_days
    total_late_minutes = attendances.filter(minutes_late__gt=0).aggregate(
        total=models.Sum('minutes_late')
    )['total'] or 0
    total_work_minutes = attendances.filter(
        total_work_minutes__gt=0
    ).aggregate(
        total=models.Sum('total_work_minutes')
    )['total'] or 0
    
    # Get all attendance records for the period
    attendance_records = [
        {
            "id": att.id,
            "date_local": str(att.date_local),
            "check_in_at_utc": att.check_in_at_utc.isoformat() if att.check_in_at_utc else None,
            "check_out_at_utc": att.check_out_at_utc.isoformat() if att.check_out_at_utc else None,
            "check_in_lat": float(att.check_in_lat) if att.check_in_lat else None,
            "check_in_lng": float(att.check_in_lng) if att.check_in_lng else None,
            "check_out_lat": float(att.check_out_lat) if att.check_out_lat else None,
            "check_out_lng": float(att.check_out_lng) if att.check_out_lng else None,
            "minutes_late": att.minutes_late,
            "total_work_minutes": att.total_work_minutes,
            "is_holiday": att.is_holiday,
            "within_geofence": att.within_geofence,
            "note": att.note,
            "employee_note": att.employee_note,
            "created_at": att.created_at.isoformat(),
            "updated_at": att.updated_at.isoformat(),
        }
        for att in attendances
    ]
    
    return JsonResponse({
        "employee": {
            "id": employee.id,
            "nip": employee.nip,
            "user": {
                "id": employee.user.id,
                "username": employee.user.username,
                "first_name": employee.user.first_name,
                "last_name": employee.user.last_name,
                "email": employee.user.email,
            },
            "division": {
                "id": employee.division.id,
                "name": employee.division.name
            } if employee.division else None,
            "position": {
                "id": employee.position.id,
                "name": employee.position.name
            } if employee.position else None,
        },
        "summary": {
            "total_days": total_days,
            "present_days": present_days,
            "late_days": late_days,
            "absent_days": absent_days,
            "attendance_rate": round((present_days / total_days * 100) if total_days > 0 else 0, 2),
            "total_late_minutes": total_late_minutes,
            "total_work_minutes": total_work_minutes,
            "average_work_minutes": round(total_work_minutes / present_days, 2) if present_days > 0 else 0
        },
        "attendance_records": attendance_records,
        "filters": {
            "start_date": start_date,
            "end_date": end_date,
            "month": month
        }
    }, safe=False)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def attendance_precheck(request):
    """Return current day attendance status for confirmation UI."""
    user = request.user
    now = dj_timezone.now()
    ws, _ = WorkSettings.objects.get_or_create()
    tz = ZoneInfo(ws.timezone or dj_timezone.get_current_timezone_name())
    local_now = now.astimezone(tz)
    date_local = local_now.date()
    att = Attendance.objects.filter(user=user, date_local=date_local).first()
    has_check_in = bool(att and att.check_in_at_utc)
    has_check_out = bool(att and att.check_out_at_utc)
    return JsonResponse({
        'date_local': str(date_local),
        'has_check_in': has_check_in,
        'has_check_out': has_check_out,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def attendance_check_in(request):
    user = request.user
    now = dj_timezone.now()
    ws, _ = WorkSettings.objects.get_or_create()
    tz = ZoneInfo(ws.timezone or dj_timezone.get_current_timezone_name())
    local_now = now.astimezone(tz)
    date_local = local_now.date()
    # Prevent double check-in today
    att, _created = Attendance.objects.get_or_create(user=user, date_local=date_local, defaults={
        'timezone': ws.timezone or dj_timezone.get_current_timezone_name(),
    })
    if att.check_in_at_utc:
        return JsonResponse({'detail': 'Already checked in.'}, status=400)

    # Parse location
    data = request.data if hasattr(request, 'data') else {}
    try:
        lat = float(data.get('lat'))
        lng = float(data.get('lng'))
        acc = int(data.get('accuracy_m') or 0)
    except Exception:
        return JsonResponse({'detail': 'Invalid location payload'}, status=400)

    # Geofence validation
    if ws.office_latitude is None or ws.office_longitude is None:
        return JsonResponse({'detail': 'Office location is not configured'}, status=400)
    dist = haversine_meters(float(ws.office_latitude), float(ws.office_longitude), lat, lng)
    within = dist <= float(ws.office_radius_meters or 100)
    if not within:
        return JsonResponse({'detail': 'Outside office radius'}, status=403)

    # Holiday/workday determination
    is_holiday = Holiday.objects.filter(date=date_local).exists()
    minutes_late = 0
    if not is_holiday:
        # Compute lateness using local time now
        # evaluate_lateness expects a datetime; we pass now (server) which will be normalized
        res = evaluate_lateness_as_dict(now)
        minutes_late = int(res.get('minutes_late') or 0)

    att.check_in_at_utc = now
    att.check_in_lat = lat
    att.check_in_lng = lng
    att.check_in_accuracy_m = acc
    att.within_geofence = within
    att.is_holiday = is_holiday
    att.minutes_late = minutes_late
    # Mark off-day attendance if today is not a configured workday and not a holiday
    try:
        workdays = ws.workdays or []
        weekday = local_now.weekday()
        is_workday = weekday in workdays
        if (not is_workday) and (not is_holiday):
            att.note = (att.note or 'Off-day attendance')
    except Exception:
        pass
    # Optional employee note for lateness
    try:
        employee_note = (data.get('employee_note') or '').strip()
        if minutes_late > 0 and employee_note:
            att.employee_note = employee_note
    except Exception:
        pass
    # Try link to employee
    try:
        att.employee = user.employee
    except Exception:
        pass
    att.save()
    return JsonResponse(AttendanceSerializer(att).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def attendance_check_out(request):
    user = request.user
    now = dj_timezone.now()
    ws, _ = WorkSettings.objects.get_or_create()
    tz = ZoneInfo(ws.timezone or dj_timezone.get_current_timezone_name())
    local_now = now.astimezone(tz)
    date_local = local_now.date()
    att = Attendance.objects.filter(user=user, date_local=date_local).first()
    if not att or not att.check_in_at_utc:
        return JsonResponse({'detail': 'No active attendance for today'}, status=400)
    if att.check_out_at_utc:
        return JsonResponse({'detail': 'Already checked out'}, status=400)

    data = request.data if hasattr(request, 'data') else {}
    try:
        lat = float(data.get('lat'))
        lng = float(data.get('lng'))
        acc = int(data.get('accuracy_m') or 0)
    except Exception:
        return JsonResponse({'detail': 'Invalid location payload'}, status=400)

    # Geofence validation (optional at checkout; still enforce by default)
    if ws.office_latitude is None or ws.office_longitude is None:
        return JsonResponse({'detail': 'Office location is not configured'}, status=400)
    dist = haversine_meters(float(ws.office_latitude), float(ws.office_longitude), lat, lng)
    within = dist <= float(ws.office_radius_meters or 100)
    if not within:
        return JsonResponse({'detail': 'Outside office radius'}, status=403)

    att.check_out_at_utc = now
    att.check_out_lat = lat
    att.check_out_lng = lng
    att.check_out_accuracy_m = acc
    # Compute total work minutes
    delta = now - (att.check_in_at_utc or now)
    att.total_work_minutes = max(0, int(delta.total_seconds() // 60))
    # Optional employee note for underwork (less than required minutes)
    try:
        employee_note = (data.get('employee_note') or '').strip()
        # Determine required minutes based on weekday (Friday special)
        weekday = local_now.weekday()  # Monday=0..Sunday=6
        required = int(ws.friday_required_minutes or 0) if weekday == 4 else int(ws.required_minutes or 0)
        if att.total_work_minutes < required and employee_note:
            att.employee_note = employee_note
    except Exception:
        pass
    att.save(update_fields=['check_out_at_utc', 'check_out_lat', 'check_out_lng', 'check_out_accuracy_m', 'total_work_minutes', 'employee_note'])
    return JsonResponse(AttendanceSerializer(att).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_report(request):
    """Get detailed attendance report with summary statistics for the current user."""
    user = request.user
    
    # Get query parameters
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    month = request.GET.get('month')  # Format: YYYY-MM
    
    # Build attendance queryset
    attendance_qs = Attendance.objects.filter(user=user)
    
    # Apply date filters
    if start_date:
        attendance_qs = attendance_qs.filter(date_local__gte=start_date)
    if end_date:
        attendance_qs = attendance_qs.filter(date_local__gte=end_date)
    if month:
        # Parse month and filter by year-month
        try:
            year, month_num = month.split('-')
            attendance_qs = attendance_qs.filter(
                date_local__year=year,
                date_local__month=month_num
            )
        except ValueError:
            return JsonResponse({"detail": "invalid_month_format_use_yyyy_mm"}, status=400)
    
    # Get attendance records
    attendances = attendance_qs.order_by('-date_local')
    
    # Calculate detailed statistics
    total_days = attendances.count()
    present_days = attendances.filter(check_in_at_utc__isnull=False).count()
    late_days = attendances.filter(minutes_late__gt=0).count()
    absent_days = total_days - present_days
    total_late_minutes = attendances.filter(minutes_late__gt=0).aggregate(
        total=models.Sum('minutes_late')
    )['total'] or 0
    total_work_minutes = attendances.filter(
        total_work_minutes__gt=0
    ).aggregate(
        total=models.Sum('total_work_minutes')
    )['total'] or 0
    
    # Get all attendance records for the period
    attendance_records = [
        {
            "id": att.id,
            "date_local": str(att.date_local),
            "check_in_at_utc": att.check_in_at_utc.isoformat() if att.check_in_at_utc else None,
            "check_out_at_utc": att.check_out_at_utc.isoformat() if att.check_out_at_utc else None,
            "check_in_lat": float(att.check_in_lat) if att.check_in_lat else None,
            "check_in_lng": float(att.check_in_lng) if att.check_in_lng else None,
            "check_out_lat": float(att.check_out_lat) if att.check_out_lat else None,
            "check_out_lng": float(att.check_out_lng) if att.check_out_lng else None,
            "minutes_late": att.minutes_late,
            "total_work_minutes": att.total_work_minutes,
            "is_holiday": att.is_holiday,
            "within_geofence": att.within_geofence,
            "note": att.note,
            "employee_note": att.employee_note,
            "created_at": att.created_at.isoformat(),
            "updated_at": att.updated_at.isoformat(),
        }
        for att in attendances
    ]
    
    return JsonResponse({
        "summary": {
            "total_days": total_days,
            "present_days": present_days,
            "late_days": late_days,
            "absent_days": absent_days,
            "attendance_rate": round((present_days / total_days * 100) if total_days > 0 else 0, 2),
            "total_late_minutes": total_late_minutes,
            "total_work_minutes": total_work_minutes,
            "average_work_minutes": round(total_work_minutes / present_days, 2) if present_days > 0 else 0
        },
        "attendance_records": attendance_records,
        "filters": {
            "start_date": start_date,
            "end_date": end_date,
            "month": month
        }
    }, safe=False)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_report_pdf(request):
    """Generate PDF report for attendance data."""
    user = request.user
    
    # Get query parameters
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    month = request.GET.get('month')
    
    # Build attendance queryset
    attendance_qs = Attendance.objects.filter(user=user)
    
    # Apply date filters
    if start_date:
        attendance_qs = attendance_qs.filter(date_local__gte=start_date)
    if end_date:
        attendance_qs = attendance_qs.filter(date_local__gte=end_date)
    if month:
        try:
            year, month_num = month.split('-')
            attendance_qs = attendance_qs.filter(
                date_local__year=year,
                date_local__month=month_num
            )
        except ValueError:
            return JsonResponse({"detail": "invalid_month_format_use_yyyy_mm"}, status=400)
    
    # Get attendance records
    attendances = attendance_qs.order_by('-date_local')
    
    # Calculate statistics
    total_days = attendances.count()
    present_days = attendances.filter(check_in_at_utc__isnull=False).count()
    late_days = attendances.filter(minutes_late__gt=0).count()
    absent_days = total_days - present_days
    total_late_minutes = attendances.filter(minutes_late__gt=0).aggregate(
        total=models.Sum('minutes_late')
    )['total'] or 0
    total_work_minutes = attendances.filter(
        total_work_minutes__gt=0
    ).aggregate(
        total=models.Sum('total_work_minutes')
    )['total'] or 0
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    
    # Get styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=30,
        alignment=1  # Center alignment
    )
    
    # Title
    title = Paragraph("Laporan Absensi Pegawai", title_style)
    elements.append(title)
    
    # Employee Info
    try:
        employee = user.employee
        employee_info = f"""
        <b>Nama:</b> {user.first_name} {user.last_name}<br/>
        <b>NIP:</b> {employee.nip if employee else 'N/A'}<br/>
        <b>Divisi:</b> {employee.division.name if employee and employee.division else 'N/A'}<br/>
        <b>Jabatan:</b> {employee.position.name if employee and employee.position else 'N/A'}<br/>
        <b>Periode:</b> {start_date or 'Semua'} - {end_date or 'Semua'}
        """
        if month:
            employee_info += f"<br/><b>Bulan:</b> {month}"
    except:
        employee_info = f"<b>Nama:</b> {user.first_name} {user.last_name}<br/><b>Periode:</b> {start_date or 'Semua'} - {end_date or 'Semua'}"
    
    employee_para = Paragraph(employee_info, styles['Normal'])
    elements.append(employee_para)
    elements.append(Spacer(1, 20))
    
    # Summary Statistics
    summary_title = Paragraph("Ringkasan Statistik", styles['Heading2'])
    elements.append(summary_title)
    elements.append(Spacer(1, 10))
    
    summary_data = [
        ['Total Hari', 'Hadir', 'Terlambat', 'Tidak Hadir', 'Tingkat Kehadiran'],
        [
            str(total_days),
            str(present_days),
            str(late_days),
            str(absent_days),
            f"{round((present_days / total_days * 100) if total_days > 0 else 0, 2)}%"
        ]
    ]
    
    summary_table = Table(summary_data)
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 20))
    
    # Work Hours Summary
    work_hours_title = Paragraph("Ringkasan Jam Kerja", styles['Heading2'])
    elements.append(work_hours_title)
    elements.append(Spacer(1, 10))
    
    work_hours_data = [
        ['Total Jam Kerja', 'Total Keterlambatan', 'Rata-rata Jam Kerja/Hari'],
        [
            format_work_hours(total_work_minutes),
            format_work_hours(total_late_minutes),
            format_work_hours(total_work_minutes / present_days) if present_days > 0 else '0m'
        ]
    ]
    
    work_hours_table = Table(work_hours_data)
    work_hours_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(work_hours_table)
    elements.append(Spacer(1, 20))
    
    # Detailed Records
    if attendances.exists():
        records_title = Paragraph("Detail Absensi", styles['Heading2'])
        elements.append(records_title)
        elements.append(Spacer(1, 10))
        
        # Prepare table data
        table_data = [['Tanggal', 'Status', 'Check-in', 'Check-out', 'Terlambat', 'Jam Kerja']]
        
        for att in attendances[:50]:  # Limit to 50 records to avoid PDF too large
            # Determine status
            if att.is_holiday:
                status = 'Hari Libur'
            elif att.minutes_late > 0:
                status = f'Terlambat {att.minutes_late}m'
            elif att.check_in_at_utc and att.check_out_at_utc:
                status = 'Hadir Lengkap'
            elif att.check_in_at_utc:
                status = 'Hanya Check-in'
            else:
                status = 'Tidak Hadir'
            
            # Format times
            check_in = att.check_in_at_utc.strftime('%H:%M') if att.check_in_at_utc else '-'
            check_out = att.check_out_at_utc.strftime('%H:%M') if att.check_out_at_utc else '-'
            
            # Format work hours
            work_hours = format_work_hours(att.total_work_minutes)
            
            table_data.append([
                att.date_local.strftime('%d/%m/%Y'),
                status,
                check_in,
                check_out,
                f"{att.minutes_late}m" if att.minutes_late > 0 else '-',
                work_hours
            ])
        
        # Create table
        records_table = Table(table_data, colWidths=[1*inch, 1.5*inch, 0.8*inch, 0.8*inch, 0.8*inch, 1*inch])
        records_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(records_table)
        
        if attendances.count() > 50:
            elements.append(Spacer(1, 10))
            note = Paragraph(f"<i>Catatan: Ditampilkan 50 record terbaru dari total {attendances.count()} record</i>", styles['Normal'])
            elements.append(note)
    
    # Footer
    elements.append(Spacer(1, 30))
    footer = Paragraph(f"<i>Dibuat pada: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</i>", styles['Normal'])
    elements.append(footer)
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    # Create response
    response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="attendance-report-{datetime.datetime.now().strftime("%Y%m%d-%H%M%S")}.pdf"'
    
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def supervisor_team_attendance_pdf(request):
    """Generate PDF report for supervisor team attendance."""
    user = request.user
    
    # Check if user is supervisor or admin
    if not (user.is_superuser or user.groups.filter(name__in=['admin', 'supervisor']).exists()):
        return HttpResponse("Forbidden", status=403)
    
    # Get supervisor's division
    try:
        supervisor_division_id = user.employee.division_id
        if not supervisor_division_id:
            return HttpResponse("Supervisor division not configured", status=400)
    except Exception:
        return HttpResponse("Supervisor employee record not found", status=400)
    
    # Get query parameters
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    employee_id = request.GET.get('employee_id')
    
    # Build base queryset for team members in same division
    team_employees = Employee.objects.filter(
        division_id=supervisor_division_id
    ).select_related('user', 'division', 'position')
    
    # Filter by specific employee if requested
    if employee_id:
        team_employees = team_employees.filter(id=employee_id)
    
    # Get attendance data for team members
    attendance_data = []
    
    for employee in team_employees:
        # Get attendance records for this employee
        attendance_qs = Attendance.objects.filter(
            user=employee.user
        ).select_related('user', 'user__employee', 'user__employee__division', 'user__employee__position')
        
        # Apply date filters
        if start_date:
            attendance_qs = attendance_qs.filter(date_local__gte=start_date)
        if end_date:
            attendance_qs = attendance_qs.filter(date_local__gte=end_date)
        
        # Get attendance records
        attendances = attendance_qs.order_by('-date_local')
        
        # Calculate summary statistics
        total_days = attendances.count()
        present_days = attendances.filter(check_in_at_utc__isnull=False).count()
        late_days = attendances.filter(minutes_late__gt=0).count()
        absent_days = total_days - present_days
        
        employee_data = {
            "employee": employee,
            "summary": {
                "total_days": total_days,
                "present_days": present_days,
                "late_days": late_days,
                "absent_days": absent_days,
                "attendance_rate": round((present_days / total_days * 100) if total_days > 0 else 0, 2)
            },
            "attendances": attendances
        }
        
        attendance_data.append(employee_data)
    
    try:
        # Create PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        
        # Title
        title = Paragraph("Laporan Absensi Tim Supervisor", title_style)
        elements.append(title)
        
        # Supervisor Info
        try:
            supervisor_info = f"""
            <b>Supervisor:</b> {user.first_name} {user.last_name}<br/>
            <b>Divisi:</b> {user.employee.division.name if user.employee and user.employee.division else 'N/A'}<br/>
            <b>Periode:</b> {start_date or 'Semua'} - {end_date or 'Semua'}
            """
            if employee_id:
                supervisor_info += f"<br/><b>Employee ID:</b> {employee_id}"
        except:
            supervisor_info = f"<b>Supervisor:</b> {user.first_name} {user.last_name}<br/><b>Periode:</b> {start_date or 'Semua'} - {end_date or 'Semua'}"
        
        supervisor_para = Paragraph(supervisor_info, styles['Normal'])
        elements.append(supervisor_para)
        elements.append(Spacer(1, 20))
        
        # Team Summary Statistics
        summary_title = Paragraph("Ringkasan Tim", styles['Heading2'])
        elements.append(summary_title)
        elements.append(Spacer(1, 10))
        
        total_members = len(attendance_data)
        total_present_days = sum(member['summary']['present_days'] for member in attendance_data)
        total_late_days = sum(member['summary']['late_days'] for member in attendance_data)
        avg_attendance_rate = sum(member['summary']['attendance_rate'] for member in attendance_data) / total_members if total_members > 0 else 0
        
        summary_data = [
            ['Total Anggota Tim', 'Total Hari Hadir', 'Total Hari Terlambat', 'Rata-rata Tingkat Kehadiran'],
            [
                str(total_members),
                str(total_present_days),
                str(total_late_days),
                f"{round(avg_attendance_rate, 2)}%"
            ]
        ]
        
        summary_table = Table(summary_data)
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 20))
        
        # Individual Employee Summary
        if attendance_data:
            employee_title = Paragraph("Ringkasan per Anggota Tim", styles['Heading2'])
            elements.append(employee_title)
            elements.append(Spacer(1, 10))
            
            # Prepare table data
            table_data = [['Nama', 'NIP', 'Divisi', 'Jabatan', 'Total Hari', 'Hadir', 'Terlambat', 'Rate (%)']]
            
            for member in attendance_data:
                employee = member['employee']
                summary = member['summary']
                
                table_data.append([
                    f"{employee.user.first_name} {employee.user.last_name}",
                    employee.nip,
                    employee.division.name if employee.division else '-',
                    employee.position.name if employee.position else '-',
                    str(summary['total_days']),
                    str(summary['present_days']),
                    str(summary['late_days']),
                    f"{summary['attendance_rate']}%"
                ])
            
            # Create table
            employee_table = Table(table_data, colWidths=[1.2*inch, 0.8*inch, 1*inch, 1*inch, 0.7*inch, 0.6*inch, 0.7*inch, 0.6*inch])
            employee_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            elements.append(employee_table)
            elements.append(Spacer(1, 20))
            
            # Recent Attendance Records (first 3 employees only to avoid PDF too large)
            if len(attendance_data) <= 3:
                records_title = Paragraph("Detail Absensi Terbaru", styles['Heading2'])
                elements.append(records_title)
                elements.append(Spacer(1, 10))
                
                for member in attendance_data:
                    employee = member['employee']
                    attendances = member['attendances'][:7]  # Last 7 days
                    
                    if attendances.exists():
                        employee_name = f"{employee.user.first_name} {employee.user.last_name}"
                        employee_header = Paragraph(f"<b>{employee_name} ({employee.nip})</b>", styles['Heading3'])
                        elements.append(employee_header)
                        elements.append(Spacer(1, 5))
                        
                        # Prepare records table
                        records_data = [['Tanggal', 'Status', 'Check-in', 'Check-out', 'Jam Kerja', 'Keterlambatan']]
                        
                        for att in attendances:
                            # Determine status
                            if att.is_holiday:
                                status = 'Hari Libur'
                            elif att.minutes_late > 0:
                                status = f'Terlambat {att.minutes_late}m'
                            elif att.check_in_at_utc and att.check_out_at_utc:
                                status = 'Hadir Lengkap'
                            elif att.check_in_at_utc:
                                status = 'Hanya Check-in'
                            else:
                                status = 'Tidak Hadir'
                            
                            # Format times
                            check_in = att.check_in_at_utc.strftime('%H:%M') if att.check_in_at_utc else '-'
                            check_out = att.check_out_at_utc.strftime('%H:%M') if att.check_out_at_utc else '-'
                            
                            # Format work hours
                            work_hours = format_work_hours(att.total_work_minutes)
                            
                            records_data.append([
                                att.date_local.strftime('%d/%m/%Y'),
                                status,
                                check_in,
                                check_out,
                                work_hours,
                                f"{att.minutes_late}m" if att.minutes_late > 0 else '-'
                            ])
                        
                        # Create records table
                        records_table = Table(records_data, colWidths=[0.8*inch, 1.2*inch, 0.7*inch, 0.7*inch, 0.8*inch, 0.8*inch])
                        records_table.setStyle(TableStyle([
                            ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
                            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                            ('FONTSIZE', (0, 0), (-1, 0), 8),
                            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                            ('GRID', (0, 0), (-1, -1), 1, colors.black),
                            ('FONTSIZE', (0, 1), (-1, -1), 7),
                            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                        ]))
                        elements.append(records_table)
                        elements.append(Spacer(1, 15))
        
        # Footer
        elements.append(Spacer(1, 30))
        footer = Paragraph(f"<i>Dibuat pada: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</i>", styles['Normal'])
        elements.append(footer)
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        # Create response with proper headers
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="supervisor-team-attendance-{datetime.datetime.now().strftime("%Y%m%d-%H%M%S")}.pdf"'
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        
        return response
        
    except Exception as e:
        # Log the error for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error generating PDF: {str(e)}")
        
        # Return error response
        return HttpResponse(f"Error generating PDF: {str(e)}", status=500)


def supervisor_team_attendance_pdf_alt(request):
    """Alternative PDF generation function without DRF decorators to avoid Accept header issues."""
    from django.contrib.auth.decorators import login_required
    from django.views.decorators.http import require_http_methods
    
    # Check if user is authenticated
    if not request.user.is_authenticated:
        return HttpResponse("Unauthorized", status=401)
    
    # Check if user is supervisor or admin
    if not (request.user.is_superuser or request.user.groups.filter(name__in=['admin', 'supervisor']).exists()):
        return HttpResponse("Forbidden", status=403)
    
    user = request.user
    
    # Get supervisor's division
    try:
        supervisor_division_id = user.employee.division_id
        if not supervisor_division_id:
            return HttpResponse("Supervisor division not configured", status=400)
    except Exception:
        return HttpResponse("Supervisor employee record not found", status=400)
    
    # Get query parameters
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    employee_id = request.GET.get('employee_id')
    
    # Build base queryset for team members in same division
    team_employees = Employee.objects.filter(
        division_id=supervisor_division_id
    ).select_related('user', 'division', 'position')
    
    # Filter by specific employee if requested
    if employee_id:
        team_employees = team_employees.filter(id=employee_id)
    
    # Get attendance data for team members
    attendance_data = []
    
    for employee in team_employees:
        # Get attendance records for this employee
        attendance_qs = Attendance.objects.filter(
            user=employee.user
        ).select_related('user', 'user__employee', 'user__employee__division', 'user__employee__position')
        
        # Apply date filters
        if start_date:
            attendance_qs = attendance_qs.filter(date_local__gte=start_date)
        if end_date:
            attendance_qs = attendance_qs.filter(date_local__gte=end_date)
        
        # Get attendance records
        attendances = attendance_qs.order_by('-date_local')
        
        # Calculate summary statistics
        total_days = attendances.count()
        present_days = attendances.filter(check_in_at_utc__isnull=False).count()
        late_days = attendances.filter(minutes_late__gt=0).count()
        absent_days = total_days - present_days
        
        employee_data = {
            "employee": employee,
            "summary": {
                "total_days": total_days,
                "present_days": present_days,
                "late_days": late_days,
                "absent_days": absent_days,
                "attendance_rate": round((present_days / total_days * 100) if total_days > 0 else 0, 2)
            },
            "attendances": attendances
        }
        
        attendance_data.append(employee_data)
    
    try:
        # Create PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        
        # Title
        title = Paragraph("Laporan Absensi Tim Supervisor", title_style)
        elements.append(title)
        
        # Supervisor Info
        try:
            supervisor_info = f"""
            <b>Supervisor:</b> {user.first_name} {user.last_name}<br/>
            <b>Divisi:</b> {user.employee.division.name if user.employee and user.employee.division else 'N/A'}<br/>
            <b>Periode:</b> {start_date or 'Semua'} - {end_date or 'Semua'}
            """
            if employee_id:
                supervisor_info += f"<br/><b>Employee ID:</b> {employee_id}"
        except:
            supervisor_info = f"<b>Supervisor:</b> {user.first_name} {user.last_name}<br/><b>Periode:</b> {start_date or 'Semua'} - {end_date or 'Semua'}"
        
        supervisor_para = Paragraph(supervisor_info, styles['Normal'])
        elements.append(supervisor_para)
        elements.append(Spacer(1, 20))
        
        # Team Summary Statistics
        summary_title = Paragraph("Ringkasan Tim", styles['Heading2'])
        elements.append(summary_title)
        elements.append(Spacer(1, 10))
        
        total_members = len(attendance_data)
        total_present_days = sum(member['summary']['present_days'] for member in attendance_data)
        total_late_days = sum(member['summary']['late_days'] for member in attendance_data)
        avg_attendance_rate = sum(member['summary']['attendance_rate'] for member in attendance_data) / total_members if total_members > 0 else 0
        
        summary_data = [
            ['Total Anggota Tim', 'Total Hari Hadir', 'Total Hari Terlambat', 'Rata-rata Tingkat Kehadiran'],
            [
                str(total_members),
                str(total_present_days),
                str(total_late_days),
                f"{round(avg_attendance_rate, 2)}%"
            ]
        ]
        
        summary_table = Table(summary_data)
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 20))
        
        # Individual Employee Summary
        if attendance_data:
            employee_title = Paragraph("Ringkasan per Anggota Tim", styles['Heading2'])
            elements.append(employee_title)
            elements.append(Spacer(1, 10))
            
            # Prepare table data
            table_data = [['Nama', 'NIP', 'Divisi', 'Jabatan', 'Total Hari', 'Hadir', 'Terlambat', 'Rate (%)']]
            
            for member in attendance_data:
                employee = member['employee']
                summary = member['summary']
                
                table_data.append([
                    f"{employee.user.first_name} {employee.user.last_name}",
                    employee.nip,
                    employee.division.name if employee.division else '-',
                    employee.position.name if employee.position else '-',
                    str(summary['total_days']),
                    str(summary['present_days']),
                    str(summary['late_days']),
                    f"{summary['attendance_rate']}%"
                ])
            
            # Create table
            employee_table = Table(table_data, colWidths=[1.2*inch, 0.8*inch, 1*inch, 1*inch, 0.7*inch, 0.6*inch, 0.7*inch, 0.6*inch])
            employee_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            elements.append(employee_table)
            elements.append(Spacer(1, 20))
        
        # Footer
        elements.append(Spacer(1, 30))
        footer = Paragraph(f"<i>Dibuat pada: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</i>", styles['Normal'])
        elements.append(footer)
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        # Create response with proper headers
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="supervisor-team-attendance-{datetime.datetime.now().strftime("%Y%m%d-%H%M%S")}.pdf"'
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        
        return response
        
    except Exception as e:
        # Log the error for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error generating PDF: {str(e)}")
        
        # Return error response
        return HttpResponse(f"Error generating PDF: {str(e)}", status=500)
