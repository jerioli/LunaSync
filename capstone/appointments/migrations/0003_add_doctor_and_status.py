from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
        ('appointments', '0002_remove_appointment_full_name_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='appointment',
            name='doctor',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='appointments',
                to='accounts.customuser'
            ),
        ),
        migrations.AddField(
            model_name='appointment',
            name='status',
            field=models.CharField(default='scheduled', max_length=20),
        ),
    ] 