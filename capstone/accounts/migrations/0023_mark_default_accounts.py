from django.db import migrations

def mark_default_accounts(apps, schema_editor):
    """
    Mark default system accounts with the is_default_account flag.
    These accounts should have restricted access to sensitive features.
    """
    CustomUser = apps.get_model('accounts', 'CustomUser')
    
    # List of default account usernames that should be marked as restricted
    default_usernames = ['superadmin', 'admin', 'doctor', 'receptionist']
    
    for username in default_usernames:
        try:
            user = CustomUser.objects.get(username=username)
            user.is_default_account = True
            user.save()
            print(f"Marked {username} as default account")
        except CustomUser.DoesNotExist:
            print(f"Default account {username} not found, skipping")

def unmark_default_accounts(apps, schema_editor):
    """
    Remove the default account flag from all users.
    This is used when reversing the migration.
    """
    CustomUser = apps.get_model('accounts', 'CustomUser')
    
    # Reset all default account flags
    CustomUser.objects.filter(is_default_account=True).update(is_default_account=False)
    print("Removed default account flags from all users")

class Migration(migrations.Migration):
    
    dependencies = [
        ('accounts', '0022_add_is_default_account_field'),
    ]

    operations = [
        migrations.RunPython(
            mark_default_accounts,
            unmark_default_accounts
        ),
    ]