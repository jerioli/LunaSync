from django.db import migrations

def restrict_default_superadmin(apps, schema_editor):
    """
    Restrict the default superadmin account to prevent access to sensitive areas.
    The default superadmin will have limited permissions similar to an admin user.
    """
    CustomUser = apps.get_model('accounts', 'CustomUser')
    
    try:
        # Find the default superadmin account
        default_superadmin = CustomUser.objects.get(username='superadmin')
        
        # Restrict permissions for the default superadmin account
        # Remove sensitive superadmin-only permissions
        default_superadmin.can_manage_permissions = False
        default_superadmin.can_view_audit_logs = False
        
        # Keep basic administrative permissions but mark as restricted
        default_superadmin.can_manage_appointments = True
        default_superadmin.can_manage_patients = True
        default_superadmin.can_manage_staff = False  # Remove staff management
        default_superadmin.can_view_reports = True
        default_superadmin.can_manage_clinic_settings = False  # Remove clinic settings management
        default_superadmin.can_manage_inventory = True
        
        # Remove superuser status to prevent Django admin access
        default_superadmin.is_superuser = False
        
        default_superadmin.save()
        
        print(f"Successfully restricted default superadmin account: {default_superadmin.username}")
        
    except CustomUser.DoesNotExist:
        print("Default superadmin account not found, skipping restriction")
    
    # Also restrict the default 'admin' account if it exists
    try:
        default_admin = CustomUser.objects.get(username='admin')
        
        # Ensure admin account also has proper restrictions
        default_admin.can_manage_permissions = False
        default_admin.can_view_audit_logs = False
        default_admin.is_superuser = False
        
        default_admin.save()
        
        print(f"Successfully restricted default admin account: {default_admin.username}")
        
    except CustomUser.DoesNotExist:
        print("Default admin account not found, skipping restriction")

def reverse_default_superadmin_restriction(apps, schema_editor):
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
            restrict_default_superadmin,
            reverse_default_superadmin_restriction
        ),
    ]