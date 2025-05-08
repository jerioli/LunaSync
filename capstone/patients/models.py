from django.db import models

class Patient(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10, choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')])
    address = models.TextField()
    marital_status = models.CharField(max_length=20, choices=[('single', 'Single'), ('married', 'Married'), ('divorced', 'Divorced'), ('widowed', 'Widowed')], blank=True, null=True)
    medical_info = models.JSONField(blank=True, null=True)  # Store medical info as JSON
    registration_date = models.DateField(auto_now_add=True)

    def __str__(self):
        return self.name