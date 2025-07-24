from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models

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
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    ROLE_CHOICES = (
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
    
    objects = CustomUserManager()
    
    class Meta:
        db_table = 'Users'
    
    def __str__(self):
        return f"{self.username} ({self.role})"
    
    def save(self, *args, **kwargs):
        # Set default permissions based on role
        if self.role == 'admin':
            self.can_manage_appointments = True
            self.can_manage_patients = True
            self.can_manage_staff = True
            self.can_view_reports = True
            self.can_manage_clinic_settings = True
        elif self.role == 'receptionist':
            self.can_manage_appointments = True
            self.can_manage_patients = True
            self.can_manage_staff = False
            self.can_view_reports = False
            self.can_manage_clinic_settings = False
        elif self.role == 'doctor':
            self.can_manage_appointments = False
            self.can_manage_patients = True
            self.can_manage_staff = False
            self.can_view_reports = True
            self.can_manage_clinic_settings = False
        
        super().save(*args, **kwargs)

