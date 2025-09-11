from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import redirect
from django.http import FileResponse, HttpResponse
from django.conf import settings
import os
from datetime import datetime, timedelta, date
from io import BytesIO
from docx import Document
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from .models import OvertimeRequest, MonthlySummaryRequest
from .serializers import (
    OvertimeRequestSerializer, OvertimeRequestAdminSerializer,
    OvertimeRequestSupervisorSerializer, OvertimeRequestEmployeeSerializer,
    OvertimeRequestCreateUpdateSerializer, OvertimeRequestApprovalSerializer,
    OvertimeRequestListSerializer,
    MonthlySummaryRequestSerializer, MonthlySummaryRequestAdminSerializer,
    MonthlySummaryRequestSupervisorSerializer, MonthlySummaryRequestEmployeeSerializer,
    MonthlySummaryRequestCreateUpdateSerializer, MonthlySummaryRequestApprovalSerializer,
    MonthlySummaryRequestListSerializer
)
from apps.core.permissions import IsAdmin, IsSupervisor, IsEmployee


# Overtime Request Views
class OvertimeRequestViewSet(viewsets.ModelViewSet):
    """Overtime request management ViewSet with role-based access"""
    serializer_class = OvertimeRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return OvertimeRequestAdminSerializer
        elif self.request.user.groups.filter(name='supervisor').exists():
            return OvertimeRequestSupervisorSerializer
        else:
            return OvertimeRequestEmployeeSerializer
    
    def get_queryset(self):
        """Filter overtime requests based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return OvertimeRequest.objects.all()
        elif self.request.user.groups.filter(name='supervisor').exists():
            # Supervisors can see overtime requests of employees in their division
            if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.division:
                return OvertimeRequest.objects.filter(
                    employee__division=self.request.user.employee_profile.division
                )
            return OvertimeRequest.objects.none()
        else:
            # Regular employees can only see their own overtime requests
            return OvertimeRequest.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Set user when creating overtime request"""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve, reject, or cancel an overtime request"""
        if not (request.user.is_superuser or 
                request.user.groups.filter(name__in=['admin', 'supervisor']).exists()):
            return Response(
                {"error": "Only admins and supervisors can approve overtime requests"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        overtime_request = self.get_object()
        serializer = OvertimeRequestApprovalSerializer(data=request.data)
        
        if serializer.is_valid():
            action = serializer.validated_data['action']
            reason = serializer.validated_data.get('reason', '')
            
            if action == 'approve':
                overtime_request.approve(request.user)
                return Response(
                    {"message": "Overtime request approved successfully"}, 
                    status=status.HTTP_200_OK
                )
            elif action == 'reject':
                overtime_request.reject(request.user, reason)
                return Response(
                    {"message": "Overtime request rejected successfully"}, 
                    status=status.HTTP_200_OK
                )
            elif action == 'cancel':
                overtime_request.cancel(request.user)
                return Response(
                    {"message": "Overtime request cancelled successfully"}, 
                    status=status.HTTP_200_OK
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending overtime requests for approval"""
        if not (request.user.is_superuser or 
                request.user.groups.filter(name__in=['admin', 'supervisor']).exists()):
            return Response(
                {"error": "Only admins and supervisors can view pending overtime requests"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.get_queryset().filter(status='pending')
        serializer = OvertimeRequestListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def approvals_summary(self, request):
        """Summary approval counts for dashboard card (admin/supervisor)"""
        if not (request.user.is_superuser or 
                request.user.groups.filter(name__in=['admin', 'supervisor']).exists()):
            return Response(
                {"error": "Only admins and supervisors can view approvals summary"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        pending_qs = self.get_queryset().filter(status='pending')
        approved_qs = self.get_queryset().filter(status='approved')
        rejected_qs = self.get_queryset().filter(status='rejected')
        return Response({
            'pending': pending_qs.count(),
            'approved': approved_qs.count(),
            'rejected': rejected_qs.count(),
        })

    @action(detail=False, methods=['get'])
    def export_monthly_pdf(self, request):
        """Export monthly overtime data directly to PDF (v2)"""
        month = request.query_params.get('month')  # YYYY-MM
        employee_id = request.query_params.get('employee_id')
        if not month:
            return Response({"detail": "Parameter month (YYYY-MM) diperlukan"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            year_str, month_str = month.split('-')
            year = int(year_str)
            month_num = int(month_str)
            if month_num < 1 or month_num > 12:
                raise ValueError
        except ValueError:
            return Response({"detail": "Format month harus YYYY-MM (contoh: 2025-01)"}, status=status.HTTP_400_BAD_REQUEST)

        from apps.employees.models import Employee as EmployeeModel
        if employee_id and (request.user.is_superuser or request.user.groups.filter(name='admin').exists()):
            try:
                employee = EmployeeModel.objects.get(id=employee_id)
            except EmployeeModel.DoesNotExist:
                return Response({"detail": "Employee tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)
        else:
            try:
                employee = request.user.employee_profile
            except Exception:
                return Response({"detail": "User tidak memiliki profil employee"}, status=status.HTTP_400_BAD_REQUEST)

        start_date = date(year, month_num, 1)
        if month_num == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month_num + 1, 1) - timedelta(days=1)

        from .models import OvertimeRequest as OR
        overtime_records = OR.objects.filter(
            employee=employee,
            date__gte=start_date,
            date__lte=end_date,
            status='approved'
        ).order_by('date')

        if not overtime_records.exists():
            return Response({"detail": f"Tidak ada data overtime untuk periode {month}"}, status=status.HTTP_404_NOT_FOUND)

        # Build PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
        styles = getSampleStyleSheet()
        elements = []

        title = Paragraph(f"Laporan Lembur Bulanan - {month}", styles['Title'])
        info = Paragraph(f"Nama: {employee.display_name} &nbsp;&nbsp; NIP: {employee.nip} &nbsp;&nbsp; Divisi: {employee.get_division_name()} &nbsp;&nbsp; Jabatan: {employee.get_position_name()}", styles['Normal'])
        elements.extend([title, Spacer(1, 0.4*cm), info, Spacer(1, 0.6*cm)])

        data = [["Tanggal", "Uraian Pekerjaan", "Jam", "Jumlah (Rp)"]]
        total_hours = 0.0
        total_amount = 0.0
        for rec in overtime_records:
            date_str = rec.date.strftime('%d-%m-%Y')
            hours = float(rec.total_hours or 0)
            amount = float(rec.total_amount or 0)
            data.append([date_str, rec.work_description or '-', f"{hours:.2f}", f"{amount:,.2f}"])
            total_hours += hours
            total_amount += amount

        data.append(["", "Total", f"{total_hours:.2f}", f"{total_amount:,.2f}"])

        table = Table(data, colWidths=[3.0*cm, 8.0*cm, 3.0*cm, 3.0*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('ALIGN', (2,1), (3,-1), 'RIGHT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTNAME', (1,-1), (1,-1), 'Helvetica-Bold'),
            ('FONTNAME', (2,-1), (3,-1), 'Helvetica-Bold'),
        ]))
        elements.append(table)

        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Laporan_Lembur_{employee.nip}_{month}.pdf"'
        return response

    @action(detail=False, methods=['get'])
    def export_list_pdf(self, request):
        """Export list of overtime requests to PDF (v2)"""
        month = request.query_params.get('month')  # YYYY-MM optional
        status_filter = request.query_params.get('status')
        employee_id = request.query_params.get('employee_id')

        queryset = self.get_queryset()

        if month:
            try:
                year_str, month_str = month.split('-')
                year = int(year_str)
                month_num = int(month_str)
                start_date = date(year, month_num, 1)
                end_date = date(year + (1 if month_num == 12 else 0), (1 if month_num == 12 else month_num + 1), 1) - timedelta(days=1)
                queryset = queryset.filter(date__range=[start_date, end_date])
            except ValueError:
                return Response({"detail": "Format bulan tidak valid. Gunakan format YYYY-MM"}, status=status.HTTP_400_BAD_REQUEST)

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

        overtime_requests = queryset.order_by('-date', '-requested_at')
        if not overtime_requests.exists():
            return Response({"detail": "Tidak ada data pengajuan lembur yang ditemukan"}, status=status.HTTP_404_NOT_FOUND)

        # Build PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
        styles = getSampleStyleSheet()
        elements = []

        title = Paragraph("Daftar Pengajuan Lembur", styles['Title'])
        subtitle_parts = []
        if month:
            subtitle_parts.append(f"Bulan: {month}")
        if status_filter:
            subtitle_parts.append(f"Status: {status_filter}")
        sub = Paragraph(' &nbsp;&nbsp; '.join(subtitle_parts), styles['Normal']) if subtitle_parts else Spacer(1, 0.01*cm)
        elements.extend([title, Spacer(1, 0.4*cm), sub, Spacer(1, 0.6*cm)])

        data = [["ID", "Tanggal", "Pegawai", "Jenis", "Jam", "Status"]]
        for req in overtime_requests.select_related('employee'):
            employee_name = req.employee.fullname if req.employee and req.employee.fullname else (req.employee.user.get_full_name() if req.employee and req.employee.user else '-')
            data.append([
                str(req.id),
                req.date.strftime('%d-%m-%Y'),
                employee_name or '-',
                req.request_type,
                f"{float(req.total_hours or 0):.2f}",
                req.status,
            ])

        table = Table(data, colWidths=[2.0*cm, 3.0*cm, 6.0*cm, 3.0*cm, 2.5*cm, 2.5*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('ALIGN', (4,1), (4,-1), 'RIGHT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ]))
        elements.append(table)

        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="Daftar_Pengajuan_Lembur.pdf"'
        return response

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def export_pdf(self, request, pk=None):
        """Export individual overtime request to PDF (v2)"""
        # Allow public access similar to legacy for sharing
        try:
            req = OvertimeRequest.objects.get(pk=pk)
        except OvertimeRequest.DoesNotExist:
            return Response({"detail": "Overtime request tidak ditemukan."}, status=status.HTTP_404_NOT_FOUND)

        if req.status != 'approved':
            return Response({"detail": "Overtime request must be approved to export PDF."}, status=status.HTTP_400_BAD_REQUEST)

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
        styles = getSampleStyleSheet()
        elements = []

        title = Paragraph(f"Pengajuan Lembur #{req.id}", styles['Title'])
        elements.append(title)
        elements.append(Spacer(1, 0.5*cm))

        emp_name = req.employee.fullname if req.employee and req.employee.fullname else (req.employee.user.get_full_name() if req.employee and req.employee.user else '-')
        info_lines = [
            f"Nama: {emp_name}",
            f"NIP: {req.employee.nip if req.employee else '-'}",
            f"Tanggal: {req.date.strftime('%d-%m-%Y')}",
            f"Jenis: {req.request_type}",
            f"Jam: {float(req.total_hours or 0):.2f}",
            f"Status: {req.status}",
        ]
        for line in info_lines:
            elements.append(Paragraph(line, styles['Normal']))
        elements.append(Spacer(1, 0.4*cm))

        elements.append(Paragraph("Uraian Pekerjaan:", styles['Heading4']))
        elements.append(Paragraph(req.work_description or '-', styles['Normal']))
        elements.append(Spacer(1, 0.4*cm))

        if req.approved_by:
            elements.append(Paragraph(f"Disetujui oleh: {req.approved_by.get_full_name() or req.approved_by.username}", styles['Normal']))
        if req.approved_at:
            elements.append(Paragraph(f"Tanggal Persetujuan: {req.approved_at.strftime('%d-%m-%Y %H:%M')}", styles['Normal']))
        if req.total_amount is not None:
            elements.append(Paragraph(f"Jumlah (Rp): {float(req.total_amount):,.2f}", styles['Normal']))

        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Lembur_{req.id}.pdf"'
        return response
    
    @action(detail=False, methods=['get'])
    def my_overtime(self, request):
        """Get current user's overtime requests"""
        queryset = OvertimeRequest.objects.filter(user=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_status(self, request):
        """Get overtime requests filtered by status"""
        status_filter = request.query_params.get('status', '')
        if status_filter:
            queryset = self.get_queryset().filter(status=status_filter)
        else:
            queryset = self.get_queryset()
        
        serializer = OvertimeRequestListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get overtime requests filtered by type"""
        request_type = request.query_params.get('type', '')
        if request_type:
            queryset = self.get_queryset().filter(request_type=request_type)
        else:
            queryset = self.get_queryset()
        
        serializer = OvertimeRequestListSerializer(queryset, many=True)
        return Response(serializer.data)


# Monthly Summary Request Views
class MonthlySummaryRequestViewSet(viewsets.ModelViewSet):
    """Monthly summary request management ViewSet with role-based access"""
    serializer_class = MonthlySummaryRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return MonthlySummaryRequestAdminSerializer
        elif self.request.user.groups.filter(name='supervisor').exists():
            return MonthlySummaryRequestSupervisorSerializer
        else:
            return MonthlySummaryRequestEmployeeSerializer
    
    def get_queryset(self):
        """Filter monthly summary requests based on user role"""
        if self.request.user.is_superuser or self.request.user.groups.filter(name='admin').exists():
            return MonthlySummaryRequest.objects.all()
        elif self.request.user.groups.filter(name='supervisor').exists():
            # Supervisors can see monthly summary requests of employees in their division
            if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.division:
                return MonthlySummaryRequest.objects.filter(
                    employee__division=self.request.user.employee_profile.division
                )
            return MonthlySummaryRequest.objects.none()
        else:
            # Regular employees can only see their own monthly summary requests
            return MonthlySummaryRequest.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Set user when creating monthly summary request"""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve or reject a monthly summary request"""
        if not (request.user.is_superuser or 
                request.user.groups.filter(name__in=['admin', 'supervisor']).exists()):
            return Response(
                {"error": "Only admins and supervisors can approve monthly summary requests"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        monthly_summary = self.get_object()
        serializer = MonthlySummaryRequestApprovalSerializer(data=request.data)
        
        if serializer.is_valid():
            action = serializer.validated_data['action']
            reason = serializer.validated_data.get('reason', '')
            
            if action == 'approve':
                monthly_summary.approve(request.user)
                return Response(
                    {"message": "Monthly summary request approved successfully"}, 
                    status=status.HTTP_200_OK
                )
            elif action == 'reject':
                monthly_summary.reject(request.user, reason)
                return Response(
                    {"message": "Monthly summary request rejected successfully"}, 
                    status=status.HTTP_200_OK
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending monthly summary requests for approval"""
        if not (request.user.is_superuser or 
                request.user.groups.filter(name__in=['admin', 'supervisor']).exists()):
            return Response(
                {"error": "Only admins and supervisors can view pending monthly summary requests"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.get_queryset().filter(status='pending')
        serializer = MonthlySummaryRequestListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def export_monthly_docx(self, request):
        """Export monthly overtime data to DOCX using template with dynamic table (v2)"""
        month = request.query_params.get('month')  # YYYY-MM
        employee_id = request.query_params.get('employee_id')
        if not month:
            return Response({"detail": "Parameter month (YYYY-MM) diperlukan"}, status=status.HTTP_400_BAD_REQUEST)

        # Parse month
        try:
            year_str, month_str = month.split('-')
            year = int(year_str)
            month_num = int(month_str)
            if month_num < 1 or month_num > 12:
                raise ValueError
        except ValueError:
            return Response({"detail": "Format month harus YYYY-MM (contoh: 2025-01)"}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve employee
        from apps.employees.models import Employee as EmployeeModel
        if employee_id and (request.user.is_superuser or request.user.groups.filter(name='admin').exists()):
            try:
                employee = EmployeeModel.objects.get(id=employee_id)
            except EmployeeModel.DoesNotExist:
                return Response({"detail": "Employee tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)
        else:
            try:
                employee = request.user.employee_profile
            except Exception:
                return Response({"detail": "User tidak memiliki profil employee"}, status=status.HTTP_400_BAD_REQUEST)

        # Date range
        start_date = date(year, month_num, 1)
        if month_num == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month_num + 1, 1) - timedelta(days=1)

        # Query overtime requests
        from .models import OvertimeRequest as OR
        overtime_records = OR.objects.filter(
            employee=employee,
            date__gte=start_date,
            date__lte=end_date,
            status='approved'
        ).order_by('date')

        if not overtime_records.exists():
            return Response({"detail": f"Tidak ada data overtime untuk periode {month}"}, status=status.HTTP_404_NOT_FOUND)

        # Resolve template path with MEDIA override support
        template_path = self._get_monthly_export_template_path()
        if not template_path:
            return Response({"detail": "Template DOCX tidak ditemukan"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Build DOCX from template
        doc = Document(template_path)

        # Basic replacements
        employee_name = employee.display_name
        employee_nip = employee.nip
        employee_position = employee.get_position_name()
        employee_division = employee.get_division_name()
        period_label = f"{month}"

        def replace_text_in_paragraphs(paragraphs, old_text, new_text):
            for paragraph in paragraphs:
                if old_text in paragraph.text:
                    paragraph.text = paragraph.text.replace(old_text, new_text)

        def replace_text_in_tables(tables, old_text, new_text):
            for table in tables:
                for row in table.rows:
                    for cell in row.cells:
                        if old_text in cell.text:
                            cell.text = cell.text.replace(old_text, new_text)

        replacements = {
            '{{NAMA_PEGAWAI}}': employee_name,
            '{{NIP}}': employee_nip,
            '{{JABATAN_PEGAWAI}}': employee_position,
            '{{DIVISI_PEGAWAI}}': employee_division,
            '{{PERIODE}}': period_label,
        }
        for placeholder, value in replacements.items():
            replace_text_in_paragraphs(doc.paragraphs, placeholder, value)
            replace_text_in_tables(doc.tables, placeholder, value)

        # Insert overtime table: expect a placeholder table or append to first table
        # Collect data
        rows = []
        total_hours = 0.0
        total_amount = 0.0
        for rec in overtime_records:
            date_str = rec.date.strftime('%d-%m-%Y')
            hours = float(rec.total_hours or 0)
            amount = float(rec.total_amount or 0)
            rows.append([date_str, rec.work_description or '-', f"{hours:.2f}", f"{amount:,.2f}"])
            total_hours += hours
            total_amount += amount

        # Try to find a table with a placeholder header
        target_table = None
        for table in doc.tables:
            header_text = ' '.join([cell.text for cell in table.rows[0].cells]) if table.rows else ''
            if 'TANGGAL' in header_text.upper() and 'JAM' in header_text.upper():
                target_table = table
                break

        if target_table is None:
            # Create a new table at the end
            target_table = doc.add_table(rows=1, cols=4)
            hdr_cells = target_table.rows[0].cells
            hdr_cells[0].text = 'Tanggal'
            hdr_cells[1].text = 'Uraian Pekerjaan'
            hdr_cells[2].text = 'Jam'
            hdr_cells[3].text = 'Jumlah (Rp)'

        # Append data rows
        for r in rows:
            row_cells = target_table.add_row().cells
            row_cells[0].text = r[0]
            row_cells[1].text = r[1]
            row_cells[2].text = r[2]
            row_cells[3].text = r[3]

        # Summary replacements
        summary_replacements = {
            '{{TOTAL_JAM_LEMBUR}}': f"{total_hours:.2f}",
            '{{TOTAL_NILAI_LEMBUR}}': f"{total_amount:,.2f}",
        }
        for placeholder, value in summary_replacements.items():
            replace_text_in_paragraphs(doc.paragraphs, placeholder, value)
            replace_text_in_tables(doc.tables, placeholder, value)

        # Save to temp file
        from tempfile import NamedTemporaryFile
        tmp = NamedTemporaryFile(delete=False, suffix='.docx')
        doc.save(tmp.name)
        tmp.flush()
        tmp_path = tmp.name
        tmp.close()

        filename = f"Laporan_Overtime_{employee.nip}_{month}.docx"
        resp = FileResponse(open(tmp_path, 'rb'), content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        resp['Content-Disposition'] = f'attachment; filename="{filename}"'
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
        return resp

    def _get_monthly_export_template_path(self):
        try:
            media_dir = getattr(settings, 'MEDIA_ROOT', None)
            if media_dir:
                override_dir = os.path.join(media_dir, 'overtime_summary_templates')
                override_file = os.path.join(override_dir, 'template_monthly_overtime_export.docx')
                if os.path.exists(override_file):
                    return override_file
        except Exception:
            pass
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        fallback_template = os.path.join(project_root, 'template', 'template_rekap_lembur.docx')
        if os.path.exists(fallback_template):
            return fallback_template
        return None

    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    def upload_monthly_export_template(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"detail": "File 'file' diperlukan"}, status=status.HTTP_400_BAD_REQUEST)
        if not file_obj.name.lower().endswith('.docx'):
            return Response({"detail": "Hanya file .docx yang diperbolehkan"}, status=status.HTTP_400_BAD_REQUEST)
        media_dir = getattr(settings, 'MEDIA_ROOT', None)
        if not media_dir:
            return Response({"detail": "MEDIA_ROOT tidak terkonfigurasi"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        target_dir = os.path.join(media_dir, 'overtime_summary_templates')
        os.makedirs(target_dir, exist_ok=True)
        target_path = os.path.join(target_dir, 'template_monthly_overtime_export.docx')
        with open(target_path, 'wb') as dest:
            for chunk in file_obj.chunks():
                dest.write(chunk)
        return Response({"detail": "Template terunggah", "path": target_path})

    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    def reload_monthly_export_template(self, request):
        path = self._get_monthly_export_template_path()
        if not path:
            return Response({"detail": "Template tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"detail": "Template siap", "path": path})
    
    @action(detail=False, methods=['get'])
    def my_summaries(self, request):
        """Get current user's monthly summary requests"""
        queryset = MonthlySummaryRequest.objects.filter(user=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_month_year(self, request):
        """Get monthly summary requests filtered by month and year"""
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        
        queryset = self.get_queryset()
        if month:
            queryset = queryset.filter(month=month)
        if year:
            queryset = queryset.filter(year=year)
        
        serializer = MonthlySummaryRequestListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def export_docx(self, request, pk=None):
        """Export a specific monthly summary request to DOCX (v2)."""
        try:
            summary = self.get_object()
        except Exception:
            return Response({"detail": "summary_not_found"}, status=status.HTTP_404_NOT_FOUND)
        # Use same generator as monthly export but bound to summary month/year
        month = f"{summary.year:04d}-{summary.month:02d}"
        request._request.GET = request._request.GET.copy()
        request._request.GET['month'] = month
        request._request.GET['employee_id'] = str(summary.employee_id) if summary.employee_id else ''
        return self.export_monthly_docx(request)

    @action(detail=True, methods=['get'])
    def export_pdf(self, request, pk=None):
        """Export a specific monthly summary request to PDF (v2)."""
        try:
            summary = self.get_object()
        except Exception:
            return Response({"detail": "summary_not_found"}, status=status.HTTP_404_NOT_FOUND)
        month = f"{summary.year:04d}-{summary.month:02d}"
        request._request.GET = request._request.GET.copy()
        request._request.GET['month'] = month
        request._request.GET['employee_id'] = str(summary.employee_id) if summary.employee_id else ''
        # Delegate to OvertimeRequestViewSet monthly pdf method for consistency
        # Recompute directly here using same logic as export_monthly_pdf
        try:
            year = summary.year
            month_num = summary.month
            from apps.employees.models import Employee as EmployeeModel
            employee = summary.employee or (request.user.employee_profile if hasattr(request.user, 'employee_profile') else None)
            if not employee:
                return Response({"detail": "employee_not_found"}, status=status.HTTP_404_NOT_FOUND)
            start_date = date(year, month_num, 1)
            end_date = date(year + 1, 1, 1) - timedelta(days=1) if month_num == 12 else date(year, month_num + 1, 1) - timedelta(days=1)
            from .models import OvertimeRequest as OR
            overtime_records = OR.objects.filter(
                employee=employee,
                date__gte=start_date,
                date__lte=end_date,
                status='approved'
            ).order_by('date')
            if not overtime_records.exists():
                return Response({"detail": f"Tidak ada data overtime untuk periode {month}"}, status=status.HTTP_404_NOT_FOUND)
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
            styles = getSampleStyleSheet()
            elements = []
            title = Paragraph(f"Laporan Lembur Bulanan - {month}", styles['Title'])
            info = Paragraph(f"Nama: {employee.display_name} &nbsp;&nbsp; NIP: {employee.nip} &nbsp;&nbsp; Divisi: {employee.get_division_name()} &nbsp;&nbsp; Jabatan: {employee.get_position_name()}", styles['Normal'])
            elements.extend([title, Spacer(1, 0.4*cm), info, Spacer(1, 0.6*cm)])
            data = [["Tanggal", "Uraian Pekerjaan", "Jam", "Jumlah (Rp)"]]
            total_hours = 0.0
            total_amount = 0.0
            for rec in overtime_records:
                date_str = rec.date.strftime('%d-%m-%Y')
                hours = float(rec.total_hours or 0)
                amount = float(rec.total_amount or 0)
                data.append([date_str, rec.work_description or '-', f"{hours:.2f}", f"{amount:,.2f}"])
                total_hours += hours
                total_amount += amount
            data.append(["", "Total", f"{total_hours:.2f}", f"{total_amount:,.2f}"])
            table = Table(data, colWidths=[3.0*cm, 8.0*cm, 3.0*cm, 3.0*cm])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
                ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
                ('ALIGN', (2,1), (3,-1), 'RIGHT'),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTNAME', (1,-1), (1,-1), 'Helvetica-Bold'),
                ('FONTNAME', (2,-1), (3,-1), 'Helvetica-Bold'),
            ]))
            elements.append(table)
            doc.build(elements)
            pdf_bytes = buffer.getvalue()
            buffer.close()
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Laporan_Lembur_{employee.nip}_{month}.pdf"'
            return response
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Role-specific ViewSets for backward compatibility
class AdminOvertimeRequestViewSet(OvertimeRequestViewSet):
    """Admin-specific overtime request ViewSet"""
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        return OvertimeRequest.objects.all()


class SupervisorOvertimeRequestViewSet(OvertimeRequestViewSet):
    """Supervisor-specific overtime request ViewSet"""
    permission_classes = [IsSupervisor]
    
    def get_queryset(self):
        # Supervisors can see overtime requests of employees in their division
        if hasattr(self.request.user, 'employee_profile') and self.request.user.employee_profile.division:
            return OvertimeRequest.objects.filter(
                employee__division=self.request.user.employee_profile.division
            )
        return OvertimeRequest.objects.none()


class EmployeeOvertimeRequestViewSet(OvertimeRequestViewSet):
    """Employee-specific overtime request ViewSet"""
    permission_classes = [IsEmployee]
    
    def get_queryset(self):
        # Employees can only see their own overtime requests
        return OvertimeRequest.objects.filter(user=self.request.user)
