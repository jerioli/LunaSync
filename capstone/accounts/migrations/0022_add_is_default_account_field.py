# Generated manually to add is_default_account field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0021_restrict_default_superadmin'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='is_default_account',
            field=models.BooleanField(default=False, help_text='Flag to mark default/system accounts that should be restricted'),
        ),
    ]