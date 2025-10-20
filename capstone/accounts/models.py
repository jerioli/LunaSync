from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models
from security_app.fields import EncryptedCharField

class CustomUserManager(UserManager):
    def create_user(self, username=None, email=None, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        if not username:
            username = email
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)  # Hash the password
        user.save(using=self._db)
        return user

class CustomUser(AbstractUser):
    email = EncryptedCharField(max_length=600, unique=True)
    phone = EncryptedCharField(max_length=100, blank=True, null=True)
    license_number = EncryptedCharField(max_length=100, blank=True, null=True)  # For doctor's license
    ROLE_CHOICES = (
        ('superadmin', 'Super Admin'),
        ('admin', 'Admin'),
        ('receptionist', 'Receptionist'),
        ('doctor', 'Doctor'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='doctor')
    force_password_change = models.BooleanField(default=False)  # Flag for first-time login
    
    # Permission fields for granular access control
    can_manage_appointments = models.BooleanField(default=False)
    can_manage_patients = models.BooleanField(default=False)
    can_manage_staff = models.BooleanField(default=False)
    can_view_reports = models.BooleanField(default=False)
    can_manage_clinic_settings = models.BooleanField(default=False)
    can_manage_inventory = models.BooleanField(default=False)  # New permission for inventory management
    
    # Superadmin exclusive permissions
    can_manage_permissions = models.BooleanField(default=False)
    can_access_integrations = models.BooleanField(default=False)
    can_view_audit_logs = models.BooleanField(default=False)
    can_view_usage_reports = models.BooleanField(default=False)
    can_access_security_testing = models.BooleanField(default=False)
    
    objects = CustomUserManager()
    
    class Meta:
        db_table = 'Users'
    
    def __str__(self):
        return f"{self.username} ({self.role})"
    
    def save(self, *args, **kwargs):
        # Only set default permissions on creation
        if self._state.adding:
            if self.role == 'superadmin':
                self.can_manage_appointments = True
                self.can_manage_patients = True
                self.can_manage_staff = True
                self.can_view_reports = True
                self.can_manage_clinic_settings = True
                self.can_manage_inventory = True
                self.can_manage_permissions = True
                self.can_access_integrations = True
                self.can_view_audit_logs = True
                self.can_view_usage_reports = True
                self.can_access_security_testing = True
            elif self.role == 'admin':
                self.can_manage_appointments = True
                self.can_manage_patients = True
                self.can_manage_staff = True
                self.can_view_reports = True
                self.can_manage_clinic_settings = True
                self.can_manage_inventory = True
                self.can_manage_permissions = False
                self.can_access_integrations = False
                self.can_view_audit_logs = False
                self.can_view_usage_reports = False
                self.can_access_security_testing = False
            elif self.role == 'receptionist':
                self.can_manage_appointments = True
                self.can_manage_patients = True
                self.can_manage_staff = False
                self.can_view_reports = False
                self.can_manage_clinic_settings = False
                self.can_manage_inventory = True
                self.can_manage_permissions = False
                self.can_access_integrations = False
                self.can_view_audit_logs = False
                self.can_view_usage_reports = False
                self.can_access_security_testing = False
            elif self.role == 'doctor':
                self.can_manage_appointments = False
                self.can_manage_patients = True
                self.can_manage_staff = False
                self.can_view_reports = True
                self.can_manage_clinic_settings = False
                self.can_manage_inventory = True
                self.can_manage_permissions = False
                self.can_access_integrations = False
                self.can_view_audit_logs = False
                self.can_view_usage_reports = False
                self.can_access_security_testing = False
        super().save(*args, **kwargs)

