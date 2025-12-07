from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
import logging
import base64
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.utils import formataddr
from clinic.models import ClinicSettings

logger = logging.getLogger(__name__)

def get_logo_attachment():
    """
    Get the clinic logo as an email attachment
    """
    try:
        clinic_settings = ClinicSettings.objects.first()
        if clinic_settings and clinic_settings.logo:
            logo_path = clinic_settings.logo.path
            if os.path.exists(logo_path):
                with open(logo_path, 'rb') as image_file:
                    image_data = image_file.read()
                    
                    # Create MIMEImage attachment
                    logo_attachment = MIMEImage(image_data)
                    logo_attachment.add_header('Content-ID', '<clinic_logo>')
                    logo_attachment.add_header('Content-Disposition', 'inline', filename='clinic_logo.jpg')
                    
                    return logo_attachment
    except Exception as e:
        print(f"Error getting logo attachment: {e}")
    return None

def get_logo_url():
    """
    Get the URL for clinic logo for email embedding
    """
    try:
        clinic_settings = ClinicSettings.objects.first()
        if clinic_settings and clinic_settings.logo:
            # Build absolute URL
            domain = getattr(settings, 'DOMAIN_URL', 'http://localhost:8000')
            logo_url = f"{domain.rstrip('/')}{settings.MEDIA_URL}{clinic_settings.logo}"
            return logo_url
    except Exception as e:
        print(f"Error getting logo URL: {e}")
    return None

