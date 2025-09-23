# Position Switching Implementation

## Overview
Implementasi position switching untuk mengatasi masalah multi posisi di halaman supervisor approvals. Sekarang user dengan multiple positions dapat switch antara posisi yang berbeda dan approval capabilities akan berubah sesuai posisi aktif.

## Changes Made

### 1. Modified `useSupervisorApprovalLevel` Hook
**File:** `frontend/src/lib/hooks.ts`

**Changes:**
- Priority 1: Menggunakan `current_context` (posisi aktif) instead of `approval_capabilities` (max level)
- Menambahkan informasi `current_position` dan `context` di `positionInfo`
- Menghapus override redundant untuk `currentContext`

**Impact:**
- Approval level sekarang berdasarkan posisi aktif, bukan level tertinggi
- Real-time switching saat user mengubah posisi

### 2. Created `PositionSwitcher` Component
**File:** `frontend/src/components/PositionSwitcher.tsx`

**Features:**
- Display current position dengan approval level dan capabilities
- Dropdown untuk switch ke posisi lain
- Visual indicators untuk primary position dan current position
- Approval level badges dengan color coding
- Loading states dan error handling
- Auto-refresh setelah position switch

### 3. Integrated PositionSwitcher in Supervisor Pages
**Files:**
- `frontend/src/app/supervisor/page.tsx`
- `frontend/src/app/supervisor/approvals/page.tsx`

**Integration:**
- Added PositionSwitcher di bagian atas halaman supervisor dashboard
- Added PositionSwitcher di halaman approvals untuk easy switching
- Position switcher muncul sebelum approval level warning

## How It Works

### Backend Flow
1. User login → Backend set `active_position` ke primary position
2. User switch position → Frontend call `/api/v2/employees/employees/switch_position/`
3. Backend update `active_position` field di Employee model
4. API `/api/v2/auth/me/` return `current_context` dengan posisi aktif
5. Frontend detect perubahan dan update approval capabilities

### Frontend Flow
1. `useSupervisorApprovalLevel()` hook menggunakan `current_context.approval_level`
2. PositionSwitcher component fetch available contexts
3. User select new position → trigger `useSwitchPosition()` mutation
4. Page auto-refresh setelah successful switch
5. Hook re-run dan detect perubahan `current_context`
6. Approval level dan UI update sesuai posisi baru

## Testing Instructions

### Test Case: Akun Konsuler dengan Multi Position

**Setup:**
- Username: `konsuler`
- Password: `1`
- Positions: 
  - Home Staff (Level 1) - Primary
  - PPK (Level 2)

### Test Steps

#### 1. Login dan Check Initial State
1. Login dengan akun konsuler
2. Navigate ke `/supervisor`
3. Check PositionSwitcher component:
   - Current Position: "Home Staff"
   - Approval Level: "Level 1"
   - Description: "Division Level - Dapat approve request dari divisi sendiri"

#### 2. Navigate to Approvals Page
1. Click "Pending Approvals" button
2. Check approval level warning:
   - Should show "Level 1 - Division Level"
   - Should NOT show "Level 2" capabilities

#### 3. Switch to PPK Position
1. In PositionSwitcher dropdown, select "PPK (Level 2)"
2. Wait for page refresh (automatic)
3. Check PositionSwitcher:
   - Current Position: "PPK"
   - Approval Level: "Level 2"
   - Description: "Organization Level - Dapat approve request dari semua divisi (final approval)"
   - Should show "Org-wide" badge

#### 4. Verify Approval Capabilities Changed
1. Check approval level warning:
   - Should now show "Level 2 - Organization Level"
2. Check approval actions in table:
   - Should show Level 2 capabilities
   - Should be able to approve organization-wide requests

#### 5. Switch Back to Home Staff
1. In PositionSwitcher dropdown, select "Home Staff (Level 1)"
2. Wait for page refresh
3. Verify approval level kembali ke Level 1

### Expected Results

#### Before Implementation (Problem)
- Approval level selalu Level 2 (max level dari PPK)
- Tidak bisa menggunakan Level 1 capabilities dari Home Staff
- Tidak ada cara untuk switch posisi

#### After Implementation (Solution)
- Approval level sesuai posisi aktif
- Bisa switch antara Home Staff (Level 1) dan PPK (Level 2)
- Real-time update approval capabilities
- User-friendly position switcher UI

## API Endpoints Used

### 1. Get Available Contexts
```
GET /api/v2/employees/employees/available_contexts/
```
Returns available position contexts for switching.

### 2. Switch Position
```
POST /api/v2/employees/employees/switch_position/
Body: { "position_id": number | null }
```
Switch to specific position or reset to primary.

### 3. Get Current User Info
```
GET /api/v2/auth/me/
```
Returns user info with `current_context` containing active position.

## Troubleshooting

### Common Issues

#### 1. PositionSwitcher Not Loading
- Check if user has multiple positions assigned
- Verify API endpoints are accessible
- Check browser console for errors

#### 2. Approval Level Not Changing
- Verify `current_context` is being used in hook
- Check if position switch was successful
- Refresh page manually if auto-refresh fails

#### 3. Position Switch Fails
- Check if position assignment is active
- Verify `effective_from` and `effective_until` dates
- Check backend logs for errors

### Debug Information

#### Frontend Console Logs
```javascript
// Check approval level calculation
console.log('Enhanced approval level calculation:', {
  current_context: result.current_context,
  approval_level: level,
  source: source
});

// Check available contexts
console.log('Available contexts:', availableContexts);
```

#### Backend Logs
- Check Django logs for position switching errors
- Verify Employee model `active_position` field updates
- Check API response for `current_context` data

## Future Enhancements

### Potential Improvements
1. **Persistent Position Preference**: Remember last selected position across sessions
2. **Position History**: Track position switching history
3. **Bulk Position Operations**: Switch multiple users at once
4. **Position-based Permissions**: Different UI based on position capabilities
5. **Position Notifications**: Notify when position switch affects capabilities

### Performance Optimizations
1. **Caching**: Cache available contexts to reduce API calls
2. **Optimistic Updates**: Update UI immediately, rollback on error
3. **Debounced Switching**: Prevent rapid position switches

## Conclusion

Implementasi ini berhasil mengatasi masalah multi posisi di halaman supervisor approvals. Sekarang user dengan multiple positions dapat:

✅ Switch antara posisi yang berbeda
✅ Approval capabilities berubah sesuai posisi aktif
✅ Real-time update tanpa perlu logout/login
✅ User-friendly interface untuk position management
✅ Maintain backward compatibility dengan single position users

Akun konsuler sekarang dapat menggunakan Level 1 capabilities dari Home Staff atau Level 2 capabilities dari PPK sesuai kebutuhan.
