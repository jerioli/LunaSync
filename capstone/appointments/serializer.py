from rest_framework import serializers
from .models import Appointment
from patients.models import Patient
from accounts.models import CustomUser
from datetime import datetime
import re
import json
import logging
import traceback
from django.utils import timezone

logger = logging.getLogger(__name__)

class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(required=True, write_only=True)
    patient_email = serializers.EmailField(required=True, write_only=True)
    patient_phone = serializers.CharField(required=True, write_only=True)
    date_of_birth = serializers.DateField(required=True, write_only=True)
    gender = serializers.ChoiceField(choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other'), ('prefer_not_to_say', 'Prefer not to say')], required=False, allow_null=True, write_only=True)
    address = serializers.CharField(required=False, allow_blank=True, write_only=True)
    marital_status = serializers.ChoiceField(choices=[('single', 'Single'), ('married', 'Married'), ('divorced', 'Divorced'), ('widowed', 'Widowed'), ('prefer_not_to_say', 'Prefer not to say')], required=False, allow_null=True, write_only=True)
    appointment_type = serializers.ChoiceField(choices=Appointment.TYPE_CHOICES, required=True)
    doctor_id = serializers.IntegerField(required=True, write_only=True)
    date = serializers.DateField(required=True)
    time = serializers.TimeField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=Appointment.STATUS_CHOICES, required=False, default='pending')
    
    # Display fields for better data representation
    display_patient_name = serializers.SerializerMethodField(read_only=True)
    display_doctor_name = serializers.SerializerMethodField(read_only=True)
    display_time = serializers.SerializerMethodField(read_only=True)
    display_date = serializers.SerializerMethodField(read_only=True)
    display_notes = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient_name', 'patient_email', 'patient_phone',
            'date_of_birth', 'gender', 'address', 'marital_status',
            'appointment_type', 'doctor_id', 'date', 'time',
            'notes', 'status', 'created_at',
            'display_patient_name', 'display_doctor_name',
            'display_time', 'display_date', 'display_notes'
        ]
        read_only_fields = ['id', 'created_at']

    def get_display_patient_name(self, obj):
        try:
            if obj.patient:
                return obj.patient.name
            return "N/A"
        except Exception as e:
            logger.error(f"Error getting patient name: {str(e)}")
            return "N/A"

    def get_display_doctor_name(self, obj):
        try:
            if obj.doctor:
                return f"{obj.doctor.first_name} {obj.doctor.last_name}"
            return "Not Assigned"
        except Exception as e:
            logger.error(f"Error getting doctor name: {str(e)}")
            return "Not Assigned"

    def get_display_time(self, obj):
        try:
            if obj.time:
                return obj.time.strftime('%I:%M %p')
            return "N/A"
        except Exception as e:
            logger.error(f"Error formatting time: {str(e)}")
            return "N/A"

    def get_display_date(self, obj):
        try:
            if obj.date:
                return obj.date.strftime('%B %d, %Y')
            return "N/A"
        except Exception as e:
            logger.error(f"Error formatting date: {str(e)}")
            return "N/A"

    def get_display_notes(self, obj):
        try:
            return obj.notes or "No notes"
        except Exception as e:
            logger.error(f"Error getting notes: {str(e)}")
            return "No notes"

    def to_representation(self, instance):
        try:
            data = super().to_representation(instance)
            
            # Add doctor information
            if instance.doctor:
                data['doctor'] = instance.doctor.id
                data['doctor_name'] = f"{instance.doctor.first_name} {instance.doctor.last_name}"
            else:
                data['doctor'] = None
                data['doctor_name'] = "Not Assigned"
            
            # Add patient details from the related patient object or from notes
            if instance.patient:
                # For confirmed appointments with patient records
                data['patient'] = instance.patient.id
                data['patient_name'] = instance.patient.name
                data['patient_email'] = instance.patient.email
                data['patient_phone'] = instance.patient.phone
                data['date_of_birth'] = instance.patient.date_of_birth
                data['gender'] = instance.patient.gender
                data['address'] = instance.patient.address
                data['marital_status'] = instance.patient.marital_status
            elif instance.status == 'pending' and instance.notes and 'Patient Details (Pending):' in instance.notes:
                # For pending appointments, extract patient details from notes
                try:
                    import json
                    patient_details_str = instance.notes.split('Patient Details (Pending):')[1].strip()
                    patient_details = json.loads(patient_details_str)
                    
                    data['patient'] = None
                    data['patient_name'] = patient_details.get('name')
                    data['patient_email'] = patient_details.get('email')
                    data['patient_phone'] = patient_details.get('phone')
                    data['date_of_birth'] = patient_details.get('date_of_birth')
                    data['gender'] = patient_details.get('gender')
                    data['address'] = patient_details.get('address')
                    data['marital_status'] = patient_details.get('marital_status')
                except (json.JSONDecodeError, IndexError) as e:
                    logger.error(f"Error parsing patient details from notes: {str(e)}")
                    # Set default values if parsing fails
                    data['patient'] = None
                    data['patient_name'] = None
                    data['patient_email'] = None
                    data['patient_phone'] = None
                    
            return data
        except Exception as e:
            logger.error(f"Error in to_representation: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    def validate(self, data):
        try:
            # Check if we have either a patient object or complete patient details
            if not data.get('patient') and not all([
                data.get('patient_name'),
                data.get('patient_email'),
                data.get('patient_phone')
            ]):
                raise serializers.ValidationError(
                    "Either provide a patient object or complete patient details"
                )

            # Validate appointment date
            appointment_date = data.get('date')
            if appointment_date:
                if appointment_date < timezone.now().date():
                    raise serializers.ValidationError(
                        "Appointment date cannot be in the past"
                    )

            # Validate appointment type
            appointment_type = data.get('appointment_type')
            if appointment_type:
                valid_types = [
                    'Consultation',
                    'Follow-up',
                    'Emergency',
                    'Routine Check-up',
                    'Vaccination',
                    'Lab Test',
                    'Physical Examination'
                ]
                if appointment_type not in valid_types:
                    raise serializers.ValidationError(
                        f"Invalid appointment type. Must be one of: {', '.join(valid_types)}"
                    )

            # Validate status
            status = data.get('status')
            if status and status not in ['pending', 'scheduled', 'completed', 'cancelled', 'no-show']:
                raise serializers.ValidationError(
                    "Invalid status. Must be one of: pending, scheduled, completed, cancelled, no-show"
                )

            return data
        except Exception as e:
            logger.error(f"Error in validate: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    def validate_time(self, value):
        """Validate time format and business hours"""
        if isinstance(value, str):
            try:
                # Try parsing 12-hour format with space
                value = datetime.strptime(value, '%I:%M %p').time()
            except ValueError:
                try:
                    # Try parsing 12-hour format without space
                    value = datetime.strptime(value, '%I:%M%p').time()
                except ValueError:
                    try:
                        # Try parsing 24-hour format
                        value = datetime.strptime(value, '%H:%M').time()
                    except ValueError:
                        raise serializers.ValidationError(
                            "Time must be in format HH:MM AM/PM or HH:MM"
                        )

        # Validate business hours (8 AM to 5 PM)
        if value < datetime.strptime('08:00', '%H:%M').time() or \
           value > datetime.strptime('17:00', '%H:%M').time():
            raise serializers.ValidationError(
                "Appointment time must be between 8:00 AM and 5:00 PM"
            )
        return value

    def validate_patient_phone(self, value):
        """Validate phone number format"""
        if not value:
            return value
            
        # Remove any non-digit characters
        phone = re.sub(r'\D', '', value)
        
        # Check if the phone number has a valid length
        if len(phone) < 10 or len(phone) > 15:
            raise serializers.ValidationError(
                "Phone number must be between 10 and 15 digits"
            )
        return phone

    def create(self, validated_data):
        """Create a new appointment"""
        try:
            status = validated_data.get('status', 'pending')
            
            # Extract patient data first
            patient_data = {
                'name': validated_data.pop('patient_name'),
                'email': validated_data.pop('patient_email'),
                'phone': validated_data.pop('patient_phone'),
                'date_of_birth': validated_data.pop('date_of_birth'),
                'gender': validated_data.pop('gender'),
                'address': validated_data.pop('address'),
                'marital_status': validated_data.pop('marital_status')
            }
            
            # For pending appointments from the chatbot, don't create patient record yet
            if status == 'pending':
                # Store patient details in notes for pending appointments
                user_notes = validated_data.get('notes', '')
                import json
                
                # Convert date objects to strings for JSON serialization
                serializable_patient_data = patient_data.copy()
                if 'date_of_birth' in serializable_patient_data and serializable_patient_data['date_of_birth']:
                    serializable_patient_data['date_of_birth'] = serializable_patient_data['date_of_birth'].strftime('%Y-%m-%d')
                
                patient_details_json = json.dumps(serializable_patient_data)
                combined_notes = f"{user_notes}\n\nPatient Details (Pending): {patient_details_json}".strip()
                validated_data['notes'] = combined_notes
                
                # Set patient to null for pending appointments
                patient = None
            else:
                # For non-pending appointments, create or get patient record
                patient, created = Patient.objects.get_or_create(
                    email=patient_data['email'],
                    defaults=patient_data
                )

            # Get the doctor
            doctor_id = validated_data.pop('doctor_id')
            try:
                doctor = CustomUser.objects.get(id=doctor_id, role='doctor')
            except CustomUser.DoesNotExist:
                raise serializers.ValidationError(f"Doctor with ID {doctor_id} not found")

            # Create the appointment
            appointment = Appointment.objects.create(
                patient=patient,  # Will be null for pending appointments
                doctor=doctor,
                date=validated_data.get('date'),
                time=validated_data.get('time'),
                appointment_type=validated_data.pop('appointment_type'),
                notes=validated_data.get('notes', ''),
                status=status
            )

            return appointment
        except Exception as e:
            logger.error(f"Error creating appointment: {str(e)}")
            logger.error(traceback.format_exc())
            raise