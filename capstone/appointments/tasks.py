from celery import shared_task
from django.utils import timezone
from datetime import datetime, timedelta
from appointments.models import Appointment
from accounts.iprog_sms_service import iprog_sms_service

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

    for appointment in appointments:
        appointment_dt = datetime.combine(appointment.date, appointment.time)
        hours_until = (appointment_dt - now).total_seconds() / 3600
        patient = appointment.patient
        patient_phone = getattr(patient, 'phone', None) or getattr(appointment, 'patient_phone', None)
        if not patient_phone:
            continue

        appointment_date = appointment.date.strftime('%B %d, %Y')
        appointment_time = appointment.time.strftime('%I:%M %p')
        doctor_name = appointment.doctor.get_full_name() if appointment.doctor else 'Doctor'
        patient_name = getattr(patient, 'name', None) or getattr(appointment, 'patient_name', 'Patient')

        sms_message = f"""Appointment Reminder\n\nPatient: {patient_name}\nDate: {appointment_date}\nTime: {appointment_time}\nDoctor: {doctor_name}\nType: {appointment.appointment_type}\n\n{clinic_name}"""

        def send_sms():
            try:
                success, message, reference_id = iprog_sms_service.send_sms(
                    patient_phone,
                    sms_message
                )
            except Exception:
                pass

        if hours_until > 24:
            reminder_time = appointment_dt - timedelta(hours=24)
        elif 8 <= hours_until <= 24:
            reminder_time = appointment_dt - timedelta(hours=6)
        elif 4 <= hours_until < 8:
            reminder_time = appointment_dt - timedelta(hours=3)
        else:
            send_sms()
            continue

        delay = (reminder_time - now).total_seconds()
        if 0 <= delay < 600:  # If reminder is due within the next 10 minutes
            send_sms()
