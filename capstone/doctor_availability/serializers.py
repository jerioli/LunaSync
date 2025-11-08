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
    appointment_status = serializers.SerializerMethodField()
    appointment_id = serializers.SerializerMethodField()
    is_effectively_booked = serializers.SerializerMethodField()
    
    class Meta:
        model = TimeSlot
        fields = ['id', 'start_time', 'end_time', 'is_booked', 'is_effectively_booked', 'appointment_status', 'appointment_id']

    def get_is_effectively_booked(self, obj):
        """Check if slot is effectively booked (including ongoing appointments)"""
        return obj.is_effectively_booked()

    def get_appointment_status(self, obj):
        """Get the status of appointment in this time slot"""
        return obj.get_appointment_status()
    
    def get_appointment_id(self, obj):
        """Get the ID of appointment in this time slot"""
        from appointments.models import Appointment
        
        try:
            # Find appointment that matches this time slot
            appointment = Appointment.objects.filter(
                doctor=obj.availability.doctor,
                date=obj.availability.date,
                time=obj.start_time
            ).first()
            
            if appointment:
                return appointment.id
            return None
        except Exception:
            return None

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