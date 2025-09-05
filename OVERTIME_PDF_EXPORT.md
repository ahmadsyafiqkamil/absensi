# Overtime PDF Export - Direct PDF Generation

## Overview
Fitur ini memungkinkan export daftar pengajuan lembur langsung ke PDF tanpa perlu konversi dari DOCX. PDF yang dihasilkan memiliki tampilan yang meniru template DOCX yang sudah ada.

## Endpoint Baru

### Export Monthly Overtime to PDF
```
GET /api/overtime-requests/export-monthly-pdf
```

**Parameters:**
- `month` (required): Format YYYY-MM (contoh: 2025-01)
- `employee_id` (optional): ID employee (hanya untuk admin)

**Response:**
- File PDF dengan nama: `Laporan_Overtime_{NIP}_{month}.pdf`

## Fitur PDF

### 1. Header dan Informasi Pegawai
- Judul: "DAFTAR PENGAJUAN LEMBUR"
- Informasi pegawai (Nama, NIP, Jabatan, Divisi, Periode)
- Format tabel yang rapi dengan alignment yang konsisten

### 2. Ringkasan Statistik
- Total pengajuan
- Total jam lembur
- Total biaya lembur
- Rata-rata per pengajuan
- Background abu-abu untuk membedakan dari konten utama

### 3. Tabel Detail Pengajuan
- Nomor urut
- Tanggal pengajuan
- Jam lembur
- Deskripsi pekerjaan (dipotong jika terlalu panjang)
- Status pengajuan
- Jumlah biaya (format Rupiah)

### 4. Styling
- Header tabel: Background biru gelap, teks putih
- Data rows: Alternating white dan light grey
- Font: Helvetica dengan berbagai ukuran
- Alignment: Center untuk angka, Left untuk teks, Right untuk uang
- Grid lines untuk memisahkan data

### 5. Footer
- Tanggal pembuatan dokumen

## Perbedaan dengan DOCX Export

| Aspek | DOCX Export | PDF Export (Baru) |
|-------|-------------|-------------------|
| **Kecepatan** | Lambat (generate DOCX + convert) | Cepat (langsung PDF) |
| **Dependencies** | python-docx + docx2pdf | Hanya reportlab |
| **File Size** | Lebih besar | Lebih kecil |
| **Template** | Menggunakan template DOCX | Hardcoded styling |
| **Customization** | Mudah (edit template) | Perlu edit code |
| **Consistency** | Tergantung template | Konsisten |

## Penggunaan

### Frontend Integration
```javascript
// Ganti endpoint dari DOCX ke PDF
const exportUrl = `/api/overtime-requests/export-monthly-pdf?month=${month}`;

// Download PDF
window.open(exportUrl, '_blank');
```

### Backend Integration
```python
# Endpoint sudah tersedia di OvertimeRequestViewSet
@action(detail=False, methods=['get'], permission_classes=[IsOvertimeRequestOwnerOrSupervisor])
def export_monthly_pdf(self, request):
    # Implementation sudah selesai
```

## Permission
- User harus memiliki permission `IsOvertimeRequestOwnerOrSupervisor`
- Employee hanya bisa export data sendiri
- Supervisor bisa export data tim
- Admin bisa export data semua employee

## Error Handling
- Validasi format month (YYYY-MM)
- Cek keberadaan data overtime
- Fallback styling jika ada error
- Response error yang informatif

## Performance
- Generate PDF langsung tanpa file temporary
- Memory efficient dengan BytesIO
- Response headers untuk cache control
- Cleanup otomatis

## Testing
Untuk test endpoint:
```bash
# Test dengan curl
curl -H "Authorization: Bearer {token}" \
     "http://localhost:8000/api/overtime-requests/export-monthly-pdf?month=2025-01" \
     --output laporan_overtime.pdf
```

## Future Enhancements
1. **Template System**: Buat template system untuk PDF seperti DOCX
2. **Custom Styling**: Allow customization melalui parameter
3. **Multiple Formats**: Support export ke format lain (Excel, CSV)
4. **Batch Export**: Export multiple employees sekaligus
5. **Email Integration**: Kirim PDF via email otomatis
