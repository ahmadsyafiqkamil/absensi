from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_worksettings_friday_end_time_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendance',
            name='employee_note',
            field=models.TextField(null=True, blank=True),
        ),
    ]


