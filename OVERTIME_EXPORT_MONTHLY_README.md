# FITUR EXPORT MONTHLY OVERTIME KE DOCX

## **DESKRIPSI FITUR**

Fitur ini memungkinkan pegawai untuk mengexport data overtime bulanan ke format DOCX dengan tabel dinamis yang berisi detail pengajuan lembur selama periode tertentu.

## **FITUR UTAMA**

### **1. Export Data Bulanan**
- Export data overtime berdasarkan bulan yang dipilih (format: YYYY-MM)
- Data diambil dari model `OvertimeRequest`
- Filter berdasarkan tanggal pengajuan lembur

### **2. Template System dengan Placeholder**
- Menggunakan template DOCX yang sudah ada atau membuat struktur dasar
- Placeholder system untuk data dinamis
- Support untuk template custom

### **3. Tabel Dinamis**
- Tabel otomatis dengan data overtime
- Styling profesional dengan borders dan alignment
- Summary row dengan total jam dan gaji

### **4. Multi-Level Approval System**
- **Level 1**: Supervisor Divisi
- **Level 2**: Supervisor Organisasi
- **Final**: Export dan download dokumen

### **5. Template Management System**
- **Upload Template**: Admin dapat upload template baru
- **Template Priority**: Sistem mencari template dengan prioritas tertentu
- **Cache Management**: Template caching untuk performance
- **Fallback System**: Fallback ke template regular jika template monthly export tidak ada

## **TEMPLATE SYSTEM**

### **1. Template Priority Order**
```
1. template_monthly_overtime_export.docx (Primary)
2. template_monthly_overtime.docx (Fallback 1)
3. template_monthly_export.docx (Fallback 2)
4. template_overtime_monthly.docx (Fallback 3)
5. Regular overtime template (Final fallback)
```

### **2. Placeholder yang Didukung**
```python
# Header & Metadata
{{PERIODE_EXPORT}}          # Periode export (Januari 2024)
{{TANGGAL_EXPORT}}          # Tanggal export (15 Januari 2024)
{{NOMOR_EXPORT}}            # Nomor export (EXP-202401/2025)

# Employee Information
{{NAMA_PEGAWAI}}            # Nama lengkap pegawai
{{NIP_PEGAWAI}}             # NIP pegawai
{{DIVISI_PEGAWAI}}          # Divisi pegawai
{{JABATAN_PEGAWAI}}         # Jabatan pegawai

# Summary Data
{{TOTAL_HARI_LEMBUR}}       # Total hari lembur (5 hari)
{{TOTAL_JAM_LEMBUR}}        # Total jam lembur (24.5 jam)
{{TOTAL_GAJI_LEMBUR}}       # Total gaji lembur (Rp 1,250,000)
{{RATA_RATA_PER_HARI}}      # Rata-rata jam per hari (4.9 jam)

# Approval Information
{{LEVEL1_APPROVER}}          # Nama supervisor divisi
{{FINAL_APPROVER}}           # Nama supervisor organisasi
{{TANGGAL_APPROVAL}}         # Tanggal approval

# Company Information
{{NAMA_PERUSAHAAN}}          # Nama perusahaan
{{ALAMAT_PERUSAHAAN}}        # Alamat perusahaan
{{LOKASI}}                   # Lokasi
```

## **API ENDPOINTS**

### **1. Export Monthly Overtime**
```http
GET /api/overtime-requests/export-monthly-docx?month=2024-01&employee_id=1
```

**Parameters:**
- `month`: Periode export (YYYY-MM)
- `employee_id`: ID pegawai (optional, admin only)

**Response:** File DOCX

### **2. Upload Monthly Export Template**
```http
POST /api/overtime-requests/upload-monthly-export-template
```

**Body:** Multipart form dengan field `template` (file .docx)

**Response:**
```json
{
    "detail": "Template monthly export berhasil diupload",
    "filename": "template_monthly_overtime_export.docx",
    "size": 24576,
    "path": "/app/template/template_monthly_overtime_export.docx",
    "message": "Template berhasil disimpan dan akan digunakan sebagai template monthly export"
}
```

### **3. Reload Monthly Export Template**
```http
POST /api/overtime-requests/reload-monthly-export-template
```

**Response:**
```json
{
    "detail": "Template monthly export cache berhasil di-clear",
    "current_template": "template_monthly_overtime_export.docx",
    "message": "Template akan digunakan untuk export monthly overtime selanjutnya"
}
```

## **IMPLEMENTASI BACKEND**

