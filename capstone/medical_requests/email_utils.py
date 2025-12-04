from django.core.mail import send_mail
from django.conf import settings
import logging
import base64
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.application import MIMEApplication
from email.utils import formataddr
from clinic.models import ClinicSettings
from .pdf_utils import create_medical_certificate_pdf, create_prescription_pdf, create_lab_result_pdf
from datetime import datetime

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

def send_email_with_embedded_logo_and_pdf(to_email, subject, html_content, plain_content, clinic_name, pdf_buffer=None, pdf_filename=None):
    """
    Send email using smtplib with embedded logo image and PDF attachment
    """
    try:
        # Create message container
        msg = MIMEMultipart('related')
        msg['Subject'] = subject
        msg['From'] = formataddr((clinic_name, settings.EMAIL_HOST_USER))
        msg['To'] = to_email

        # Create alternative container for HTML and plain text
        msg_alternative = MIMEMultipart('alternative')
        msg.attach(msg_alternative)

        # Add plain text part
        part_text = MIMEText(plain_content, 'plain')
        msg_alternative.attach(part_text)

        # Add HTML part
        part_html = MIMEText(html_content, 'html')
        msg_alternative.attach(part_html)

        # Try to attach logo
        logo_attachment = get_logo_attachment()
        if logo_attachment:
            msg.attach(logo_attachment)

        # Attach PDF if provided
        if pdf_buffer and pdf_filename:
            pdf_attachment = MIMEApplication(pdf_buffer.read(), _subtype='pdf')
            pdf_attachment.add_header('Content-Disposition', 'attachment', filename=pdf_filename)
            msg.attach(pdf_attachment)

        # Send email using smtplib
        server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
        if settings.EMAIL_USE_TLS:
            server.starttls()
        if settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD:
            server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
        
        server.send_message(msg)
        server.quit()
        
        return True
    except Exception as e:
        logger.error(f"Failed to send email with smtplib: {e}")
        return False

def send_email_with_embedded_logo(to_email, subject, html_content, text_content, from_email=None, from_name=None, pdf_attachment=None, pdf_filename=None):
    """
    Send email using smtplib with embedded logo image and optional PDF attachment
    """
    try:
        # Set default from email and name
        if not from_email:
            from_email = settings.EMAIL_HOST_USER
        if not from_name:
            from_name = 'HealthNexus Medical Center'
            
        # Create message container
        msg = MIMEMultipart('related')
        msg['Subject'] = subject
        msg['From'] = formataddr((from_name, from_email))
        msg['To'] = to_email

        # Create alternative container for HTML and plain text
        msg_alternative = MIMEMultipart('alternative')
        msg.attach(msg_alternative)

        # Add plain text part
        part_text = MIMEText(text_content, 'plain')
        msg_alternative.attach(part_text)

        # Add HTML part
        part_html = MIMEText(html_content, 'html')
        msg_alternative.attach(part_html)

        # Try to attach logo
        logo_attachment = get_logo_attachment()
        if logo_attachment:
            msg.attach(logo_attachment)

        # Add PDF attachment if provided
        if pdf_attachment and pdf_filename:
            pdf_part = MIMEApplication(pdf_attachment, _subtype='pdf')
            pdf_part.add_header('Content-Disposition', 'attachment', filename=pdf_filename)
            msg.attach(pdf_part)

        # Send email using smtplib
        server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
        if settings.EMAIL_USE_TLS:
            server.starttls()
        if settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD:
            server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
        
        server.send_message(msg)
        server.quit()
        
        return True
    except Exception as e:
        logger.error(f"Failed to send email with smtplib: {e}")
        return False

