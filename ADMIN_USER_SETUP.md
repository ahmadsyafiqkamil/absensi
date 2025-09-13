# Admin User Setup Guide

## Masalah
Saat membuat superuser dengan `python manage.py createsuperuser`, user tersebut tidak otomatis mendapat role `admin` dan hanya menjadi `employee` (pegawai).

## Solusi
Tersedia beberapa cara untuk membuat admin user dengan role yang benar:

### 1. Menggunakan Script Otomatis (Recommended)

#### Cara 1: Menggunakan Script Shell
```bash
# Dengan parameter default (username: admin, email: admin@example.com, password: admin123)
./create_admin_user.sh

# Dengan parameter custom
./create_admin_user.sh myadmin admin@company.com mypassword123
```

#### Cara 2: Menggunakan Management Command
```bash
# Masuk ke Docker container
docker-compose exec backend bash

# Jalankan management command
python manage.py create_admin_user --username admin --email admin@example.com

# Atau dengan noinput (menggunakan default password)
python manage.py create_admin_user --username admin --email admin@example.com --noinput
```

#### Cara 3: Menggunakan Script Python Langsung
```bash
# Masuk ke Docker container
docker-compose exec backend bash

# Jalankan script
python create_admin.py admin admin@example.com admin123
```

### 2. Menggunakan Django Shell

```bash
# Masuk ke Docker container
docker-compose exec backend bash

# Buka Django shell
python manage.py shell

# Jalankan kode berikut:
```

```python
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

User = get_user_model()

# Buat superuser
user = User.objects.create_superuser(
    username='admin',
    email='admin@example.com',
    password='admin123'
)

# Dapatkan atau buat group admin
admin_group, created = Group.objects.get_or_create(name='admin')

# Tambahkan user ke group admin
user.groups.add(admin_group)

print(f"User {user.username} created with admin role")
```

### 3. Override createsuperuser Command (Advanced)

Jika Anda ingin `createsuperuser` otomatis menambahkan role admin, gunakan custom command yang sudah dibuat:

```bash
# Masuk ke Docker container
docker-compose exec backend bash

# Gunakan custom createsuperuser command
python manage.py createsuperuser
```

## Verifikasi

Untuk memverifikasi bahwa user sudah mendapat role admin:

```bash
# Masuk ke Django shell
python manage.py shell
```

```python
from django.contrib.auth import get_user_model
User = get_user_model()

# Cek user dan group-nya
user = User.objects.get(username='admin')
print(f"User: {user.username}")
print(f"Is superuser: {user.is_superuser}")
print(f"Groups: {[g.name for g in user.groups.all()]}")
print(f"Has admin role: {user.groups.filter(name='admin').exists()}")
```

## Role System

Aplikasi ini menggunakan 3 role utama:
- `admin` - Administrator penuh
- `supervisor` - Supervisor/atasan
- `pegawai` - Employee/karyawan

## Troubleshooting

### Jika user sudah ada tapi tidak ada di group admin:
```python
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

User = get_user_model()
user = User.objects.get(username='admin')
admin_group = Group.objects.get(name='admin')
user.groups.add(admin_group)
```

### Jika group admin belum ada:
```python
from django.contrib.auth.models import Group
admin_group = Group.objects.create(name='admin')
```

## File yang Dibuat

1. `drf/app/apps/users/management/commands/create_admin_user.py` - Management command
2. `drf/app/apps/users/management/commands/createsuperuser.py` - Override createsuperuser
3. `drf/app/create_admin.py` - Standalone script
4. `create_admin_user.sh` - Shell script wrapper
