from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_attendance_employee_note'),
    ]

    operations = [
        migrations.CreateModel(
            name='AttendanceCorrection',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_local', models.DateField()),
                ('type', models.CharField(choices=[('missing_check_in', 'Missing Check-in'), ('missing_check_out', 'Missing Check-out'), ('edit', 'Edit')], max_length=32)),
                ('proposed_check_in_local', models.DateTimeField(blank=True, null=True)),
                ('proposed_check_out_local', models.DateTimeField(blank=True, null=True)),
                ('reason', models.TextField()),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')], default='pending', max_length=16)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('decision_note', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_corrections', to=settings.AUTH_USER_MODEL)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attendance_corrections', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]


