from django.db import migrations

def remove_superadmin_patient_appointment_permissions(apps, schema_editor):
    """
    Remove patient and appointment management permissions from superadmin accounts.
    Superadmin should only manage staff, settings, permissions, and audit logs.
    """
    CustomUser = apps.get_model('accounts', 'CustomUser')
    
    # Update all superadmin accounts
    superadmins = CustomUser.objects.filter(role='superadmin')
    
    for superadmin in superadmins:
        # Remove patient, appointment, and inventory permissions
        superadmin.can_manage_patients = False
        superadmin.can_manage_appointments = False
        superadmin.can_manage_inventory = False
        
        # Keep essential superadmin permissions
        superadmin.can_manage_staff = True
        superadmin.can_view_reports = True
        superadmin.can_manage_clinic_settings = True
        superadmin.can_manage_permissions = True
        superadmin.can_view_audit_logs = True
        
        superadmin.save()
        
        print(f"Updated permissions for superadmin: {superadmin.username}")

def restore_superadmin_patient_appointment_permissions(apps, schema_editor):
    """
    Restore patient and appointment management permissions for superadmin accounts.
    This reversal should only be used if needed.
    """
    CustomUser = apps.get_model('accounts', 'CustomUser')
    
    # Update all superadmin accounts
    superadmins = CustomUser.objects.filter(role='superadmin')
    
    for superadmin in superadmins:
        # Restore all permissions
        superadmin.can_manage_patients = True
        superadmin.can_manage_appointments = True
        superadmin.can_manage_inventory = True
        superadmin.can_manage_staff = True
        superadmin.can_view_reports = True
        superadmin.can_manage_clinic_settings = True
        superadmin.can_manage_permissions = True
        superadmin.can_view_audit_logs = True
        
        superadmin.save()
        
        print(f"Restored permissions for superadmin: {superadmin.username}")

class Migration(migrations.Migration):
    
    dependencies = [
        ('accounts', '0023_mark_default_accounts'),
    ]

    operations = [
        migrations.RunPython(
            remove_superadmin_patient_appointment_permissions,
            restore_superadmin_patient_appointment_permissions
        ),
    ]