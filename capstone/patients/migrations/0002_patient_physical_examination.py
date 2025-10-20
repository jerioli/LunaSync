# Generated migration for adding physical_examination field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('patients', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='patient',
            name='physical_examination',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
