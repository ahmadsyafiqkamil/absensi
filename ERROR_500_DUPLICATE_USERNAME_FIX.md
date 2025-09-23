# Error 500 - Duplicate Username Fix

## Masalah yang Ditemukan

**Error 500 Internal Server Error** disebabkan oleh **IntegrityError** di database:

```
django.db.utils.IntegrityError: (1062, "Duplicate entry 'tes1111' for key 'auth_user.username'")
```

### Root Cause:
- Username 'tes1111' sudah ada di database (ID: 51)
- Ketika mencoba membuat user baru dengan username yang sama, terjadi duplicate entry error
- Backend mengembalikan HTTP 500 karena database constraint violation

## Analisis Error

### 1. **Database Constraint Violation**
```sql
-- MySQL Error 1062: Duplicate entry
-- Constraint: auth_user.username UNIQUE
-- Username 'tes1111' already exists
```

### 2. **Backend Error Stack Trace**
```
File "/app/apps/users/serializers.py", line 56, in create
    user = User.objects.create(**validated_data)
File "/usr/local/lib/python3.11/site-packages/django/db/models/manager.py", line 87, in manager_method
    return getattr(self.get_queryset(), name)(*args, **kwargs)
File "/usr/local/lib/python3.11/site-packages/django/db/models/query.py", line 679, in create
    obj.save(force_insert=True, using=self.db)
```

### 3. **Frontend Tidak Menangani Error dengan Baik**
- Error 500 tidak ditangani dengan spesifik
- User tidak mendapat feedback yang jelas tentang masalah username

## Solusi yang Diterapkan

### 1. **Enhanced Error Handling di Frontend**

```typescript
if (!userResponse.ok) {
  const errorText = await userResponse.text();
  console.error('[DEBUG] User provision error response:', errorText);
  console.error('[DEBUG] User provision error status:', userResponse.status);
  
  let errorData;
  try {
    errorData = JSON.parse(errorText);
  } catch (e) {
    errorData = { detail: errorText };
  }
  
  // Handle specific error cases
  if (userResponse.status === 500) {
    // Check if it's a duplicate username error
    if (errorText.includes('Duplicate entry') && errorText.includes('username')) {
      throw new Error(`Username '${formData.username}' already exists. Please choose a different username.`);
    }
    throw new Error(`Server error: ${extractErrorMessage(errorData) || 'Internal server error'}`);
  }
  
  throw new Error(extractErrorMessage(errorData) || `Failed to create user (${userResponse.status})`);
}
```

### 2. **Username Validation di Frontend**

```typescript
const validateForm = () => {
  const errors: string[] = [];
  
  // Basic validation
  if (!formData.username.trim()) {
    errors.push('Username is required');
  } else {
    // Check for username format
    if (formData.username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }
  }
  if (!formData.password.trim()) {
    errors.push('Password is required');
  } else if (formData.password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  // ... rest of validation
};
```

### 3. **Username Availability Check**

```typescript
const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/admin/users/check-username?username=${encodeURIComponent(username)}`);
    if (response.ok) {
      const data = await response.json();
      return data.available;
    }
    return true; // If check fails, assume available
  } catch (error) {
    console.warn('Username availability check failed:', error);
    return true; // If check fails, assume available
  }
};

// In handleSubmit
console.log('[DEBUG] Checking username availability for:', formData.username);
const isUsernameAvailable = await checkUsernameAvailability(formData.username);
if (!isUsernameAvailable) {
  setError(`Username '${formData.username}' is already taken. Please choose a different username.`);
  setIsLoading(false);
  return;
}
```

### 4. **Backend Username Check Endpoint**

```python
@action(detail=False, methods=['get'])
def check_username(self, request):
    """Check if username is available"""
    username = request.query_params.get('username')
    
    if not username:
        return Response(
            {'detail': 'Username parameter is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if username exists
    exists = User.objects.filter(username=username).exists()
    
    return Response({
        'username': username,
        'available': not exists,
        'exists': exists
    })
```

### 5. **Frontend API Route untuk Username Check**

```typescript
// /api/admin/users/check-username/route.ts
export async function GET(request: NextRequest) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const meResponse = await fetch(`${getBackendUrl()}/api/v2/auth/me/`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!meResponse.ok) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const userData = await meResponse.json();
    const isAdmin = userData.groups?.includes('admin') || userData.is_superuser;

    if (!isAdmin) {
      return NextResponse.json({ detail: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ detail: 'Username parameter is required' }, { status: 400 });
    }

    // Check username availability by calling backend
    const response = await fetch(`${getBackendUrl()}/api/v2/users/users/check-username/?username=${encodeURIComponent(username)}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      // If backend returns 404, username is available
      if (response.status === 404) {
        return NextResponse.json({ available: true });
      }
      return NextResponse.json({ detail: 'Backend error' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error checking username availability:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Testing Steps

### 1. **Test Duplicate Username Error**
1. Buka halaman Admin > Add User
2. Masukkan username yang sudah ada (misalnya 'tes1111')
3. Submit form
4. **Expected Result**: Error message yang jelas: "Username 'tes1111' already exists. Please choose a different username."

### 2. **Test Username Validation**
1. Masukkan username dengan format yang tidak valid
2. **Expected Results**:
   - Username kurang dari 3 karakter: "Username must be at least 3 characters long"
   - Username dengan karakter khusus: "Username can only contain letters, numbers, and underscores"

### 3. **Test Username Availability Check**
1. Masukkan username yang sudah ada
2. **Expected Result**: Error sebelum submit: "Username 'username' is already taken. Please choose a different username."

### 4. **Test Successful User Creation**
1. Masukkan username yang belum ada
2. Submit form
3. **Expected Result**: User berhasil dibuat tanpa error

## Monitoring

Setelah perbaikan ini diterapkan, monitor:

1. **Console logs** untuk melihat username availability check
2. **Error messages** untuk feedback yang jelas ke user
3. **Backend logs** untuk melihat apakah ada error 500 lagi
4. **Database** untuk memastikan tidak ada duplicate username

## Troubleshooting

### Jika Masih Ada Error 500:

1. **Periksa Database**
   ```sql
   SELECT username, COUNT(*) FROM auth_user GROUP BY username HAVING COUNT(*) > 1;
   ```

2. **Periksa Backend Logs**
   ```bash
   docker logs --tail 100 absensi_backend_dev | grep -E "(500|IntegrityError|Duplicate)"
   ```

3. **Periksa Frontend Logs**
   ```bash
   docker logs --tail 100 absensi_frontend_dev | grep -E "(500|Error|Exception)"
   ```

### Jika Username Check Tidak Berfungsi:

1. **Periksa API Endpoint**
   ```bash
   curl -H "Authorization: Bearer <token>" "http://localhost:8000/api/v2/users/users/check-username/?username=test"
   ```

2. **Periksa Frontend API Route**
   ```bash
   curl "http://localhost:3000/api/admin/users/check-username?username=test"
   ```

## File yang Dimodifikasi

- `frontend/src/app/admin/add-user/page.tsx` - Enhanced error handling dan username validation
- `frontend/src/app/api/admin/users/check-username/route.ts` - API route untuk username check
- `drf/app/apps/users/views.py` - Backend endpoint untuk username check
- `ERROR_500_DUPLICATE_USERNAME_FIX.md` - Dokumentasi masalah ini

## Next Steps

1. **Test dengan username yang berbeda** untuk memastikan tidak ada duplicate
2. **Periksa apakah ada username lain yang duplicate** di database
3. **Implementasi real-time username validation** saat user mengetik
4. **Tambahkan username suggestions** jika username sudah ada