def send_email_with_embedded_logo(to_email, subject, html_content, plain_content, clinic_name):
    """
    Send email using Django's EmailMultiAlternatives with proper headers for Yahoo Mail compatibility
    """
    try:
        from django.core.mail import EmailMultiAlternatives
        from email.utils import make_msgid
        
        # Create email with proper headers for Yahoo Mail compatibility
        email = EmailMultiAlternatives(
            subject=subject,
            body=plain_content,
            from_email=formataddr((clinic_name, settings.EMAIL_HOST_USER)),
            to=[to_email],
            headers={
                'Message-ID': make_msgid(domain='gmail.com'),  # Proper Message-ID for Gmail sending
                'X-Priority': '1',  # High priority
                'X-MSMail-Priority': 'High',
                'Importance': 'High',
                'Content-Type': 'multipart/alternative',  # Explicit content type
            }
        )
        
        # Attach HTML alternative
        email.attach_alternative(html_content, "text/html")
        
        # Try to attach logo (optional, won't break if fails)
        try:
            logo_attachment = get_logo_attachment()
            if logo_attachment:
                email.attach(logo_attachment)
        except Exception as logo_error:
            logger.warning(f"Could not attach logo: {logo_error}")
        
        # Set additional properties for better deliverability
        email.mixed_subtype = 'related'  # For embedded images
        
        # Send the email
        email.send(fail_silently=False)
        logger.info(f"Email sent successfully to {to_email}")
        return True
            
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        
        # Fallback: Try with smtplib for more control
        try:
            import smtplib
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText
            from email.utils import make_msgid, formatdate
            
            # Create message with proper MIME structure
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = formataddr((clinic_name, settings.EMAIL_HOST_USER))
            msg['To'] = to_email
            msg['Date'] = formatdate(localtime=True)
            msg['Message-ID'] = make_msgid(domain='gmail.com')
            
            # Attach plain text first (fallback)
            part1 = MIMEText(plain_content, 'plain', 'utf-8')
            msg.attach(part1)
            
            # Attach HTML version
            part2 = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(part2)
            
            # Connect to SMTP server
            server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=30)
            server.set_debuglevel(0)  # Disable debug output
            server.ehlo()  # Identify ourselves to the server
            
            if settings.EMAIL_USE_TLS:
                server.starttls()
                server.ehlo()  # Re-identify after STARTTLS
            
            if settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD:
                server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
            
            # Send email
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Email sent successfully via smtplib fallback to {to_email}")
            return True
            
        except Exception as fallback_error:
            logger.error(f"Fallback email also failed: {str(fallback_error)}")
            return False

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
        clinic_logo = clinic.logo.url if clinic and clinic.logo else None

        subject = f'Appointment Confirmed - {clinic_name}'
        
        # Format the appointment date and time
        appointment_date = appointment.date.strftime('%B %d, %Y')
        appointment_time = appointment.time.strftime('%I:%M %p')
        
        # Get doctor name, handle case where doctor might not be assigned
        if appointment.doctor:
            doctor_name = f"Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}"
        else:
            doctor_name = "To be assigned"
        
        # Get clinic logo attachment
        logo_attachment = get_logo_attachment()
        
        # Create logo header section
        logo_section = ""
        if logo_attachment:
            # Use embedded image reference (CID)
            logo_section = f"""
            <div style="background: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; border: 1px solid #e0e0e0;">
                <div style="display: inline-block;">
                    <img src="cid:clinic_logo" alt="{clinic_name} Logo" style="max-height: 80px; max-width: 300px; height: auto; display: block; margin: 0 auto;">
                </div>
                <div style="margin-top: 15px; color: #6b7280; font-size: 14px;">
                    <p style="margin: 5px 0; font-weight: 500;">{clinic_address}</p>
                    <p style="margin: 5px 0; font-weight: 500;">{clinic_phone}</p>
                </div>
            </div>
            """
        else:
            logo_section = f"""
            <div style="background: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; border: 1px solid #e0e0e0;">
                <h2 style="color: #059669; margin: 0; font-size: 24px;">{clinic_name}</h2>
                <div style="margin-top: 15px; color: #6b7280; font-size: 14px;">
                    <p style="margin: 5px 0; font-weight: 500;">{clinic_address}</p>
                    <p style="margin: 5px 0; font-weight: 500;">{clinic_phone}</p>
                </div>
            </div>
            """
        
        # Create HTML email content
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            {logo_section}
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">✅ Appointment Confirmed!</h1>
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
                            <td style="padding: 8px 0; font-weight: bold; color: #4b5563; width: 100px;">Patient ID:</td>
                            <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">{patient.patient_id}</td>
                        </tr>
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
                    <h4 style="margin-top: 0; color: #065f46;">📍 Contact Information</h4>
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
- Patient ID: {patient.patient_id}
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
        # Use smtplib to send email with embedded logo
        success = send_email_with_embedded_logo(
            to_email=patient.email,
            subject=subject,
            html_content=html_content,
            plain_content=plain_text_message.strip(),
            clinic_name=clinic_name
        )
        
        if success:
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
        clinic_logo = clinic.logo.url if clinic and clinic.logo else None
        
        subject = f'Appointment Reminder - {clinic_name}'
        
        # Format the appointment date and time
        appointment_date = appointment.date.strftime('%B %d, %Y')
        appointment_time = appointment.time.strftime('%I:%M %p')
        
        # Get clinic logo attachment
        logo_attachment = get_logo_attachment()
        
        # Create logo header section
        logo_section = ""
        if logo_attachment:
            # Use embedded image reference (CID)
            logo_section = f"""
            <div style="background: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; border: 1px solid #e0e0e0;">
                <div style="display: inline-block;">
                    <img src="cid:clinic_logo" alt="{clinic_name} Logo" style="max-height: 80px; max-width: 300px; height: auto; display: block; margin: 0 auto;">
                </div>
                <div style="margin-top: 15px; color: #6b7280; font-size: 14px;">
                    <p style="margin: 5px 0; font-weight: 500;">{clinic_address}</p>
                    <p style="margin: 5px 0; font-weight: 500;">{clinic_phone}</p>
                </div>
            </div>
            """
        else:
            logo_section = f"""
            <div style="background: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; border: 1px solid #e0e0e0;">
                <h2 style="color: #2563eb; margin: 0; font-size: 24px;">{clinic_name}</h2>
                <div style="margin-top: 15px; color: #6b7280; font-size: 14px;">
                    <p style="margin: 5px 0; font-weight: 500;">{clinic_address}</p>
                    <p style="margin: 5px 0; font-weight: 500;">{clinic_phone}</p>
                </div>
            </div>
            """
        
        # Create HTML email content
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            {logo_section}
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">⏰ Appointment Reminder</h1>
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
                            <td style="padding: 8px 0; font-weight: bold; color: #4b5563; width: 100px;">Patient ID:</td>
                            <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">{patient.patient_id}</td>
                        </tr>
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
- Patient ID: {patient.patient_id}
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
        
        # Use smtplib to send email with embedded logo
        success = send_email_with_embedded_logo(
            to_email=patient.email,
            subject=subject,
            html_content=html_content,
            plain_content=plain_text_message.strip(),
            clinic_name=clinic_name
        )
        
        if success:
            logger.info(f"Reminder email sent to {patient.email} for appointment {appointment.id}")
            return True
        else:
            logger.error(f"Failed to send reminder email to {patient.email} for appointment {appointment.id}")
            return False
        
    except Exception as email_error:
        logger.error(f"Failed to send reminder email: {str(email_error)}")
        return False

