# Admin Add User - Multi-Position Support

## Overview
Halaman add user telah diupdate untuk mendukung multi-position assignment. Fitur ini memungkinkan admin untuk assign multiple positions kepada satu employee sekaligus saat membuat user baru.

## Features

### 1. Single Position Mode (Default)
- Mode tradisional yang assign satu posisi ke employee
- Kompatibel dengan sistem existing
- Menggunakan dropdown selection biasa

### 2. Multi-Position Mode
- Dapat diaktifkan dengan checkbox "Enable Multi-Position"
- Memungkinkan assignment multiple positions dengan metadata lengkap
- Setiap position assignment memiliki:
  - Position selection
  - Primary position flag (hanya satu yang boleh primary)
  - Active status
  - Effective from/until dates
  - Assignment notes

## UI Components

### Multi-Position Assignment Section
- **Add Position Button**: Menambah position assignment baru
- **Position Cards**: Setiap position ditampilkan dalam card terpisah
- **Primary Badge**: Menunjukkan position mana yang primary
- **Approval Level Badges**: Menampilkan level approval (L0, L1, L2)
- **Organization-wide Badge**: Menunjukkan kemampuan approve lintas divisi
- **Position Summary**: Ringkasan semua positions yang akan di-assign

### Validation Features
- Minimal satu position harus di-assign jika multi-position enabled
- Hanya satu position yang boleh primary
- Tidak boleh assign position yang sama lebih dari sekali
- Validasi tanggal effective (until harus setelah from)
- Semua position assignment harus memiliki position yang dipilih

## API Integration

### Backend Endpoints Used
- `POST /api/v2/employees/employee-positions/assign_position/` - Assign individual position
- `GET /api/admin/positions/` - Fetch available positions
- `POST /api/admin/employees/` - Create employee record

### Data Flow
1. User dibuat terlebih dahulu via `/api/admin/users/provision`
2. Employee record dibuat via `/api/admin/employees`
3. Jika multi-position enabled, setiap position di-assign via `/api/v2/employees/employee-positions/assign_position/`

## Usage Instructions

### For Single Position
1. Fill user account details
2. Fill employee details
3. Select division and position from dropdown
4. Submit form

### For Multi-Position
1. Fill user account details
2. Fill employee details
3. Check "Enable Multi-Position" checkbox
4. Click "Add Position" to add position assignments
5. For each position:
   - Select position from dropdown
   - Set effective dates
   - Mark one as primary
   - Add notes if needed
6. Review position summary
7. Submit form

## Technical Notes

### Form State Management
- `selectedPositions`: Array of PositionAssignment objects
- `showMultiPosition`: Boolean flag untuk toggle mode
- `availablePositions`: Filtered positions untuk prevent duplicates

### Validation Logic
- Form validation runs before submission
- Comprehensive validation untuk multi-position scenarios
- Error messages yang descriptive

### Backward Compatibility
- Legacy single position assignment tetap supported
- Existing API endpoints tidak berubah
- Form dapat switch antara single dan multi-position mode

## Future Enhancements
- Bulk position assignment untuk multiple employees
- Position templates untuk common combinations
- Advanced filtering untuk position selection
- Position hierarchy visualization
