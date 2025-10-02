# Perubahan Orientasi PDF Report Supervisor Attendance

## Ringkasan Perubahan

Telah dilakukan perubahan pada tombol download PDF report di halaman supervisor/attendance untuk mengubah orientasi PDF dari portrait menjadi landscape.

## File yang Dimodifikasi

### Backend: `drf/app/apps/attendance/views.py`

#### Perubahan 1: Import landscape
```python
# Sebelum
from reportlab.lib.pagesizes import A4

# Sesudah  
from reportlab.lib.pagesizes import A4, landscape
```

#### Perubahan 2: Orientasi PDF
```python
# Sebelum
doc = SimpleDocTemplate(buffer, pagesize=A4)

# Sesudah
doc = SimpleDocTemplate(buffer, pagesize=landscape(A4))
```

#### Perubahan 3: Lebar Kolom Tabel (Optimasi untuk Landscape)
```python
# Sebelum
details_table = Table(table_data, colWidths=[1.5*inch, 1*inch, 1.2*inch, 0.8*inch, 0.6*inch, 0.8*inch, 0.8*inch, 0.8*inch])

# Sesudah
details_table = Table(table_data, colWidths=[2*inch, 1.2*inch, 1.5*inch, 1*inch, 0.8*inch, 1*inch, 1*inch, 1*inch])
```

#### Perubahan 4: Ukuran Font (Optimasi untuk Landscape)
```python
# Sebelum
('FONTSIZE', (0, 0), (-1, 0), 10),  # Header font size
('FONTSIZE', (0, 1), (-1, -1), 8),  # Body font size

# Sesudah
('FONTSIZE', (0, 0), (-1, 0), 12),  # Header font size
('FONTSIZE', (0, 1), (-1, -1), 10), # Body font size
```

## Lokasi Tombol Download PDF

Tombol download PDF berada di halaman:
- **Frontend**: `/supervisor/attendance` 
- **File**: `frontend/src/app/supervisor/attendance/page.tsx`
- **Baris**: 303-324

Tombol ini memanggil API endpoint:
- **API Route**: `/api/supervisor/team-attendance/pdf`
- **File**: `frontend/src/app/api/supervisor/team-attendance/pdf/route.ts`
- **Backend Endpoint**: `/api/v2/attendance/supervisor/attendance/team_attendance_pdf/`

## Manfaat Perubahan

1. **Lebih Banyak Ruang Horizontal**: Orientasi landscape memberikan lebih banyak ruang untuk menampilkan kolom-kolom data
2. **Tabel Lebih Mudah Dibaca**: Dengan lebar kolom yang disesuaikan, data lebih mudah dibaca
3. **Font Lebih Besar**: Ukuran font yang lebih besar membuat PDF lebih mudah dibaca
4. **Layout Lebih Optimal**: Pemanfaatan ruang horizontal yang lebih baik untuk data tabel

## Testing

Untuk menguji perubahan:

1. Login sebagai supervisor
2. Akses halaman `/supervisor/attendance`
3. Klik tombol "Download PDF Report"
4. Periksa bahwa PDF yang dihasilkan memiliki orientasi landscape

## Catatan Teknis

- Perubahan hanya mempengaruhi fungsi `team_attendance_pdf` di `AttendanceViewSet`
- Tidak ada perubahan pada frontend, hanya backend PDF generation
- Menggunakan `reportlab.lib.pagesizes.landscape()` untuk mengubah orientasi A4
- Lebar kolom disesuaikan untuk memanfaatkan ruang horizontal yang lebih luas

