from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
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
        hours = options['hours']
        now = timezone.now()
        reminder_time = now + timedelta(hours=hours)
        
        # Get appointments that are scheduled and happening within the next N hours
        upcoming_appointments = Appointment.objects.filter(
            status='scheduled',
            date=reminder_time.date(),
            time__gte=now.time(),
            time__lte=reminder_time.time(),
            patient__isnull=False  # Only appointments with patient records
        ).select_related('patient', 'doctor')
        
        self.stdout.write(f"Found {upcoming_appointments.count()} appointments for reminder emails")
        
        emails_sent = 0
        for appointment in upcoming_appointments:
            try:
                if send_appointment_reminder_email(appointment, appointment.patient):
                    emails_sent += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Reminder email sent to {appointment.patient.email} for appointment on {appointment.date} at {appointment.time}"
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Failed to send reminder email to {appointment.patient.email} for appointment {appointment.id}"
                        )
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"Error sending reminder email for appointment {appointment.id}: {str(e)}"
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully sent {emails_sent} reminder emails out of {upcoming_appointments.count()} appointments"
            )
        ) 