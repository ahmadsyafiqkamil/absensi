# 👥 Supervisor Features - Sistem Absensi

Dokumentasi fitur supervisor yang tersedia di sistem absensi untuk monitoring tim dan approval.

## 📋 Overview

Fitur supervisor memberikan akses untuk mengelola tim, memonitor kehadiran, dan menyetujui permintaan perbaikan absensi. User dengan role `supervisor` atau `admin` dapat mengakses fitur ini.

## 🔐 Access Control

### Role-Based Access Control
- **Supervisor**: User dengan role `supervisor` - akses ke fitur tim dan approval
- **Admin**: User dengan role `admin` atau `superuser` - akses ke semua fitur supervisor + admin
- **Pegawai**: User dengan role `pegawai` - tidak dapat mengakses fitur supervisor

### Division-Based Scoping
- Supervisor hanya dapat melihat data tim dalam divisi yang sama
- Data absensi dibatasi berdasarkan `division_id` supervisor
- Approval hanya untuk anggota tim dalam divisi yang sama

## 🏠 Supervisor Dashboard

**Route:** `/supervisor`

Dashboard utama supervisor yang menampilkan:
- Quick access ke semua fitur supervisor
- Statistik tim (akan diimplementasikan)
- Navigation ke berbagai modul

### Features Available
- **Team Management**: View team members and assignments
- **Attendance Monitoring**: Monitor team attendance and approve requests
- **Performance Reports**: Generate and view team performance reports
- **Communication**: Team announcements and messaging
- **Settings**: Configure supervisor preferences

## 📊 Team Attendance Monitoring

**Route:** `/supervisor/attendance`

Fitur utama untuk memonitor kehadiran tim dengan detail lengkap.

### Features
- **Team Overview**: Statistik keseluruhan tim
- **Individual Employee Cards**: Kartu untuk setiap anggota tim
- **Recent Attendance**: Kehadiran 7 hari terakhir
- **Filtering**: Filter berdasarkan tanggal dan employee ID
- **Summary Statistics**: Total days, present days, late days, attendance rate

### Data Displayed
- Nama, NIP, Division, Position
- Summary statistik kehadiran
- Recent attendance records
- Link ke detail lengkap

### Filters Available
- **Start Date**: Filter dari tanggal tertentu
- **End Date**: Filter sampai tanggal tertentu  
- **Employee ID**: Filter berdasarkan ID employee tertentu

## 👤 Employee Attendance Detail

**Route:** `/supervisor/attendance-detail/{employee_id}`

Halaman detail untuk melihat riwayat kehadiran lengkap dari employee tertentu.

### Features
- **Employee Information**: Detail lengkap employee
- **Attendance Summary**: Statistik kehadiran detail
- **Detailed Records**: Semua record kehadiran dengan filter
- **Location Data**: Koordinat GPS check-in/check-out
- **Work Hours**: Total dan rata-rata jam kerja

### Summary Statistics
- Total Days, Present Days, Late Days, Absent Days
- Attendance Rate (percentage)
- Total Late Minutes
- Total Work Minutes
- Average Work Minutes per day

### Filters Available
- **Start Date**: Filter dari tanggal tertentu
- **End Date**: Filter sampai tanggal tertentu
- **Month**: Filter berdasarkan bulan (format: YYYY-MM)

### Data Displayed
- Tanggal dan status kehadiran
- Check-in dan check-out time
- GPS coordinates (jika tersedia)
- Minutes late
- Total work minutes
- Notes dan employee notes
- Created/updated timestamps

## 🔌 API Endpoints

### Team Attendance Overview
- **GET** `/api/supervisor/team-attendance`
- **Description**: Get attendance data for supervisor's team members
- **Authentication**: Required (supervisor/admin only)
- **Query Parameters**:
  - `start_date` (optional): Filter from date (YYYY-MM-DD)
  - `end_date` (optional): Filter to date (YYYY-MM-DD)
  - `employee_id` (optional): Filter by specific employee ID
- **Response**: Team attendance data dengan summary dan recent records

### Employee Attendance Detail
- **GET** `/api/supervisor/attendance-detail/{employee_id}`
- **Description**: Get detailed attendance data for a specific team member
- **Authentication**: Required (supervisor/admin only)
- **Path Parameters**:
  - `employee_id`: ID dari employee yang akan dilihat
- **Query Parameters**:
  - `start_date` (optional): Filter from date (YYYY-MM-DD)
  - `end_date` (optional): Filter to date (YYYY-MM-DD)
  - `month` (optional): Filter by month (YYYY-MM)
