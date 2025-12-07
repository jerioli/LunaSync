# Generated migration for appointment_status_notifications field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0026_customuser_otp_enabled'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='appointment_status_notifications',
            field=models.BooleanField(default=True),
        ),
    ]