def send_medical_certificate_email(patient_email, patient_name, certificate_html, doctor_name=None, hospital_name=None, patient_dob=None, fitness_status=None, certificate_request=None):
    """
    Send medical certificate email to patient with PDF attachment and embedded logo
    
    Args:
        patient_email: Patient's email address
        patient_name: Patient's full name
        certificate_html: HTML content of the medical certificate
        doctor_name: Name of the doctor issuing the certificate
        hospital_name: Name of the hospital/clinic
        patient_dob: Patient's date of birth
        fitness_status: Fitness for work status
        certificate_request: Complete certificate request object
    """
    try:
        # Fetch clinic info from the database
        clinic = ClinicSettings.objects.first()
        
        # Set clinic information with fallbacks
        clinic_name = clinic.clinic_name if clinic else 'HealthNexus Medical Center'
        clinic_address = f"{clinic.address}, {clinic.city}, {clinic.state} {clinic.zip}" if clinic else '123 Health Avenue, Medical District'
        clinic_phone = clinic.phone if clinic else '(123) 456-7890'
        clinic_email = clinic.email if clinic else 'info@healthnexus.com'
        clinic_website = clinic.website if clinic else 'www.healthnexus.com'
        
        # If hospital_name is provided, override the clinic name
        if hospital_name:
            clinic_name = hospital_name

        subject = f'Medical Certificate - {patient_name}'
        
        # Get clinic logo attachment
        logo_attachment = get_logo_attachment()
        
        # Create logo header section
        logo_section = ""
        if logo_attachment:
            # Use embedded image reference (CID)
            logo_section = f"""
                        <div style="background: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
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
                        <div style="background: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h2 style="color: #1e40af; margin: 0; font-size: 24px;">{clinic_name}</h2>
                            <div style="margin-top: 15px; color: #6b7280; font-size: 14px;">
                                <p style="margin: 5px 0; font-weight: 500;">{clinic_address}</p>
                                <p style="margin: 5px 0; font-weight: 500;">{clinic_phone}</p>
                            </div>
                        </div>
            """
        
        # Create HTML email content
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
                    {logo_section}
                    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">Your Medical Certificate</h1>
                    </div>
                    
                    <div style="padding: 30px;">
                        <p style="font-size: 16px; margin-bottom: 25px;">Dear {patient_name},</p>
                        
                        <p style="font-size: 16px; margin-bottom: 25px;">
                            Please find your medical certificate attached as a PDF. This is an official medical document issued by {doctor_name or 'our medical team'}.
                        </p>
                        
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
                            Thank you for choosing {clinic_name}
                        </p>
                        <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px;">
                            Your health is our priority.
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Create plain text version
        plain_text_message = f"""
Dear {patient_name},

Please find your medical certificate attached as a PDF. This is an official medical document.

For verification or any questions about your certificate, please contact our clinic:

{clinic_name}
Phone: {clinic_phone}
Email: {clinic_email}
{f'Website: {clinic_website}' if clinic_website else ''}

Best regards,
{doctor_name or 'The Medical Team'}
{clinic_name}
        """
        
        # Generate PDF
        pdf_data = create_medical_certificate_pdf({
            'patient_name': patient_name,
            'patient_dob': patient_dob,
            'certificate_html': certificate_html,
            'doctor_name': doctor_name,
            'fitness_status': fitness_status,
            'clinic_name': clinic_name,
            'clinic_address': clinic_address,
            'clinic_phone': clinic_phone,
            'request_type': certificate_request.get_request_type_display() if certificate_request else 'Medical Certificate',
            'issue_date': certificate_request.doctor_approved_at.strftime('%B %d, %Y') if certificate_request and certificate_request.doctor_approved_at else None,
            'doctor_notes': certificate_request.doctor_notes if certificate_request else None
        })
        
        # Send email using smtplib with PDF attachment and embedded logo
        return send_email_with_embedded_logo(
            to_email=patient_email,
            subject=subject,
            html_content=html_content,
            text_content=plain_text_message,
            from_email=clinic_email,
            from_name=clinic_name,
            pdf_attachment=pdf_data,
            pdf_filename=f"Medical_Certificate_{patient_name.replace(' ', '_')}.pdf"
        )
        
    except Exception as email_error:
        logger.error(f"Failed to send medical certificate email: {str(email_error)}")
        return False


