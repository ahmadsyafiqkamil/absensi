from datetime import date
from django.db.models import Sum, Count
from .models import OvertimeRequest

class OvertimeService:
    def get_overtime_summary(self, user, start_date, end_date):
        """Get overtime summary for a user"""
        try:
            overtime_requests = OvertimeRequest.objects.filter(
                user=user,
                date__range=[start_date, end_date]
            )

            # Calculate total amounts using the same logic as the serializer
            total_hours = 0
            total_amount = 0
            total_approved_amount = 0  # Only approved amounts for summary
            level1_approved_requests = 0
            
            for request in overtime_requests:
                if request.total_hours:
                    total_hours += float(request.total_hours)
                
                # Calculate amount using the same logic as serializer
                request_amount = 0
                if request.total_amount is not None:
                    # Use stored amount if available
                    request_amount = float(request.total_amount)
                elif request.employee and request.employee.gaji_pokok and request.total_hours:
                    # Calculate estimated amount using same logic as serializer
                    from apps.settings.models import WorkSettings
                    ws = WorkSettings.objects.first()
                    if ws:
                        monthly_hours = 22 * 8
                        base_hourly_wage = float(request.employee.gaji_pokok) / monthly_hours
                        
                        # Determine rate by request type (same logic as serializer)
                        req_type = getattr(request, 'request_type', 'regular') or 'regular'
                        if req_type == 'holiday':
                            rate_multiplier = float(ws.overtime_rate_holiday or 0.75)
                        else:
                            rate_multiplier = float(ws.overtime_rate_workday or 0.50)
                        
                        estimated_hourly_rate = base_hourly_wage * rate_multiplier
                        request_amount = estimated_hourly_rate * float(request.total_hours)
                
                # Add to total amount (all requests)
                total_amount += request_amount
                
                # Add to approved amount only if approved
                if request.status == 'approved':
                    total_approved_amount += request_amount
                
                if request.status == 'level1_approved':
                    level1_approved_requests += 1

            summary = {
                'total_requests': overtime_requests.count(),
                'pending_requests': overtime_requests.filter(status='pending').count(),
                'level1_approved_requests': level1_approved_requests,
                'approved_requests': overtime_requests.filter(status='approved').count(),
                'rejected_requests': overtime_requests.filter(status='rejected').count(),
                'total_approved_hours': total_hours,  # Frontend expects this field name
                'total_approved_amount': total_approved_amount,  # Frontend expects this field name
                'total_hours': total_hours,
                'total_amount': total_amount,
                'requests': []
            }

            for request in overtime_requests:
                summary['requests'].append({
                    'date': request.date.isoformat(),
                    'total_hours': request.total_hours,
                    'total_amount': request.total_amount,
                    'status': request.status
                })
            
            return {
                'success': True,
                'summary': summary
            }
        except Exception as e:
            return {
                'success': False,
                'message': str(e)
            }
