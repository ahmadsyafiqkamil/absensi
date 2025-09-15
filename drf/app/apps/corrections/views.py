from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import AttendanceCorrection
from .serializers import (
    AttendanceCorrectionSerializer, AttendanceCorrectionAdminSerializer,
    AttendanceCorrectionSupervisorSerializer, AttendanceCorrectionEmployeeSerializer,
    AttendanceCorrectionCreateUpdateSerializer, AttendanceCorrectionApprovalSerializer,
    AttendanceCorrectionListSerializer
)
from apps.core.permissions import IsAdmin, IsSupervisor, IsEmployee


class AttendanceCorrectionViewSet(viewsets.ModelViewSet):
    """Attendance correction management ViewSet with role-based access"""
    serializer_class = AttendanceCorrectionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on user role and action"""
        if self.action in ['create', 'update', 'partial_update']:
            return AttendanceCorrectionCreateUpdateSerializer
        elif self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return AttendanceCorrectionAdminSerializer
        elif self.request.user.groups.filter(name='supervisor').exists():
            return AttendanceCorrectionSupervisorSerializer
        else:
            return AttendanceCorrectionEmployeeSerializer
    
    def get_queryset(self):
        """Filter corrections based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return AttendanceCorrection.objects.all()
        elif self.request.user.groups.filter(name='supervisor').exists():
            # Supervisors can see corrections of employees in their division
            if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.division:
                return AttendanceCorrection.objects.filter(
                    employee__division=self.request.user.employee_profile.division
                )
            return AttendanceCorrection.objects.none()
        else:
            # Regular employees can only see their own corrections
            return AttendanceCorrection.objects.filter(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Create a new attendance correction with debug logging"""
        # Debug logging
        print(f"=== CORRECTIONS CREATE DEBUG ===")
        print(f"Received data: {request.data}")
        print(f"Data keys: {list(request.data.keys())}")
        print(f"Data values: {dict(request.data)}")
        
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            print(f"Serializer is valid, creating...")
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        
        print(f"Serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        """Set user when creating correction"""
        # For manual corrections, we need to handle the case where attendance is not provided
        data = serializer.validated_data
        
        # If attendance is not provided, this is a manual correction
        if not data.get('attendance'):
            # For manual corrections, we don't need to create an attendance record
            # The date_local field will be used instead
            serializer.save(user=self.request.user)
        else:
            serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve or reject a correction request"""
        if not (request.user.is_superuser or 
                request.user.groups.filter(name__in=['admin', 'supervisor']).exists()):
            return Response(
                {"error": "Only admins and supervisors can approve corrections"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        correction = self.get_object()
        serializer = AttendanceCorrectionApprovalSerializer(data=request.data)
        
        if serializer.is_valid():
            action = serializer.validated_data['action']
            reason = serializer.validated_data.get('reason', '')
            
            if action == 'approve':
                correction.approve(request.user)
                return Response(
                    {"message": "Correction approved successfully"}, 
                    status=status.HTTP_200_OK
                )
            elif action == 'reject':
                correction.reject(request.user, reason)
                return Response(
                    {"message": "Correction rejected successfully"}, 
                    status=status.HTTP_200_OK
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending corrections for approval"""
        if not (request.user.is_superuser or 
                request.user.groups.filter(name__in=['admin', 'supervisor']).exists()):
            return Response(
                {"error": "Only admins and supervisors can view pending corrections"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.get_queryset().filter(status='pending')
        serializer = AttendanceCorrectionListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_corrections(self, request):
        """Get current user's correction requests"""
        queryset = AttendanceCorrection.objects.filter(user=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_status(self, request):
        """Get corrections filtered by status"""
        status_filter = request.query_params.get('status', '')
        if status_filter:
            queryset = self.get_queryset().filter(status=status_filter)
        else:
            queryset = self.get_queryset()
        
        serializer = AttendanceCorrectionListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def correction_records(self, request):
        """Get attendance records that need corrections (matching legacy API structure)"""
        from apps.attendance.models import Attendance
        from apps.settings.models import WorkSettings
        from django.db.models import Q
        from datetime import datetime, timedelta
        from django.utils import timezone as dj_timezone
        import datetime
        
        try:
            # Get user and employee
            user = request.user
            try:
                from apps.employees.models import Employee
                employee = Employee.objects.get(user=user)
            except Employee.DoesNotExist:
                return Response(
                    {'detail': 'Employee not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get query parameters
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            month = request.query_params.get('month')
            status_filter = request.query_params.get('status', 'all')

            # Build date filter
            date_filter = Q()
            # Keep explicit date bounds for use with manual corrections
            start_bound = None
            end_bound = None
            if month:
                # Parse month (YYYY-MM format)
                try:
                    year, month_num = month.split('-')
                    start_of_month = datetime.date(int(year), int(month_num), 1)
                    if int(month_num) == 12:
                        end_of_month = datetime.date(int(year) + 1, 1, 1) - timedelta(days=1)
                    else:
                        end_of_month = datetime.date(int(year), int(month_num) + 1, 1) - timedelta(days=1)
                    
                    date_filter = Q(date_local__gte=start_of_month) & Q(date_local__lte=end_of_month)
                    start_bound = start_of_month
                    end_bound = end_of_month
                except (ValueError, TypeError):
                    return Response(
                        {'detail': 'Invalid month format. Use YYYY-MM'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            elif start_date and end_date:
                try:
                    start = datetime.strptime(start_date, '%Y-%m-%d').date()
                    end = datetime.strptime(end_date, '%Y-%m-%d').date()
                    date_filter = Q(date_local__gte=start) & Q(date_local__lte=end)
                    start_bound = start
                    end_bound = end
                except ValueError:
                    return Response(
                        {'detail': 'Invalid date format. Use YYYY-MM-DD'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                # Default to current month if no date filter
                today = dj_timezone.now().date()
                start_of_month = today.replace(day=1)
                if today.month == 12:
                    end_of_month = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
                else:
                    end_of_month = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
                date_filter = Q(date_local__gte=start_of_month) & Q(date_local__lte=end_of_month)
                start_bound = start_of_month
                end_bound = end_of_month

            # Get attendance records for the user
            attendance_records = Attendance.objects.filter(
                user=user
            ).filter(date_filter).order_by('-date_local')

            # Process records to identify correction needs
            correction_records = []
            total_records = 0
            wfa_records = 0
            missing_attendance = 0
            pending_corrections = 0

            for record in attendance_records:
                total_records += 1
                
                # Check if record needs correction
                needs_correction = False
                correction_reasons = []
                
                # Check for missing attendance
                if not record.check_in_at_utc and not record.check_out_at_utc:
                    needs_correction = True
                    correction_reasons.append('missing_both')
                    missing_attendance += 1
                elif not record.check_in_at_utc:
                    needs_correction = True
                    correction_reasons.append('missing_check_in')
                    missing_attendance += 1
                elif not record.check_out_at_utc:
                    needs_correction = True
                    correction_reasons.append('missing_check_out')
                    missing_attendance += 1
                
                # Check for WFA
                if record.check_in_at_utc and not record.within_geofence:
                    needs_correction = True
                    correction_reasons.append('wfa')
                    wfa_records += 1
                
                # Check for system notes indicating issues
                if record.note and ('luar area kantor' in record.note.lower() or 'outside office' in record.note.lower()):
                    needs_correction = True
                    correction_reasons.append('system_note')
                
                # Check if correction request exists
                try:
                    correction = AttendanceCorrection.objects.filter(
                        user=user,
                        attendance=record
                    ).first()
                    if correction:
                        correction_status = correction.status
                        if correction.status == 'pending':
                            pending_corrections += 1
                    else:
                        correction_status = None
                except Exception:
                    correction_status = None
                
                # Add to correction records if needs correction or has correction request
                if needs_correction or correction_status:
                    correction_records.append({
                        'id': record.id,
                        'date_local': record.date_local,
                        'check_in_at_utc': record.check_in_at_utc.isoformat() if record.check_in_at_utc else None,
                        'check_out_at_utc': record.check_out_at_utc.isoformat() if record.check_out_at_utc else None,
                        'check_in_lat': record.check_in_lat,
                        'check_in_lng': record.check_in_lng,
                        'check_out_lat': record.check_out_lat,
                        'check_out_lng': record.check_out_lng,
                        'check_in_ip': record.check_in_ip,
                        'check_out_ip': record.check_out_ip,
                        'minutes_late': record.minutes_late,
                        'total_work_minutes': record.total_work_minutes,
                        'is_holiday': record.is_holiday,
                        'within_geofence': record.within_geofence,
                        'note': record.note,
                        'employee_note': record.employee_note,
                        'created_at': record.created_at.isoformat(),
                        'updated_at': record.updated_at.isoformat(),
                        'correction_status': correction_status,
                        'correction_reasons': correction_reasons,
                        # Add proposed correction times if correction request exists
                        'proposed_check_in_local': correction.requested_check_in.isoformat() if correction and correction.requested_check_in else None,
                        'proposed_check_out_local': correction.requested_check_out.isoformat() if correction and correction.requested_check_out else None,
                        'correction_type': correction.correction_type if correction else None,
                        'correction_reason': correction.reason if correction else None
                    })

            # Also include manual correction requests (no linked attendance)
            try:
                from .models import AttendanceCorrection as AC
                manual_qs = AC.objects.filter(user=user, attendance__isnull=True)
                if start_bound and end_bound:
                    manual_qs = manual_qs.filter(date_local__gte=start_bound, date_local__lte=end_bound)
                for corr in manual_qs:
                    # Build a minimal, synthetic record compatible with frontend expectations
                    correction_records.append({
                        'id': -corr.id,  # negative id to avoid clashing with attendance ids
                        'date_local': corr.date_local.isoformat() if corr.date_local else None,
                        'check_in_at_utc': None,
                        'check_out_at_utc': None,
                        'check_in_lat': None,
                        'check_in_lng': None,
                        'check_out_lat': None,
                        'check_out_lng': None,
                        'check_in_ip': None,
                        'check_out_ip': None,
                        'minutes_late': 0,
                        'total_work_minutes': 0,
                        'is_holiday': False,
                        'within_geofence': True,
                        'note': None,
                        'employee_note': None,
                        'created_at': corr.created_at.isoformat(),
                        'updated_at': corr.updated_at.isoformat(),
                        'correction_status': corr.status,
                        'correction_reasons': ['manual_request'],
                        'proposed_check_in_local': corr.requested_check_in.isoformat() if corr.requested_check_in else None,
                        'proposed_check_out_local': corr.requested_check_out.isoformat() if corr.requested_check_out else None,
                        'correction_type': corr.correction_type,
                        'correction_reason': corr.reason,
                    })
            except Exception:
                # Fail-safe: do not break if manual correction aggregation fails
                pass

            # Apply status filter if specified
            if status_filter != 'all':
                if status_filter == 'not_submitted':
                    correction_records = [r for r in correction_records if not r['correction_status']]
                elif status_filter == 'pending':
                    correction_records = [r for r in correction_records if r['correction_status'] == 'pending']
                elif status_filter == 'approved':
                    correction_records = [r for r in correction_records if r['correction_status'] == 'approved']
                elif status_filter == 'rejected':
                    correction_records = [r for r in correction_records if r['correction_status'] == 'rejected']

            # Prepare response
            response_data = {
                'correction_records': correction_records,
                'summary': {
                    'total_records': total_records,
                    'wfa_records': wfa_records,
                    'missing_attendance': missing_attendance,
                    'pending_corrections': pending_corrections
                }
            }

            return Response(response_data)

        except Exception as e:
            print(f"Error in correction_records: {str(e)}")
            return Response(
                {'detail': 'Internal server error'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# Role-specific ViewSets for backward compatibility
class AdminAttendanceCorrectionViewSet(AttendanceCorrectionViewSet):
    """Admin-specific attendance correction ViewSet"""
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        return AttendanceCorrection.objects.all()


class SupervisorAttendanceCorrectionViewSet(AttendanceCorrectionViewSet):
    """Supervisor-specific attendance correction ViewSet"""
    permission_classes = [IsSupervisor]
    
    def get_queryset(self):
        # Supervisors can see corrections of employees in their division
        if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.division:
            return AttendanceCorrection.objects.filter(
                employee__division=self.request.user.employee_profile.division
            )
        return AttendanceCorrection.objects.none()


class EmployeeAttendanceCorrectionViewSet(AttendanceCorrectionViewSet):
    """Employee-specific attendance correction ViewSet"""
    permission_classes = [IsEmployee]
    
    def get_queryset(self):
        # Employees can only see their own corrections
        return AttendanceCorrection.objects.filter(user=self.request.user)
