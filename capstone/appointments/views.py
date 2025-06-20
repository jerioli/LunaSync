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

logger = logging.getLogger(__name__)

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