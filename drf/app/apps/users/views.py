from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import User, Group
from .models import UserProfile
from .serializers import (
    UserSerializer, UserCreateSerializer, UserProvisionSerializer,
    UserProfileSerializer, GroupSerializer
)
from apps.core.permissions import IsAdmin, IsAdminOrReadOnly


class UserViewSet(viewsets.ModelViewSet):
    """User management ViewSet"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action == 'provision':
            return UserProvisionSerializer
        return UserSerializer
    
    @action(detail=False, methods=['post'])
    def provision(self, request):
        """Provision a new user with groups"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        response_serializer = UserSerializer(user)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user info"""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def set_groups(self, request, pk=None):
        """Set user groups"""
        user = self.get_object()
        group_names = request.data.get('groups', [])
        
        user.groups.clear()
        for group_name in group_names:
            try:
                group = Group.objects.get(name=group_name)
                user.groups.add(group)
            except Group.DoesNotExist:
                pass
        
        serializer = UserSerializer(user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def check(self, request):
        """Check if username exists"""
        username = request.query_params.get('username')
        if not username:
            return Response({'error': 'Username parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        exists = User.objects.filter(username=username).exists()
        return Response({
            'username': username,
            'exists': exists
        })


class AdminUserViewSet(UserViewSet):
    """Admin-specific user management"""
    pass


class GroupViewSet(viewsets.ModelViewSet):
    """Group management ViewSet"""
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [IsAdminOrReadOnly]


class AdminGroupViewSet(GroupViewSet):
    """Admin-specific group management"""
    permission_classes = [IsAdmin]


class UserProfileViewSet(viewsets.ModelViewSet):
    """User profile management ViewSet"""
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return UserProfile.objects.all()
        return UserProfile.objects.filter(user=self.request.user)
