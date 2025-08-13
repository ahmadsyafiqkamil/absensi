from django.http import JsonResponse
from django.contrib.auth.models import User
from django.views.decorators.http import require_GET
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import viewsets, permissions
from .models import Division, Position, Employee, WorkSettings, Holiday
from .serializers import (
    DivisionSerializer,
    PositionSerializer,
    EmployeeSerializer,
    WorkSettingsSerializer,
    HolidaySerializer,
)
from .pagination import DefaultPagination

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
