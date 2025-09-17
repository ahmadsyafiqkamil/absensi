# DATABASE MIGRATION PLAN: Legacy to V2

## 🚨 CRITICAL ISSUE IDENTIFIED

### Model Conflicts Between Legacy and V2

#### Employee Model Relationship Conflict
```python
# Legacy Model (api/models.py)
class Employee(models.Model):
    user = models.OneToOneField(..., related_name="employee")

# V2 Model (apps/employees/models.py)  
class Employee(TimeStampedModel):
    user = models.OneToOneField(..., related_name="employee_profile")
```

**PROBLEM**: Different `related_name` akan menyebabkan konflik database!

## 🛠️ SOLUTION STRATEGY

### Option 1: Unify Models (RECOMMENDED)
Gunakan satu set model saja - pindah semua ke V2 structure.

### Option 2: Migration with Alias
Buat migration yang mengubah `related_name` secara bertahap.

## 📋 STEP-BY-STEP MIGRATION PLAN

### Phase 1: Model Analysis & Preparation

#### 1.1 Identify All Model Conflicts
```bash
# Check current database tables
python manage.py dbshell
.tables  # or SHOW TABLES;
```

**Models that need attention:**
- `Employee` (relationship conflict)
- `Attendance` (might have different fields)
- `OvertimeRequest` (different structure)
- `AttendanceCorrection` (different structure)

#### 1.2 Backup Current Database
```bash
# Create backup before any migration
python manage.py dumpdata > backup_before_v2_migration.json

# Or for MySQL
mysqldump -u username -p database_name > backup_before_v2_migration.sql
```

### Phase 2: Create Unified Models

#### 2.1 Create New Migration Strategy
Instead of having duplicate models, we'll:
1. Keep V2 models as the source of truth
2. Update Legacy code to use V2 models
3. Remove Legacy models completely

#### 2.2 Update Legacy Code to Use V2 Models
```python
# In api/views.py - Update imports
from apps.employees.models import Employee, Division, Position
from apps.attendance.models import Attendance
from apps.overtime.models import OvertimeRequest
from apps.corrections.models import AttendanceCorrection
from apps.settings.models import WorkSettings, Holiday
```

### Phase 3: Database Schema Migration

#### 3.1 Create Migration Files
```bash
# First, make migrations for V2 apps
python manage.py makemigrations employees
python manage.py makemigrations attendance  
python manage.py makemigrations overtime
python manage.py makemigrations corrections
python manage.py makemigrations settings

# Then create a migration to remove Legacy models
python manage.py makemigrations api --empty
```

#### 3.2 Custom Migration Script
```python
# In the empty migration file for api app
from django.db import migrations

def migrate_data_to_v2(apps, schema_editor):
    """Migrate data from Legacy tables to V2 tables if needed"""
    # This will be auto-handled by Django if we use same table names
    pass

def reverse_migrate_data(apps, schema_editor):
    """Reverse migration"""
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('api', '0029_add_overtime_summary_document'),  # Latest Legacy migration
        ('employees', '0001_initial'),
        ('attendance', '0001_initial'),
        ('overtime', '0001_initial'),
        ('corrections', '0001_initial'),
        ('settings', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(migrate_data_to_v2, reverse_migrate_data),
    ]
```

### Phase 4: Update Settings & Configuration

#### 4.1 Update INSTALLED_APPS in settings.py
```python
INSTALLED_APPS = [
    # ... existing apps
    
    # V2 Apps (add these)
    'apps.auth',
    'apps.users', 
    'apps.employees',
    'apps.attendance',
    'apps.overtime',
    'apps.corrections',
    'apps.settings',
    'apps.reporting',
    'apps.core',
    
    # Legacy app (keep for now during transition)
    'api',
]
```

#### 4.2 Update Database Router (if needed)
If you want to route V2 apps to different database:
```python
class DatabaseRouter:
    def db_for_read(self, model, **hints):
        if model._meta.app_label in ['employees', 'attendance', 'overtime', 'corrections', 'settings', 'reporting']:
            return 'v2_db'  # or keep 'default'
        return 'default'
```

### Phase 5: Testing Migration

#### 5.1 Test Migration in Development
```bash
# 1. Create test database
python manage.py migrate --run-syncdb

# 2. Load test data
python manage.py loaddata test_data.json

# 3. Test all endpoints
python manage.py test
```

#### 5.2 Verify Data Integrity
```python
# Create a management command to verify data
# management/commands/verify_migration.py

from django.core.management.base import BaseCommand
from apps.employees.models import Employee
from api.models import Employee as LegacyEmployee

class Command(BaseCommand):
    def handle(self, *args, **options):
        # Verify employee count matches
        v2_count = Employee.objects.count()
        legacy_count = LegacyEmployee.objects.count()
        
        if v2_count == legacy_count:
            self.stdout.write("✅ Employee migration successful")
        else:
            self.stdout.write("❌ Employee migration failed")
```

## 🔧 IMPLEMENTATION COMMANDS

### Step 1: Backup Database
```bash
python manage.py dumpdata > backup_$(date +%Y%m%d_%H%M%S).json
```

### Step 2: Update Legacy Imports
```bash
# Find all Legacy model imports
grep -r "from api.models import" drf/app/api/
grep -r "from .models import" drf/app/api/

# Update them to use V2 models
```

### Step 3: Run Migrations
```bash
# Make migrations for V2 apps
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Verify migration
python manage.py verify_migration
```

### Step 4: Test Everything
```bash
# Run all tests
python manage.py test

# Test API endpoints manually
curl -X GET http://localhost:8000/api/v2/employees/employees/
curl -X GET http://localhost:8000/api/v2/attendance/attendance/
```

## ⚠️ RISKS & MITIGATION

### High Risk Items
1. **Data Loss**: Always backup before migration
2. **Downtime**: Plan maintenance window
3. **Relationship Conflicts**: Test thoroughly in dev

### Mitigation Strategies
1. **Incremental Migration**: Migrate one model at a time
2. **Rollback Plan**: Keep Legacy code until V2 is stable
3. **Monitoring**: Add health checks after migration

## 🎯 SUCCESS CRITERIA

- [ ] All V2 endpoints working correctly
- [ ] No data loss during migration
- [ ] All tests passing
- [ ] Frontend working with V2 APIs
- [ ] Performance maintained or improved
- [ ] Legacy code successfully removed

## 📞 NEXT STEPS

1. **Execute backup** (CRITICAL)
2. **Update Legacy imports** to use V2 models
3. **Create and run migrations**
4. **Test thoroughly**
5. **Deploy to staging**
6. **Frontend migration**
7. **Production deployment**
8. **Legacy cleanup**
