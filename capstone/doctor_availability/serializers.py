from rest_framework import serializers
from django.utils import timezone
from .models import DoctorAvailability, TimeSlot, PredefinedTimeSlot
from accounts.models import CustomUser

class PredefinedTimeSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = PredefinedTimeSlot
        fields = ['id', 'start_time', 'end_time', 'is_active']

    def validate(self, data):
        if data.get('start_time') and data.get('end_time'):
            if data['start_time'] >= data['end_time']:
                raise serializers.ValidationError("End time must be after start time")
        return data

class TimeSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeSlot
        fields = ['id', 'start_time', 'end_time', 'is_booked']

    def validate(self, data):
        if data.get('start_time') and data.get('end_time'):
            if data['start_time'] >= data['end_time']:
                raise serializers.ValidationError("End time must be after start time")
        return data

class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    time_slots = TimeSlotSerializer(many=True, read_only=True)
    doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = DoctorAvailability
        fields = ['id', 'doctor', 'doctor_name', 'date', 'is_available', 'max_appointments', 'time_slots']
        read_only_fields = ['created_at', 'updated_at']

    def get_doctor_name(self, obj):
        return obj.doctor.get_full_name() if obj.doctor else ''

    def validate_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("Cannot set availability for past dates")
        return value 