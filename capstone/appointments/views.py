from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Appointment
from .serializer import AppointmentSerializer
from rest_framework.generics import ListAPIView
from patients.models import Patient
from clinic.models import ClinicSettings
import json
import traceback
import logging
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from accounts.permissions import IsReceptionist
from datetime import datetime
from django.core.mail import send_mail
from django.conf import settings
from .email_utils import send_appointment_confirmation_email
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.core.exceptions import ValidationError
from django.db import models
from systemlogs.audit_logger import AuditLogger

logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class AppointmentCreateView(APIView):
    permission_classes = [AllowAny]  # Allow unauthenticated access for chatbot

    def post(self, request):
        try:
            logger.info(f"Received appointment data: {request.data}")
            logger.info(f"Request data type: {type(request.data)}")
            logger.info(f"Request data keys: {request.data.keys()}")
            
            # Check if this is an existing patient lookup
            patient_id = request.data.get('patient_id') or ''
            patient_id = patient_id.strip() if patient_id else ''
            existing_patient = None
            
            if patient_id:
                try:
                    existing_patient = Patient.objects.get(patient_id=patient_id)
                    logger.info(f"Found existing patient with ID {patient_id}: {existing_patient.name}")
                except Patient.DoesNotExist:
                    logger.warning(f"Patient with ID {patient_id} not found")
            
            # Transform the incoming data
            data = {
                # Handle separate name fields from chatbot
                'firstName': (request.data.get('firstName') or '').strip(),
                'middleInitial': (request.data.get('middleInitial') or '').strip(),
                'lastName': (request.data.get('lastName') or '').strip(),
                'suffix': (request.data.get('suffix') or '').strip(),
                # Legacy patient_name field (for backward compatibility)
                'patient_name': (request.data.get('patient_name') or '').strip(),
                'patient_id': patient_id,  # Include patient ID for existing patient lookup
                'appointment_type': (request.data.get('appointment_type') or '').strip(),
                'date': request.data.get('date', ''),
                'time': request.data.get('time', ''),
                'doctor_id': request.data.get('doctor_id'),
                'status': request.data.get('status', 'scheduled'),
            }
            
            # If we found an existing patient, use their decrypted data
            if existing_patient:
                data.update({
                    'patient_email': existing_patient.email,  # This will be decrypted automatically
                    'patient_phone': existing_patient.phone,  # This will be decrypted automatically
                    'date_of_birth': existing_patient.date_of_birth,
                    'gender': existing_patient.gender,
                    'address': existing_patient.address,
                    'marital_status': existing_patient.marital_status,
                })
                logger.info(f"Using existing patient data: email={existing_patient.email}, phone={existing_patient.phone}")
            else:
                # For new patients, use provided data
                data.update({
                    'patient_email': (request.data.get('patient_email') or '').strip(),
                    'patient_phone': (request.data.get('patient_phone') or '').strip(),
                    'date_of_birth': request.data.get('date_of_birth'),
                    'gender': request.data.get('gender'),
                    'address': request.data.get('address'),
                    'marital_status': request.data.get('marital_status'),
                })

            # Log the transformed data
            logger.info(f"Transformed data: {data}")
            logger.info(f"Appointment type received: '{data['appointment_type']}'")
            logger.info(f"Appointment type length: {len(data['appointment_type'])}")
            logger.info(f"Appointment type bytes: {data['appointment_type'].encode('utf-8')}")
            logger.info(f"Status: {data['status']}")

            # Log each field value for debugging
            for field, value in data.items():
                logger.info(f"Field {field}: {value} (type: {type(value)})")

            serializer = AppointmentSerializer(data=data)
            if not serializer.is_valid():
                logger.error(f"Validation errors: {serializer.errors}")
                # Log each validation error in detail
                for field, errors in serializer.errors.items():
                    logger.error(f"Field '{field}' validation errors: {errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            try:
                appointment = serializer.save()
                logger.info(f"Appointment created successfully: {appointment.id}")
                
                # Check if this is a follow-up appointment
                is_follow_up = appointment.appointment_type == 'Follow-up' and appointment.status == 'scheduled' and appointment.patient
                
                # Audit log for appointment creation
                patient_name = appointment.patient.name if appointment.patient else \
                             f"{request.data.get('firstName', '')} {request.data.get('lastName', '')}".strip() or 'Unknown'
                
                if is_follow_up:
                    AuditLogger.log_action(
                        user=request.user if request.user.is_authenticated else None,
                        action='CREATE FOLLOW-UP APPOINTMENT',
                        resource_type='APPOINTMENT',
                        resource_id=str(appointment.id),
                        description=f"Created follow-up appointment for {patient_name} on {appointment.date} at {appointment.time}",
                        request=request
                    )
                else:
                    AuditLogger.log_action(
                        user=request.user if request.user.is_authenticated else None,
                        action='CREATE APPOINTMENT',
                        resource_type='APPOINTMENT',
                        resource_id=str(appointment.id),
                        description=f"Created appointment for {patient_name} on {appointment.date} at {appointment.time} (Status: {appointment.status})",
                        request=request
                    )
                
                # Check if SMS confirmation is requested
                confirmation_method = request.data.get('confirmation_method', 'email')
                # Get phone from request data (works for both pending and confirmed appointments)
                patient_phone = request.data.get('patient_phone')
                
                # Send SMS for scheduled appointments (including follow-ups) with existing patients
                if appointment.status == 'scheduled' and appointment.patient:
                    try:
                        from accounts.iprog_sms_service import iprog_sms_service
                        
                        # Get patient phone from the Patient object
                        patient_phone_obj = appointment.patient.phone
                        
                        if patient_phone_obj:
                            # Get clinic name from settings
                            clinic_settings = ClinicSettings.objects.first()
                            clinic_name = clinic_settings.clinic_name if clinic_settings else 'Clinic'
                            
                            # Format appointment details
                            appointment_date = appointment.date.strftime('%B %d, %Y')
                            appointment_time = appointment.time.strftime('%I:%M %p')
                            doctor_name = appointment.doctor.get_full_name() if appointment.doctor else 'Doctor'
                            patient_name = appointment.patient.name
                            
                            # Create SMS message for scheduled appointment
                            sms_message = f"""Follow-up Appointment Scheduled

Patient: {patient_name}
Date: {appointment_date}
Time: {appointment_time}
Doctor: {doctor_name}
Type: {appointment.appointment_type}

{clinic_name}"""
                            
                            # Send SMS
                            success, message, reference_id = iprog_sms_service.send_sms(
                                patient_phone_obj,
                                sms_message
                            )
                            
                            if success:
                                logger.info(f"Follow-up SMS sent to {patient_phone_obj}")
                                if reference_id:
                                    logger.info(f"SMS Reference ID: {reference_id}")
                            else:
                                logger.warning(f"Failed to send follow-up SMS: {message}")
                    except Exception as sms_error:
                        logger.error(f"Error sending follow-up SMS: {sms_error}")
                        # Don't fail the appointment creation if SMS fails
                
                if confirmation_method == 'sms' and patient_phone:
                    try:
                        from accounts.iprog_sms_service import iprog_sms_service
                        
                        # Get clinic name from settings
                        clinic_settings = ClinicSettings.objects.first()
                        clinic_name = clinic_settings.clinic_name
                        
                        # Format appointment details
                        appointment_date = appointment.date.strftime('%B %d, %Y')
                        appointment_time = appointment.time.strftime('%I:%M %p')
                        doctor_name = appointment.doctor.get_full_name() or appointment.doctor.username
                        
                        # Get patient name from request data or patient object
                        if appointment.patient:
                            patient_name = appointment.patient.name
                        else:
                            # For pending appointments, construct name from request data
                            first_name = request.data.get('firstName', '')
                            last_name = request.data.get('lastName', '')
                            patient_name = f"{first_name} {last_name}".strip() or "Patient"
                        
                        # Create concise SMS message
                        sms_message = f"""Appointment Confirmed

Patient: {patient_name}
Date: {appointment_date}
Time: {appointment_time}
Doctor: {doctor_name}
Type: {appointment.appointment_type}

{clinic_name}"""
                        
                        # Send SMS
                        success, message, reference_id = iprog_sms_service.send_sms(
                            patient_phone,
                            sms_message
                        )
                        
                        if success:
                            logger.info(f"SMS confirmation sent to {patient_phone}")
                            if reference_id:
                                logger.info(f"SMS Reference ID: {reference_id}")
                        else:
                            logger.warning(f"Failed to send SMS confirmation: {message}")
                    except Exception as sms_error:
                        logger.error(f"Error sending SMS confirmation: {sms_error}")
                        # Don't fail the appointment creation if SMS fails
                
                # Return the serialized appointment data
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except ValidationError as ve:
                logger.error(f"Validation error saving appointment: {str(ve)}")
                # Check if this is a time slot conflict
                if "already booked" in str(ve):
                    return Response(
                        {
                            'error': 'TIME_SLOT_CONFLICT',
                            'message': 'This time slot is already booked',
                            'detail': 'The selected time slot has just been booked by another patient. Please select a different time.'
                        },
                        status=status.HTTP_409_CONFLICT
                    )
                else:
                    return Response(
                        {'error': 'VALIDATION_ERROR', 'message': str(ve)},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except Exception as e:
                logger.error(f"Error saving appointment: {str(e)}")
                logger.error(traceback.format_exc())
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            logger.error(traceback.format_exc())
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@method_decorator(csrf_exempt, name='dispatch')
class AppointmentListView(ListAPIView):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [AllowAny]  # Allow unauthenticated access for now
    
    def get_serializer(self, *args, **kwargs):
        """Override to ensure request context is passed to serializer"""
        kwargs['context'] = self.get_serializer_context()
        return super().get_serializer(*args, **kwargs)

    def get_queryset(self):
        try:
            logger.info("Starting to fetch appointments...")
            # First check if we can access the database
            try:
                Appointment.objects.exists()
                logger.info("Successfully accessed database")
            except Exception as db_error:
                logger.error(f"Database access error: {str(db_error)}")
                logger.error(traceback.format_exc())
                raise

            # Try to fetch appointments with related data
            try:
                # Start with all appointments, but exclude those for soft-deleted patients
                queryset = Appointment.objects.all().select_related('patient', 'doctor')
                
                # Filter out appointments for soft-deleted patients
                # Include appointments without a patient (pending) or with non-deleted patients
                queryset = queryset.filter(
                    models.Q(patient__isnull=True) |  # Pending appointments without patient record
                    models.Q(patient__is_deleted=False)  # Appointments with non-deleted patients
                )
                
                # Get status filter from query params or URL kwargs
                status_filter = self.request.GET.get('status') or self.kwargs.get('status')
                
                # Handle special "upcoming" status filter
                if status_filter == 'upcoming':
                    from datetime import date
                    queryset = queryset.filter(
                        status__in=['scheduled', 'ongoing'],
                        date__gte=date.today()
                    ).order_by('date', 'time')
                    logger.info("Filtering for upcoming appointments (scheduled/ongoing, today or future)")
                elif status_filter and status_filter in dict(Appointment.STATUS_CHOICES):
                    queryset = queryset.filter(status=status_filter)
                    logger.info(f"Filtering by status: {status_filter}")
                elif status_filter and status_filter not in ['upcoming']:
                    logger.warning(f"Invalid status filter: {status_filter}")
                
                doctor_filter = self.request.GET.get('doctor_id')
                if doctor_filter:
                    queryset = queryset.filter(doctor_id=doctor_filter)
                    logger.info(f"Filtering by doctor_id: {doctor_filter}")
                
                date_filter = self.request.GET.get('date')
                if date_filter:
                    queryset = queryset.filter(date=date_filter)
                    logger.info(f"Filtering by date: {date_filter}")
                
                count = queryset.count()
                logger.info(f"Found {count} appointments after filtering")
                
                # Log the first few appointments for debugging
                for appt in queryset[:3]:
                    logger.info(f"Sample appointment: id={appt.id}, status={appt.status}, date={appt.date}")
                    logger.info(f"Patient: {appt.patient}")
                    logger.info(f"Doctor: {appt.doctor}")
                    logger.info(f"Appointment Type: {appt.appointment_type}")
                
                return queryset
            except Exception as query_error:
                logger.error(f"Query error: {str(query_error)}")
                logger.error(traceback.format_exc())
                raise

        except Exception as e:
            logger.error(f"Error in get_queryset: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    def list(self, request, *args, **kwargs):
        try:
            logger.info("Starting list method...")
            queryset = self.get_queryset()
            
            # Try to serialize the data
            try:
                # First try serializing a single appointment to isolate any issues
                if queryset.exists():
                    first_appointment = queryset.first()
                    logger.info(f"Testing serialization with first appointment: {first_appointment.id}")
                    try:
                        test_serializer = self.get_serializer(first_appointment)
                        test_data = test_serializer.data
                        logger.info(f"Successfully serialized first appointment: {test_data}")
                    except Exception as single_serialize_error:
                        logger.error(f"Error serializing single appointment: {str(single_serialize_error)}")
                        logger.error(traceback.format_exc())
                        return Response(
                            {'error': 'Failed to serialize appointment', 'detail': str(single_serialize_error)},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR
                        )
                
                # Now try serializing all appointments
                try:
                    serializer = self.get_serializer(queryset, many=True)
                    data = serializer.data
                    logger.info(f"Successfully serialized all appointments. Count: {len(data)}")
                    return Response(data)
                except Exception as bulk_serialize_error:
                    logger.error(f"Error serializing all appointments: {str(bulk_serialize_error)}")
                    logger.error(traceback.format_exc())
                    return Response(
                        {'error': 'Failed to serialize appointments', 'detail': str(bulk_serialize_error)},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            except Exception as serialization_error:
                logger.error(f"Serialization error: {str(serialization_error)}")
                logger.error(traceback.format_exc())
                return Response(
                    {'error': 'Failed to serialize appointments', 'detail': str(serialization_error)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Exception as e:
            logger.error(f"Error in list view: {str(e)}")
            logger.error(traceback.format_exc())
            return Response(
                {'error': 'Failed to fetch appointments', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@method_decorator(csrf_exempt, name='dispatch')
class AppointmentApproveView(APIView):
    def post(self, request, appointment_id):
        try:
            appointment = Appointment.objects.get(id=appointment_id)
            
            # Get patient details directly from appointment fields
            if appointment.patient_name and appointment.patient_email and appointment.patient_phone:
                try:
                    # Use the appointment fields directly
                    patient_details = {
                        'name': appointment.patient_name,
                        'email': appointment.patient_email,
                        'phone': appointment.patient_phone,
                        'date_of_birth': appointment.date_of_birth.strftime('%Y-%m-%d') if appointment.date_of_birth else None,
                        'gender': appointment.gender,
                        'address': appointment.address,
                        'marital_status': appointment.marital_status
                    }
                    
                    # Create new patient record with the appointment fields
                    patient = Patient.objects.create(
                        name=patient_details['name'],
                        email=patient_details['email'],
                        phone=patient_details['phone'],
                        date_of_birth=appointment.date_of_birth,
                        gender=patient_details.get('gender'),
                        address=patient_details.get('address'),
                        marital_status=patient_details.get('marital_status')
                    )
                    
                    # Update appointment with patient reference
                    appointment.patient = patient
                    appointment.status = 'scheduled'
                    appointment.save()
                    
                    # Send confirmation email to patient
                    email_sent = send_appointment_confirmation_email(appointment, patient)
                    if not email_sent:
                        logger.warning(f"Failed to send confirmation email for appointment {appointment.id}")
                    
                    return Response({
                        'message': 'Appointment approved and patient record created successfully!',
                        'appointment_id': appointment.id,
                        'patient_id': patient.id
                    }, status=status.HTTP_200_OK)
                    
                except Exception as e:
                    logger.error(f"Error creating patient from appointment data: {str(e)}")
                    return Response({
                        'message': 'Invalid patient details in appointment',
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    'message': 'No patient details found in appointment',
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Appointment.DoesNotExist:
            return Response({
                'message': 'Appointment not found',
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error approving appointment: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({
                'message': 'Server error occurred',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class AppointmentUpdateStatusView(APIView):
    permission_classes = [AllowAny]  # Allow unauthenticated access for now

    def post(self, request, appointment_id):
        try:
            appointment = Appointment.objects.get(id=appointment_id)
            new_status = request.data.get('status')
            send_notification = request.data.get('send_notification', False)
            notification_type = request.data.get('notification_type', '')
            
            if not new_status:
                return Response(
                    {'error': 'Status is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if new_status not in dict(Appointment.STATUS_CHOICES):
                return Response(
                    {'error': f'Invalid status. Must be one of: {", ".join(dict(Appointment.STATUS_CHOICES).keys())}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Handle pending -> scheduled status change
            if appointment.status == 'pending' and new_status == 'scheduled':
                # Refresh appointment object to get the latest data including patient_id_lookup
                appointment.refresh_from_db()
                email_sent = self._handle_appointment_confirmation(appointment)
                
                appointment.status = new_status
                appointment.save(skip_validation=True)  # Skip validation for status updates
                
                # Audit log for confirming appointment
                patient_name = appointment.patient.name if appointment.patient else getattr(appointment, 'patient_name', 'Unknown')
                AuditLogger.log_action(
                    user=request.user if request.user.is_authenticated else None,
                    action='CONFIRM APPOINTMENT',
                    resource_type='APPOINTMENT',
                    resource_id=str(appointment.id),
                    description=f"Confirmed appointment for {patient_name} on {appointment.date} at {appointment.time}",
                    request=request
                )
                
                serializer = AppointmentSerializer(appointment, context={'request': request})
                response_data = serializer.data
                response_data['email_sent'] = email_sent
                response_data['patient_created'] = hasattr(appointment, '_patient_created')
                
                return Response(response_data)
            # Handle notification for declined, cancelled, or no-show appointments
            elif send_notification and new_status in ['cancelled', 'no-show']:
                # Send notifications before updating status
                email_sent, sms_sent = self._handle_appointment_notification(
                    appointment, new_status, notification_type
                )
                
                old_status = appointment.status
                appointment.status = new_status
                appointment.save(skip_validation=True)
                
                # Audit log for declining/cancelling/no-show
                patient_name = appointment.patient.name if appointment.patient else getattr(appointment, 'patient_name', 'Unknown')
                action_text = 'DECLINE APPOINTMENT' if old_status == 'pending' and new_status == 'cancelled' else \
                             'MARK PATIENT AS NO-SHOW' if new_status == 'no-show' else \
                             'CANCEL APPOINTMENT'
                AuditLogger.log_action(
                    user=request.user if request.user.is_authenticated else None,
                    action=action_text,
                    resource_type='APPOINTMENT',
                    resource_id=str(appointment.id),
                    description=f"{action_text.title().replace('Appointment', 'appointment for')} {patient_name} on {appointment.date} at {appointment.time}",
                    request=request
                )
                
                serializer = AppointmentSerializer(appointment, context={'request': request})
                response_data = serializer.data
                response_data['email_sent'] = email_sent
                response_data['sms_sent'] = sms_sent
                
                return Response(response_data)
            else:
                # Regular status update
                old_status = appointment.status
                appointment.status = new_status
                appointment.save(skip_validation=True)  # Skip validation for status updates
                
                # Audit log for other status changes
                patient_name = appointment.patient.name if appointment.patient else getattr(appointment, 'patient_name', 'Unknown')
                action_text = 'CHECK-IN PATIENT' if new_status == 'ongoing' else \
                             'COMPLETE APPOINTMENT' if new_status == 'completed' else \
                             'UPDATE APPOINTMENT STATUS'
                AuditLogger.log_action(
                    user=request.user if request.user.is_authenticated else None,
                    action=action_text,
                    resource_type='APPOINTMENT',
                    resource_id=str(appointment.id),
                    description=f"{action_text.title().replace('Appointment', 'appointment for').replace('Patient', 'patient')} {patient_name} on {appointment.date} at {appointment.time} (Status: {old_status} → {new_status})",
                    request=request
                )
                
                serializer = AppointmentSerializer(appointment, context={'request': request})
                return Response(serializer.data)
                
        except Appointment.DoesNotExist:
            return Response(
                {'error': 'Appointment not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error updating appointment status: {str(e)}")
            logger.error(traceback.format_exc())
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _handle_appointment_notification(self, appointment, new_status, notification_type):
        """Handle sending email and SMS notifications for declined/cancelled appointments"""
        try:
            from .email_utils import send_appointment_declined_email
            from accounts.iprog_sms_service import iprog_sms_service
            from clinic.models import ClinicSettings
            
            email_sent = False
            sms_sent = False
            
            # Get patient information
            patient = None
            patient_email = None
            patient_phone = None
            patient_name = None
            
            logger.info(f"=== APPOINTMENT NOTIFICATION DEBUG ===")
            logger.info(f"Appointment ID: {appointment.id}")
            logger.info(f"New Status: {new_status}")
            logger.info(f"Notification Type: {notification_type}")
            logger.info(f"Appointment Patient: {appointment.patient}")
            logger.info(f"Patient Email Field: {getattr(appointment, 'patient_email', 'NOT SET')}")
            logger.info(f"Patient Phone Field: {getattr(appointment, 'patient_phone', 'NOT SET')}")
            
            # Try to get patient information from different sources
            if appointment.patient:
                # Patient is linked to appointment
                patient = appointment.patient
                patient_email = patient.email
                patient_phone = patient.phone
                patient_name = patient.name if hasattr(patient, 'name') else patient.get_full_name()
                logger.info(f"Using linked patient: {patient_name} ({patient_email}, {patient_phone})")
            elif hasattr(appointment, 'patient_email') and appointment.patient_email:
                # Use appointment patient fields
                patient_email = appointment.patient_email
                patient_phone = getattr(appointment, 'patient_phone', None)
                patient_name = getattr(appointment, 'patient_name', 'Patient')
                logger.info(f"Using appointment fields: {patient_name} ({patient_email}, {patient_phone})")
            
            if not patient_email:
                logger.warning(f"No email found for appointment {appointment.id}, cannot send notification")
                return False, False
            
            # Check if the current user (staff member) has email notifications enabled
            from accounts.models import CustomUser
            should_send_email = True
            
            # Get the user from the request (the staff member performing the action)
            try:
                # Get the user from the request context
                request_user = self.request.user if hasattr(self, 'request') and self.request.user.is_authenticated else None
                
                if request_user and hasattr(request_user, 'appointment_status_notifications'):
                    should_send_email = request_user.appointment_status_notifications
                    logger.info(f"Staff member {request_user.username} notification preference: {should_send_email}")
                else:
                    # Default to sending if we can't check preferences
                    should_send_email = True
                    logger.info(f"No notification preference found, defaulting to send email")
            except Exception as pref_error:
                logger.warning(f"Could not check notification preferences: {str(pref_error)}")
                # Default to sending if we can't check preferences
                should_send_email = True
            
            # Send email notification if preferences allow
            if should_send_email:
                try:
                    if patient:
                        email_sent = send_appointment_declined_email(appointment, patient, new_status)
                    else:
                        # Create a simple patient-like object for email sending
                        class PatientData:
                            def __init__(self, email, name):
                                self.email = email
                                self.name = name
                        
                        patient_obj = PatientData(patient_email, patient_name)
                        email_sent = send_appointment_declined_email(appointment, patient_obj, new_status)
                    
                    if email_sent:
                        logger.info(f"Email notification sent to {patient_email}")
                    else:
                        logger.warning(f"Failed to send email notification to {patient_email}")
                except Exception as email_error:
                    logger.error(f"Error sending email notification: {str(email_error)}")
                    email_sent = False
            else:
                logger.info(f"Email notification skipped - user has disabled appointment status notifications")
                email_sent = False
            
            # Send SMS notification if phone number is available
            if patient_phone:
                try:
                    clinic_settings = ClinicSettings.objects.first()
                    clinic_name = clinic_settings.clinic_name if clinic_settings else 'HealthNexus Medical Center'
                    
                    # Format appointment details
                    appointment_date = appointment.date.strftime('%B %d, %Y')
                    appointment_time = appointment.time.strftime('%I:%M %p')
                    
                    # Create SMS message based on status
                    if new_status == 'cancelled':
                        sms_message = f"""Appointment Update

Your appointment has been declined.

Date: {appointment_date}
Time: {appointment_time}
Type: {appointment.appointment_type}

You can reschedule by contacting:
{clinic_name}
Phone: {clinic_settings.phone if clinic_settings else '(123) 456-7890'}"""
                    elif new_status == 'no-show':
                        sms_message = f"""Appointment Update

You were marked as no-show for your appointment.

Date: {appointment_date}
Time: {appointment_time}
Type: {appointment.appointment_type}

Please contact us to reschedule:
{clinic_name}
Phone: {clinic_settings.phone if clinic_settings else '(123) 456-7890'}"""
                    else:
                        sms_message = f"""Appointment Update

Your appointment status has been updated.

Date: {appointment_date}
Time: {appointment_time}
Type: {appointment.appointment_type}

Contact us for details:
{clinic_name}
Phone: {clinic_settings.phone if clinic_settings else '(123) 456-7890'}"""
                    
                    # Send SMS
                    success, message, reference_id = iprog_sms_service.send_sms(
                        patient_phone,
                        sms_message
                    )
                    
                    if success:
                        sms_sent = True
                        logger.info(f"SMS notification sent to {patient_phone}")
                        if reference_id:
                            logger.info(f"SMS Reference ID: {reference_id}")
                    else:
                        logger.warning(f"Failed to send SMS notification: {message}")
                        
                except Exception as sms_error:
                    logger.error(f"Error sending SMS notification: {str(sms_error)}")
                    sms_sent = False
            else:
                logger.info(f"No phone number available for SMS notification")
            
            return email_sent, sms_sent
            
        except Exception as e:
            logger.error(f"Error handling appointment notification: {str(e)}")
            logger.error(traceback.format_exc())
            return False, False
    
    def _handle_appointment_confirmation(self, appointment):
        """Handle patient creation and email/SMS sending when confirming a pending appointment"""
        try:
            # Check if appointment has patient details in different formats
            patient = None
            email_sent = False
            sms_sent = False
            
            # Debug logging
            logger.info(f"=== APPOINTMENT CONFIRMATION DEBUG ===")
            logger.info(f"Appointment ID: {appointment.id}")
            logger.info(f"Patient Name: {getattr(appointment, 'patient_name', 'NOT SET')}")
            logger.info(f"Patient Email: {getattr(appointment, 'patient_email', 'NOT SET')}")
            logger.info(f"Confirmation Method: {getattr(appointment, 'confirmation_method', 'NOT SET')}")
            logger.info(f"Current Patient: {appointment.patient}")
            logger.info(f"Appointment already has patient assigned: {appointment.patient is not None}")
            
            # If appointment already has a patient assigned, use that patient
            if appointment.patient:
                patient = appointment.patient
                logger.info(f"Using already assigned patient {patient.id} ({patient.name}) for appointment {appointment.id}")
            
            # Check if appointment has patient details in appointment fields (new format)
            elif hasattr(appointment, 'patient_name') and appointment.patient_name and appointment.patient_email:
                # Try to find existing patient by email to avoid duplicates
                try:
                    existing_patient_by_email = Patient.objects.get(email=appointment.patient_email)
                    # Patient exists, use the existing one
                    appointment.patient = existing_patient_by_email
                    patient = existing_patient_by_email
                    logger.info(f"Found and using existing patient {existing_patient_by_email.id} (email: {appointment.patient_email}) for appointment {appointment.id}")
                except Patient.DoesNotExist:
                    # No existing patient found by email, create a new one only if needed
                    logger.info(f"No existing patient found with email {appointment.patient_email}, creating new patient")
                    
                    # Parse the combined patient name into separate fields
                    name_parts = appointment.patient_name.strip().split() if appointment.patient_name else []
                    first_name = name_parts[0] if len(name_parts) > 0 else ""
                    last_name = name_parts[-1] if len(name_parts) > 1 else ""
                    middle_initial = ""
                    suffix = ""
                    
                    # If there are more than 2 parts, treat middle parts as middle initial
                    if len(name_parts) > 2:
                        middle_parts = name_parts[1:-1]
                        # Check if last part might be a suffix (Jr, Sr, III, etc.)
                        potential_suffix = name_parts[-1]
                        if potential_suffix.lower() in ['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v']:
                            suffix = potential_suffix
                            last_name = name_parts[-2] if len(name_parts) > 2 else ""
                            if len(name_parts) > 3:
                                middle_parts = name_parts[1:-2]
                        
                        # Join middle parts as middle initial
                        if middle_parts:
                            middle_initial = ' '.join(middle_parts)
                    
                    try:
                        patient = Patient.objects.create(
                            first_name=first_name,
                            last_name=last_name,
                            middle_initial=middle_initial,
                            suffix=suffix,
                            email=appointment.patient_email,
                            phone=appointment.patient_phone,
                            date_of_birth=appointment.date_of_birth,
                            gender=appointment.gender,
                            address=appointment.address,
                            marital_status=appointment.marital_status,
                            religion=appointment.religion
                        )
                        
                        # Link the patient to the appointment
                        appointment.patient = patient
                        appointment._patient_created = True
                        logger.info(f"Created new patient {patient.id} ({patient.get_full_name()}) for appointment {appointment.id}")
                        
                    except Exception as patient_error:
                        logger.error(f"Error creating patient from appointment fields: {str(patient_error)}")
            # Check if appointment has patient details in notes (old format)
            elif appointment.notes and 'Patient Details (Pending):' in appointment.notes:
                try:
                    # Extract the patient details JSON string
                    patient_details_str = appointment.notes.split('Patient Details (Pending):')[1].strip()
                    patient_details = json.loads(patient_details_str)
                    
                    # Convert date format from DD/MM/YYYY or MM/DD/YYYY to YYYY-MM-DD
                    date_of_birth = patient_details.get('dateOfBirth') or patient_details.get('date_of_birth')
                    if date_of_birth:
                        try:
                            # Try to parse different date formats
                            if '/' in str(date_of_birth):
                                date_str = str(date_of_birth)
                                # Try MM/DD/YYYY format first (American format)
                                try:
                                    date_obj = datetime.strptime(date_str, '%m/%d/%Y')
                                    date_of_birth = date_obj.strftime('%Y-%m-%d')
                                except ValueError:
                                    # If that fails, try DD/MM/YYYY format (European format)
                                    try:
                                        date_obj = datetime.strptime(date_str, '%d/%m/%Y')
                                        date_of_birth = date_obj.strftime('%Y-%m-%d')
                                    except ValueError:
                                        # If both fail, try to use as is (might already be in YYYY-MM-DD)
                                        pass
                        except Exception:
                            # If any conversion fails, try to use as is
                            pass
                    
                    # Create new patient record with all required fields
                    # Convert 'Prefer not to say' to 'prefer_not_to_say' to match database values
                    gender = patient_details.get('gender')
                    if gender == 'Prefer not to say':
                        gender = 'prefer_not_to_say'
                    
                    marital_status = patient_details.get('maritalStatus') or patient_details.get('marital_status')
                    if marital_status == 'Prefer not to say':
                        marital_status = 'prefer_not_to_say'
                    
                    # Ensure phone number doesn't exceed 20 characters
                    phone = patient_details['phone']
                    if phone and len(phone) > 20:
                        phone = phone[:20]
                        logger.warning(f"Phone number truncated from {len(patient_details['phone'])} to 20 characters")
                    
                    # Debug logging to identify the problematic field
                    logger.info(f"Processing patient with data:")
                    logger.info(f"  name: '{patient_details['name']}' (length: {len(patient_details['name']) if patient_details['name'] else 0})")
                    logger.info(f"  email: '{patient_details['email']}' (length: {len(patient_details['email']) if patient_details['email'] else 0})")
                    logger.info(f"  phone: '{phone}' (length: {len(phone) if phone else 0})")
                    logger.info(f"  gender: '{gender}' (length: {len(gender) if gender else 0})")
                    logger.info(f"  address: '{patient_details.get('address')}' (length: {len(patient_details.get('address')) if patient_details.get('address') else 0})")
                    logger.info(f"  marital_status: '{marital_status}' (length: {len(marital_status) if marital_status else 0})")
                    logger.info(f"  date_of_birth: '{date_of_birth}'")
                    
                    # Check if patient with this email already exists
                    try:
                        existing_patient = Patient.objects.get(email=patient_details['email'])
                        # Patient exists, use the existing one
                        patient = existing_patient
                        appointment.patient = patient
                        logger.info(f"Using existing patient {patient.id} (email: {patient_details['email']}) for appointment {appointment.id}")
                    except Patient.DoesNotExist:
                        # Create new patient record
                        patient = Patient.objects.create(
                            name=patient_details['name'],
                            email=patient_details['email'],
                            phone=phone,
                            date_of_birth=date_of_birth,
                            gender=gender,
                            address=patient_details.get('address'),
                            marital_status=marital_status
                        )
                        
                        # Update appointment with patient reference and clean up notes
                        appointment.patient = patient
                        appointment._patient_created = True
                        logger.info(f"Created new patient {patient.id} from notes for appointment {appointment.id}")
                    
                    # Remove patient details from notes, keep only user notes
                    if 'Patient Details (Pending):' in appointment.notes:
                        appointment.notes = appointment.notes.split('Patient Details (Pending):')[0].strip()
                    
                    
                except (json.JSONDecodeError, KeyError) as parse_error:
                    logger.error(f"Error parsing patient details from notes: {str(parse_error)}")
            
            # Send confirmation via preferred method if we have a patient
            if patient:
                # Check confirmation method preference
                confirmation_method = getattr(appointment, 'confirmation_method', 'email')
                logger.info(f"Using confirmation method: {confirmation_method}")
                
                if confirmation_method == 'sms':
                    # Send SMS confirmation
                    try:
                        from accounts.iprog_sms_service import iprog_sms_service
                        from clinic.models import ClinicSettings
                        
                        patient_phone = patient.phone
                        if patient_phone:
                            clinic_settings = ClinicSettings.objects.first()
                            clinic_name = clinic_settings.clinic_name if clinic_settings else 'Healthcare Center'
                            
                            appointment_date = appointment.date.strftime('%B %d, %Y')
                            appointment_time = appointment.time.strftime('%I:%M %p')
                            doctor_name = appointment.doctor.get_full_name() if appointment.doctor else 'Doctor'
                            patient_name = patient.name if hasattr(patient, 'name') else patient.get_full_name()
                            
                            sms_message = f"""Appointment Confirmed

Patient: {patient_name}
Date: {appointment_date}
Time: {appointment_time}
Doctor: {doctor_name}
Type: {appointment.appointment_type}

{clinic_name}"""
                            
                            success, message, reference_id = iprog_sms_service.send_sms(
                                patient_phone,
                                sms_message
                            )
                            
                            if success:
                                sms_sent = True
                                logger.info(f"SMS confirmation sent to {patient_phone} for appointment {appointment.id}")
                                if reference_id:
                                    logger.info(f"SMS Reference ID: {reference_id}")
                            else:
                                logger.warning(f"Failed to send SMS confirmation: {message}")
                        else:
                            logger.warning(f"No phone number available for SMS confirmation")
                    except Exception as sms_error:
                        logger.error(f"Error sending SMS confirmation: {str(sms_error)}")
                        sms_sent = False
                else:
                    # Send email confirmation (default)
                    try:
                        email_sent = send_appointment_confirmation_email(appointment, patient)
                        if email_sent:
                            logger.info(f"Confirmation email sent to {patient.email} for appointment {appointment.id}")
                        else:
                            logger.warning(f"Failed to send confirmation email for appointment {appointment.id}")
                    except Exception as email_error:
                        logger.error(f"Error sending confirmation email: {str(email_error)}")
                        email_sent = False
            else:
                logger.warning(f"No patient found for appointment {appointment.id}, cannot send confirmation")
            
            return email_sent or sms_sent
            
        except Exception as e:
            logger.error(f"Error handling appointment confirmation: {str(e)}")
            logger.error(traceback.format_exc())
            return False


@method_decorator(csrf_exempt, name='dispatch')
class AvailableTimeSlotsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get available time slots for a specific doctor on a specific date
        Query parameters:
        - doctor_id: ID of the doctor
        - date: Date in YYYY-MM-DD format
        """
        try:
            doctor_id = request.GET.get('doctor_id')
            date_str = request.GET.get('date')
            
            if not doctor_id or not date_str:
                return Response({
                    'error': 'doctor_id and date parameters are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Parse the date
            try:
                from datetime import datetime
                appointment_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({
                    'error': 'Date must be in YYYY-MM-DD format'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if doctor exists
            from accounts.models import CustomUser
            try:
                doctor = CustomUser.objects.get(id=doctor_id, role='doctor')
            except CustomUser.DoesNotExist:
                return Response({
                    'error': 'Doctor not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Get doctor availability for the date
            from doctor_availability.models import DoctorAvailability, TimeSlot
            try:
                doctor_availability = DoctorAvailability.objects.get(
                    doctor=doctor,
                    date=appointment_date,
                    is_available=True
                )
            except DoctorAvailability.DoesNotExist:
                return Response({
                    'available_slots': [],
                    'message': f'Doctor is not available on {date_str}'
                }, status=status.HTTP_200_OK)
            
            # Get predefined time slots for this doctor's availability
            time_slots = TimeSlot.objects.filter(
                availability=doctor_availability,
                is_booked=False
            ).order_by('start_time')
            
            # Check for existing appointments at those times
            existing_appointments = Appointment.objects.filter(
                doctor=doctor,
                date=appointment_date,
                status__in=['scheduled', 'ongoing', 'pending']
            ).values_list('time', flat=True)
            
            # Format available slots
            available_slots = []
            for slot in time_slots:
                # Convert time to the same format for comparison
                slot_time = slot.start_time
                
                # Check if this time slot is already booked by an appointment
                if slot_time not in existing_appointments:
                    # Format time for display (12-hour format)
                    start_time_12h = slot.start_time.strftime('%I:%M %p')
                    end_time_12h = slot.end_time.strftime('%I:%M %p')
                    
                    available_slots.append({
                        'label': f"{start_time_12h} - {end_time_12h}",
                        'value': slot.start_time.strftime('%H:%M:%S'),  # 24-hour format for form submission
                        'start_time': slot.start_time.strftime('%H:%M:%S'),
                        'end_time': slot.end_time.strftime('%H:%M:%S')
                    })
            
            return Response({
                'available_slots': available_slots,
                'doctor_name': f"Dr. {doctor.first_name} {doctor.last_name}",
                'date': date_str,
                'total_slots': len(available_slots)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting available time slots: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AppointmentDeleteView(APIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, appointment_id):
        try:
            logger.info(f"Attempting to delete appointment with ID: {appointment_id}")
            
            # Check if appointment exists
            try:
                appointment = Appointment.objects.get(id=appointment_id)
            except Appointment.DoesNotExist:
                logger.warning(f"Appointment with ID {appointment_id} not found")
                return Response({
                    'error': 'Appointment not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check if user has permission to delete
            # Only admin and receptionist can delete appointments
            if not (hasattr(request.user, 'role') and request.user.role in ['admin', 'receptionist']):
                logger.warning(f"User {request.user.id} attempted to delete appointment without permission")
                return Response({
                    'error': 'Permission denied. Only admin and receptionist can delete appointments.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Log appointment details before deletion
            logger.info(f"Deleting appointment: ID={appointment.id}, Patient={appointment.patient}, Date={appointment.date}, Status={appointment.status}")
            
            # Delete the appointment from database
            appointment.delete()
            
            logger.info(f"Successfully deleted appointment with ID: {appointment_id}")
            
            return Response({
                'message': 'Appointment successfully deleted',
                'deleted_id': appointment_id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error deleting appointment {appointment_id}: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({
                'error': 'Internal server error while deleting appointment'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)