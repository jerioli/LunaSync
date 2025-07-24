from django.db import models
from django.utils import timezone
from accounts.models import CustomUser

class PredefinedTimeSlot(models.Model):
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_time']
        db_table = 'predefined_time_slot'

    def __str__(self):
        return f"{self.start_time} - {self.end_time}"

class DoctorAvailability(models.Model):
    doctor = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='availabilities')
    date = models.DateField()
    is_available = models.BooleanField(default=True)
    max_appointments = models.PositiveIntegerField(default=8)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('doctor', 'date')
        ordering = ['date']
        db_table = 'doctor_availability'

    def __str__(self):
        return f"{self.doctor.get_full_name()} - {self.date}"

class TimeSlot(models.Model):
    availability = models.ForeignKey(DoctorAvailability, on_delete=models.CASCADE, related_name='time_slots')
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_booked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_time']
        db_table = 'time_slot'

    def __str__(self):
        return f"{self.start_time} - {self.end_time}"