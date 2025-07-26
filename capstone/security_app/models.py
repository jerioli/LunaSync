from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import json

User = get_user_model()

class SecurityAudit(models.Model):
    """Track security audits and their results"""
    AUDIT_TYPES = [
        ('system', 'System Security Audit'),
        ('data', 'Data Protection Audit'),
        ('access', 'Access Control Audit'),
        ('backup', 'Backup System Audit'),
        ('encryption', 'Encryption Status Audit'),
    ]
    
    AUDIT_STATUS = [
        ('passed', 'Passed'),
        ('failed', 'Failed'),
        ('warning', 'Warning'),
        ('in_progress', 'In Progress'),
    ]
    
    audit_type = models.CharField(max_length=20, choices=AUDIT_TYPES)
    status = models.CharField(max_length=20, choices=AUDIT_STATUS, default='in_progress')
    audit_date = models.DateTimeField(default=timezone.now)
    completed_date = models.DateTimeField(null=True, blank=True)
    auditor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conducted_audits')
    findings = models.TextField(blank=True)
    recommendations = models.TextField(blank=True)
    score = models.IntegerField(default=0, help_text='Audit score out of 100')
    
    class Meta:
        ordering = ['-audit_date']
    
    def __str__(self):
        return f"{self.get_audit_type_display()} - {self.audit_date.strftime('%Y-%m-%d')}"

class EncryptionStatus(models.Model):
    """Track encryption status for different data types"""
    ENCRYPTION_TYPES = [
        ('database', 'Database Encryption'),
        ('files', 'File System Encryption'),
        ('communication', 'Communication Encryption'),
        ('backup', 'Backup Encryption'),
    ]
    
    encryption_type = models.CharField(max_length=20, choices=ENCRYPTION_TYPES, unique=True)
    is_enabled = models.BooleanField(default=False)
    algorithm = models.CharField(max_length=50, blank=True)
    key_strength = models.CharField(max_length=20, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    details = models.JSONField(default=dict, blank=True)
    
    def __str__(self):
        return f"{self.get_encryption_type_display()} - {'Enabled' if self.is_enabled else 'Disabled'}"

class BackupStatus(models.Model):
    """Track backup operations and status"""
    BACKUP_TYPES = [
        ('full', 'Full Backup'),
        ('incremental', 'Incremental Backup'),
        ('differential', 'Differential Backup'),
    ]
    
    BACKUP_STATUS = [
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('in_progress', 'In Progress'),
        ('scheduled', 'Scheduled'),
    ]
    
    backup_type = models.CharField(max_length=20, choices=BACKUP_TYPES)
    status = models.CharField(max_length=20, choices=BACKUP_STATUS, default='scheduled')
    start_time = models.DateTimeField(default=timezone.now)
    end_time = models.DateTimeField(null=True, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True, help_text='Size in bytes')
    location = models.CharField(max_length=255, blank=True)
    checksum = models.CharField(max_length=128, blank=True)
    error_message = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-start_time']
    
    def __str__(self):
        return f"{self.get_backup_type_display()} - {self.start_time.strftime('%Y-%m-%d %H:%M')}"

class SecuritySettings(models.Model):
    """Global security settings and configurations"""
    # Password policy
    min_password_length = models.IntegerField(default=8)
    require_uppercase = models.BooleanField(default=True)
    require_lowercase = models.BooleanField(default=True)
    require_numbers = models.BooleanField(default=True)
    require_special_chars = models.BooleanField(default=True)
    password_expiry_days = models.IntegerField(default=90)
    
    # Session security
    session_timeout_minutes = models.IntegerField(default=30)
    max_login_attempts = models.IntegerField(default=5)
    lockout_duration_minutes = models.IntegerField(default=15)
    
    # Audit settings
    enable_audit_logging = models.BooleanField(default=True)
    audit_retention_days = models.IntegerField(default=365)
    
    # Backup settings
    auto_backup_enabled = models.BooleanField(default=True)
    backup_frequency_hours = models.IntegerField(default=24)
    backup_retention_days = models.IntegerField(default=30)
    
    # Encryption settings
    encryption_enabled = models.BooleanField(default=True)
    encryption_algorithm = models.CharField(max_length=50, default='AES-256')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    class Meta:
        verbose_name = 'Security Settings'
        verbose_name_plural = 'Security Settings'
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and SecuritySettings.objects.exists():
            raise ValueError('Only one SecuritySettings instance allowed')
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Security Settings - Updated {self.updated_at.strftime('%Y-%m-%d')}"

class SecurityIncident(models.Model):
    """Track security incidents and responses"""
    SEVERITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    INCIDENT_TYPES = [
        ('breach', 'Data Breach'),
        ('unauthorized_access', 'Unauthorized Access'),
        ('malware', 'Malware Detection'),
        ('phishing', 'Phishing Attempt'),
        ('ddos', 'DDoS Attack'),
        ('other', 'Other'),
    ]
    
    INCIDENT_STATUS = [
        ('open', 'Open'),
        ('investigating', 'Under Investigation'),
        ('resolved', 'Resolved'),
        ('false_positive', 'False Positive'),
    ]
    
    incident_id = models.CharField(max_length=20, unique=True)
    incident_type = models.CharField(max_length=30, choices=INCIDENT_TYPES)
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS)
    status = models.CharField(max_length=20, choices=INCIDENT_STATUS, default='open')
    title = models.CharField(max_length=200)
    description = models.TextField()
    detected_at = models.DateTimeField(default=timezone.now)
    resolved_at = models.DateTimeField(null=True, blank=True)
    assigned_to = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_incidents')
    reported_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reported_incidents')
    
    class Meta:
        ordering = ['-detected_at']
    
    def __str__(self):
        return f"{self.incident_id} - {self.title}"
