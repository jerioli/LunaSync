from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
from appointments.models import Appointment
from appointments.email_utils import send_appointment_reminder_email
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Send reminder emails for upcoming appointments'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=24,
            help='Send reminders for appointments happening in the next N hours (default: 24)'
        )

    def handle(self, *args, **options):
        from accounts.iprog_sms_service import iprog_sms_service
        hours = options['hours']
        now = timezone.localtime()
        today = now.date()
        self.stdout.write(f"Running appointment reminder notifications at {now}")

        appointments = Appointment.objects.filter(
            status='scheduled',
            date__gte=today,
            patient__isnull=False
        ).select_related('patient', 'doctor')

        clinic_settings = None
        try:
            from clinic.models import ClinicSettings
            clinic_settings = ClinicSettings.objects.first()
        except Exception:
            pass
        clinic_name = clinic_settings.clinic_name if clinic_settings else 'Clinic'

        notifications_sent = 0
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
                    if success:
                        self.stdout.write(self.style.SUCCESS(f"SMS sent to {patient_phone} for appointment at {appointment_time}"))
                    else:
                        self.stdout.write(self.style.WARNING(f"Failed to send SMS to {patient_phone}: {message}"))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error sending SMS for appointment {appointment.id}: {str(e)}"))

            # Notification logic
            if hours_until > 24:
                reminder_time = appointment_dt - timedelta(hours=24)
            elif 8 <= hours_until <= 24:
                reminder_time = appointment_dt - timedelta(hours=6)
            elif 4 <= hours_until < 8:
                reminder_time = appointment_dt - timedelta(hours=3)
            else:
                send_sms()
                notifications_sent += 1
                continue

            delay = (reminder_time - now).total_seconds()
            if delay <= 0:
                send_sms()
                notifications_sent += 1
            else:
                # For demo/testing, just print what would be scheduled
                self.stdout.write(f"Would schedule SMS to {patient_phone} at {reminder_time} (in {delay/3600:.2f} hours)")

        self.stdout.write(self.style.SUCCESS(f"Successfully sent {notifications_sent} SMS notifications (immediate)"))