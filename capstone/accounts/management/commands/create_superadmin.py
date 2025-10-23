"""
Management command to create a default superadmin account for LunaSync deployment.

This command creates a superadmin account with all permissions enabled.
It can be run safely multiple times - it will not create duplicate accounts.

Usage:
    python manage.py create_superadmin
    python manage.py create_superadmin --email custom@email.com --password custompass
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db import IntegrityError
import os

User = get_user_model()

class Command(BaseCommand):
    help = 'Create a default superadmin account for deployment'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            default='admin@lunasync.site',
            help='Email for the superadmin account (default: admin@lunasync.site)'
        )
        parser.add_argument(
            '--password',
            type=str,
            default='LunaSync2024!',
            help='Password for the superadmin account (default: LunaSync2024!)'
        )
        parser.add_argument(
            '--username',
            type=str,
            default=None,
            help='Username for the superadmin account (default: uses email)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update existing superadmin account'
        )

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        username = options['username'] or email
        force = options['force']

        # Check if superadmin already exists
        existing_superadmin = User.objects.filter(
            role='superadmin',
            email=email
        ).first()

        if existing_superadmin and not force:
            self.stdout.write(
                self.style.WARNING(
                    f'Superadmin account with email {email} already exists. '
                    'Use --force to update the existing account.'
                )
            )
            return

        try:
            if existing_superadmin and force:
                # Update existing superadmin
                user = existing_superadmin
                user.set_password(password)
                user.username = username
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
                    f'Successfully {action} superadmin account:\n'
                    f'  Email: {email}\n'
                    f'  Username: {username}\n'
                    f'  Password: {password}\n'
                    f'  Role: superadmin\n'
                    f'  All permissions: Enabled\n'
                    f'\n'
                    f'⚠️  IMPORTANT SECURITY NOTES:\n'
                    f'  1. Change the password after first login\n'
                    f'  2. Consider using environment variables for credentials\n'
                    f'  3. Restrict access to this account\n'
                    f'  4. Enable 2FA if available\n'
                )
            )

            # Log creation for audit trail
            self.stdout.write(
                self.style.HTTP_INFO(
                    f'Superadmin account {action} on deployment. '
                    f'User ID: {user.id}, Email: {email}'
                )
            )

        except IntegrityError as e:
            raise CommandError(
                f'Failed to create superadmin account due to database constraint: {e}'
            )
        except Exception as e:
            raise CommandError(f'Unexpected error creating superadmin account: {e}')

    def log_creation(self, user, action):
        """Log the superadmin creation for audit purposes"""
        try:
            from systemlogs.models import SystemLog
            SystemLog.objects.create(
                user=user,
                action=f'SUPERADMIN_{action.upper()}',
                description=f'Superadmin account {action} via management command',
                ip_address='127.0.0.1',
                details={
                    'email': user.email,
                    'username': user.username,
                    'role': user.role,
                    'created_via': 'management_command'
                }
            )
        except Exception as e:
            # Don't fail the command if logging fails
            self.stdout.write(
                self.style.WARNING(f'Could not create audit log: {e}')
            )