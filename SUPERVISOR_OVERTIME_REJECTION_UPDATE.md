# Update Proses Approval/Rejection untuk Halaman Supervisor Overtime Requests

## Ringkasan Perubahan

Telah diperbarui halaman supervisor/overtime-requests untuk mendukung field-field rejection baru yang telah ditambahkan ke model `OvertimeRequest`.

## Perubahan pada Frontend

### 1. Type Definition Update

**File**: `frontend/src/app/supervisor/overtime-requests/OvertimeRequestsTable.tsx`

Ditambahkan field-field rejection baru ke type `OvertimeRequest`:
```typescript
type OvertimeRequest = {
  // ... existing fields ...
  level1_rejected_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  } | null;
  level1_rejected_at: string | null;
  final_rejected_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  } | null;
  final_rejected_at: string | null;
  // ... existing fields ...
};
```

### 2. Status Display Update

**Tampilan Status Rejection**:
- Menampilkan informasi siapa yang melakukan reject (Level 1 atau Final)
- Menampilkan timestamp kapan reject dilakukan
- Menampilkan alasan rejection dengan truncation untuk tampilan yang rapi

```typescript
{row.original.status === 'rejected' && (
  <div className="text-xs space-y-1">
    {row.original.level1_rejected_by && (
      <div className="text-red-600">
        ✗ Level 1: {row.original.level1_rejected_by.username}
        {row.original.level1_rejected_at && (
          <span className="text-gray-500 ml-1">
            ({formatDateTime(row.original.level1_rejected_at)})
          </span>
        )}
      </div>
    )}
    {row.original.final_rejected_by && (
      <div className="text-red-600">
        ✗ Final: {row.original.final_rejected_by.username}
        {row.original.final_rejected_at && (
          <span className="text-gray-500 ml-1">
            ({formatDateTime(row.original.final_rejected_at)})
          </span>
        )}
      </div>
    )}
    {/* Alasan rejection */}
  </div>
)}
```

### 3. Role Information Display

**Informasi Role User**:
- Menampilkan role user di bagian atas tabel
- Memberikan informasi jelas tentang permission yang dimiliki

```typescript
{supervisorInfo && (
  <div className="mt-2 text-sm">
    <span className="font-medium">Role Anda: </span>
    {supervisorInfo.isAdmin ? (
      <span className="text-purple-600">Admin (Dapat approve/reject semua level)</span>
    ) : supervisorInfo.isOrgWide ? (
      <span className="text-blue-600">Supervisor Organization-wide (Final approval)</span>
    ) : (
      <span className="text-green-600">Supervisor Divisi (Level 1 approval)</span>
    )}
  </div>
)}
```

### 4. Action Button Update

**Button Reject**:
- Menampilkan text yang lebih informatif: "Final Reject" atau "Level 1 Reject"
- Tooltip yang menjelaskan level rejection yang akan dilakukan

```typescript
<Button
  size="sm"
  variant="outline"
  className="border-red-300 text-red-600 hover:bg-red-50 text-xs px-2 py-1"
  onClick={() => openActionModal(row.original, 'reject')}
  title={supervisorInfo?.isAdmin ? 'Reject (Final)' : supervisorInfo?.isOrgWide ? 'Reject (Final)' : 'Reject (Level 1)'}
>
  {supervisorInfo?.isAdmin || supervisorInfo?.isOrgWide ? 'Final Reject' : 'Level 1 Reject'}
</Button>
```

### 5. Modal Enhancement

**Action Type Indicator**:
- Menampilkan informasi jelas tentang jenis action yang akan dilakukan
- Menjelaskan workflow approval/rejection berdasarkan role user

```typescript
{/* Action Type Indicator */}
<div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
  <div className="text-sm font-medium text-blue-800">
    {actionType === 'approve' ? (
      <>
        {supervisorInfo?.isAdmin ? 'Admin Approval' : supervisorInfo?.isOrgWide ? 'Final Approval' : 'Level 1 Approval'}
      </>
    ) : (
      <>
        {supervisorInfo?.isAdmin ? 'Admin Rejection' : supervisorInfo?.isOrgWide ? 'Final Rejection' : 'Level 1 Rejection'}
      </>
    )}
  </div>
  <div className="text-xs text-blue-600 mt-1">
    {/* Penjelasan detail action */}
  </div>
</div>
```

**Approval/Rejection History**:
- Menampilkan riwayat lengkap approval dan rejection
- Menampilkan siapa yang melakukan action dan kapan

```typescript
{/* Approval/Rejection History */}
{(selectedRequest.level1_approved_by || selectedRequest.final_approved_by || 
  selectedRequest.level1_rejected_by || selectedRequest.final_rejected_by) && (
  <div className="mt-2 text-xs space-y-1">
    {/* Level 1 Approval */}
    {/* Final Approval */}
    {/* Level 1 Rejection */}
    {/* Final Rejection */}
  </div>
)}
```

## Perubahan pada Backend

### 1. Supervisor Approvals Summary API

**File**: `drf/app/api/views.py`

Ditambahkan field `is_admin` ke response API:
```python
return Response({
    'pending_overtime_count': pending_overtime_count,
    'pending_corrections_count': pending_corrections_count,
    'is_org_wide_supervisor': is_org_wide_supervisor,
    'supervisor_division': supervisor_employee.division.name if supervisor_employee.division else None,
    'can_approve_overtime_org_wide': is_org_wide_supervisor,
    'is_admin': user.is_superuser or user.groups.filter(name='admin').exists(),
})
```

### 2. Rejection Logic Update

**Method `reject()` di OvertimeRequestViewSet**:
- Mendukung 2-level rejection system
- Admin: Final rejection langsung
- Org-wide supervisor: Final rejection
- Division supervisor: Level 1 rejection

## Workflow Approval/Rejection

### 1. Admin
- **Approve**: Dapat melakukan final approval langsung
- **Reject**: Dapat melakukan final rejection langsung
- **Scope**: Semua request di sistem

### 2. Organization-wide Supervisor
- **Approve**: Hanya dapat melakukan final approval setelah level 1
- **Reject**: Dapat melakukan final rejection untuk request level 1 approved
- **Scope**: Semua request di sistem

### 3. Division Supervisor
- **Approve**: Hanya dapat melakukan level 1 approval
- **Reject**: Dapat melakukan level 1 rejection untuk request pending
- **Scope**: Request dari divisi sendiri

## Visual Indicators

### Status Colors
- **Pending**: Orange (Menunggu approval)
- **Level 1 Approved**: Blue (Menunggu final approval)
- **Final Approved**: Green (Sudah disetujui)
- **Rejected**: Red (Ditolak)

### Icons
- **Approval**: ✓ (Checkmark)
- **Rejection**: ✗ (Cross)
- **Pending**: ⏳ (Hourglass)

## Testing

### 1. Frontend Testing
- Test tampilan field rejection di tabel
- Test modal approval/rejection dengan berbagai role
- Test button states dan disabled conditions
- Test role information display

### 2. Backend Testing
- Test API rejection dengan berbagai role
- Test field rejection terisi dengan benar
- Test workflow 2-level rejection

### 3. Integration Testing
- Test end-to-end approval/rejection flow
- Test data consistency antara frontend dan backend
- Test error handling dan validation

## Backward Compatibility

- Semua perubahan bersifat backward compatible
- Field legacy tetap dipertahankan
- Tidak ada breaking changes pada API yang sudah ada
- UI tetap berfungsi untuk data lama tanpa field rejection
