from django.db import migrations
from django.contrib.auth.hashers import make_password

def create_default_admin(apps, schema_editor):
    CustomUser = apps.get_model('accounts', 'CustomUser')
    
    # Create default admin
    if not CustomUser.objects.filter(username='admin').exists():
        admin_user = CustomUser(
            username='admin',
            email='admin@example.com',
            password=make_password('adminpassword'),
            role='admin',
            is_staff=True,
            is_superuser=True
        )
        admin_user.save()

    # Create default superadmin
    if not CustomUser.objects.filter(username='superadmin').exists():
        superadmin_user = CustomUser(
            username='superadmin',
            email='superadmin@example.com',
            password=make_password('superadminpassword'),
            role='superadmin',
            is_staff=True,
            is_superuser=True
        )
        superadmin_user.save()

    # Create default doctor
    if not CustomUser.objects.filter(username='doctor').exists():
        doctor_user = CustomUser(
            username='doctor',
            email='doctor@example.com',
            password=make_password('doctorpassword'),
            role='doctor',
            is_staff=True,
            is_superuser=False
        )
        doctor_user.save()

    # Create default receptionist
    if not CustomUser.objects.filter(username='receptionist').exists():
        receptionist_user = CustomUser(
            username='receptionist',
            email='receptionist@example.com',
            password=make_password('receptionistpassword'),
            role='receptionist',
            is_staff=True,
            is_superuser=False
        )
        receptionist_user.save()

class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0012_customuser_can_access_integrations_and_more'),
    ]

    operations = [
        migrations.RunPython(create_default_admin),
    ]
