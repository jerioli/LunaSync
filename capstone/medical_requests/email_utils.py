from django.core.mail import EmailMultiAlternatives
from django.conf import settings
import logging
from clinic.models import ClinicSettings

logger = logging.getLogger(__name__)

def send_medical_certificate_email(patient_email, patient_name, certificate_html, doctor_name=None, hospital_name=None):
    """
    Send medical certificate email to patient with HTML formatting
    
    Args:
        patient_email: Patient's email address
        patient_name: Patient's full name
        certificate_html: HTML content of the medical certificate
        doctor_name: Name of the doctor issuing the certificate
        hospital_name: Name of the hospital/clinic
    """
    try:
        # Fetch clinic info from the database
        clinic = ClinicSettings.objects.first()  # Use the first/default settings
        
        # Set clinic information with fallbacks (same approach as appointment emails)
        clinic_name = clinic.clinic_name if clinic else 'HealthNexus Medical Center'
        clinic_address = f"{clinic.address}, {clinic.city}, {clinic.state} {clinic.zip}" if clinic else '123 Health Avenue, Medical District'
        clinic_phone = clinic.phone if clinic else '(123) 456-7890'
        clinic_email = clinic.email if clinic else 'info@healthnexus.com'
        clinic_website = clinic.website if clinic else 'www.healthnexus.com'
        
        # If hospital_name is provided, override the clinic name
        if hospital_name:
            clinic_name = hospital_name

        subject = f'Medical Certificate - {patient_name}'
        
        # Create HTML email content without duplicating clinic info
        html_content = f"""
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Medical Certificate</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
            <div style="background: #f9fafb; padding: 20px;">
                <div style="max-width: 900px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">Your Medical Certificate</h1>
                    </div>
                    
                    <div style="padding: 30px;">
                        <p style="font-size: 16px; margin-bottom: 25px;">Dear {patient_name},</p>
                        
                        <p style="font-size: 16px; margin-bottom: 25px;">
                            Please find your medical certificate attached below. This is an official medical document issued by {doctor_name or 'our medical team'}.
                        </p>
                        
                        <div style="margin: 30px 0;">
                            {certificate_html}
                        </div>
                        
                        <p style="font-size: 16px; margin-top: 25px;">
                            If you have any questions or need further assistance, please don't hesitate to contact us.
                        </p>
                        
                        <p style="font-size: 16px; margin-top: 25px;">
                            Best regards,<br>
                            {doctor_name or 'The Medical Team'}<br>
                            {clinic_name}
                        </p>
                    </div>
                    
                    <div style="background: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">
                            {clinic_name}<br>
                            {clinic_address}<br>
                            Phone: {clinic_phone} | Email: {clinic_email}
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Create plain text version for email clients that don't support HTML
        plain_text_message = f"""
Dear {patient_name},

Please find your medical certificate attached. This is an official medical document.

For verification or any questions about your certificate, please contact our clinic:

{clinic_name}
Phone: {clinic_phone}
Email: {clinic_email}
{f'Website: {clinic_website}' if clinic_website else ''}

Best regards,
{doctor_name or 'The Medical Team'}
{clinic_name}
        """
        
        # Use EmailMultiAlternatives to send both HTML and plain text versions
        # Get clinic email settings from database for sender address
        if clinic and clinic.email:
            from_email = f"{clinic_name} <{clinic.email}>"
        else:
            # Fallback to Django settings if no clinic email is configured
            from_email = f"{clinic_name} <{settings.EMAIL_HOST_USER}>"
        
        to_email = [patient_email]
        
        msg = EmailMultiAlternatives(
            subject=subject,
            body=plain_text_message.strip(),
            from_email=from_email,
            to=to_email,
            headers={
                'X-Patient-Name': patient_name,
                'X-Document-Type': 'Medical Certificate',
                'X-Provider': doctor_name or clinic_name
            }
        )
        
        msg.attach_alternative(html_content, "text/html")
        result = msg.send()
        
        if result == 1:
            logger.info(f"Medical certificate email sent to {patient_email}")
            return True
        else:
            logger.error(f"Failed to send medical certificate email to {patient_email}")
            return False
        
    except Exception as email_error:
        logger.error(f"Failed to send medical certificate email: {str(email_error)}")
        return False
