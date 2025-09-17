from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import logout
from django.contrib.auth.models import User
from apps.employees.serializers import EmployeeSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom login view"""
    pass


class CustomTokenRefreshView(TokenRefreshView):
    """Custom token refresh view"""
    pass


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """Get current user information"""
    user = request.user
    
    # Get user basic info
    user_data = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'groups': [group.name for group in user.groups.all()],
        'is_superuser': user.is_superuser,
        'is_staff': user.is_staff,
    }
    
    # Add employee info if exists
    if hasattr(user, 'employee_profile'):
        from apps.employees.serializers import EmployeeSerializer
        employee_data = EmployeeSerializer(user.employee_profile).data
        user_data['employee'] = employee_data
        
        # Also add position data at top level for compatibility with frontend
        if employee_data.get('position'):
            user_data['position'] = employee_data['position']
    
    return Response(user_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Logout user"""
    try:
        # For JWT, we typically just rely on frontend to remove token
        # But we can blacklist the token if using blacklist app
        return Response({'message': 'Successfully logged out'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint"""
    return Response({'status': 'healthy', 'message': 'API is running'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_me(request):
    """Get current user's employee information"""
    user = request.user
    
    if hasattr(user, 'employee_profile'):
        from apps.employees.serializers import EmployeeSerializer
        employee_data = EmployeeSerializer(user.employee_profile).data
        return Response(employee_data)
    else:
        return Response({'error': 'Employee profile not found'}, status=status.HTTP_404_NOT_FOUND)
