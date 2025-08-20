from django.db import models

class Patient(models.Model):
    # Separate name fields - temporarily nullable for migration
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    middle_initial = models.CharField(max_length=5, blank=True, null=True)
    suffix = models.CharField(max_length=20, blank=True, null=True)  # Jr., Sr., III, etc.
    
    # Keep name field for backward compatibility (computed property)
    name = models.CharField(max_length=255, blank=True, null=True)
    
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

    def save(self, *args, **kwargs):
        # Automatically construct full name when saving
        name_parts = [self.first_name, self.last_name]
        if self.middle_initial:
            name_parts.insert(1, self.middle_initial + '.')
        if self.suffix:
            name_parts.append(self.suffix)
        self.name = ' '.join(filter(None, name_parts))
        super().save(*args, **kwargs)

    def get_full_name(self):
        """Return the full name including middle initial and suffix"""
        name_parts = [self.first_name, self.last_name]
        if self.middle_initial:
            name_parts.insert(1, self.middle_initial + '.')
        if self.suffix:
            name_parts.append(self.suffix)
        return ' '.join(filter(None, name_parts))

    def __str__(self):
        return self.get_full_name()