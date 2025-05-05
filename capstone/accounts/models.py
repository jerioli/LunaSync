from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    def create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = models.EmailField(unique=True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)  # Hash the password
        user.save(using=self._db)
        return user
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('receptionist', 'Receptionist'),
        ('doctor', 'Doctor'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='doctor')
    
    def __str__(self):
        return f"{self.username} ({self.role})"
    
    