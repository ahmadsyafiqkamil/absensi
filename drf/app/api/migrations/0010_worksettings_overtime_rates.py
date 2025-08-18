from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_attendancecorrection_attachment'),
    ]

    operations = [
        migrations.AddField(
            model_name='worksettings',
            name='overtime_rate_workday',
            field=models.DecimalField(
                default=0.5,
                help_text='Multiplier of hourly base wage for overtime on workdays (e.g., 0.50 = 2/4)',
                max_digits=5,
                decimal_places=2,
                verbose_name='Overtime Rate (Workday)'
            ),
        ),
        migrations.AddField(
            model_name='worksettings',
            name='overtime_rate_holiday',
            field=models.DecimalField(
                default=0.75,
                help_text='Multiplier of hourly base wage for overtime on holidays (e.g., 0.75 = 3/4)',
                max_digits=5,
                decimal_places=2,
                verbose_name='Overtime Rate (Holiday)'
            ),
        ),
    ]


