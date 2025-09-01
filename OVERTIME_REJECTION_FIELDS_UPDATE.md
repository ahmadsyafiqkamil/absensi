# Update Field Rejection untuk Model OvertimeRequest

## Ringkasan Perubahan

Telah ditambahkan field-field baru untuk menampung data supervisor yang melakukan reject pada model `OvertimeRequest`.

## Field Baru yang Ditambahkan

### 1. Level 1 Rejection (Division Supervisor)
- `level1_rejected_by`: ForeignKey ke User yang melakukan reject level 1
- `level1_rejected_at`: DateTimeField kapan reject level 1 dilakukan

### 2. Final Rejection (Organization-wide Supervisor)
- `final_rejected_by`: ForeignKey ke User yang melakukan reject final
- `final_rejected_at`: DateTimeField kapan reject final dilakukan

## Perubahan pada Model

### Model OvertimeRequest
```python
# Level 1 rejection (division supervisor)
level1_rejected_by = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    null=True,
    blank=True,
    on_delete=models.SET_NULL,
    related_name='level1_rejected_overtime_requests',
    verbose_name="Level 1 Rejected By"
)
level1_rejected_at = models.DateTimeField(
    null=True,
    blank=True,
    verbose_name="Level 1 Rejected At"
)

# Final rejection (organization-wide supervisor)
final_rejected_by = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    null=True,
    blank=True,
    on_delete=models.SET_NULL,
    related_name='final_rejected_overtime_requests',
    verbose_name="Final Rejected By"
)
final_rejected_at = models.DateTimeField(
    null=True,
    blank=True,
    verbose_name="Final Rejected At"
)
```

## Perubahan pada Admin Interface

### OvertimeRequestAdmin
- **list_display**: Ditambahkan field rejection untuk ditampilkan di list view
- **list_filter**: Ditambahkan filter untuk field rejection
- **search_fields**: Ditambahkan search untuk field rejection
- **readonly_fields**: Ditambahkan timestamp rejection sebagai readonly
- **fieldsets**: Diorganisir ulang untuk memisahkan approval dan rejection

### Auto-save Logic
Admin interface sekarang otomatis mengisi field rejection berdasarkan:
- Status perubahan ke 'rejected'
- Level approval yang sudah ada sebelumnya
- User yang melakukan perubahan

## Perubahan pada Serializers

### Semua Serializers (Admin, Supervisor, Employee)
- Ditambahkan field rejection baru ke dalam fields
- Ditambahkan UserBasicSerializer untuk field rejection
- Employee serializer: field rejection ditandai sebagai read-only

## Perubahan pada Views

### OvertimeRequestViewSet.reject()
Method reject sekarang mendukung 2-level rejection system:
- **Admin**: Dapat melakukan final rejection langsung
- **Org-wide Supervisor**: Dapat melakukan final rejection
- **Division Supervisor**: Dapat melakukan level 1 rejection

Logic rejection:
1. Admin dapat reject request dengan status apapun → final rejection
2. Org-wide supervisor dapat reject level1_approved → final rejection  
3. Division supervisor dapat reject pending → level 1 rejection

## Migration

Migration file: `api/migrations/0025_add_rejection_fields_to_overtime_request.py`

Field yang ditambahkan:
- `final_rejected_at`
- `final_rejected_by`
- `level1_rejected_at`
- `level1_rejected_by`

## Backward Compatibility

- Field legacy (`approved_by`, `approved_at`) tetap dipertahankan
- Semua field rejection bersifat optional (null=True, blank=True)
- Tidak ada breaking changes pada API yang sudah ada

## Testing

Untuk test perubahan ini:

1. **Admin Interface**: 
   - Buka Django Admin → OvertimeRequest
   - Coba approve/reject request dan lihat field otomatis terisi

2. **API Testing**:
   - Test endpoint reject dengan berbagai role user
   - Verifikasi field rejection terisi dengan benar

3. **Serialization**:
   - Test bahwa field rejection muncul di response API
   - Verifikasi data supervisor rejection tersimpan dengan benar

