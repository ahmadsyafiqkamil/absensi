# Export PDF Daftar Pengajuan Lembur

## Overview
Fitur ini memungkinkan export daftar pengajuan lembur langsung ke PDF tanpa konversi DOCX. PDF dihasilkan menggunakan ReportLab dengan tampilan yang sesuai dengan template DOCX yang sudah ada.

## Endpoint API

### GET /api/overtime-requests/export-list-pdf

**Parameters:**
- `month` (optional): Filter berdasarkan bulan dalam format YYYY-MM (contoh: 2025-08)
- `status` (optional): Filter berdasarkan status pengajuan (pending, approved, rejected)
- `employee_id` (optional): Filter berdasarkan ID employee

**Response:**
- Content-Type: `application/pdf`
- File PDF dengan nama: `daftar-pengajuan-lembur-YYYY-MM.pdf`

**Contoh Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/overtime-requests/export-list-pdf?month=2025-08" \
  --output daftar-pengajuan-lembur.pdf
```

## Frontend Integration

### OvertimeRequestsManager.tsx
- Tombol "📑 Export PDF" muncul ketika ada filter bulan aktif
- Menggunakan fungsi `handleExportListPdf()` untuk memanggil API
- Mendukung loading state dan error handling
- File otomatis didownload dengan nama yang sesuai

### Fitur PDF
1. **Header**: Logo KJRI Dubai dan judul dokumen
2. **Informasi Periode**: Bulan dan tahun yang diexport
3. **Tabel Data**: 
   - Nomor urut
   - Tanggal pengajuan
   - Nama pegawai
   - Jam lembur
   - Status
   - Jumlah lembur
4. **Summary**: Total jam lembur dan total jumlah
5. **Footer**: Tanggal generate dan informasi sistem

## Technical Details

### Backend (Django)
- Fungsi: `export_list_pdf()` di `OvertimeRequestViewSet`
- PDF Generator: `generate_overtime_list_pdf()` menggunakan ReportLab
- Permission: `IsOvertimeRequestOwnerOrSupervisor`
- Filter: Mendukung filter berdasarkan bulan, status, dan employee

### Frontend (React)
- Komponen: `OvertimeRequestsManager.tsx`
- State: `downloadingId` untuk loading state
- Error Handling: Menampilkan pesan error jika export gagal
- Success Message: Konfirmasi berhasil export

## Usage

1. Buka halaman "Pengajuan Lembur" di frontend
2. Pilih filter bulan yang diinginkan
3. Klik tombol "📑 Export PDF" yang muncul
4. File PDF akan otomatis didownload

## File Output
- Nama file: `daftar-pengajuan-lembur-YYYY-MM.pdf`
- Format: PDF (ReportLab)
- Ukuran: ~90KB untuk data normal
- Kompatibilitas: Semua PDF viewer modern
