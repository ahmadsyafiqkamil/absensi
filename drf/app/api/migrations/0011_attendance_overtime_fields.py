from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_worksettings_overtime_rates'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendance',
            name='overtime_minutes',
            field=models.PositiveIntegerField(
                default=0,
                verbose_name='Overtime Minutes',
                help_text='Minutes worked beyond required work hours'
            ),
        ),
        migrations.AddField(
            model_name='attendance',
            name='overtime_amount',
            field=models.DecimalField(
                max_digits=12,
                decimal_places=2,
                default=0,
                verbose_name='Overtime Amount',
                help_text='Calculated overtime pay amount'
            ),
        ),
        migrations.AddField(
            model_name='attendance',
            name='overtime_approved',
            field=models.BooleanField(
                default=False,
                verbose_name='Overtime Approved',
                help_text='Whether overtime has been approved by supervisor'
            ),
        ),
        migrations.AddField(
            model_name='attendance',
            name='overtime_approved_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='approved_overtimes',
                to='auth.user',
                verbose_name='Overtime Approved By'
            ),
        ),
        migrations.AddField(
            model_name='attendance',
            name='overtime_approved_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name='Overtime Approved At'
            ),
        ),
    ]
