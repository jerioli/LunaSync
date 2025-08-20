from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class AuditLog(models.Model):
    """
    Model to store audit logs for all system activities
    """
    # Action types
    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('READ', 'Read'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('PASSWORD_CHANGE', 'Password Change'),
        ('PERMISSION_CHANGE', 'Permission Change'),
        ('BULK_OPERATION', 'Bulk Operation'),
        ('EXPORT', 'Export'),
        ('IMPORT', 'Import'),
    ]
    
    # Resource types
    RESOURCE_CHOICES = [
        ('USER', 'User'),
        ('PATIENT', 'Patient'),
        ('APPOINTMENT', 'Appointment'),
        ('PRESCRIPTION', 'Prescription'),
        ('MEDICAL_DOCUMENT', 'Medical Document'),
        ('MEDICAL_REQUEST', 'Medical Request'),
        ('STAFF', 'Staff'),
        ('CLINIC_SETTINGS', 'Clinic Settings'),
        ('PERMISSIONS', 'Permissions'),
        ('AUTHENTICATION', 'Authentication'),
        ('SYSTEM', 'System'),
    ]
    
    # Basic fields
    timestamp = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    user_email = models.EmailField(blank=True)  # Store email even if user is deleted
    
    # Action details
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=20, choices=RESOURCE_CHOICES)
    resource_id = models.CharField(max_length=100, blank=True)  # ID of the affected resource
    resource_name = models.CharField(max_length=255, blank=True)  # Name/description of resource
    
    # Detailed information
    description = models.TextField()  # Human-readable description
    details = models.JSONField(default=dict, blank=True)  # Additional structured data
    
    # Request metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    session_key = models.CharField(max_length=40, blank=True)
    
    # Changes tracking (for UPDATE actions)
    old_values = models.JSONField(default=dict, blank=True)
    new_values = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['user']),
            models.Index(fields=['action']),
            models.Index(fields=['resource_type']),
            models.Index(fields=['resource_id']),
        ]
    
    def __str__(self):
        return f"{self.timestamp} - {self.user_email or 'System'} - {self.action} {self.resource_type}"
