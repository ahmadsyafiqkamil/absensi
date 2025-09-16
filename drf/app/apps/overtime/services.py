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

            # Calculate total amounts including estimated amounts for non-approved requests
            total_hours = 0
            total_amount = 0
            level1_approved_requests = 0
            
            for request in overtime_requests:
                if request.total_hours:
                    total_hours += float(request.total_hours)
                
                # Calculate amount - use stored amount if approved, otherwise calculate estimated
                if request.total_amount and request.status == 'approved':
                    total_amount += float(request.total_amount)
                elif request.employee and request.employee.gaji_pokok and request.total_hours:
                    # Calculate estimated amount for non-approved requests
                    from apps.settings.models import WorkSettings
                    ws = WorkSettings.objects.first()
                    if ws:
                        monthly_hours = 22 * 8
                        base_hourly_wage = float(request.employee.gaji_pokok) / monthly_hours
                        
                        rate_multiplier = 0.50  # Default for workday
                        if request.request_type == 'holiday':
                            rate_multiplier = float(ws.overtime_rate_holiday or 0.75)
                        elif request.request_type == 'weekend':
                            rate_multiplier = float(ws.overtime_rate_holiday or 0.75)  # Assuming weekend uses holiday rate
                        
                        estimated_hourly_rate = base_hourly_wage * rate_multiplier
                        estimated_total_amount = estimated_hourly_rate * float(request.total_hours)
                        total_amount += estimated_total_amount
                
                if request.status == 'level1_approved':
                    level1_approved_requests += 1

            summary = {
                'total_requests': overtime_requests.count(),
                'pending_requests': overtime_requests.filter(status='pending').count(),
                'level1_approved_requests': level1_approved_requests,
                'approved_requests': overtime_requests.filter(status='approved').count(),
                'rejected_requests': overtime_requests.filter(status='rejected').count(),
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