### **1. Model OvertimeExportHistory**
```python
class OvertimeExportHistory(models.Model):
    EXPORT_STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('level1_approved', 'Level 1 Approved'),
        ('approved', 'Final Approved'),
        ('rejected', 'Rejected'),
        ('exported', 'Successfully Exported'),
        ('failed', 'Export Failed'),
    ]
    
    # Fields untuk tracking export history
    employee = models.ForeignKey('Employee')
    export_period = models.CharField(max_length=7)  # YYYY-MM
    status = models.CharField(max_length=20, choices=EXPORT_STATUS_CHOICES)
    level1_approved_by = models.ForeignKey(User, null=True, blank=True)
    final_approved_by = models.ForeignKey(User, null=True, blank=True)
    exported_file_path = models.CharField(max_length=500, null=True, blank=True)
    export_metadata = models.JSONField(null=True, blank=True)
```

### **2. Core Methods**
- **`export_monthly_docx`**: Main endpoint handler
- **`generate_monthly_export_docx`**: Generate dokumen DOCX
- **`get_monthly_export_template_path`**: Get template path dengan priority system
- **`upload_monthly_export_template`**: Upload template baru
- **`reload_monthly_export_template`**: Reload template cache

### **3. Template Management**
- **Priority System**: Template monthly export memiliki prioritas tertinggi
- **Fallback Chain**: Fallback ke template regular jika tidak ada
- **Cache Management**: Template caching untuk performance
- **File Validation**: Validasi file type (.docx) dan size (max 10MB)

## **FLOW APPROVAL 2 TINGKAT**

### **1. Request Export**
```
Pegawai → Request Export → Status: pending
```

### **2. Level 1 Approval (Supervisor Divisi)**
```
Supervisor Divisi → Review → Approve → Status: level1_approved
```

### **3. Level 2 Approval (Supervisor Organisasi)**
```
Supervisor Organisasi → Review → Approve → Status: approved
```

### **4. Export & Download**
```
System → Generate DOCX → Status: exported → Download available
```

## **SECURITY & PERMISSIONS**

### **1. Authentication Required**
- Semua endpoint memerlukan user authentication
- Menggunakan permission class `IsOvertimeRequestOwnerOrSupervisor`

### **2. Template Upload**
- Hanya admin yang dapat upload template
- Validasi file type dan size
- Sanitasi filename

### **3. Data Isolation**
- Pegawai hanya bisa export data milik sendiri
- Supervisor bisa export data tim mereka
- Admin bisa export semua data

## **PERFORMANCE OPTIMIZATION**

### **1. Template Caching**
- Cache template path selama 5 menit
- Cache invalidation saat template berubah
- Hash-based change detection

### **2. Database Optimization**
- Select related untuk mengurangi query
- Filtering berdasarkan date range
- Efficient pagination

### **3. File Handling**
- Streaming file response
- Temporary file cleanup
- Chunked file upload

## **ERROR HANDLING**

### **1. Validation Errors**
- Format month validation (YYYY-MM)
- Employee existence check
- Template availability check

### **2. File Generation Errors**
- Template loading errors
- Document generation failures
- File system errors

### **3. Permission Errors**
- Unauthorized access
- Insufficient permissions
- Role-based restrictions

## **TESTING & VERIFICATION**

### **1. Unit Tests**
- Template path resolution
- Placeholder replacement
- Document generation

### **2. Integration Tests**
- API endpoint functionality
- File upload/download
- Approval flow

### **3. Performance Tests**
- Template caching
- Large document generation
- Concurrent requests

## **MONITORING & LOGGING**

### **1. Export History**
- Track semua export request
- Monitor approval times
- Audit trail lengkap

### **2. Template Usage**
- Template popularity metrics
- Cache hit/miss rates
- Template change frequency

### **3. Error Tracking**
- Failed export attempts
- Template loading errors
- Permission violations

## **DEPLOYMENT & MAINTENANCE**

### **1. Template Updates**
- Hot-swappable templates
- Version control untuk templates
- Backup template system

### **2. Configuration**
- Environment-based settings
- Template directory configuration
- Cache timeout settings

### **3. Backup & Recovery**
- Template backup strategy
- Export history backup
- Disaster recovery plan

## **BENEFITS & VALUE**

### **1. Business Value**
- **Compliance**: Memenuhi regulasi internal
- **Audit Trail**: Tracking lengkap export data
- **Data Security**: Approval wajib sebelum export
- **Professional Output**: Dokumen dengan format standar

### **2. Technical Value**
- **Scalability**: Template system yang fleksibel
- **Maintainability**: Easy template updates
- **Performance**: Caching dan optimization
- **Security**: Role-based access control

### **3. User Experience**
- **Consistency**: Format dokumen yang konsisten
- **Efficiency**: Export otomatis dengan approval
- **Flexibility**: Template customization
- **Reliability**: Error handling yang robust

---

**🎯 KESIMPULAN**: Fitur export monthly overtime ke DOCX dengan approval 2 tingkat dan template management system telah berhasil diimplementasikan secara lengkap. Sistem memberikan fleksibilitas tinggi untuk customization template sambil mempertahankan security dan audit trail yang kuat.

Fitur ini terintegrasi dengan baik dengan sistem overtime yang sudah ada dan memberikan value yang signifikan untuk reporting dan dokumentasi.
