from django.db import migrations
from django.contrib.auth.hashers import make_password

def create_default_admin(apps, schema_editor):
    CustomUser = apps.get_model('accounts', 'CustomUser')
    
    # Create default superadmin with full permissions
    if not CustomUser.objects.filter(username='superadmin').exists():
        superadmin_user = CustomUser(
            username='superadmin',
            email='superadmin@example.com',
            password=make_password('superadminpassword'),
            role='superadmin',
            is_staff=True,
            is_superuser=True,
            can_manage_appointments=True,
            can_manage_patients=True,
            can_manage_staff=True,
            can_view_reports=True,
            can_manage_clinic_settings=True,
            can_manage_inventory=True,
            can_manage_permissions=True,
            can_view_audit_logs=True
        )
        superadmin_user.save()
    
    # Create default admin with all permissions except superadmin-exclusive ones
    if not CustomUser.objects.filter(username='admin').exists():
        admin_user = CustomUser(
            username='admin',
            email='admin@example.com',
            password=make_password('adminpassword'),
            role='admin',
            is_staff=True,
            is_superuser=True,
            can_manage_appointments=True,
            can_manage_patients=True,
            can_manage_staff=True,
            can_view_reports=True,
            can_manage_clinic_settings=True,
            can_manage_inventory=True,
            can_manage_permissions=False,
            can_view_audit_logs=False
        )
        admin_user.save()

    # Create default doctor with patient management and report viewing
    if not CustomUser.objects.filter(username='doctor').exists():
        doctor_user = CustomUser(
            username='doctor',
            email='doctor@example.com',
            password=make_password('doctorpassword'),
            role='doctor',
            is_staff=True,
            is_superuser=False,
            can_manage_appointments=False,
            can_manage_patients=True,
            can_manage_staff=False,
            can_view_reports=True,
            can_manage_clinic_settings=False,
            can_manage_inventory=True,
            can_manage_permissions=False,
            can_view_audit_logs=False
        )
        doctor_user.save()

    # Create default receptionist with appointment and patient management
    if not CustomUser.objects.filter(username='receptionist').exists():
        receptionist_user = CustomUser(
            username='receptionist',
            email='receptionist@example.com',
            password=make_password('receptionistpassword'),
            role='receptionist',
            is_staff=True,
            is_superuser=False,
            can_manage_appointments=True,
            can_manage_patients=True,
            can_manage_staff=False,
            can_view_reports=False,
            can_manage_clinic_settings=False,
            can_manage_inventory=True,
            can_manage_permissions=False,
            can_view_audit_logs=False
        )
        receptionist_user.save()

class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0012_customuser_can_access_integrations_and_more'),
    ]

    operations = [
        migrations.RunPython(create_default_admin),
    ]
