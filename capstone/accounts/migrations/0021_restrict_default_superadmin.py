from django.db import migrations

def ensure_default_superadmin_permissions(apps, schema_editor):
    """
    Ensure the default superadmin account has full superadmin permissions.
    This gives the default superadmin access to audit logs, permissions, dashboard, staff, user settings.
    """
    CustomUser = apps.get_model('accounts', 'CustomUser')
    
    try:
        # Find the default superadmin account
        default_superadmin = CustomUser.objects.get(username='superadmin')
        
        # Give default superadmin full permissions like when creating new superadmin
        default_superadmin.can_manage_appointments = True
        default_superadmin.can_manage_patients = True
        default_superadmin.can_manage_staff = True
        default_superadmin.can_view_reports = True
        default_superadmin.can_manage_clinic_settings = True
        default_superadmin.can_manage_inventory = True
        default_superadmin.can_manage_permissions = True
        default_superadmin.can_view_audit_logs = True
        
        # Maintain superuser status for Django admin access
        default_superadmin.is_superuser = True
        
        default_superadmin.save()
        
        print(f"Successfully ensured full permissions for default superadmin account: {default_superadmin.username}")
        
    except CustomUser.DoesNotExist:
        print("Default superadmin account not found, skipping permissions update")
    
    # Ensure the default 'admin' account has proper admin permissions
    try:
        default_admin = CustomUser.objects.get(username='admin')
        
        # Give admin account standard admin permissions
        default_admin.can_manage_appointments = True
        default_admin.can_manage_patients = True
        default_admin.can_manage_staff = True
        default_admin.can_view_reports = True
        default_admin.can_manage_clinic_settings = True
        default_admin.can_manage_inventory = True
        default_admin.can_manage_permissions = False  # No permission management for admin
        default_admin.can_view_audit_logs = False  # No audit logs for admin
        default_admin.is_superuser = True  # Allow Django admin access
        
        default_admin.save()
        
        print(f"Successfully ensured admin permissions for default admin account: {default_admin.username}")
        
    except CustomUser.DoesNotExist:
        print("Default admin account not found, skipping permissions update")

def reverse_default_superadmin_permissions(apps, schema_editor):
    """
    Reverse the restriction on default superadmin account.
    This should only be used if the migration needs to be reversed.
    """
    CustomUser = apps.get_model('accounts', 'CustomUser')
    
    try:
        # Restore default superadmin account permissions
        default_superadmin = CustomUser.objects.get(username='superadmin')
        
        # Restore full superadmin permissions
        default_superadmin.can_manage_appointments = True
        default_superadmin.can_manage_patients = True
        default_superadmin.can_manage_staff = True
        default_superadmin.can_view_reports = True
        default_superadmin.can_manage_clinic_settings = True
        default_superadmin.can_manage_inventory = True
        default_superadmin.can_manage_permissions = True
        default_superadmin.can_view_audit_logs = True
        default_superadmin.is_superuser = True
        
        default_superadmin.save()
        
        print(f"Successfully restored default superadmin account: {default_superadmin.username}")
        
    except CustomUser.DoesNotExist:
        print("Default superadmin account not found during reverse")

class Migration(migrations.Migration):
    
    dependencies = [
        ('accounts', '0020_remove_unused_permissions'),
    ]

    operations = [
        migrations.RunPython(
            ensure_default_superadmin_permissions,
            reverse_default_superadmin_permissions
        ),
    ]