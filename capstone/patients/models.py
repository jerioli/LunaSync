from django.db import models

class Patient(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=20, choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other'), ('prefer_not_to_say', 'Prefer not to say')], blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    marital_status = models.CharField(max_length=30, choices=[('single', 'Single'), ('married', 'Married'), ('divorced', 'Divorced'), ('widowed', 'Widowed'), ('prefer_not_to_say', 'Prefer not to say')], blank=True, null=True)
    medical_info = models.JSONField(blank=True, null=True)  # Store medical info as JSON
    physical_examination = models.JSONField(blank=True, null=True)  # Store physical examination data as JSON
    registration_date = models.DateField(auto_now_add=True)

    class Meta:
        db_table = 'patients'

    def __str__(self):
        return self.name