def send_prescription_email(patient_email, patient_name, prescription_html, doctor_name=None, hospital_name=None, patient_dob=None, prescription_request=None):
    """
    Send e-prescription email to patient with PDF attachment and embedded logo
    
    Args:
        patient_email: Patient's email address
        patient_name: Patient's full name
        prescription_html: HTML content of the prescription
        doctor_name: Name of the doctor issuing the prescription
        hospital_name: Name of the hospital/clinic
        patient_dob: Patient's date of birth
        prescription_request: Complete prescription request object
    """
    try:
        # Fetch clinic info from the database
        clinic = ClinicSettings.objects.first()
        
        # Set clinic information with fallbacks
        clinic_name = clinic.clinic_name if clinic else 'HealthNexus Medical Center'
        clinic_address = f"{clinic.address}, {clinic.city}, {clinic.state} {clinic.zip}" if clinic else '123 Health Avenue, Medical District'
        clinic_phone = clinic.phone if clinic else '(123) 456-7890'
        clinic_email = clinic.email if clinic else 'info@healthnexus.com'
        clinic_website = clinic.website if clinic else 'www.healthnexus.com'
        
        # If hospital_name is provided, override the clinic name
        if hospital_name:
            clinic_name = hospital_name

        subject = f'E-Prescription - {patient_name}'
        
        # Get clinic logo attachment
        logo_attachment = get_logo_attachment()
        
        # Create logo header section
        logo_section = ""
        if logo_attachment:
            # Use embedded image reference (CID)
            logo_section = f"""
                        <div style="background: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
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
                        <div style="background: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h2 style="color: #1e40af; margin: 0; font-size: 24px;">{clinic_name}</h2>
                            <div style="margin-top: 15px; color: #6b7280; font-size: 14px;">
                                <p style="margin: 5px 0; font-weight: 500;">{clinic_address}</p>
                                <p style="margin: 5px 0; font-weight: 500;">{clinic_phone}</p>
                            </div>
                        </div>
            """
        
        # Create HTML email content
        html_content = f"""
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your E-Prescription</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
            <div style="background: #f9fafb; padding: 20px;">
                <div style="max-width: 900px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    {logo_section}
                    <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center; border-radius: 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">Your E-Prescription</h1>
                    </div>
                    
                    <div style="padding: 30px;">
                        <p style="font-size: 16px; margin-bottom: 25px;">Dear {patient_name},</p>
                        
                        <p style="font-size: 16px; margin-bottom: 25px;">
                            Please find your electronic prescription attached as a PDF. This is an official prescription document issued by {doctor_name or 'our medical team'}.
                        </p>
                        
                        <div style="background: #f0fdfa; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 0 5px 5px 0;">
                            <p style="margin: 0; color: #064e3b; font-size: 14px;">
                                <strong>Important:</strong> Please present this prescription to your pharmacy or show this PDF on your mobile device for electronic processing.
                            </p>
                        </div>
                        
                        <p style="font-size: 16px; margin-top: 25px;">
                            If you have any questions about your medication or need further assistance, please don't hesitate to contact us.
                        </p>
                        
                        <p style="font-size: 16px; margin-top: 25px;">
                            Best regards,<br>
                            {doctor_name or 'The Medical Team'}<br>
                            {clinic_name}
                        </p>
                    </div>
                    
                    <div style="background: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">
                            Thank you for choosing {clinic_name}
                        </p>
                        <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px;">
                            Your health is our priority.
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Create plain text version
        plain_text_message = f"""
Dear {patient_name},

Please find your electronic prescription attached as a PDF. This is an official prescription document.

Important: Please present this prescription to your pharmacy for medication dispensing.

For verification or any questions about your prescription, please contact our clinic:

{clinic_name}
Phone: {clinic_phone}
Email: {clinic_email}
{f'Website: {clinic_website}' if clinic_website else ''}

