from django.core.management.base import BaseCommand
from django.utils import timezone
from appointments.models import Appointment
from doctor_availability.models import DoctorAvailability, TimeSlot
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Fix time slot booking status based on existing appointments'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        # First, mark all time slots as available
        total_slots = TimeSlot.objects.count()
        if not dry_run:
            TimeSlot.objects.update(is_booked=False)
        self.stdout.write(f'Reset {total_slots} time slots to available')
        
        # Then, mark time slots as booked if they have active appointments
        active_appointments = Appointment.objects.filter(
            status__in=['pending', 'scheduled'],
            doctor__isnull=False
        )
        
        updated_count = 0
        not_found_count = 0
        
        for appointment in active_appointments:
            try:
                # Find the corresponding availability
                availability = DoctorAvailability.objects.filter(
                    doctor=appointment.doctor,
                    date=appointment.date
                ).first()
                
                if availability:
                    # Find the matching time slot
                    time_slot = TimeSlot.objects.filter(
                        availability=availability,
                        start_time=appointment.time
                    ).first()
                    
                    if time_slot:
                        if not dry_run:
                            time_slot.is_booked = True
                            time_slot.save()
                        updated_count += 1
                        self.stdout.write(
                            f'{"Would mark" if dry_run else "Marked"} time slot {time_slot.id} as booked '
                            f'for appointment {appointment.id} '
                            f'(Dr. {appointment.doctor.get_full_name()}, {appointment.date}, {appointment.time})'
                        )
                    else:
                        not_found_count += 1
                        self.stdout.write(
                            self.style.WARNING(
                                f'No time slot found for appointment {appointment.id} '
                                f'(Dr. {appointment.doctor.get_full_name()}, {appointment.date}, {appointment.time})'
                            )
                        )
                else:
                    not_found_count += 1
                    self.stdout.write(
                        self.style.WARNING(
                            f'No availability found for appointment {appointment.id} '
                            f'(Dr. {appointment.doctor.get_full_name()}, {appointment.date})'
                        )
                    )
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Error processing appointment {appointment.id}: {str(e)}'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n{"Would update" if dry_run else "Updated"} {updated_count} time slots to booked status'
            )
        )
        
        if not_found_count > 0:
            self.stdout.write(
                self.style.WARNING(
                    f'{not_found_count} appointments could not find matching time slots'
                )
            )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    '\nTo apply these changes, run the command without --dry-run'
                )
            )
