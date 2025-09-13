from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.contrib.auth.models import Group
from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, authentication_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

# Reuse legacy serializers/models during migration
from .models import GroupPermission, GroupPermissionTemplate
from .serializers import (
    GroupSerializer, GroupAdminSerializer, GroupCreateSerializer, GroupUpdateSerializer,
    GroupDetailSerializer, GroupWithPermissionsSerializer,
    GroupPermissionSerializer, GroupPermissionCreateSerializer, GroupPermissionUpdateSerializer,
    GroupPermissionTemplateSerializer, GroupPermissionTemplateCreateSerializer, GroupPermissionTemplateUpdateSerializer,
    BulkPermissionUpdateSerializer, PermissionSummarySerializer,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    groups = list(user.groups.values_list('name', flat=True))
    employee_profile = getattr(user, 'employee_profile', None)
    employee_data = None
    if employee_profile is not None:
        employee_data = {
            'nip': employee_profile.nip,
            'division': employee_profile.division.name if employee_profile.division else None,
            'position': employee_profile.position.name if employee_profile.position else None,
            'fullname': employee_profile.fullname,
        }
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'groups': groups,
        'employee': employee_data,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def logout(request):
    return Response({'message': 'Logged out (client should discard tokens)'})


@api_view(['GET'])
@permission_classes([AllowAny])
def check_user(request):
    username = request.query_params.get('username') or request.GET.get('username')
    if not username:
        return Response({'error': 'username is required'}, status=status.HTTP_400_BAD_REQUEST)
    UserModel = get_user_model()
    exists = UserModel.objects.filter(username=username).exists()
    return Response({'exists': exists})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def users_list(request):
    if not (request.user.is_superuser or request.user.groups.filter(name='admin').exists()):
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    UserModel = get_user_model()
    users = UserModel.objects.all().order_by('username')
    data = []
    for u in users:
        data.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'is_active': u.is_active,
            'groups': list(u.groups.values_list('name', flat=True)),
        })
    return Response(data)


@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
@csrf_exempt
def provision_user(request):
    payload = request.data or {}
    username = payload.get('username')
    password = payload.get('password') or None
    email = payload.get('email') or ''
    group_name = payload.get('group')  # 'admin' | 'supervisor' | 'pegawai'
    if not username or not group_name:
        return Response({'error': 'username and group are required'}, status=status.HTTP_400_BAD_REQUEST)

    UserModel = get_user_model()
    user, created = UserModel.objects.get_or_create(username=username, defaults={'email': email})
    if created and password:
        user.set_password(password)
        user.save()

    # Map legacy group names to actual groups
    valid_groups = ['admin', 'supervisor', 'pegawai']
    if group_name not in valid_groups:
        return Response({'error': 'invalid group'}, status=status.HTTP_400_BAD_REQUEST)
    group, _ = Group.objects.get_or_create(name=group_name)
    user.groups.add(group)
    user.save()

    return Response({
        'created': created,
        'id': user.id,
        'username': user.username,
        'groups': list(user.groups.values_list('name', flat=True)),
    })


class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all().order_by('name')
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            if self.action == 'create':
                return GroupCreateSerializer
            if self.action in ['update', 'partial_update']:
                return GroupUpdateSerializer
            if self.action == 'retrieve':
                return GroupDetailSerializer
            return GroupAdminSerializer
        if self.action == 'retrieve':
            return GroupDetailSerializer
        return GroupSerializer


class GroupPermissionViewSet(viewsets.ModelViewSet):
    queryset = GroupPermission.objects.select_related('group').all().order_by('group__name', 'permission_type', 'permission_action')
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == 'create':
            return GroupPermissionCreateSerializer
        if self.action in ['update', 'partial_update']:
            return GroupPermissionUpdateSerializer
        if self.action == 'retrieve':
            return GroupPermissionSerializer
        return GroupPermissionSerializer


class GroupPermissionTemplateViewSet(viewsets.ModelViewSet):
    queryset = GroupPermissionTemplate.objects.all().order_by('name')
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == 'create':
            return GroupPermissionTemplateCreateSerializer
        if self.action in ['update', 'partial_update']:
            return GroupPermissionTemplateUpdateSerializer
        return GroupPermissionTemplateSerializer


class AdminGroupWithPermissionsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Group.objects.all().order_by('name')
    serializer_class = GroupWithPermissionsSerializer
    permission_classes = [permissions.IsAdminUser]


class PermissionManagementViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        serializer = BulkPermissionUpdateSerializer(data=request.data)
        if serializer.is_valid():
            group_id = serializer.validated_data['group_id']
            perms = serializer.validated_data['permissions']
            try:
                group = Group.objects.get(id=group_id)
            except Group.DoesNotExist:
                return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)

            # Replace group's custom permissions
            GroupPermission.objects.filter(group=group).delete()
            created = []
            for perm in perms:
                created.append(GroupPermission.objects.create(
                    group=group,
                    permission_type=perm['permission_type'],
                    permission_action=perm['permission_action'],
                    is_active=True,
                ))
            return Response({'success': True, 'created': len(created)})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        summaries = []
        for group in Group.objects.all().order_by('name'):
            perms = GroupPermission.objects.filter(group=group, is_active=True)
            permission_types = sorted(set(p.permission_type for p in perms))
            permission_actions = sorted(set(p.permission_action for p in perms))
            summaries.append({
                'group_id': group.id,
                'group_name': group.name,
                'total_permissions': perms.count(),
                'active_permissions': perms.count(),
                'permission_types': permission_types,
                'permission_actions': permission_actions,
            })
        serializer = PermissionSummarySerializer(summaries, many=True)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_token_view(request):
    return Response({'success': True})


@api_view(['GET'])
@permission_classes([AllowAny])
def public_permissions_view(request):
    if not bool(getattr(__import__('django.conf').conf.settings, 'DEBUG', False)):
        return Response({'error': 'Not available'}, status=status.HTTP_403_FORBIDDEN)
    perms = GroupPermission.objects.select_related('group').all()
    data = GroupPermissionSerializer(perms, many=True).data
    return Response(data)


