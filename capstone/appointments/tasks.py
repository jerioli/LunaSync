from celery import shared_task
from django.utils import timezone
from datetime import datetime, timedelta
from appointments.models import Appointment
from accounts.iprog_sms_service import iprog_sms_service
import logging

logger = logging.getLogger(__name__)

@shared_task
def send_appointment_reminders_task():
    now = timezone.localtime()
    today = now.date()
    appointments = Appointment.objects.filter(
        status='scheduled',
        date__gte=today,
        patient__isnull=False
    ).select_related('patient', 'doctor')

    try:
        from clinic.models import ClinicSettings
        clinic_settings = ClinicSettings.objects.first()
    except Exception:
        clinic_settings = None
    clinic_name = clinic_settings.clinic_name if clinic_settings else 'Clinic'

    reminders_sent = 0
    
    for appointment in appointments:
        # Make appointment datetime timezone-aware
        appointment_dt = timezone.make_aware(
            datetime.combine(appointment.date, appointment.time)
        )
        hours_until = (appointment_dt - now).total_seconds() / 3600
        
        # Skip if appointment is in the past
        if hours_until < 0:
            continue
            
        patient = appointment.patient
        patient_phone = getattr(patient, 'phone_number', None) or getattr(patient, 'phone', None) or getattr(appointment, 'patient_phone', None)
        if not patient_phone:
            continue

        # Determine the appropriate reminder time based on hours until appointment
        should_send = False
        reminder_type = None
        
        if hours_until > 24:
            # Send reminder 24 hours (1 day) before
            reminder_time = appointment_dt - timedelta(hours=24)
            time_window = abs((reminder_time - now).total_seconds() / 60)  # minutes
            if time_window <= 5:  # Within 5 minute window
                should_send = True
                reminder_type = "1-day"
        elif 1 <= hours_until <= 24:
            # Send reminder 1 hour before
            reminder_time = appointment_dt - timedelta(hours=1)
            time_window = abs((reminder_time - now).total_seconds() / 60)
            if time_window <= 5:
                should_send = True
                reminder_type = "1-hour"
        
        if should_send:
            # Check if we already sent this type of reminder (using a simple flag system)
            # You can enhance this by adding a field to track sent reminders
            appointment_date = appointment.date.strftime('%B %d, %Y')
            appointment_time = appointment.time.strftime('%I:%M %p')
            doctor_name = appointment.doctor.get_full_name() if appointment.doctor else 'Doctor'
            patient_name = getattr(patient, 'name', None) or getattr(appointment, 'patient_name', 'Patient')

            sms_message = f"""Appointment Reminder ({reminder_type})\n\nPatient: {patient_name}\nDate: {appointment_date}\nTime: {appointment_time}\nDoctor: {doctor_name}\nType: {appointment.appointment_type}\n\n{clinic_name}"""

            try:
                success, message, reference_id = iprog_sms_service.send_sms(
                    patient_phone,
                    sms_message
                )
                if success:
                    reminders_sent += 1
                    logger.info(f"Sent {reminder_type} reminder to {patient_name} ({patient_phone}) for appointment on {appointment_date} at {appointment_time}")
                else:
                    logger.error(f"Failed to send reminder to {patient_phone}: {message}")
            except Exception as e:
                logger.error(f"Error sending SMS reminder: {str(e)}")
    
    logger.info(f"Reminder task completed. Sent {reminders_sent} reminders.")
    return f"Sent {reminders_sent} reminders"
