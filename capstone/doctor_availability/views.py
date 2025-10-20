from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from datetime import timedelta, time, datetime
import pytz
from .models import DoctorAvailability, TimeSlot, PredefinedTimeSlot
from .serializers import DoctorAvailabilitySerializer, TimeSlotSerializer, PredefinedTimeSlotSerializer
from accounts.models import CustomUser
from rest_framework.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)

# Set Pacific Time zone
PACIFIC_TZ = pytz.timezone('America/Los_Angeles')

def convert_to_pacific(dt):
    """Convert a datetime to Pacific Time"""
    if dt.tzinfo is None:
        dt = timezone.make_aware(dt)
    return dt.astimezone(PACIFIC_TZ)

def get_pacific_now():
    """Get current time in Pacific Time"""
    return timezone.now().astimezone(PACIFIC_TZ)

class PredefinedTimeSlotViewSet(viewsets.ModelViewSet):
    serializer_class = PredefinedTimeSlotSerializer
    permission_classes = [AllowAny]
    queryset = PredefinedTimeSlot.objects.all()

    @action(detail=False, methods=['get'])
    def active_slots(self, request):
        slots = PredefinedTimeSlot.objects.filter(is_active=True)
        serializer = self.get_serializer(slots, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        try:
            if isinstance(request.data, list):
                serializer = self.get_serializer(data=request.data, many=True)
            else:
                serializer = self.get_serializer(data=request.data)
            
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def perform_create(self, serializer):
        serializer.save()

class DoctorAvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorAvailabilitySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = DoctorAvailability.objects.all()
        doctor_id = self.request.query_params.get('doctor_id')
        date_str = self.request.query_params.get('date')

        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
        if date_str:
            try:
                # Parse date in Pacific Time
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
                queryset = queryset.filter(date=date)
            except ValueError:
                raise ValidationError(f"Invalid date format. Expected YYYY-MM-DD, got {date_str}")
        
        return queryset

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.get_queryset()
            if not queryset.exists():
                # If no availability exists, return predefined time slots
                predefined_slots = PredefinedTimeSlot.objects.filter(is_active=True)
                serializer = PredefinedTimeSlotSerializer(predefined_slots, many=True)
                return Response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=False, methods=['get'])
    def available_dates(self, request):
        try:
            doctor_id = request.query_params.get('doctor_id')
            logger.info(f"Available dates request received - doctor_id: {doctor_id}")

            if not doctor_id:
                logger.error("Missing doctor_id parameter")
                return Response({'error': 'doctor_id is required'}, status=status.HTTP_400_BAD_REQUEST)

            # Get current date in Pacific Time
            pacific_now = get_pacific_now()
            current_date = pacific_now.date()

            # Get all availabilities for the doctor that are available and in the future
            availabilities = DoctorAvailability.objects.filter(
                doctor_id=doctor_id,
                date__gte=current_date,
                is_available=True
            ).order_by('date')

            logger.info(f"Found {availabilities.count()} availabilities for doctor {doctor_id}")
            
            # Log each availability
            for avail in availabilities:
                logger.info(f"Availability: ID={avail.id}, Date={avail.date}, Max Appointments={avail.max_appointments}")

            # Extract dates and convert to strings
            dates = [availability.date.isoformat() for availability in availabilities]
            
            logger.info(f"Returning dates: {dates}")
            return Response(dates)
        except Exception as e:
            logger.error(f"Error in available_dates: {str(e)}", exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def available_times(self, request):
        try:
            doctor_id = request.query_params.get('doctor_id')
            date = request.query_params.get('date')

            if not doctor_id or not date:
                return Response(
                    {'error': 'doctor_id and date are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                date_obj = datetime.strptime(date, '%Y-%m-%d').date()
                availability = DoctorAvailability.objects.get(
                    doctor_id=doctor_id,
                    date=date_obj,
                    is_available=True
                )
                time_slots = TimeSlot.objects.filter(
                    availability=availability,
                    is_booked=False
                )
                serializer = TimeSlotSerializer(time_slots, many=True)
                return Response(serializer.data)
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Expected YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except DoctorAvailability.DoesNotExist:
                return Response(
                    {'error': 'No availability found for this date'},
                    status=status.HTTP_404_NOT_FOUND
                )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def time_slots(self, request):
        try:
            doctor_id = request.query_params.get('doctor_id')
            date_str = request.query_params.get('date')

            logger.info(f"Time slots request received - doctor_id: {doctor_id}, date: {date_str}")

            if not doctor_id or not date_str:
                logger.error("Missing required parameters", extra={
                    'doctor_id': doctor_id,
                    'date': date_str
                })
                return Response(
                    {'error': 'doctor_id and date are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                # Parse date in Pacific Time
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
                
                # Try to get existing availability
                availability = DoctorAvailability.objects.filter(
                    doctor_id=doctor_id,
                    date=date
                ).first()

                logger.info(f"Found availability: {availability}")

                if availability:
                    # If availability exists, return its time slots
                    time_slots = TimeSlot.objects.filter(availability=availability)
                    logger.info(f"Found {time_slots.count()} time slots for availability {availability.id}")
                    
                    # Convert time slots to Pacific Time
                    pacific_slots = []
                    for slot in time_slots:
                        # Create datetime objects for today with these times
                        start_dt = datetime.combine(date, slot.start_time)
                        end_dt = datetime.combine(date, slot.end_time)
                        
                        # Convert to Pacific Time
                        pacific_start = convert_to_pacific(start_dt)
                        pacific_end = convert_to_pacific(end_dt)
                        
                        pacific_slots.append({
                            'id': slot.id,
                            'start_time': pacific_start.strftime('%H:%M:%S'),
                            'end_time': pacific_end.strftime('%H:%M:%S'),
                            'is_booked': slot.is_booked
                        })
                    
                    logger.info(f"Time slots in Pacific Time: {pacific_slots}")
                    return Response(pacific_slots)
                else:
                    # If no availability exists, return predefined time slots
                    logger.info("No availability found, returning predefined slots")
                    predefined_slots = PredefinedTimeSlot.objects.filter(is_active=True)
                    
                    # Convert predefined slots to Pacific Time
                    pacific_slots = []
                    for slot in predefined_slots:
                        start_time = datetime.strptime(slot.start_time, '%H:%M:%S').time()
                        end_time = datetime.strptime(slot.end_time, '%H:%M:%S').time()
                        
                        start_dt = datetime.combine(date, start_time)
                        end_dt = datetime.combine(date, end_time)
                        
                        pacific_start = convert_to_pacific(start_dt)
                        pacific_end = convert_to_pacific(end_dt)
                        
                        pacific_slots.append({
                            'id': slot.id,
                            'start_time': pacific_start.strftime('%H:%M:%S'),
                            'end_time': pacific_end.strftime('%H:%M:%S'),
                            'is_booked': False
                        })
                    
                    logger.info(f"Found {len(pacific_slots)} predefined slots in Pacific Time")
                    return Response(pacific_slots)

            except ValueError as e:
                logger.error(f"Invalid date format: {date_str}", exc_info=True)
                return Response(
                    {'error': 'Invalid date format. Expected YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            logger.error("Unexpected error in time_slots", exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request, *args, **kwargs):
        doctor_id = request.data.get('doctor_id')
        date = request.data.get('date')

        if not doctor_id or not date:
            return Response(
                {'error': 'doctor_id and date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        availability, created = DoctorAvailability.objects.get_or_create(
            doctor_id=doctor_id,
            date=date,
            defaults={
                'is_available': True,
                'max_appointments': request.data.get('max_appointments', 8)
            }
        )

        serializer = self.get_serializer(availability)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['patch'])
    def update_time_slot(self, request, pk=None):
        try:
            availability = self.get_object()
            
            time_slot_id = request.data.get('time_slot_id')
            is_booked = request.data.get('is_booked')

            if not time_slot_id or is_booked is None:
                return Response(
                    {'error': 'time_slot_id and is_booked are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                time_slot = TimeSlot.objects.get(id=time_slot_id, availability=availability)
                time_slot.is_booked = is_booked
                time_slot.save()
                serializer = TimeSlotSerializer(time_slot)
                return Response(serializer.data)
            except TimeSlot.DoesNotExist:
                return Response(
                    {'error': 'Time slot not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        except DoctorAvailability.DoesNotExist:
            return Response(
                {'error': 'Availability not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def create_time_slot(self, request, pk=None):
        try:
            availability = self.get_object()
            
            start_time = request.data.get('start_time')
            end_time = request.data.get('end_time')
            is_booked = request.data.get('is_booked', False)

            logger.info(f"Creating time slot with data: {request.data}")
            logger.info(f"Availability ID: {availability.id}, Doctor: {availability.doctor.get_full_name()}, Date: {availability.date}")

            if not start_time or not end_time:
                logger.error("Missing required fields: start_time or end_time")
                return Response(
                    {'error': 'start_time and end_time are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate time format
            try:
                # Ensure times are in HH:MM:SS format
                if len(start_time.split(':')) == 2:
                    start_time = f"{start_time}:00"
                if len(end_time.split(':')) == 2:
                    end_time = f"{end_time}:00"

                # Parse times to validate format
                datetime.strptime(start_time, '%H:%M:%S')
                datetime.strptime(end_time, '%H:%M:%S')
            except ValueError as e:
                logger.error(f"Invalid time format: {str(e)}")
                return Response(
                    {'error': 'Invalid time format. Expected HH:MM:SS'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if time slot already exists
            existing_slot = TimeSlot.objects.filter(
                availability=availability,
                start_time=start_time,
                end_time=end_time
            ).first()

            if existing_slot:
                logger.info(f"Time slot already exists: ID={existing_slot.id}")
                serializer = TimeSlotSerializer(existing_slot)
                return Response(serializer.data, status=status.HTTP_200_OK)

            # Create new time slot
            time_slot = TimeSlot.objects.create(
                availability=availability,
                start_time=start_time,
                end_time=end_time,
                is_booked=is_booked
            )

            logger.info(f"Created time slot: ID={time_slot.id}, Start={time_slot.start_time}, End={time_slot.end_time}, Booked={time_slot.is_booked}")
            
            serializer = TimeSlotSerializer(time_slot)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except DoctorAvailability.DoesNotExist:
            logger.error(f"Availability not found for ID: {pk}")
            return Response(
                {'error': 'Availability not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error creating time slot: {str(e)}", exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 