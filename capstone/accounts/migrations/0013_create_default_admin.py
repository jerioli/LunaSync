from django.db import migrations

def create_default_admin(apps, schema_editor):
    CustomUser = apps.get_model('accounts', 'CustomUser')
    # Create default admin
    if not CustomUser.objects.filter(username='admin').exists():
        CustomUser.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpassword',
            role='admin',
            is_staff=True,
            is_superuser=True
        )

    # Create default superadmin
    if not CustomUser.objects.filter(username='superadmin').exists():
        CustomUser.objects.create_superuser(
            username='superadmin',
            email='superadmin@example.com',
            password='superadminpassword',
            role='superadmin',
            is_staff=True,
            is_superuser=True
        )

    # Create default doctor
    if not CustomUser.objects.filter(username='doctor').exists():
        CustomUser.objects.create_user(
            username='doctor',
            email='doctor@example.com',
            password='doctorpassword',
            role='doctor',
            is_staff=True,
            is_superuser=False
        )

    # Create default receptionist
    if not CustomUser.objects.filter(username='receptionist').exists():
        CustomUser.objects.create_user(
            username='receptionist',
            email='receptionist@example.com',
            password='receptionistpassword',
            role='receptionist',
            is_staff=True,
            is_superuser=False
        )

class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0012_customuser_can_access_integrations_and_more'),
    ]

    operations = [
        migrations.RunPython(create_default_admin),
    ]
