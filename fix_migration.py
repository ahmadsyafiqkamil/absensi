#!/usr/bin/env python
"""
Script to fix migration issues after database drop.
"""
import os
import sys
import django
from pathlib import Path

# Setup Django
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.core.settings')
django.setup()

# Disable signal BEFORE importing anything else
from django.db.models.signals import post_migrate
from api.signals import ensure_default_groups
post_migrate.disconnect(ensure_default_groups, sender=None)

print('✅ Signal disabled successfully')

# Now run migration with fake-initial
from django.core.management import execute_from_command_line
print('🚀 Running migration with --fake-initial...')
try:
    execute_from_command_line(['manage.py', 'migrate', '--fake-initial'])
    print('✅ Migration completed successfully!')
except Exception as e:
    print(f'❌ Migration failed: {e}')

# Reconnect signal
post_migrate.connect(ensure_default_groups, sender=None)
print('✅ Signal reconnected')
