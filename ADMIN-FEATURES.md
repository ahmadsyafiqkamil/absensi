# 🛡️ Admin Features - Sistem Absensi

Dokumentasi fitur admin yang tersedia di sistem absensi.

## 📋 Overview

Fitur admin memberikan akses khusus untuk mengelola sistem, user, dan data master. Hanya user dengan role `admin` atau `superuser` yang dapat mengakses fitur ini.

## 🔐 Access Control

### Role-Based Access Control
- **Admin**: User dengan role `admin` atau `superuser` - akses ke semua fitur admin
- **Supervisor**: User dengan role `supervisor` - akses ke fitur supervisor
- **Pegawai**: User dengan role `pegawai` - akses ke fitur employee

### Automatic Role-Based Routing
Setelah login, user akan otomatis diarahkan ke halaman yang sesuai dengan rolenya:
- **Admin** → `/admin` (Admin Dashboard)
- **Supervisor** → `/supervisor` (Supervisor Dashboard)  
- **Pegawai** → `/dashboard` (Employee Dashboard)

### Protected Routes
- `/admin/*` - Admin Dashboard dan fitur admin
- `/supervisor/*` - Supervisor Dashboard dan fitur supervisor
- `/dashboard/*` - Employee Dashboard dan fitur pegawai
- Middleware akan memverifikasi role sebelum memberikan akses

## 🏠 Admin Dashboard

**Route:** `/admin`

Dashboard utama admin yang menampilkan:
- Quick access ke semua fitur admin
- Statistik sistem (akan diimplementasikan)
- Navigation ke berbagai modul

### Features Available
- **User Management**: Add new users, view all users
- **Employee Management**: Manage employee records
- **Division Management**: Manage organizational divisions
- **Position Management**: Manage job positions
- **System Settings**: Configure system parameters
- **Reports & Analytics**: Generate reports

## 👤 Add User Feature

**Route:** `/admin/add-user`

Fitur untuk menambahkan user baru dengan detail lengkap.

### Form Fields

#### Account Details (Required)
- **Username**: Username untuk login (required)
- **Email**: Email address (optional)
- **Password**: Password untuk login (required)
- **Role**: User role - pegawai, supervisor, atau admin (required)

#### Employee Details (Optional)
- **NIP**: Employee ID number
- **Division**: Organizational division
- **Position**: Job position

### Workflow
1. Admin mengisi form user
2. Sistem membuat user account melalui API `/api/users/provision`
3. Jika NIP diisi, sistem membuat employee record
4. User baru dapat login dengan credentials yang diberikan

### Role Options
- **Pegawai**: Regular employee
- **Supervisor**: Team leader/manager
- **Admin**: System administrator

## 🔌 API Endpoints

### Admin Divisions
- **GET** `/api/admin/divisions`
- **Description**: Fetch all divisions (admin only)
- **Response**: Array of division objects

### Admin Positions
- **GET** `/api/admin/positions`
- **Description**: Fetch all positions (admin only)
- **Response**: Array of position objects

### Admin Users Provision
- **POST** `/api/admin/users/provision`
- **Description**: Create new user account (admin only)
- **Body**: `{ username, password, email, group }`
- **Response**: Created user object

### Admin Employees
- **POST** `/api/admin/employees`
- **Description**: Create employee record (admin only)
- **Body**: `{ user_id, nip, division_id, position_id }`
- **Response**: Created employee object

## 🎨 UI Components

#### Header Component
- **Header**: Konsisten di semua halaman dashboard
- **User Info**: Menampilkan username dan role
- **Logout Button**: Tombol logout dengan styling yang menarik
- **Responsive Design**: Adaptif untuk berbagai ukuran layar

#### Form Components
- **Card**: Container untuk form sections
- **Input**: Text input fields
- **Select**: Dropdown selection
- **Button**: Action buttons dengan loading states
- **Label**: Form field labels

### Styling
- Responsive design dengan Tailwind CSS
- Consistent dengan design system
- Loading states dan error handling
- Success messages dan validation
- **Header dengan tombol logout** di setiap halaman dashboard

## 🚀 Usage Examples

### Accessing Admin Dashboard
1. Login sebagai admin
2. Klik "Go to Admin Dashboard" di halaman utama
3. Atau navigasi langsung ke `/admin`

### Adding New User
1. Dari admin dashboard, klik "Add New User"
2. Isi form dengan detail user
3. Submit form
4. Sistem akan membuat user dan redirect ke dashboard

### Managing Data
- Semua operasi CRUD dilakukan melalui API
- Frontend hanya menampilkan UI dan handle user interaction
- Backend melakukan validasi dan business logic

## 🔒 Security Features

### Authentication
- JWT token validation untuk setiap request
- Cookie-based token storage (httpOnly)
- Automatic token refresh (akan diimplementasikan)

### Authorization
- Role-based access control
- Admin-only API endpoints
- Middleware protection untuk semua rute admin

### Input Validation
- Frontend validation untuk UX
- Backend validation untuk security
- SQL injection protection melalui ORM

## 🧪 Testing

### Manual Testing
1. Login sebagai admin
2. Navigasi ke admin dashboard
3. Test add user functionality
4. Verify user creation di database
5. Test access control dengan non-admin user

### API Testing
- Test semua endpoint dengan valid credentials
- Test endpoint dengan invalid credentials
- Test endpoint dengan non-admin user
- Verify response format dan status codes

## 🚧 Future Enhancements

### Planned Features
- **User List**: View dan manage existing users
- **User Edit**: Modify user details
- **User Delete**: Remove user accounts
- **Bulk Operations**: Import/export users
- **Audit Logs**: Track admin actions
- **Advanced Search**: Filter dan search users

### Technical Improvements
- **Real-time Updates**: WebSocket untuk live data
- **Pagination**: Handle large datasets
- **Caching**: Improve performance
- **Offline Support**: Progressive Web App features

## 📝 Notes

### Development
- Semua fitur admin menggunakan React hooks
- Form state management dengan useState
- API calls menggunakan fetch API
- Error handling dan loading states

### Production Considerations
- Rate limiting untuk API endpoints
- Logging untuk admin actions
- Backup dan recovery procedures
- Monitoring dan alerting

### Maintenance
- Regular security audits
- Update dependencies
- Performance monitoring
- User feedback collection
