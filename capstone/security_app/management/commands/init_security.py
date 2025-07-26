from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta
from security_app.models import (
    SecurityAudit, EncryptionStatus, BackupStatus, 
    SecuritySettings, SecurityIncident
)

User = get_user_model()

class Command(BaseCommand):
    help = 'Initialize security data with default values'

    def handle(self, *args, **options):
        self.stdout.write('Initializing security data...')
        
        # Get or create an admin user
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            admin_user = User.objects.filter(role='admin').first()
        if not admin_user:
            admin_user = User.objects.first()
        
        if not admin_user:
            self.stdout.write(
                self.style.ERROR('No users found. Please create a user first.')
            )
            return

        # Initialize Encryption Status
        encryption_types = [
            {'type': 'database', 'enabled': True, 'algorithm': 'AES-256', 'strength': '256-bit'},
            {'type': 'files', 'enabled': True, 'algorithm': 'AES-256', 'strength': '256-bit'},
            {'type': 'communication', 'enabled': True, 'algorithm': 'TLS 1.3', 'strength': '256-bit'},
            {'type': 'backup', 'enabled': True, 'algorithm': 'AES-256', 'strength': '256-bit'},
        ]
        
        for enc_data in encryption_types:
            encryption, created = EncryptionStatus.objects.get_or_create(
                encryption_type=enc_data['type'],
                defaults={
                    'is_enabled': enc_data['enabled'],
                    'algorithm': enc_data['algorithm'],
                    'key_strength': enc_data['strength']
                }
            )
            if created:
                self.stdout.write(f'Created encryption status for {enc_data["type"]}')

        # Initialize Backup Status
        if not BackupStatus.objects.exists():
            BackupStatus.objects.create(
                backup_type='full',
                status='success',
                start_time=timezone.now() - timedelta(hours=2),
                end_time=timezone.now() - timedelta(hours=1),
                file_size=1024*1024*500,  # 500MB
                location='/backups/daily/',
                checksum='abc123def456789'
            )
            self.stdout.write('Created initial backup status')

        # Initialize Security Audit
        if not SecurityAudit.objects.exists():
            SecurityAudit.objects.create(
                audit_type='system',
                status='passed',
                audit_date=timezone.now() - timedelta(days=7),
                completed_date=timezone.now() - timedelta(days=7, hours=2),
                auditor=admin_user,
                findings='System security audit completed successfully. All security measures are functioning properly.',
                recommendations='Continue regular security audits and maintain current security protocols.',
                score=95
            )
            self.stdout.write('Created initial security audit')

        # Initialize Security Settings
        if not SecuritySettings.objects.exists():
            SecuritySettings.objects.create(
                updated_by=admin_user,
                min_password_length=8,
                require_uppercase=True,
                require_lowercase=True,
                require_numbers=True,
                require_special_chars=True,
                password_expiry_days=90,
                session_timeout_minutes=30,
                max_login_attempts=5,
                lockout_duration_minutes=15,
                enable_audit_logging=True,
                audit_retention_days=365,
                auto_backup_enabled=True,
                backup_frequency_hours=24,
                backup_retention_days=30,
                encryption_enabled=True,
                encryption_algorithm='AES-256'
            )
            self.stdout.write('Created security settings')

        # Create a sample resolved security incident (optional)
        if not SecurityIncident.objects.exists():
            SecurityIncident.objects.create(
                incident_id='SEC-2025-001',
                incident_type='unauthorized_access',
                severity='medium',
                status='resolved',
                title='Suspicious login attempt detected',
                description='Multiple failed login attempts detected from IP address. Account temporarily locked as precaution.',
                detected_at=timezone.now() - timedelta(days=15),
                resolved_at=timezone.now() - timedelta(days=14),
                assigned_to=admin_user,
                reported_by=admin_user
            )
            self.stdout.write('Created sample security incident')

        self.stdout.write(
            self.style.SUCCESS('Successfully initialized security data!')
        )