def send_appointment_declined_email(appointment, patient, new_status=None):
    """
    Send appointment declined/cancelled email to patient with HTML formatting
    
    Args:
        appointment: Appointment object
        patient: Patient object or patient data
        new_status: The new status being set (cancelled, no-show, etc.)
    """
    try:
        # Use new_status if provided, otherwise fall back to appointment.status
        current_status = new_status if new_status else appointment.status
        
        # Fetch clinic info from the database
        clinic = ClinicSettings.objects.last()
        clinic_name = clinic.clinic_name if clinic else 'HealthNexus Medical Center'
        clinic_address = clinic.address if clinic else '123 Health Avenue, Medical District'
        clinic_phone = clinic.phone if clinic else '(123) 456-7890'
        clinic_email = clinic.email if clinic else 'info@healthnexus.com'
        clinic_website = clinic.website if clinic else 'www.healthnexus.com'
        
        # Get patient email - handle both Patient object and appointment patient fields
        if hasattr(patient, 'email'):
            patient_email = patient.email
            patient_name = patient.name if hasattr(patient, 'name') else patient.get_full_name()
        else:
            # Use appointment patient fields
            patient_email = appointment.patient_email
            patient_name = appointment.patient_name or 'Patient'
        
        if not patient_email:
            logger.warning(f"No email address found for appointment {appointment.id}")
            return False
            
        # Determine status message and subject based on current_status
        if current_status == 'cancelled':
            status_message = "❌ Appointment Declined"
            status_description = "We regret to inform you that your appointment request has been DECLINED."
            status_color = "#dc2626"
            subject = f'Appointment DECLINED - {clinic_name}'
        elif current_status == 'no-show':
            status_message = "⏰ Missed Appointment - NO SHOW"
            status_description = "You were marked as NO SHOW for your scheduled appointment."
            status_color = "#ea580c"
            subject = f'Appointment NO SHOW - {clinic_name}'
        else:
            status_message = "📅 Appointment Update"
            status_description = "There has been an update to your appointment status."
            status_color = "#2563eb"
            subject = f'Appointment Update - {clinic_name}'
        
        # Format the appointment date and time
        appointment_date = appointment.date.strftime('%B %d, %Y')
        appointment_time = appointment.time.strftime('%I:%M %p')
        
        # Get doctor name
        if appointment.doctor:
            doctor_name = f"Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}"
        else:
            doctor_name = "Doctor"
        
        # Get clinic logo attachment
        logo_attachment = get_logo_attachment()
        
        # Create logo header section based on status
        logo_section = ""
        if logo_attachment:
            logo_section = f"""
            <div style="background: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; border: 1px solid #e0e0e0;">
                <div style="display: inline-block;">
                    <img src="cid:clinic_logo" alt="{clinic_name} Logo" style="max-height: 80px; max-width: 300px; height: auto; display: block; margin: 0 auto;">
                </div>
                <div style="margin-top: 15px; color: #6b7280; font-size: 14px;">
                    <p style="margin: 5px 0; font-weight: 500;">{clinic_address}</p>
                    <p style="margin: 5px 0; font-weight: 500;">{clinic_phone}</p>
                </div>
            </div>
            """
        else:
            logo_section = f"""
            <div style="background: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; border: 1px solid #e0e0e0;">
                <h2 style="color: {status_color}; margin: 0; font-size: 24px;">{clinic_name}</h2>
                <div style="margin-top: 15px; color: #6b7280; font-size: 14px;">
                    <p style="margin: 5px 0; font-weight: 500;">{clinic_address}</p>
                    <p style="margin: 5px 0; font-weight: 500;">{clinic_phone}</p>
                </div>
            </div>
            """
        
        # Create HTML email content
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            {logo_section}
            <div style="background: linear-gradient(135deg, {status_color} 0%, #991b1b 100%); padding: 30px; text-align: center; border-radius: 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">{status_message}</h1>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e0e0e0;">
                <h2 style="color: {status_color}; margin-top: 0;">Hello {patient_name}! 👋</h2>
                <p style="font-size: 16px; margin-bottom: 25px;">{status_description}</p>
                
                <div style="background: #fef2f2; border-left: 4px solid {status_color}; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                    <h3 style="margin-top: 0; color: #991b1b; display: flex; align-items: center;">
                        📅 Appointment Details - Status: {current_status.upper().replace('_', ' ').replace('CANCELLED', 'DECLINED').replace('NO-SHOW', 'NO SHOW')}
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
                
                <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin: 25px 0;">
                    <h4 style="margin-top: 0; color: #065f46;">📍 Still Need Medical Care?</h4>
                    <p style="margin: 5px 0; color: #047857;">You can schedule a new appointment by contacting us directly.</p>
                    <p style="margin: 5px 0; color: #047857;"><strong>Phone:</strong> {clinic_phone}</p>
                    <p style="margin: 5px 0; color: #047857;"><strong>Email:</strong> <a href="mailto:{clinic_email}" style="color: #047857;">{clinic_email}</a></p>
                    {f'<p style="margin: 5px 0; color: #047857;"><strong>Website:</strong> <a href="{clinic_website}" style="color: #047857;">{clinic_website}</a></p>' if clinic_website else ''}
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
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
                    We apologize for any inconvenience and appreciate your understanding. 🏥
                </p>
                <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
                    Best regards,<br>
                    <strong>{clinic_name} Team</strong>
                </p>
            </div>
        </body>
        </html>
        """
        
        # Create plain text version
        status_text = "DECLINED" if current_status == 'cancelled' else "NO SHOW" if current_status == 'no-show' else current_status.upper()
        plain_text_message = f"""
