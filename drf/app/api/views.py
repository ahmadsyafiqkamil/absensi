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
    permission_classes = [IsAdmin]

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
        if start:
            qs = qs.filter(date_local__gte=start)
        if end:
            qs = qs.filter(date_local__lte=end)
        return qs.order_by('-date_local')


class AttendanceCorrectionViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceCorrectionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DefaultPagination

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
