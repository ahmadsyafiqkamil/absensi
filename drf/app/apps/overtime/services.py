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

            summary = {
                'total_requests': overtime_requests.count(),
                'pending_requests': overtime_requests.filter(status='pending').count(),
                'approved_requests': overtime_requests.filter(status='approved').count(),
                'rejected_requests': overtime_requests.filter(status='rejected').count(),
                'total_hours': overtime_requests.aggregate(Sum('total_hours'))['total_hours__sum'] or 0,
                'total_amount': overtime_requests.aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
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
