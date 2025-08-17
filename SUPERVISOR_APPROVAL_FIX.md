# Supervisor Approval Permission Fix

## Problem Description

**Issue**: Supervisor users were getting "forbidden" error when trying to approve or reject attendance corrections on the pending approvals page.

**Error Message**: `{"detail": "forbidden"}` with HTTP 403 status

**Location**: `/supervisor/approvals` page when clicking Approve/Reject buttons

## Root Cause Analysis

### 1. **Permission Class Mismatch**
The `AttendanceCorrectionViewSet.approve()` and `reject()` methods were using `IsAdminOrSupervisor` permission class, which only allows **read-only** access for supervisors.

```python
# BEFORE (Problematic Code)
@extend_schema(request=None, responses={200: AttendanceCorrectionSerializer})
def approve(self, request, pk=None):
    """Approve a pending correction (supervisor/admin only)."""
    if not IsAdminOrSupervisor().has_permission(request, self):
        return Response({"detail": "forbidden"}, status=status.HTTP_403_FORBIDDEN)
    # ... rest of method
```

### 2. **Permission Class Behavior**
`IsAdminOrSupervisor` permission class:
- **Admin**: Full access (all HTTP methods)
- **Supervisor**: Read-only access (only GET, HEAD, OPTIONS)
- **Employee**: No access

But approval actions require **POST** method, which was blocked for supervisors.

### 3. **HTTP Method Requirements**
- **GET** `/api/attendance-corrections/` → List corrections (works for supervisor)
- **POST** `/api/attendance-corrections/{id}/approve` → Approve correction (blocked for supervisor)
- **POST** `/api/attendance-corrections/{id}/reject` → Reject correction (blocked for supervisor)

## Solution Implemented

### 1. **New Permission Class**
Created `IsAdminOrSupervisorWithApproval` permission class that allows supervisors to perform approval actions:

```python
class IsAdminOrSupervisorWithApproval(permissions.BasePermission):
    """
    Permission class untuk admin dan supervisor dengan akses approval.
    
    Access Control:
    - Admin: full access (CRUD operations)
    - Supervisor: read access + approval actions (POST for approve/reject)
    - Employee: no access
    
    Use Case:
    - Attendance correction approval/rejection
    - Supervisor actions that require write access
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Admin: full access
        if user.is_superuser or user.groups.filter(name='admin').exists():
            return True
        
        # Supervisor: read access + approval actions
        if user.groups.filter(name='supervisor').exists():
            # Allow GET, HEAD, OPTIONS for read access
            if request.method in ("GET", "HEAD", "OPTIONS"):
                return True
            
            # Allow POST for approval actions (approve/reject)
            if request.method == "POST":
                # Check if this is an approval action
                action = getattr(view, 'action', None)
                if action in ['approve', 'reject']:
                    return True
            
            return False
        
        return False
```

### 2. **Updated ViewSet Methods**
Modified both `approve()` and `reject()` methods to use the new permission class:

```python
# AFTER (Fixed Code)
@extend_schema(request=None, responses={200: AttendanceCorrectionSerializer})
def approve(self, request, pk=None):
    """Approve a pending correction (supervisor/admin only)."""
    if not IsAdminOrSupervisorWithApproval().has_permission(request, self):
        return Response({"detail": "forbidden"}, status=status.HTTP_403_FORBIDDEN)
    # ... rest of method

@extend_schema(request=None, responses={200: AttendanceCorrectionSerializer})
def reject(self, request, pk=None):
    """Reject a pending correction (supervisor/admin only)."""
    if not IsAdminOrSupervisorWithApproval().has_permission(request, self):
        return Response({"detail": "forbidden"}, status=status.HTTP_403_FORBIDDEN)
    # ... rest of method
```

## Security Considerations

### 1. **Maintained Security**
- Supervisors can only approve/reject corrections within their division
- Division-based scoping is still enforced in the business logic
- No unauthorized access to other divisions' data

### 2. **Granular Permission Control**
- Supervisors get read access to view corrections
- Supervisors get write access only for approval actions
- Other write operations (create, update, delete) remain blocked

### 3. **Audit Trail**
- All approval actions are logged with `reviewed_by` and `reviewed_at`
- Decision notes are preserved for compliance

## Testing

### 1. **Test Script Created**
`test_approval_permission.py` script to verify:
- Admin can perform all operations
- Supervisor can view corrections
- Supervisor can approve/reject corrections
- Proper error handling for unauthorized actions

### 2. **Manual Testing Steps**
1. Login as supervisor
2. Navigate to `/supervisor/approvals`
3. View pending corrections
4. Click Approve/Reject buttons
5. Verify no more "forbidden" errors

## Files Modified

### Backend Files
- `drf/app/api/permissions.py` - Added new permission class
- `drf/app/api/views.py` - Updated approve/reject methods

### Test Files
- `test_approval_permission.py` - Test script for verification

## Impact

### 1. **Positive Changes**
- ✅ Supervisor can now approve/reject attendance corrections
- ✅ No breaking changes to existing functionality
- ✅ Maintains security and data integrity
- ✅ Better user experience for supervisors

### 2. **No Changes**
- ❌ Admin permissions remain unchanged
- ❌ Employee permissions remain unchanged
- ❌ Division-based data scoping remains intact
- ❌ Audit logging remains unchanged

## Future Considerations

### 1. **Permission Class Reuse**
The `IsAdminOrSupervisorWithApproval` permission class can be reused for other supervisor actions that require write access.

### 2. **Monitoring**
Monitor approval actions to ensure they're being used appropriately and within expected patterns.

### 3. **Documentation**
Update user documentation to clarify supervisor capabilities and responsibilities.

## Conclusion

The supervisor approval permission issue has been successfully resolved by:

1. **Identifying the root cause**: Permission class mismatch for approval actions
2. **Implementing a targeted solution**: New permission class for approval-specific actions
3. **Maintaining security**: Division-based scoping and audit trails preserved
4. **Testing the fix**: Verification script and manual testing

Supervisors can now perform their essential approval duties without encountering permission errors, while maintaining the security and data integrity of the system.
