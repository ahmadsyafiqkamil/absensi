from django.http import JsonResponse
from django.contrib.auth.models import User
from django.views.decorators.http import require_GET
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import viewsets, permissions
from .models import Division, Position, Employee, WorkSettings, Holiday, Attendance
from .serializers import (
    DivisionSerializer,
    PositionSerializer,
    EmployeeSerializer,
    WorkSettingsSerializer,
    HolidaySerializer,
    AttendanceSerializer,
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
    permission_classes = [IsAdmin]
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
    att.save(update_fields=['check_out_at_utc', 'check_out_lat', 'check_out_lng', 'check_out_accuracy_m', 'total_work_minutes'])
    return JsonResponse(AttendanceSerializer(att).data)