Dear {patient_name},

{status_description}

*** APPOINTMENT STATUS: {status_text} ***

Appointment Details:
- Date: {appointment_date}
- Time: {appointment_time}
- Type: {appointment.appointment_type}
- Doctor: {doctor_name}
- Status: {status_text}

If you still need medical care, you can schedule a new appointment by contacting us:

Phone: {clinic_phone}
Email: {clinic_email}
{f'Website: {clinic_website}' if clinic_website else ''}

We apologize for any inconvenience and appreciate your understanding.

Best regards,
{clinic_name} Team
        """
        
        # Send email
        success = send_email_with_embedded_logo(
            to_email=patient_email,
            subject=subject,
            html_content=html_content,
            plain_content=plain_text_message.strip(),
            clinic_name=clinic_name
        )
        
        if success:
            logger.info(f"Appointment declined email sent to {patient_email} for appointment {appointment.id}")
            return True
        else:
            logger.error(f"Failed to send declined email to {patient_email} for appointment {appointment.id}")
            return False
        
    except Exception as email_error:
        logger.error(f"Failed to send appointment declined email: {str(email_error)}")
        return False
def send_otp_email(to_email, otp_code, clinic_settings=None):
    """
    Send OTP verification email to user with comprehensive debugging
    
    Args:
        to_email: Recipient email address
        otp_code: The OTP code to send
        clinic_settings: Optional clinic settings object (deprecated parameter for compatibility)
    
    Returns:
        tuple: (success: bool, message: str)
    """
    # Import the OTP debugger
    try:
        from accounts.otp_logger import otp_email_debugger
        
        # Use the comprehensive debugger for detailed logging
        success, message, debug_details = otp_email_debugger.debug_otp_email_send(
            to_email=to_email,
            otp_code=otp_code,
            identifier_type='email'
        )
        
        # Log the final result for backward compatibility
        if success:
            logger.info(f"OTP email sent successfully to {to_email}")
        else:
            logger.error(f"Failed to send OTP email to {to_email}: {message}")
            
        return success, message
        
    except Exception as import_error:
        # Fallback to basic logging if debugger fails to import
        logger.error(f"Failed to import OTP debugger: {import_error}")
        logger.info("Falling back to basic OTP email sending...")
        
        try:
            # Basic email sending as fallback
            from django.core.mail import EmailMultiAlternatives
            from django.conf import settings
            
            # Get clinic info
            try:
                clinic = ClinicSettings.objects.first()
                clinic_name = clinic.clinic_name if clinic else 'HealthNexus Medical Center'
            except:
                clinic_name = 'HealthNexus Medical Center'
            
            subject = f'Verification Code - {clinic_name}'
            
            # Simple HTML content
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="padding: 30px; text-align: center; background: #2563eb; color: white;">
                    <h1>Verification Code</h1>
                </div>
                <div style="padding: 30px; background: white;">
                    <h2>Account Verification</h2>
                    <p>Your verification code is:</p>
                    <div style="font-size: 36px; font-weight: bold; color: #2563eb; text-align: center; padding: 20px;">
                        {otp_code}
                    </div>
                    <p><strong>Important:</strong> This code expires in 10 minutes.</p>
                </div>
            </body>
            </html>
            """
            
            plain_text = f"Your verification code is: {otp_code}\\n\\nThis code expires in 10 minutes."
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=plain_text,
                from_email=settings.EMAIL_HOST_USER,
                to=[to_email]
            )
            email.attach_alternative(html_content, "text/html")
            
            result = email.send()
            
            if result:
                logger.info(f"Fallback OTP email sent successfully to {to_email}")
                return True, "OTP email sent successfully"
            else:
                logger.error(f"Fallback OTP email failed for {to_email}")
                return False, "Failed to send OTP email"
                
        except Exception as fallback_error:
            error_msg = f"Both primary and fallback OTP email methods failed: {fallback_error}"
            logger.error(error_msg)
            return False, error_msg


def send_notification_email_with_clinic_sender(to_email, subject, plain_content, html_content, clinic_settings):
    """
    Send notification email using clinic's email configuration
    Returns (success: bool, error_message: str)
    """
    try:
        clinic_name = clinic_settings.name if clinic_settings else "Health Nexus"
        
        # Use the existing email function
        success = send_email_with_embedded_logo(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            plain_content=plain_content,
            clinic_name=clinic_name
        )
        
        if success:
            logger.info(f"Notification email sent successfully to {to_email}")
            return True, None
        else:
            error_msg = "Failed to send notification email"
            logger.error(error_msg)
            return False, error_msg
            
    except Exception as e:
        error_msg = f"Error sending notification email: {str(e)}"
        logger.error(error_msg)
        return False, error_msg