Best regards,
{doctor_name or 'The Medical Team'}
{clinic_name}
        """
        
        # Generate PDF
        pdf_data = create_prescription_pdf({
            'patient_name': patient_name,
            'patient_dob': patient_dob,
            'prescription_html': prescription_html,
            'doctor_name': doctor_name,
            'clinic_name': clinic_name,
            'clinic_address': clinic_address,
            'clinic_phone': clinic_phone,
            'medication_name': prescription_request.medication_name if prescription_request else 'Prescribed Medication',
            'dosage': prescription_request.dosage if prescription_request else '',
            'frequency': prescription_request.frequency if prescription_request else '',
            'duration': prescription_request.duration if prescription_request else '',
            'issue_date': prescription_request.doctor_approved_at.strftime('%B %d, %Y') if prescription_request and prescription_request.doctor_approved_at else None,
            'doctor_notes': prescription_request.doctor_notes if prescription_request else None
        })
        
        # Send email using smtplib with PDF attachment and embedded logo
        return send_email_with_embedded_logo(
            to_email=patient_email,
            subject=subject,
            html_content=html_content,
            text_content=plain_text_message,
            from_email=clinic_email,
            from_name=clinic_name,
            pdf_attachment=pdf_data,
            pdf_filename=f"E_Prescription_{patient_name.replace(' ', '_')}.pdf"
        )
        
    except Exception as email_error:
        logger.error(f"Failed to send prescription email: {str(email_error)}")
        return False


def send_prescription_email_with_pdf_template(patient_email, prescription_data, patient_data, clinic_settings, doctor_data):
    """
    Send prescription email using the professional htmlToPdf template (without PDF for now due to library issues)
    """
    try:
        logger.info(f"Sending prescription email to {patient_email} using professional template")
        
        # Get clinic settings - fetch from database to match PDF logic
        from clinic.models import ClinicSettings
        try:
            clinic_db_settings = ClinicSettings.objects.first()
            if clinic_db_settings:
                # Don't use clinic name from database - use provided clinic_name
                clinic_name = clinic_settings.get('clinic_name', 'Health Nexus Medical Center')
                # Fetch address, city, and state from database
                clinic_address = clinic_db_settings.address
                clinic_city = clinic_db_settings.city
                clinic_state = clinic_db_settings.state
                clinic_phone = clinic_db_settings.phone
                clinic_email = clinic_db_settings.email
                # Build full address with city and state
                full_address = f"{clinic_address}, {clinic_city}, {clinic_state}"
            else:
                clinic_name = clinic_settings.get('clinic_name', 'Health Nexus Medical Center')
                full_address = clinic_settings.get('address', 'Medical Center Address')
                clinic_phone = getattr(settings, 'CLINIC_PHONE', '(555) 123-4567')
                clinic_email = getattr(settings, 'FROM_EMAIL', 'noreply@healthnexus.com')
        except Exception as e:
            logger.error(f"Error fetching clinic settings: {e}")
            clinic_name = clinic_settings.get('clinic_name', 'Health Nexus Medical Center')
            full_address = clinic_settings.get('address', 'Medical Center Address')
            clinic_phone = getattr(settings, 'CLINIC_PHONE', '(555) 123-4567')
            clinic_email = getattr(settings, 'FROM_EMAIL', 'noreply@healthnexus.com')
        clinic_website = getattr(settings, 'CLINIC_WEBSITE', 'www.healthnexus.com')
        
        # Create subject
        patient_name = patient_data.get('name', 'Patient')
        doctor_name = f"Dr. {doctor_data.get('first_name', '')} {doctor_data.get('last_name', '')}".strip()
        if not doctor_name or doctor_name == "Dr.":
            doctor_name = doctor_data.get('name', 'Your Doctor')
        
        subject = f"Your E-Prescription from {clinic_name}"
        
        # Create HTML email content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Your E-Prescription</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ text-align: center; margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; }}
                .content {{ margin-bottom: 30px; }}
                .footer {{ text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; font-size: 12px; color: #666; }}
                .prescription-info {{ background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; }}
                .important {{ background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="cid:clinic_logo" alt="Clinic Logo" style="max-height: 60px; max-width: 200px; height: auto; display: block; margin: 0 auto 10px auto;">
                    <h1 style="color: #2c5aa0; margin: 0;">Electronic Prescription</h1>
                </div>
                
                <div class="content">
                    <p>Dear {patient_name},</p>
                    
                    <p>Your electronic prescription has been prepared and is attached as a PDF document. This is an official prescription that can be presented to any licensed pharmacy.</p>
                    
                    <div class="prescription-info">
                        <h3 style="margin-top: 0; color: #2c5aa0;">Prescription Details:</h3>
                        <p><strong>Prescribed by:</strong> {doctor_name}</p>
                        <p><strong>Prescription ID:</strong> {prescription_data.get('prescription_number', 'N/A')}</p>
                        <p><strong>Date Issued:</strong> {datetime.now().strftime('%B %d, %Y')}</p>
                    </div>
                    
                    <div class="important">
                        <h4 style="margin-top: 0;">Important Instructions:</h4>
                        <ul style="margin-bottom: 0;">
                            <li>Present the attached PDF prescription to your pharmacy</li>
                            <li>This prescription is valid for dispensing</li>
                            <li>Keep a copy for your medical records</li>
                            <li>Contact us if you have any questions about your medication</li>
                        </ul>
                    </div>
                    
                    <p>If you need assistance or have questions about your prescription, please don't hesitate to contact our clinic.</p>
                    
                    <p>Best regards,<br>
                    {doctor_name}</p>
                </div>
                
                <div class="footer">
                    <p>{full_address}</p>
                    <p>Phone: {clinic_phone} | Email: {clinic_email}</p>
                    {f'<p>Website: {clinic_website}</p>' if clinic_website else ''}
                </div>
            </div>
        </body>
        </html>
        """
        
        # Create plain text version
        plain_text_message = f"""
Dear {patient_name},

Your electronic prescription has been prepared and is attached as a PDF document.

Prescription Details:
- Prescribed by: {doctor_name}
- Prescription ID: {prescription_data.get('prescription_number', 'N/A')}
- Date Issued: {datetime.now().strftime('%B %d, %Y')}

Important Instructions:
- Present the attached PDF prescription to your pharmacy
- This prescription is valid for dispensing
- Keep a copy for your medical records
- Contact us if you have any questions about your medication

For questions or assistance, contact:
{full_address}
Phone: {clinic_phone}
Email: {clinic_email}
{f'Website: {clinic_website}' if clinic_website else ''}

Best regards,
{doctor_name}
        """
        
        # Generate PDF using the professional template
        pdf_data = None
        pdf_filename = None
        try:
            from .pdf_utils import create_prescription_pdf_from_template
            
            patient_name = patient_data.get('name', 'Patient')
            
            # Create PDF filename
            pdf_filename = f"prescription_{patient_name.replace(' ', '_')}_{prescription_data.get('prescription_number', 'N/A')}.pdf"
            
            # Generate PDF directly using the template function
            logger.info(f"Generating PDF for prescription {prescription_data.get('prescription_number', 'N/A')}")
            pdf_data = create_prescription_pdf_from_template(
                prescription_data, patient_data, clinic_settings, doctor_data
            )
            
            if pdf_data:
                logger.info(f"PDF generated successfully for email: {len(pdf_data)} bytes")
                
                return send_email_with_embedded_logo(
                    to_email=patient_email,
                    subject=subject,
                    html_content=html_content,
                    text_content=plain_text_message,
                    from_email=clinic_email,
                    from_name=clinic_name,
                    pdf_attachment=pdf_data,
                    pdf_filename=pdf_filename
                )
            else:
                logger.warning("PDF generation failed, sending email without PDF")
                
        except Exception as pdf_error:
            logger.error(f"Error generating PDF for email: {str(pdf_error)}")
            import traceback
            logger.error(f"PDF generation error: {traceback.format_exc()}")
            pdf_data = None
        
        # Send email without PDF if generation failed
        return send_email_with_embedded_logo(
            to_email=patient_email,
            subject=subject,
            html_content=html_content,
            text_content=plain_text_message,
            from_email=clinic_email,
            from_name=clinic_name,
            pdf_attachment=None,
            pdf_filename=None
        )
        
    except Exception as email_error:
        logger.error(f"Failed to send prescription email with template: {str(email_error)}")
        import traceback
        logger.error(f"Email error traceback: {traceback.format_exc()}")
        return False


