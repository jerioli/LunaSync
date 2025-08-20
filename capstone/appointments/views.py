from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Appointment
from .serializer import AppointmentSerializer
from rest_framework.generics import ListAPIView
from patients.models import Patient
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

logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class AppointmentCreateView(APIView):
    permission_classes = [AllowAny]  # Allow unauthenticated access for chatbot

    def post(self, request):
        try:
            logger.info(f"Received appointment data: {request.data}")
            logger.info(f"Request data type: {type(request.data)}")
            logger.info(f"Request data keys: {request.data.keys()}")
            
            # Transform the incoming data
            data = {
                'patient_name': request.data.get('patient_name', '').strip(),
                'patient_email': request.data.get('patient_email', '').strip(),
                'patient_phone': request.data.get('patient_phone', '').strip(),
                'appointment_type': request.data.get('appointment_type', '').strip(),
                'date': request.data.get('date', ''),
                'time': request.data.get('time', ''),
                'notes': request.data.get('notes', '').strip(),
                'doctor_id': request.data.get('doctor_id'),
                'status': request.data.get('status', 'scheduled'),
                # Add required patient fields
                'date_of_birth': request.data.get('date_of_birth'),
                'gender': request.data.get('gender'),
                'address': request.data.get('address'),
                'marital_status': request.data.get('marital_status')
            }

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
                # First try without select_related to see if that's the issue
                queryset = Appointment.objects.all()
                count = queryset.count()
                logger.info(f"Found {count} appointments")
                
                # Log the first few appointments for debugging
                for appt in queryset[:3]:
                    logger.info(f"Sample appointment: id={appt.id}")
                    logger.info(f"Patient: {appt.patient}")
                    logger.info(f"Doctor: {appt.doctor}")
                    logger.info(f"Date: {appt.date}")
                    logger.info(f"Time: {appt.time}")
                    logger.info(f"Appointment Type: {appt.appointment_type}")
                    logger.info(f"Status: {appt.status}")
                    logger.info(f"Notes: {appt.notes}")
                
                # Now try with select_related
                queryset = Appointment.objects.all().select_related('patient', 'doctor')
                logger.info("Successfully fetched appointments with select_related")
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
            
            # Extract patient details from notes
            notes = appointment.notes or ''
            if 'Patient Details (Pending):' in notes:
                try:
                    # Extract the patient details JSON string
                    patient_details_str = notes.split('Patient Details (Pending):')[1].strip()
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
                    patient = Patient.objects.create(
                        name=patient_details['name'],
                        email=patient_details['email'],
                        phone=patient_details['phone'],
                        date_of_birth=date_of_birth,
                        gender=patient_details.get('gender'),
                        address=patient_details.get('address'),
                        marital_status=patient_details.get('maritalStatus') or patient_details.get('marital_status')
                    )
                    
                    # Update appointment with patient reference and clean up notes
                    appointment.patient = patient
                    appointment.status = 'scheduled'
                    
                    # Remove patient details from notes, keep only user notes
                    if 'Patient Details (Pending):' in appointment.notes:
                        appointment.notes = appointment.notes.split('Patient Details (Pending):')[0].strip()
                    
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
                    
                except json.JSONDecodeError:
                    return Response({
                        'message': 'Invalid patient details format in notes',
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    'message': 'No pending patient details found in appointment notes',
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
                email_sent = self._handle_appointment_confirmation(appointment)
                
                appointment.status = new_status
                appointment.save()
                
                serializer = AppointmentSerializer(appointment)
                response_data = serializer.data
                response_data['email_sent'] = email_sent
                response_data['patient_created'] = hasattr(appointment, '_patient_created')
                
                return Response(response_data)
            else:
                # Regular status update
                appointment.status = new_status
                appointment.save()
                
                serializer = AppointmentSerializer(appointment)
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
    
    def _handle_appointment_confirmation(self, appointment):
        """Handle patient creation and email sending when confirming a pending appointment"""
        try:
            # Check if appointment has patient details in different formats
            patient = None
            email_sent = False
            
            # Check if appointment already has a patient (new format)
            if hasattr(appointment, 'patient_name') and appointment.patient_name:
                # Check if patient with this email already exists
                try:
                    existing_patient = Patient.objects.get(email=appointment.patient_email)
                    # Patient exists, use the existing one
                    appointment.patient = existing_patient
                    logger.info(f"Using existing patient {existing_patient.id} (email: {appointment.patient_email}) for appointment {appointment.id}")
                except Patient.DoesNotExist:
                    # Create patient from the new appointment fields
                    try:
                        patient = Patient.objects.create(
                            name=appointment.patient_name,
                            email=appointment.patient_email,
                            phone=appointment.patient_phone,
                            date_of_birth=appointment.patient_date_of_birth,
                            gender=appointment.patient_gender,
                            address=appointment.patient_address,
                            marital_status=appointment.patient_marital_status
                        )
                        
                        # Link the patient to the appointment
                        appointment.patient = patient
                        appointment._patient_created = True
                        logger.info(f"Created new patient {patient.id} for appointment {appointment.id}")
                        
                    except Exception as patient_error:
                        logger.error(f"Error creating patient from appointment fields: {str(patient_error)}")
                
                except Exception as lookup_error:
                    logger.error(f"Error checking for existing patient: {str(lookup_error)}")
            
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
            
            # Send confirmation email if we have a patient
            if patient:
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
                logger.warning(f"No patient found for appointment {appointment.id}, cannot send confirmation email")
            
            return email_sent
            
        except Exception as e:
            logger.error(f"Error handling appointment confirmation: {str(e)}")
            logger.error(traceback.format_exc())
            return False