- **Response**: Detailed attendance data dengan summary dan semua records

## 🎨 UI Components

### Header Component
- **Header**: Konsisten di semua halaman supervisor
- **User Info**: Menampilkan username dan role
- **Back Navigation**: Tombol kembali ke halaman sebelumnya
- **Responsive Design**: Adaptif untuk berbagai ukuran layar

### Data Display Components
- **Card**: Container untuk data sections
- **Statistics Grid**: Grid untuk menampilkan statistik
- **Employee Cards**: Kartu untuk setiap anggota tim
- **Attendance Records**: List record kehadiran
- **Filter Forms**: Form untuk filtering data

### Interactive Elements
- **Date Pickers**: Input tanggal untuk filtering
- **Month Picker**: Input bulan untuk filtering
- **Employee ID Input**: Input untuk filter employee tertentu
- **View Details Button**: Link ke halaman detail
- **Back Button**: Navigasi kembali

## 🚀 Usage Examples

### Accessing Team Attendance
1. Login sebagai supervisor
2. Navigasi ke supervisor dashboard
3. Klik "View Attendance" di Attendance Monitoring card
4. Lihat overview tim dan statistik kehadiran

### Filtering Attendance Data
1. Di halaman team attendance, gunakan filter yang tersedia
2. Set start date dan end date untuk range tertentu
3. Atau gunakan month picker untuk bulan tertentu
4. Data akan otomatis di-refresh sesuai filter

### Viewing Employee Detail
1. Dari team attendance, klik "View Details" pada employee card
2. Lihat statistik detail dan semua record kehadiran
3. Gunakan filter untuk melihat periode tertentu
4. Navigasi kembali dengan tombol "Back to Team Attendance"

### Understanding Attendance Status
- **Hari Libur**: Warna biru, tidak dihitung sebagai keterlambatan
- **Terlambat**: Warna kuning, menampilkan jumlah menit keterlambatan
- **Hadir Lengkap**: Warna hijau, check-in dan check-out lengkap
- **Hanya Check-in**: Warna abu-abu, hanya check-in tanpa check-out
- **Tidak Hadir**: Warna abu-abu, tidak ada record kehadiran

## 🔒 Security Features

### Authentication
- JWT token validation untuk setiap request
- Cookie-based token storage (httpOnly)
- Automatic token refresh

### Authorization
- Role-based access control (supervisor/admin only)
- Division-based data scoping
- Supervisor hanya dapat melihat tim dalam divisi yang sama

### Data Protection
- Input validation untuk semua filter
- SQL injection protection melalui Django ORM
- Error handling yang aman

## 🧪 Testing

### Manual Testing
1. Login sebagai supervisor
2. Navigasi ke team attendance
3. Test semua filter yang tersedia
4. Test view detail untuk employee tertentu
5. Verify data yang ditampilkan sesuai dengan divisi supervisor

### API Testing
- Test endpoint dengan valid credentials
- Test endpoint dengan invalid credentials
- Test endpoint dengan non-supervisor user
- Test semua query parameters
- Verify response format dan status codes

## 🚧 Future Enhancements

### Planned Features
- **Real-time Updates**: WebSocket untuk live data
- **Export Data**: Export ke Excel/PDF
- **Advanced Analytics**: Charts dan graphs
- **Notification System**: Alert untuk keterlambatan
- **Mobile App**: Progressive Web App features

### Technical Improvements
- **Caching**: Improve performance dengan Redis
- **Pagination**: Handle large datasets
- **Search**: Advanced search dan filtering
- **Offline Support**: Service worker untuk offline access

## 📝 Notes

### Development
- Semua fitur supervisor menggunakan React hooks
- State management dengan useState dan useEffect
- API calls menggunakan fetch API
- Error handling dan loading states
- Responsive design dengan Tailwind CSS

### Production Considerations
- Rate limiting untuk API endpoints
- Logging untuk supervisor actions
- Backup dan recovery procedures
- Monitoring dan alerting
- Performance optimization

### Maintenance
- Regular security audits
- Update dependencies
- Performance monitoring
- User feedback collection
- Data archiving untuk old records

## 🔗 Related Features

### Attendance Corrections
- Supervisor dapat approve/reject permintaan perbaikan
- Hanya untuk anggota tim dalam divisi yang sama
- Terintegrasi dengan sistem kehadiran

### Team Management
- View team members dan assignments
- Monitor performance dan productivity
- Generate reports untuk management

### Communication
- Team announcements dan messaging
- Notifications untuk keterlambatan
- Team coordination tools
