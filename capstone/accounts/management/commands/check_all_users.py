"""
Django management command to check all users in the database
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Check all users in the database and look for Jerry'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('👥 Checking All Users in Database'))
        self.stdout.write("=" * 60)
        
        # Get all users
        all_users = User.objects.all()
        
        self.stdout.write(f"📊 Total users in database: {all_users.count()}")
        self.stdout.write("=" * 60)
        
        if all_users.count() == 0:
            self.stdout.write("❌ No users found in database!")
            return
        
        # Display all users
        for i, user in enumerate(all_users, 1):
            self.stdout.write(f"\n👤 User #{i}:")
            self.stdout.write(f"  - ID: {user.id}")
            self.stdout.write(f"  - Email: {user.email}")
            self.stdout.write(f"  - Username: {user.username}")
            self.stdout.write(f"  - First Name: {user.first_name}")
            self.stdout.write(f"  - Last Name: {user.last_name}")
            self.stdout.write(f"  - Role: {getattr(user, 'role', 'Not set')}")
            self.stdout.write(f"  - Active: {user.is_active}")
            self.stdout.write(f"  - Superuser: {user.is_superuser}")
            self.stdout.write(f"  - Staff: {user.is_staff}")
            self.stdout.write(f"  - Date Joined: {user.date_joined}")
            self.stdout.write(f"  - Last Login: {user.last_login}")
            
            # Check permissions
            permission_fields = [
                'can_manage_appointments', 'can_manage_patients', 'can_manage_staff',
                'can_view_reports', 'can_manage_clinic_settings', 'can_manage_inventory',
                'can_manage_permissions', 'can_access_integrations', 'can_view_audit_logs',
                'can_view_usage_reports', 'can_access_security_testing'
            ]
            
            permissions = []
            for perm in permission_fields:
                if hasattr(user, perm):
                    value = getattr(user, perm)
                    permissions.append(f"{perm}: {'✅' if value else '❌'}")
            
            if permissions:
                self.stdout.write(f"  - Permissions:")
                for perm in permissions:
                    self.stdout.write(f"    {perm}")
        
        # Look specifically for Jerry-related accounts
        self.stdout.write(f"\n" + "=" * 60)
        self.stdout.write(f"🔍 Looking for Jerry-related accounts...")
        
        # Search by email
        jerry_emails = [
            'jerryolivarez231@gmail.com',
            'jeri.olivarez@gmail.com',
            'jerry@lunasync.site',
            'admin@lunasync.site'
        ]
        
        for email in jerry_emails:
            try:
                user = User.objects.get(email=email)
                self.stdout.write(f"✅ Found user with email {email}:")
                self.stdout.write(f"  - ID: {user.id}")
                self.stdout.write(f"  - Username: {user.username}")
                self.stdout.write(f"  - Name: {user.first_name} {user.last_name}")
            except User.DoesNotExist:
                self.stdout.write(f"❌ No user found with email: {email}")
        
        # Search by username
        jerry_usernames = [
            'jerry_superadmin',
            'jerry',
            'jerryolivarez',
            'admin',
            'superadmin'
        ]
        
        self.stdout.write(f"\n🔍 Looking for Jerry-related usernames...")
        for username in jerry_usernames:
            try:
                user = User.objects.get(username=username)
                self.stdout.write(f"✅ Found user with username {username}:")
                self.stdout.write(f"  - ID: {user.id}")
                self.stdout.write(f"  - Email: {user.email}")
                self.stdout.write(f"  - Name: {user.first_name} {user.last_name}")
            except User.DoesNotExist:
                self.stdout.write(f"❌ No user found with username: {username}")
        
        # Search by name
        self.stdout.write(f"\n🔍 Looking for users with 'Jerry' or 'Olivarez' in name...")
        jerry_name_users = User.objects.filter(
            first_name__icontains='jerry'
        ) | User.objects.filter(
            last_name__icontains='olivarez'
        ) | User.objects.filter(
            first_name__icontains='jeri'
        )
        
        if jerry_name_users.exists():
            for user in jerry_name_users:
                self.stdout.write(f"✅ Found user with Jerry/Olivarez name:")
                self.stdout.write(f"  - ID: {user.id}")
                self.stdout.write(f"  - Email: {user.email}")
                self.stdout.write(f"  - Username: {user.username}")
                self.stdout.write(f"  - Name: {user.first_name} {user.last_name}")
        else:
            self.stdout.write(f"❌ No users found with Jerry or Olivarez in name")
        
        # Check for superadmin users
        self.stdout.write(f"\n🔍 Looking for superadmin/admin users...")
        superusers = User.objects.filter(is_superuser=True)
        admin_role_users = User.objects.filter(role='superadmin') if hasattr(User(), 'role') else []
        
        if superusers.exists():
            self.stdout.write(f"✅ Found {superusers.count()} superuser(s):")
            for user in superusers:
                self.stdout.write(f"  - {user.email} (ID: {user.id}) - {user.first_name} {user.last_name}")
        else:
            self.stdout.write(f"❌ No superusers found")
        
        if admin_role_users:
            self.stdout.write(f"✅ Found {len(admin_role_users)} superadmin role user(s):")
            for user in admin_role_users:
                self.stdout.write(f"  - {user.email} (ID: {user.id}) - {user.first_name} {user.last_name}")
        else:
            self.stdout.write(f"❌ No users with superadmin role found")
        
        self.stdout.write(f"\n" + "=" * 60)
        self.stdout.write(f"💡 RECOMMENDATIONS:")
        self.stdout.write(f"  1. If no Jerry account exists, run: python manage.py create_jerry_superadmin")
        self.stdout.write(f"  2. If account exists with different email, update the test")
        self.stdout.write(f"  3. Check if there are any users you can test OTP with")
        self.stdout.write(f"=" * 60)