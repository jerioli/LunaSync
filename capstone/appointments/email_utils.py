from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def send_appointment_confirmation_email(appointment, patient):
    """
    Send appointment confirmation email to patient
    
    Args:
        appointment: Appointment object
        patient: Patient object
    """
    try:
        subject = 'Appointment Confirmed - Medratics Medical and Diagnostic Clinic'
        
        # Format the appointment date and time
        appointment_date = appointment.date.strftime('%B %d, %Y')
        appointment_time = appointment.time.strftime('%I:%M %p')
        
        # Create detailed email message
        message = f"""
Dear {patient.name},

Your appointment request has been approved and confirmed!

Appointment Details:
- Date: {appointment_date}
- Time: {appointment_time}
- Type: {appointment.appointment_type}
- Doctor: {appointment.doctor.first_name} {appointment.doctor.last_name}

Please arrive 10 minutes before your scheduled appointment time.

If you need to reschedule or cancel your appointment, please contact us at least 24 hours in advance.

Location: HealthNexus Medical Center
Address: 123 Health Avenue, Medical District

For any questions, please don't hesitate to contact us.

Best regards,
HealthNexus Medical Center Team
        """
        
        from_email = settings.DEFAULT_FROM_EMAIL
        to_email = [patient.email]
        
        send_mail(
            subject=subject,
            message=message.strip(),
            from_email=from_email,
            recipient_list=to_email,
            fail_silently=False
        )
        
        logger.info(f"Confirmation email sent to {patient.email} for appointment {appointment.id}")
        return True
        
    except Exception as email_error:
        logger.error(f"Failed to send confirmation email: {str(email_error)}")
        return False

def send_appointment_reminder_email(appointment, patient):
    """
    Send appointment reminder email to patient
    
    Args:
        appointment: Appointment object
        patient: Patient object
    """
    try:
        subject = 'Appointment Reminder - HealthNexus Medical Center'
        
        # Format the appointment date and time
        appointment_date = appointment.date.strftime('%B %d, %Y')
        appointment_time = appointment.time.strftime('%I:%M %p')
        
        # Create reminder email message
        message = f"""
Dear {patient.name},

This is a friendly reminder about your upcoming appointment.

Appointment Details:
- Date: {appointment_date}
- Time: {appointment_time}
- Type: {appointment.appointment_type}
- Doctor: {appointment.doctor.first_name} {appointment.doctor.last_name}

Please arrive 10 minutes before your scheduled appointment time.

If you need to reschedule or cancel your appointment, please contact us as soon as possible.

Location: HealthNexus Medical Center
Address: 123 Health Avenue, Medical District

We look forward to seeing you!

Best regards,
HealthNexus Medical Center Team
        """
        
        from_email = settings.DEFAULT_FROM_EMAIL
        to_email = [patient.email]
        
        send_mail(
            subject=subject,
            message=message.strip(),
            from_email=from_email,
            recipient_list=to_email,
            fail_silently=False
        )
        
        logger.info(f"Reminder email sent to {patient.email} for appointment {appointment.id}")
        return True
        
    except Exception as email_error:
        logger.error(f"Failed to send reminder email: {str(email_error)}")
        return False 