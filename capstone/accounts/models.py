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
    is_default_account = models.BooleanField(default=False)  # Flag to mark default/system accounts that should be restricted
    
    # Permission fields for granular access control
    can_manage_appointments = models.BooleanField(default=False)
    can_manage_patients = models.BooleanField(default=False)
    can_manage_staff = models.BooleanField(default=False)
    can_view_reports = models.BooleanField(default=False)
    can_manage_clinic_settings = models.BooleanField(default=False)
    can_manage_inventory = models.BooleanField(default=False)  # New permission for inventory management
    
    # Superadmin exclusive permissions
    can_manage_permissions = models.BooleanField(default=False)
    can_view_audit_logs = models.BooleanField(default=False)
    
    # Two-Factor Authentication setting
    otp_enabled = models.BooleanField(default=True)  # 2FA enabled by default
    
    # Notification preferences
    appointment_status_notifications = models.BooleanField(default=True)  # Email notifications for appointment status changes
    
    objects = CustomUserManager()
    
    class Meta:
        db_table = 'Users'
    
    def __str__(self):
        return f"{self.username} ({self.role})"
    
    def is_restricted_default_account(self):
        """
        Check if this is a default/system account that should have restricted access.
        Note: Default superadmin now has full access, so this only restricts other default accounts.
        """
        return (
            self.is_default_account and 
            self.role != 'superadmin'  # Don't restrict default superadmin
        )
    
    def can_access_superadmin_features(self):
        """
        Check if this user can access true superadmin features.
        Default superadmin now has full access to all superadmin features.
        """
        return (
            self.role == 'superadmin' and 
            self.can_manage_permissions and 
            self.can_view_audit_logs
        )
    
    def save(self, *args, **kwargs):
        # Only set default permissions on creation
        if self._state.adding:
            if self.role == 'superadmin':
                self.can_manage_appointments = False
                self.can_manage_patients = False
                self.can_manage_staff = True
                self.can_view_reports = True
                self.can_manage_clinic_settings = True
                self.can_manage_inventory = False
                self.can_manage_permissions = True
                self.can_view_audit_logs = True
            elif self.role == 'admin':
                self.can_manage_appointments = True
                self.can_manage_patients = True
                self.can_manage_staff = True
                self.can_view_reports = True
                self.can_manage_clinic_settings = True
                self.can_manage_inventory = True
                self.can_manage_permissions = False
                self.can_view_audit_logs = False
            elif self.role == 'receptionist':
                self.can_manage_appointments = True
                self.can_manage_patients = True
                self.can_manage_staff = False
                self.can_view_reports = False
                self.can_manage_clinic_settings = False
                self.can_manage_inventory = True
                self.can_manage_permissions = False
                self.can_view_audit_logs = False
            elif self.role == 'doctor':
                self.can_manage_appointments = False
                self.can_manage_patients = True
                self.can_manage_staff = False
                self.can_view_reports = True
                self.can_manage_clinic_settings = False
                self.can_manage_inventory = True
                self.can_manage_permissions = False
                self.can_view_audit_logs = False
        super().save(*args, **kwargs)

