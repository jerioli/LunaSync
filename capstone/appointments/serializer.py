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
    # Separate name fields (as sent from frontend)
    firstName = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    middleInitial = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    lastName = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    suffix = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    
    # Combined name field (stored in database) - not required since we construct it
    patient_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    
    # Patient ID for returning patients
    patient_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    
    def __init__(self, *args, **kwargs):
        print(f"=== SERIALIZER INIT ===")
        print(f"Args: {args}")
        print(f"Kwargs: {kwargs}")
        if args and hasattr(args[0], 'data') if len(args) > 0 else False:
            print(f"Request data: {getattr(args[0], 'data', 'No data attr')}")
        super().__init__(*args, **kwargs)
    patient_email = serializers.EmailField(required=True)
    patient_phone = serializers.CharField(required=True)
    date_of_birth = serializers.DateField(required=True)
    gender = serializers.ChoiceField(choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other'), ('prefer_not_to_say', 'Prefer not to say')], required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True)
    marital_status = serializers.ChoiceField(choices=[('single', 'Single'), ('married', 'Married'), ('divorced', 'Divorced'), ('widowed', 'Widowed'), ('prefer_not_to_say', 'Prefer not to say')], required=False, allow_null=True)
    appointment_type = serializers.ChoiceField(choices=Appointment.TYPE_CHOICES, required=True)
    doctor_id = serializers.IntegerField(required=True)
    date = serializers.DateField(required=True)
    time = serializers.TimeField(required=True)
    status = serializers.ChoiceField(choices=Appointment.STATUS_CHOICES, required=False, default='pending')
    
    # Display fields for better data representation
    display_patient_name = serializers.SerializerMethodField(read_only=True)
    display_doctor_name = serializers.SerializerMethodField(read_only=True)
    display_time = serializers.SerializerMethodField(read_only=True)
    display_date = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'firstName', 'middleInitial', 'lastName', 'suffix',
            'patient_name', 'patient_id', 'patient_email', 'patient_phone',
            'date_of_birth', 'gender', 'address', 'marital_status',
            'appointment_type', 'doctor_id', 'date', 'time',
            'status', 'created_at',
            'display_patient_name', 'display_doctor_name',
            'display_time', 'display_date'
        ]
        read_only_fields = ['id', 'created_at']

    def get_display_patient_name(self, obj):
        try:
            if obj.patient:
                return obj.patient.name
            if obj.patient_name:
                return obj.patient_name
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
            
            # Add patient details from the related patient object or from appointment fields
            if instance.patient:
                # For confirmed appointments with patient records
                data['patient'] = instance.patient.id
                data['patient_id'] = instance.patient.patient_id  # Include Patient ID
                # Prioritize appointment's patient_name if available, fallback to patient.name
                data['patient_name'] = instance.patient_name or instance.patient.name
                data['patient_email'] = instance.patient_email or instance.patient.email
                data['patient_phone'] = instance.patient_phone or instance.patient.phone
                data['date_of_birth'] = instance.date_of_birth or instance.patient.date_of_birth
                data['gender'] = instance.gender or instance.patient.gender
                data['address'] = instance.address or instance.patient.address
                data['marital_status'] = instance.marital_status or instance.patient.marital_status
            else:
                # For pending appointments, use the direct appointment fields
                data['patient'] = None
                data['patient_id'] = None  # No Patient ID for pending appointments
                data['patient_name'] = instance.patient_name
                data['patient_email'] = instance.patient_email
                data['patient_phone'] = instance.patient_phone
                data['date_of_birth'] = instance.date_of_birth
                data['gender'] = instance.gender
                data['address'] = instance.address
                data['marital_status'] = instance.marital_status
                    
            return data
        except Exception as e:
            logger.error(f"Error in to_representation: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    def validate(self, data):
        try:
            # Debug logging - first thing in validate method
            print(f"=== VALIDATE METHOD CALLED ===")
            print(f"Raw data received: {data}")
            print(f"Data keys: {list(data.keys()) if data else 'None'}")
            logger.info(f"Validation data received: {data}")
            
            # Check if we have either a patient object or the necessary data to create one
            has_patient = data.get('patient')
            has_patient_id = data.get('patient_id') and data.get('patient_id').strip()
            has_email = data.get('patient_email')
            has_phone = data.get('patient_phone')
            
            # Check if we have name components
            has_first_name = data.get('firstName') and data.get('firstName').strip()
            has_last_name = data.get('lastName') and data.get('lastName').strip()
            has_patient_name = data.get('patient_name') and data.get('patient_name').strip()
            
            print(f"Validation checks:")
            print(f"  has_patient: {has_patient}")
            print(f"  has_patient_id: {has_patient_id}")
            print(f"  has_email: {has_email}")
            print(f"  has_phone: {has_phone}")
            print(f"  has_first_name: {has_first_name}")
            print(f"  has_last_name: {has_last_name}")
            print(f"  has_patient_name: {has_patient_name}")
            
            logger.info(f"Validation checks: has_patient={has_patient}, has_patient_id={has_patient_id}, has_email={has_email}, has_phone={has_phone}, has_first_name={has_first_name}, has_last_name={has_last_name}, has_patient_name={has_patient_name}")
            
            # We need either a patient object OR patient_id OR (email + phone + some form of name)
            if not has_patient and not has_patient_id and not (has_email and has_phone and (has_first_name or has_last_name or has_patient_name)):
                print(f"Validation FAILED: Missing required fields")
                logger.error(f"Validation failed: Missing required fields")
                raise serializers.ValidationError(
                    "Either provide a patient object, patient ID for returning patients, or complete patient details (email, phone, and name)"
                )
            
            print(f"Validation PASSED - continuing with other validations")
            logger.info(f"Validation passed basic checks")

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
            
            # Check if this is a returning patient with Patient ID
            patient_id = validated_data.pop('patient_id', None)
            existing_patient = None
            
            if patient_id and patient_id.strip():
                try:
                    existing_patient = Patient.objects.get(patient_id=patient_id.strip())
                    logger.info(f"Found existing patient with ID {patient_id}: {existing_patient.name}")
                except Patient.DoesNotExist:
                    logger.warning(f"Patient with ID {patient_id} not found, will create new patient")
            
            # Construct full name from components if provided
            first_name = validated_data.pop('firstName', '')
            middle_initial = validated_data.pop('middleInitial', '')
            last_name = validated_data.pop('lastName', '')
            suffix = validated_data.pop('suffix', '')
            
            # Build the full name from components
            name_parts = []
            if first_name and first_name.strip():
                name_parts.append(first_name.strip())
            if middle_initial and middle_initial.strip():
                name_parts.append(middle_initial.strip())
            if last_name and last_name.strip():
                name_parts.append(last_name.strip())
            if suffix and suffix.strip():
                name_parts.append(suffix.strip())
            
            full_name = ' '.join(name_parts) if name_parts else validated_data.get('patient_name', '')
            
            # If we have an existing patient, use their data and update if necessary
            if existing_patient:
                # Use existing patient data but allow updating with new information if provided
                patient_email = validated_data.get('patient_email') or existing_patient.email
                patient_phone = validated_data.get('patient_phone') or existing_patient.phone
                date_of_birth = validated_data.get('date_of_birth') or existing_patient.date_of_birth
                gender = validated_data.get('gender') or existing_patient.gender
                address = validated_data.get('address') or existing_patient.address
                marital_status = validated_data.get('marital_status') or existing_patient.marital_status
                
                # Use existing patient's name if no new name provided
                if not full_name or not full_name.strip():
                    full_name = existing_patient.name
                
                patient = existing_patient
            else:
                # Validate that we have at least a name for new patients
                if not full_name or not full_name.strip():
                    raise serializers.ValidationError({
                        'patient_name': 'Patient name is required. Please provide at least a first name or last name.'
                    })
                
                # Extract patient data WITHOUT removing from validated_data
                patient_email = validated_data.get('patient_email')
                patient_phone = validated_data.get('patient_phone')
                date_of_birth = validated_data.get('date_of_birth')
                gender = validated_data.get('gender')
                address = validated_data.get('address')
                marital_status = validated_data.get('marital_status')
                
                # Extract patient data for patient record creation
                patient_data = {
                    'name': full_name,
                    'email': patient_email,
                    'phone': patient_phone,
                    'date_of_birth': date_of_birth,
                    'gender': gender,
                    'address': address,
                    'marital_status': marital_status
                }
                
                # For pending appointments from the chatbot, don't create patient record yet
                if status == 'pending':
                    # Set patient to null for pending appointments
                    patient = None
                else:
                    # For non-pending appointments, create or get patient record
                    patient, created = Patient.objects.get_or_create(
                        email=patient_data['email'],
                        defaults=patient_data
                    )
            
            # Store the full name in the appointment record as well
            validated_data['patient_name'] = full_name
            
            # Get the doctor
            doctor_id = validated_data.pop('doctor_id')
            try:
                doctor = CustomUser.objects.get(id=doctor_id, role='doctor')
            except CustomUser.DoesNotExist:
                raise serializers.ValidationError(f"Doctor with ID {doctor_id} not found")

            # Create the appointment
            appointment = Appointment.objects.create(
                patient=patient,  # Will be null for pending appointments or existing patient for returning patients
                doctor=doctor,
                date=validated_data.get('date'),
                time=validated_data.get('time'),
                appointment_type=validated_data.get('appointment_type'),
                status=status,
                # Store patient details directly in appointment fields
                patient_name=full_name,
                patient_email=patient_email,
                patient_phone=patient_phone,
                date_of_birth=date_of_birth,
                gender=gender,
                address=address,
                marital_status=marital_status
            )

            return appointment
        except Exception as e:
            logger.error(f"Error creating appointment: {str(e)}")
            logger.error(traceback.format_exc())
            raise