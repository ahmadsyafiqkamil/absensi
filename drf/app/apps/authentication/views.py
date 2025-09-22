from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import logout
from django.contrib.auth.models import User
from django.middleware.csrf import get_token
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
        
        # Add position data at top level for compatibility with frontend
        # Use primary_position if available, fallback to legacy position
        if employee_data.get('primary_position'):
            user_data['position'] = employee_data['primary_position']
        elif employee_data.get('position'):
            user_data['position'] = employee_data['position']
        
        # Add new multi-position fields
        user_data['positions'] = employee_data.get('employee_positions', [])
        user_data['approval_capabilities'] = employee_data.get('approval_capabilities', {})
        user_data['primary_position'] = employee_data.get('primary_position')
        
        # Add current position context for position switching
        employee = user.employee_profile
        current_context = employee.get_current_context_capabilities()
        current_assignment = employee.get_current_active_position()
        
        user_data['current_context'] = {
            **current_context,
            'current_assignment': {
                'id': current_assignment.id,
                'position': {
                    'id': current_assignment.position.id,
                    'name': current_assignment.position.name,
                    'approval_level': current_assignment.position.approval_level,
                    'can_approve_overtime_org_wide': current_assignment.position.can_approve_overtime_org_wide
                },
                'is_primary': current_assignment.is_primary
            } if current_assignment else None
        }
        
        # Add available contexts for position switching
        user_data['available_contexts'] = employee.get_available_position_contexts()
    
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


@api_view(['GET'])
@permission_classes([AllowAny])
def csrf_token_view(request):
    """Get CSRF token"""
    csrf_token = get_token(request)
    return Response({'csrfToken': csrf_token})
