"""
Management command to create Jerry's static superadmin account for LunaSync.

This command creates a specific superadmin account for Jerry Olivarez with predefined credentials.
It can be run safely multiple times - it will not create duplicate accounts.

Usage:
    python manage.py create_jerry_superadmin
    python manage.py create_jerry_superadmin --force  # To update if exists
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db import IntegrityError
import os

User = get_user_model()

class Command(BaseCommand):
    help = 'Create Jerry Olivarez static superadmin account'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update existing superadmin account'
        )

    def handle(self, *args, **options):
        # Static credentials for Jerry's superadmin account
        email = 'jerryolivarez231@gmail.com'
        password = 'JerryAdmin2024!'
        username = 'jerry_superadmin'
        first_name = 'Jerry'
        last_name = 'Olivarez'
        
        force = options['force']

        # Check if this specific superadmin already exists
        existing_superadmin = User.objects.filter(
            email=email
        ).first()

        if existing_superadmin and not force:
            self.stdout.write(
                self.style.WARNING(
                    f'Jerry\'s superadmin account ({email}) already exists. '
                    'Use --force to update the existing account.'
                )
            )
            self.stdout.write(
                self.style.HTTP_INFO(
                    f'Existing account details:\n'
                    f'  ID: {existing_superadmin.id}\n'
                    f'  Email: {existing_superadmin.email}\n'
                    f'  Username: {existing_superadmin.username}\n'
                    f'  Role: {existing_superadmin.role}\n'
                    f'  Active: {existing_superadmin.is_active}\n'
                    f'  Created: {existing_superadmin.date_joined}\n'
                )
            )
            return

        try:
            if existing_superadmin and force:
                # Update existing account
                user = existing_superadmin
                user.set_password(password)
                user.username = username
                user.first_name = first_name
                user.last_name = last_name
                user.role = 'superadmin'
                user.is_active = True
                user.is_staff = True
                user.is_superuser = True
                user.force_password_change = False
                action = 'updated'
            else:
                # Create new superadmin
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    role='superadmin',
                    is_active=True,
                    is_staff=True,
                    is_superuser=True,
                    force_password_change=False
                )
                action = 'created'

            # Set all permissions for superadmin
            user.can_manage_appointments = True
            user.can_manage_patients = True
            user.can_manage_staff = True
            user.can_view_reports = True
            user.can_manage_clinic_settings = True
            user.can_manage_inventory = True
            
            # Superadmin exclusive permissions
            user.can_manage_permissions = True
            user.can_access_integrations = True
            user.can_view_audit_logs = True
            user.can_view_usage_reports = True
            user.can_access_security_testing = True

            user.save()

            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Successfully {action} Jerry\'s superadmin account!\n'
                    f'\n'
                    f'📋 ACCOUNT DETAILS:\n'
                    f'  Name: {first_name} {last_name}\n'
                    f'  Email: {email}\n'
                    f'  Username: {username}\n'
                    f'  Password: {password}\n'
                    f'  Role: superadmin\n'
                    f'  User ID: {user.id}\n'
                    f'  All permissions: ✅ Enabled\n'
                    f'\n'
                    f'🔐 ENABLED PERMISSIONS:\n'
                    f'  • Manage Appointments: ✅\n'
                    f'  • Manage Patients: ✅\n'
                    f'  • Manage Staff: ✅\n'
                    f'  • View Reports: ✅\n'
                    f'  • Manage Clinic Settings: ✅\n'
                    f'  • Manage Inventory: ✅\n'
                    f'  • Manage Permissions: ✅ (Superadmin only)\n'
                    f'  • Access Integrations: ✅ (Superadmin only)\n'
                    f'  • View Audit Logs: ✅ (Superadmin only)\n'
                    f'  • View Usage Reports: ✅ (Superadmin only)\n'
                    f'  • Security Testing: ✅ (Superadmin only)\n'
                    f'\n'
                    f'⚠️  SECURITY REMINDERS:\n'
                    f'  1. This account has FULL system access\n'
                    f'  2. Change password after first login\n'
                    f'  3. Enable 2FA when available\n'
                    f'  4. Monitor account usage regularly\n'
                    f'  5. Use responsibly - all actions are logged\n'
                )
            )

            # Log creation for audit trail
            self.log_creation(user, action)

            self.stdout.write(
                self.style.HTTP_INFO(
                    f'🔍 Audit log entry created for superadmin {action}'
                )
            )

        except IntegrityError as e:
            if 'username' in str(e):
                raise CommandError(
                    f'Username "{username}" already exists. Use --force to update existing account.'
                )
            elif 'email' in str(e):
                raise CommandError(
                    f'Email "{email}" already exists. Use --force to update existing account.'
                )
            else:
                raise CommandError(
                    f'Failed to create Jerry\'s superadmin account due to database constraint: {e}'
                )
        except Exception as e:
            raise CommandError(f'Unexpected error creating Jerry\'s superadmin account: {e}')

    def log_creation(self, user, action):
        """Log the superadmin creation for audit purposes"""
        try:
            from systemlogs.models import SystemLog
            SystemLog.objects.create(
                user=user,
                action=f'JERRY_SUPERADMIN_{action.upper()}',
                description=f'Jerry Olivarez superadmin account {action} via management command',
                ip_address='127.0.0.1',
                details={
                    'email': user.email,
                    'username': user.username,
                    'role': user.role,
                    'full_name': f'{user.first_name} {user.last_name}',
                    'created_via': 'jerry_superadmin_command',
                    'permissions_enabled': 'all_superadmin_permissions'
                }
            )
        except Exception as e:
            # Don't fail the command if logging fails
            self.stdout.write(
                self.style.WARNING(f'Could not create audit log: {e}')
            )