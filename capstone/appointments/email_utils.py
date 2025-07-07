from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
import logging
from clinic.models import ClinicSettings

logger = logging.getLogger(__name__)

def send_appointment_confirmation_email(appointment, patient):
    """
    Send appointment confirmation email to patient with HTML formatting
    
    Args:
        appointment: Appointment object
        patient: Patient object
    """
    try:
        # Fetch clinic info from the database
        clinic = ClinicSettings.objects.last()  # Use the latest settings
        clinic_name = clinic.clinic_name if clinic else 'HealthNexus Medical Center'
        clinic_address = clinic.address if clinic else '123 Health Avenue, Medical District'
        clinic_phone = clinic.phone if clinic else '(123) 456-7890'
        clinic_email = clinic.email if clinic else 'info@healthnexus.com'
        clinic_website = clinic.website if clinic else 'www.healthnexus.com'

        subject = f'Appointment Confirmed - {clinic_name}'
        
        # Format the appointment date and time
        appointment_date = appointment.date.strftime('%B %d, %Y')
        appointment_time = appointment.time.strftime('%I:%M %p')
        
        # Get doctor name, handle case where doctor might not be assigned
        if appointment.doctor:
            doctor_name = f"Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}"
        else:
            doctor_name = "To be assigned"
        
        # Create HTML email content
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">✅ Appointment Confirmed!</h1>
                <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">{clinic_name}</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e0e0e0;">
                <h2 style="color: #059669; margin-top: 0;">Hello {patient.name}! 👋</h2>
                <p style="font-size: 16px; margin-bottom: 25px;">Great news! Your appointment request has been <strong>approved and confirmed</strong>.</p>
                
                <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                    <h3 style="margin-top: 0; color: #065f46; display: flex; align-items: center;">
                        📅 Your Appointment Details
                    </h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #4b5563; width: 100px;">Date:</td>
                            <td style="padding: 8px 0; color: #1f2937;">{appointment_date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Time:</td>
                            <td style="padding: 8px 0; color: #1f2937;">{appointment_time}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Type:</td>
                            <td style="padding: 8px 0; color: #1f2937;">{appointment.appointment_type}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Doctor:</td>
                            <td style="padding: 8px 0; color: #1f2937;">{doctor_name}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 25px 0;">
                    <p style="margin: 0; color: #92400e;">
                        <strong>⚠️ Important:</strong> Please arrive 10 minutes before your scheduled appointment time.
                    </p>
                </div>
                
                <div style="background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin: 25px 0;">
                    <h4 style="margin-top: 0; color: #065f46;">📍 Visit Us At</h4>
                    <p style="margin: 5px 0; color: #047857;"><strong>Address:</strong> {clinic_address}</p>
                    <p style="margin: 5px 0; color: #047857;"><strong>Phone:</strong> {clinic_phone}</p>
                    <p style="margin: 5px 0; color: #047857;"><strong>Email:</strong> <a href="mailto:{clinic_email}" style="color: #047857;">{clinic_email}</a></p>
                    {f'<p style="margin: 5px 0; color: #047857;"><strong>Website:</strong> <a href="{clinic_website}" style="color: #047857;">{clinic_website}</a></p>' if clinic_website else ''}
                </div>
                
                <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 15px; margin: 25px 0;">
                    <h4 style="margin-top: 0; color: #1e40af;">📋 What to Bring</h4>
                    <ul style="margin: 10px 0; color: #1e40af; padding-left: 20px;">
                        <li>Valid government-issued ID</li>
                        <li>Insurance card (if applicable)</li>
                        <li>List of current medications</li>
                        <li>Any relevant medical records</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <p style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">
                        Need to reschedule or cancel? Please contact us at least 24 hours in advance.
                    </p>
                    <a href="tel:{clinic_phone.replace('(', '').replace(')', '').replace(' ', '').replace('-', '')}" 
                       style="background: #059669; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; margin: 5px;">
                        📞 Call Us
                    </a>
                    <a href="mailto:{clinic_email}" 
                       style="background: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; margin: 5px;">
                        📧 Email Us
                    </a>
                </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                    We look forward to seeing you! 🏥
                </p>
                <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
                    Thank you for choosing <strong>{clinic_name}</strong><br>
                    Your health is our priority.
                </p>
            </div>
        </body>
        </html>
        """
        
        # Create plain text version for email clients that don't support HTML
        plain_text_message = f"""
Dear {patient.name},

Your appointment request has been approved and confirmed!

Appointment Details:
- Date: {appointment_date}
- Time: {appointment_time}
- Type: {appointment.appointment_type}
- Doctor: {doctor_name}

Please arrive 10 minutes before your scheduled appointment time.

If you need to reschedule or cancel your appointment, please contact us at least 24 hours in advance.

What to bring:
- Valid government-issued ID
- Insurance card (if applicable)
- List of current medications
- Any relevant medical records

Location: {clinic_name}
Address: {clinic_address}
Phone: {clinic_phone}
Email: {clinic_email}
{f'Website: {clinic_website}' if clinic_website else ''}

For any questions, please don't hesitate to contact us.

Best regards,
{clinic_name} Team
        """
          # Use EmailMultiAlternatives to send both HTML and plain text versions
        # Get clinic email settings from database for sender address  
        if clinic and clinic.email:
            from_email = f"{clinic_name} <{clinic.email}>"
        else:
            # Fallback to Django settings if no clinic email is configured
            from_email = f"{clinic_name} <{settings.EMAIL_HOST_USER}>"
        
        to_email = [patient.email]
        
        msg = EmailMultiAlternatives(
            subject=subject,
            body=plain_text_message.strip(),
            from_email=from_email,
            to=to_email,
            headers={
                'X-Patient-Name': patient.name,
                'X-Appointment-Date': appointment_date,
                'X-Appointment-Status': 'confirmed'
            }
        )
        
        msg.attach_alternative(html_content, "text/html")
        result = msg.send()
        
        if result == 1:
            logger.info(f"Confirmation email sent to {patient.email} for appointment {appointment.id}")
            return True
        else:
            logger.error(f"Failed to send confirmation email to {patient.email} for appointment {appointment.id}")
            return False
        
    except Exception as email_error:
        logger.error(f"Failed to send confirmation email: {str(email_error)}")
        return False

def send_appointment_reminder_email(appointment, patient):
    """
    Send appointment reminder email to patient with HTML formatting
    
    Args:
        appointment: Appointment object
        patient: Patient object
    """
    try:
        # Fetch clinic info from the database
        clinic = ClinicSettings.objects.last()  # Use the latest settings
        clinic_name = clinic.clinic_name if clinic else 'HealthNexus Medical Center'
        clinic_address = clinic.address if clinic else '123 Health Avenue, Medical District'
        clinic_phone = clinic.phone if clinic else '(123) 456-7890'
        clinic_email = clinic.email if clinic else 'info@healthnexus.com'
        clinic_website = clinic.website if clinic else 'www.healthnexus.com'
        
        subject = f'Appointment Reminder - {clinic_name}'
        
        # Format the appointment date and time
        appointment_date = appointment.date.strftime('%B %d, %Y')
        appointment_time = appointment.time.strftime('%I:%M %p')
        
        # Create HTML email content
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">⏰ Appointment Reminder</h1>
                <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">{clinic_name}</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e0e0e0;">
                <h2 style="color: #2563eb; margin-top: 0;">Hello {patient.name}! 👋</h2>
                <p style="font-size: 16px; margin-bottom: 25px;">This is a friendly reminder about your upcoming appointment.</p>
                
                <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                    <h3 style="margin-top: 0; color: #1e40af; display: flex; align-items: center;">
                        📅 Appointment Details
                    </h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #4b5563; width: 100px;">Date:</td>
                            <td style="padding: 8px 0; color: #1f2937;">{appointment_date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Time:</td>
                            <td style="padding: 8px 0; color: #1f2937;">{appointment_time}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Type:</td>
                            <td style="padding: 8px 0; color: #1f2937;">{appointment.appointment_type}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Doctor:</td>
                            <td style="padding: 8px 0; color: #1f2937;">Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 25px 0;">
                    <p style="margin: 0; color: #92400e;">
                        <strong>⚠️ Important:</strong> Please arrive 10 minutes before your scheduled appointment time.
                    </p>
                </div>
                
                <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin: 25px 0;">
                    <h4 style="margin-top: 0; color: #065f46;">📍 Clinic Information</h4>
                    <p style="margin: 5px 0; color: #047857;"><strong>Address:</strong> {clinic_address}</p>
                    <p style="margin: 5px 0; color: #047857;"><strong>Phone:</strong> {clinic_phone}</p>
                    <p style="margin: 5px 0; color: #047857;"><strong>Email:</strong> <a href="mailto:{clinic_email}" style="color: #047857;">{clinic_email}</a></p>
                    {f'<p style="margin: 5px 0; color: #047857;"><strong>Website:</strong> <a href="{clinic_website}" style="color: #047857;">{clinic_website}</a></p>' if clinic_website else ''}
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <p style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">
                        Need to reschedule or cancel? Contact us as soon as possible.
                    </p>
                    <a href="tel:{clinic_phone.replace('(', '').replace(')', '').replace(' ', '').replace('-', '')}" 
                       style="background: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; margin: 5px;">
                        📞 Call Us
                    </a>
                    <a href="mailto:{clinic_email}" 
                       style="background: #059669; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; margin: 5px;">
                        📧 Email Us
                    </a>
                </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                    We look forward to seeing you! 🏥
                </p>
                <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
                    Best regards,<br>
                    <strong>{clinic_name} Team</strong>
                </p>
            </div>
        </body>
        </html>
        """
        
        # Create plain text version for email clients that don't support HTML
        plain_text_message = f"""
Dear {patient.name},

This is a friendly reminder about your upcoming appointment.

Appointment Details:
- Date: {appointment_date}
- Time: {appointment_time}
- Type: {appointment.appointment_type}
- Doctor: Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}

Please arrive 10 minutes before your scheduled appointment time.

If you need to reschedule or cancel your appointment, please contact us as soon as possible.

Location: {clinic_name}
Address: {clinic_address}
Phone: {clinic_phone}
Email: {clinic_email}
{f'Website: {clinic_website}' if clinic_website else ''}

We look forward to seeing you!

Best regards,
{clinic_name} Team        """
        
        # Use EmailMultiAlternatives to send both HTML and plain text versions
        # Get clinic email settings from database for sender address
        if clinic and clinic.email:
            from_email = f"{clinic_name} <{clinic.email}>"
        else:
            # Fallback to Django settings if no clinic email is configured
            from_email = f"{clinic_name} <{settings.EMAIL_HOST_USER}>"
        
        to_email = [patient.email]
        
        msg = EmailMultiAlternatives(
            subject=subject,
            body=plain_text_message.strip(),
            from_email=from_email,
            to=to_email,
            headers={
                'X-Patient-Name': patient.name,
                'X-Appointment-Date': appointment_date,
            }
        )
        
        msg.attach_alternative(html_content, "text/html")
        result = msg.send()
        
        if result == 1:
            logger.info(f"Reminder email sent to {patient.email} for appointment {appointment.id}")
            return True
        else:
            logger.error(f"Failed to send reminder email to {patient.email} for appointment {appointment.id}")
            return False
        
    except Exception as email_error:
        logger.error(f"Failed to send reminder email: {str(email_error)}")
        return False