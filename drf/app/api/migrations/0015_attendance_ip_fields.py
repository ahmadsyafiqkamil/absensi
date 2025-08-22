from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0014_add_overtime_request_model'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendance',
            name='check_in_ip',
            field=models.GenericIPAddressField(blank=True, null=True, verbose_name='Check-in IP Address'),
        ),
        migrations.AddField(
            model_name='attendance',
            name='check_out_ip',
            field=models.GenericIPAddressField(blank=True, null=True, verbose_name='Check-out IP Address'),
        ),
    ]


