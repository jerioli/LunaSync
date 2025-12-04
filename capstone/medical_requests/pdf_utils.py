import os
import io
import time
import re
from datetime import datetime
from django.conf import settings
from django.template.loader import render_to_string
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from clinic.models import ClinicSettings
import qrcode
from PIL import Image as PILImage
import logging

logger = logging.getLogger(__name__)

def generate_prescription_qr_code(prescription_data):
    """
    Generate QR code for prescription verification
    """
    try:
        # Get document UUID (this is the prescription ID)
        document_uuid = prescription_data.get('document_uuid', '')
        
        # Use production domain in production, otherwise localhost
        if getattr(settings, 'PRODUCTION', False):
            base_url = "https://lunasync.site"
        else:
            base_url = getattr(settings, 'DOMAIN_URL', 'http://localhost:8000')
        
        # Create URL to prescription view (matches the QR endpoint URL format)
        prescription_url = f"{base_url}/api/prescriptions/{document_uuid}/"
        
        # Use the prescription URL directly as QR data
        qr_text = prescription_url
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=6,
            border=2,
        )
        qr.add_data(qr_text)
        qr.make(fit=True)
        
        # Create QR code image
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        # Save to BytesIO buffer
        qr_buffer = io.BytesIO()
        qr_img.save(qr_buffer, format='PNG')
        qr_buffer.seek(0)
        
        return qr_buffer
        
    except Exception as e:
        logger.error(f"Error generating QR code: {e}")
        return None

def get_clinic_logo_for_pdf():
    """Get clinic logo for PDF embedding"""
    try:
        clinic_settings = ClinicSettings.objects.first()
        if clinic_settings and clinic_settings.logo:
            logo_path = clinic_settings.logo.path
            if os.path.exists(logo_path):
                return logo_path
    except Exception as e:
        logger.error(f"Error getting logo for PDF: {e}")
    return None

def create_lab_result_pdf(lab_result_data):
    """
    Create a PDF for lab results without clinic branding (logo-free)
    Shows the extracted text as-is to maintain the original format
    
    Args:
        lab_result_data: Dictionary containing lab result information
    """
    try:
        # Create a BytesIO buffer to hold the PDF data
        buffer = io.BytesIO()
        
        # Create the PDF document
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch)
        
        # Define styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            alignment=1,  # Center alignment
            textColor=colors.HexColor('#1e40af')
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=11,
            spaceAfter=8,
            alignment=0
        )
        
        # Build the document content
        story = []
        
        # Simple title without clinic branding
        title = Paragraph("LABORATORY RESULT", title_style)
        story.append(title)
        story.append(Spacer(1, 0.3*inch))
        
        # Add patient and test information
        patient_name = lab_result_data.get('patient_name', 'Unknown Patient')
        test_name = lab_result_data.get('test_name', 'Lab Test')
        date_issued = lab_result_data.get('date_issued') or lab_result_data.get('reported_date', 'Date not provided')
        
        # Basic information
        basic_info = f"""
        <b>Patient:</b> {patient_name}<br/>
        <b>Test:</b> {test_name}<br/>
        <b>Date:</b> {date_issued}
        """
        
        if lab_result_data.get('laboratory_name'):
            basic_info += f"<br/><b>Laboratory:</b> {lab_result_data.get('laboratory_name')}"
        
        story.append(Paragraph(basic_info, normal_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Add extracted text content as-is (main content)
        extracted_content = lab_result_data.get('content') or lab_result_data.get('extracted_text', 'No content available')
        
        # Preserve formatting of extracted text
        content_style = ParagraphStyle(
            'ExtractedContent',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            alignment=0,
            fontName='Courier'  # Use monospace font to preserve formatting
        )
        
        # Split content into paragraphs and preserve line breaks
        content_lines = extracted_content.split('\n')
        for line in content_lines:
            if line.strip():  # Skip empty lines
                story.append(Paragraph(line.strip(), content_style))
            else:
                story.append(Spacer(1, 6))  # Small space for empty lines
        
        story.append(Spacer(1, 0.3*inch))
        
        # Add test results table if available
        if lab_result_data.get('test_results') and isinstance(lab_result_data.get('test_results'), list):
            story.append(Paragraph("<b>Test Results:</b>", normal_style))
            story.append(Spacer(1, 0.1*inch))
            
            # Create results table
            table_data = [['Test', 'Result', 'Unit', 'Reference Range', 'Status']]
            
            for test_result in lab_result_data.get('test_results', []):
                table_data.append([
                    test_result.get('test_name', '-'),
                    test_result.get('result_value', '-'),
                    test_result.get('unit', '-'),
                    test_result.get('reference_range', '-'),
                    test_result.get('status', '-')
                ])
            
            results_table = Table(table_data, colWidths=[1.8*inch, 1.0*inch, 0.8*inch, 1.5*inch, 1.0*inch])
            results_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ]))
            
            story.append(results_table)
            story.append(Spacer(1, 0.2*inch))
        
        # Add notes if available
        if lab_result_data.get('notes') or lab_result_data.get('interpretation'):
            notes_content = lab_result_data.get('notes') or lab_result_data.get('interpretation')
            notes_text = f"""
            <b>Notes:</b><br/>
            {notes_content}
            """
            story.append(Paragraph(notes_text, normal_style))
            story.append(Spacer(1, 0.3*inch))
        
        # Simple footer without clinic branding
        footer_text = f"""
        <para align="center" fontSize="9">
        <br/>
        <i>Laboratory Result Report - Generated on {date_issued}</i>
        </para>
        """
        story.append(Paragraph(footer_text, normal_style))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        pdf_bytes = buffer.getvalue()
        logger.info(f"Lab result PDF generation completed successfully, size: {len(pdf_bytes)} bytes")
        return pdf_bytes  # Return bytes data, not BytesIO object
        
    except Exception as e:
        logger.error(f"Error creating lab result PDF: {e}")
        return None


def create_medical_certificate_pdf(certificate_data):
    """
    Create a PDF for medical certificate
    
    Args:
        certificate_data: Dictionary containing certificate information
    """
    try:
        logger.info(f"Starting PDF generation with data keys: {list(certificate_data.keys()) if certificate_data else 'None'}")
        # Create a BytesIO buffer to hold the PDF data
        buffer = io.BytesIO()
        
        # Create the PDF document
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch)
        
        # Define styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=1,  # Center alignment
            textColor=colors.HexColor('#1e40af')
        )
        
        header_style = ParagraphStyle(
            'CustomHeader',
            parent=styles['Heading2'],
            fontSize=16,
            spaceAfter=12,
            alignment=1,
            textColor=colors.HexColor('#059669')
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=12,
            alignment=0
        )
        
        # Build the document content
        story = []
        
        # Get clinic information
        clinic_settings = ClinicSettings.objects.first()
        clinic_name = certificate_data.get('clinic_name') or (clinic_settings.clinic_name if clinic_settings else 'Medical Center')
        clinic_address = certificate_data.get('clinic_address') or (clinic_settings.address if clinic_settings else 'Address not available')
        clinic_phone = certificate_data.get('clinic_phone') or (clinic_settings.phone if clinic_settings else 'Phone not available')
        clinic_email = clinic_settings.email if clinic_settings else 'Email not available'
        
        # Add logo if available
        logo_path = get_clinic_logo_for_pdf()
        if logo_path:
            try:
                logo = Image(logo_path, width=2*inch, height=1*inch)
                logo.hAlign = 'CENTER'
                story.append(logo)
                story.append(Spacer(1, 0.2*inch))
            except Exception as e:
                logger.error(f"Error adding logo to PDF: {e}")
        
        # Add clinic header
        clinic_header = Paragraph(clinic_name, header_style)
        story.append(clinic_header)
        
        # Add clinic contact info
        contact_info = f"""
        <para align="center">
        {clinic_address}<br/>
        Phone: {clinic_phone} | Email: {clinic_email}
        </para>
        """
        story.append(Paragraph(contact_info, normal_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Add title
        certificate_type = certificate_data.get('certificate_type', 'Medical Certificate')
        title = Paragraph(f"MEDICAL CERTIFICATE - {certificate_type.upper()}", title_style)
        story.append(title)
        story.append(Spacer(1, 0.3*inch))
        
        # Add certificate content with patient details
        patient_name = certificate_data.get('patient_name', 'N/A')
        patient_dob = certificate_data.get('patient_dob', 'Date not provided')
        fitness_status = certificate_data.get('fitness_status', 'Fit for work')
        date_issued = certificate_data.get('date_issued') or certificate_data.get('issue_date', 'Date not provided')
        
        # Add certification statement
        certification_text = f"""
        This is to certify that <b>{patient_name}</b>, 
        born on <b>{patient_dob}</b>, has been examined and treated at our medical facility.
        """
        story.append(Paragraph(certification_text, normal_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Add patient details table
        patient_data = [
            ['Patient Name:', patient_name],
            ['Date of Birth:', patient_dob],
            ['Certificate Type:', certificate_type],
            ['Date Issued:', date_issued],
        ]
        
        # Add diagnosis if available
        if certificate_data.get('diagnosis'):
            patient_data.append(['Diagnosis:', certificate_data.get('diagnosis')])
        
        # Add medical opinion if available
        if certificate_data.get('medical_opinion'):
            patient_data.append(['Medical Opinion:', certificate_data.get('medical_opinion')])
        
        # Add purpose if available
        if certificate_data.get('purpose'):
            patient_data.append(['Purpose:', certificate_data.get('purpose')])
        
        # Add fitness status
        patient_data.append(['Fitness for Work:', fitness_status])
        
        # Add validity period if available
        if certificate_data.get('valid_from'):
            patient_data.append(['Valid From:', certificate_data.get('valid_from')])
        if certificate_data.get('valid_until'):
            patient_data.append(['Valid Until:', certificate_data.get('valid_until')])
        
        # Add restrictions if available
        if certificate_data.get('restrictions'):
            patient_data.append(['Restrictions:', certificate_data.get('restrictions')])
        
        # Add examination findings if available
        if certificate_data.get('examination_findings'):
            patient_data.append(['Examination Findings:', certificate_data.get('examination_findings')])
        
        # Create table
        patient_table = Table(patient_data, colWidths=[2*inch, 4*inch])
        patient_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        story.append(patient_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Add doctor notes if available
        if certificate_data.get('doctor_notes'):
            notes_content = f"""
            <b>Doctor's Notes:</b><br/>
            {certificate_data.get('doctor_notes')}
            """
            story.append(Paragraph(notes_content, normal_style))
            story.append(Spacer(1, 0.2*inch))
        
        # Add doctor signature area
        doctor_name = certificate_data.get('doctor_name', 'Medical Officer')
        # Clean doctor name (remove "Dr." prefix if present for display)
        display_doctor_name = doctor_name.replace('Dr. ', '') if doctor_name.startswith('Dr. ') else doctor_name
        
        signature_content = f"""
        <para align="right">
        <br/><br/>
        _________________________________<br/>
        <b>Dr. {display_doctor_name}</b><br/>
        Medical Officer<br/>
        {clinic_name}<br/>
        License No: {certificate_data.get('doctor_license', 'XXXXXXX')}<br/>
        Date: {date_issued}
        </para>
        """
        story.append(Paragraph(signature_content, normal_style))
        
        # Add footer with disclaimer
        disclaimer = """
        <para align="center" fontSize="10">
        <br/><br/>
        <i>This is a computer-generated medical certificate. 
        For verification purposes, please contact our clinic at the above number.</i>
        </para>
        """
        story.append(Paragraph(disclaimer, normal_style))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        pdf_bytes = buffer.getvalue()
        logger.info(f"PDF generation completed successfully, size: {len(pdf_bytes)} bytes")
        return pdf_bytes  # Return bytes data, not BytesIO object
        
    except Exception as e:
        logger.error(f"Error creating medical certificate PDF: {e}")
        return None

def create_prescription_pdf(prescription_data):
    """
    Create a PDF for displaying an existing e-prescription
    
    Note: This function is used to generate PDF documents for existing prescriptions
    that have been previously created and stored in the system. The prescription 
    request functionality is designed to fetch and display existing prescriptions,
    not to create new ones.
    
    Args:
        prescription_data: Dictionary containing prescription information from existing prescription
    """
    try:
        # Create a BytesIO buffer to hold the PDF data
        buffer = io.BytesIO()
        
        # Create the PDF document
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch)
        
        # Define styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=1,  # Center alignment
            textColor=colors.HexColor('#7c3aed')
        )
        
        header_style = ParagraphStyle(
            'CustomHeader',
            parent=styles['Heading2'],
            fontSize=16,
            spaceAfter=12,
            alignment=1,
            textColor=colors.HexColor('#059669')
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=12,
            alignment=0
        )
        
        # Build the document content
        story = []
        
        # Get clinic information
        clinic_settings = ClinicSettings.objects.first()
        clinic_name = clinic_settings.clinic_name if clinic_settings else 'Medical Center'
        clinic_address = clinic_settings.address if clinic_settings else 'Address not available'
        clinic_phone = clinic_settings.phone if clinic_settings else 'Phone not available'
        clinic_email = clinic_settings.email if clinic_settings else 'Email not available'
        
        # Add logo if available - centered
        logo_path = get_clinic_logo_for_pdf()
        if logo_path:
            try:
                # Use controlled dimensions with reduced height to prevent stretching
                logo = Image(logo_path, width=2*inch, height=0.6*inch)
                logo.hAlign = 'CENTER'
                story.append(logo)
                story.append(Spacer(1, 0.1*inch))
            except Exception as e:
                logger.error(f"Error adding logo to PDF: {e}")
        
        # Add clinic contact info (without clinic name)
        contact_info = f"""
        <para align="center">
        {clinic_address}<br/>
        Phone: {clinic_phone} | Email: {clinic_email}
        </para>
        """
        story.append(Paragraph(contact_info, normal_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Add title
        title = Paragraph("ELECTRONIC PRESCRIPTION", title_style)
        story.append(title)
        story.append(Spacer(1, 0.3*inch))
        
        # Add patient information with QR code on the right
        patient_dob = prescription_data.get('patient_dob', 'Date not provided')
        issue_date = prescription_data.get('issue_date', 'Date not provided')
        
        patient_info_text = f"""
        <b>Patient Name:</b> {prescription_data.get('patient_name', 'N/A')}<br/>
        <b>Date of Birth:</b> {patient_dob}<br/>
        <b>Prescription Date:</b> {issue_date}<br/>
        """
        
        # Create patient info and QR code layout
        try:
            logger.info("Creating patient info and QR code layout for documents prescription")
            
            # Generate QR code for the right side
            qr_img_element = None
            try:
                qr_buffer = generate_prescription_qr_code(prescription_data)
                if qr_buffer:
                    qr_buffer.seek(0)
                    qr_img_element = Image(qr_buffer, width=1.2*inch, height=1.2*inch)
                    logger.info("QR code generated successfully for documents prescription")
            except Exception as qr_error:
                logger.error(f"Error generating QR code for documents prescription: {qr_error}")
            
            # Create table with patient info and QR code
            if qr_img_element:
                # Patient info paragraph
                patient_paragraph = Paragraph(patient_info_text, normal_style)
                
                # Create table with patient info and QR code
                patient_qr_data = [[patient_paragraph, qr_img_element]]
                patient_qr_table = Table(patient_qr_data, colWidths=[4*inch, 2.4*inch])
                patient_qr_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (0, 0), 'LEFT'),    # Patient info left aligned
                    ('ALIGN', (1, 0), (1, 0), 'RIGHT'),   # QR code right aligned
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),  # Both top aligned
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                    ('TOPPADDING', (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                ]))
                
                story.append(patient_qr_table)
            else:
                # Fallback: Just add patient info if QR code fails
                story.append(Paragraph(patient_info_text, normal_style))
                
        except Exception as e:
            logger.error(f"Error creating patient info and QR layout for documents: {e}")
            # Fallback: Just add patient info
            story.append(Paragraph(patient_info_text, normal_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Add prescription details with Rx symbol
        story.append(Paragraph("<b><font size='24'>Rx</font></b>", normal_style))
        story.append(Spacer(1, 0.25*inch))
        
        prescription_details = f"""
        <para>
        <b>Medication:</b> {prescription_data.get('medication_name', 'N/A')}<br/>
        <b>Dosage:</b> {prescription_data.get('dosage', 'N/A')}<br/>
        <b>Frequency:</b> {prescription_data.get('frequency', 'N/A')}<br/>
        <b>Duration:</b> {prescription_data.get('duration', 'N/A')}<br/>
        </para>
        """
        story.append(Paragraph(prescription_details, normal_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Add doctor notes if available
        if prescription_data.get('doctor_notes'):
            notes_content = f"""
            <b>Doctor's Notes:</b><br/>
            {prescription_data.get('doctor_notes')}
            """
            story.append(Paragraph(notes_content, normal_style))
            story.append(Spacer(1, 0.2*inch))
        
        # Add custom prescription HTML content if provided
        if prescription_data.get('prescription_html'):
            # Clean HTML tags for PDF (basic cleanup)
            html_content = prescription_data.get('prescription_html', '')
            # Remove HTML tags for plain text display in PDF
            import re
            clean_content = re.sub('<.*?>', '', html_content)
            if clean_content.strip():
                custom_content = f"<b>Additional Instructions:</b><br/>{clean_content}"
                story.append(Paragraph(custom_content, normal_style))
                story.append(Spacer(1, 0.3*inch))
        
        # Add doctor signature area
        doctor_name = prescription_data.get('doctor_name', 'Medical Officer')
        signature_content = f"""
        <para align="right">
        <br/><br/>
        _________________________________<br/>
        <b>Dr. {doctor_name}</b><br/>
        Medical Officer<br/>
        {clinic_name}<br/>
        License No: {prescription_data.get('doctor_license', 'XXXXXXX')}<br/>
        Date: {prescription_data.get('issue_date', 'N/A')}
        </para>
        """
        story.append(Paragraph(signature_content, normal_style))
        
        # Add disclaimer
        disclaimer = """
        <para align="center" fontSize="10">
        <br/><br/>
        <i>This is an electronically generated prescription. Please present this document to your pharmacist.</i>
        </para>
        """
        story.append(Paragraph(disclaimer, normal_style))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()  # Return bytes data, not BytesIO object
        
    except Exception as e:
        logger.error(f"Error creating prescription PDF: {e}")
        return None


def create_prescription_pdf_from_template(prescription_data, patient_data, clinic_settings, doctor_data):
    """
    Create a PDF for prescription using the same template as frontend htmlToPdf
    
    Args:
        prescription_data: Dictionary containing prescription information
        patient_data: Dictionary containing patient information  
        clinic_settings: Dictionary containing clinic settings
        doctor_data: Dictionary containing doctor information
    """
    try:
        # Import the template function from frontend utilities
        # Since we can't directly import TypeScript, we'll recreate the template logic in Python
        
        logger.info(f"Creating prescription PDF from template")
        
        # Create a BytesIO buffer to hold the PDF data
        buffer = io.BytesIO()
        
        # Create the PDF document
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        # Define styles with reduced font sizes
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'PrescriptionTitle',
            parent=styles['Heading1'],
            fontSize=14,  # Reduced from 18
            spaceAfter=15,  # Reduced spacing
            alignment=1,  # Center alignment
            textColor=colors.black
        )
        
        header_style = ParagraphStyle(
            'HeaderStyle',
            parent=styles['Normal'],
            fontSize=10,  # Reduced from 12
            spaceAfter=8,  # Reduced spacing
            alignment=1  # Center alignment
        )
        
        normal_style = ParagraphStyle(
            'NormalStyle',
            parent=styles['Normal'],
            fontSize=9,  # Reduced from 10
            spaceAfter=5,  # Reduced spacing
            leftIndent=0
        )
        
        # Build the story
        story = []
        
        # Fetch clinic information from database (don't use clinic name from DB)
        from clinic.models import ClinicSettings
        try:
            clinic_db_settings = ClinicSettings.objects.first()
            if clinic_db_settings:
                # Don't fetch clinic name from database - use provided clinic_name
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
                clinic_email = getattr(settings, 'FROM_EMAIL', 'info@healthnexus.com')
        except Exception as e:
            logger.error(f"Error fetching clinic settings: {e}")
            clinic_name = clinic_settings.get('clinic_name', 'Health Nexus Medical Center')
            full_address = clinic_settings.get('address', 'Medical Center Address')
            clinic_phone = getattr(settings, 'CLINIC_PHONE', '(555) 123-4567')
            clinic_email = getattr(settings, 'FROM_EMAIL', 'info@healthnexus.com')
        
        # Header Section with Logo centered
        logo_path = get_clinic_logo_for_pdf()
        if logo_path:
            try:
                # Use controlled dimensions with reduced height to prevent stretching
                logo = Image(logo_path, width=2*inch, height=0.6*inch)
                logo.hAlign = 'CENTER'
                story.append(logo)
                story.append(Spacer(1, 0.1*inch))  # Reduced spacing after logo
            except Exception as e:
                logger.error(f"Error adding logo to prescription PDF: {e}")
        
        # Clinic info and header with reduced font sizes - removed clinic name
        story.append(Paragraph(full_address, header_style))
        story.append(Paragraph(f"Phone: {clinic_phone} | Email: {clinic_email}", header_style))
        story.append(Spacer(1, 0.2*inch))  # Reduced spacing
        
        # Prescription ID
        prescription_id = prescription_data.get('prescription_number', 'RX-' + str(prescription_data.get('id', '000000')))
        story.append(Paragraph(f"<b>PRESCRIPTION ID: {prescription_id}</b>", title_style))
        story.append(Spacer(1, 0.1*inch))
        
        # Date and location
        from datetime import datetime
        current_date = datetime.now().strftime('%B %d, %Y')
        current_time = datetime.now().strftime('%I:%M %p')
        
        date_info = f"Prescribed on: {current_date}<br/>{current_time} PHT"
        story.append(Paragraph(date_info, header_style))
        story.append(Spacer(1, 0.3*inch))  # Increased spacing
        
        # Patient Information
        patient_name = patient_data.get('name', 'Patient Name')
        patient_dob = patient_data.get('date_of_birth', '')
        patient_gender = patient_data.get('gender', 'Not specified')
        
        # Calculate age from DOB
        age = "N/A"
        if patient_dob:
            try:
                from datetime import datetime, date
                # Handle different date formats and types
                birth_date = None
                
                if isinstance(patient_dob, str):
                    # Try different date formats
                    for date_format in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y-%m-%d %H:%M:%S']:
                        try:
                            birth_date = datetime.strptime(patient_dob.split(' ')[0], date_format)
                            break
                        except:
                            continue
                elif hasattr(patient_dob, 'date'):
                    # It's a datetime object, convert to datetime for consistent calculation
                    birth_date = patient_dob if isinstance(patient_dob, datetime) else datetime.combine(patient_dob.date(), datetime.min.time())
                elif hasattr(patient_dob, 'year'):
                    # It's a date object, convert to datetime
                    birth_date = datetime.combine(patient_dob, datetime.min.time())
                
                if birth_date:
                    # Ensure both dates are datetime objects for calculation
                    if not isinstance(birth_date, datetime):
                        birth_date = datetime.combine(birth_date, datetime.min.time())
                    
                    age_years = int((datetime.now() - birth_date).days / 365.25)
                    age = str(age_years) if age_years >= 0 else "N/A"
            except Exception as e:
                logger.warning(f"Failed to calculate age from DOB {patient_dob}: {e}")
                age = "N/A"
        
        patient_info = f"""
        <b>Patient:</b> {patient_name}<br/>
        <b>Age:</b> {age} years old<br/>
        <b>Gender:</b> {patient_gender}
        """
        
        # Create patient info and QR code layout
        try:
            logger.info("Creating patient info and QR code layout")
            
            # Generate QR code for the right side
            qr_img_element = None
            try:
                qr_buffer = generate_prescription_qr_code(prescription_data)
                if qr_buffer:
                    qr_buffer.seek(0)
                    qr_img_element = Image(qr_buffer, width=1.2*inch, height=1.2*inch)
                    logger.info("QR code generated successfully for patient section")
            except Exception as qr_error:
                logger.error(f"Error generating QR code for patient section: {qr_error}")
            
            # Create table with patient info on left and QR code on right
            if qr_img_element:
                # Patient info paragraph
                patient_paragraph = Paragraph(patient_info, normal_style)
                
                # Create table with patient info and QR code
                patient_qr_data = [[patient_paragraph, qr_img_element]]
                patient_qr_table = Table(patient_qr_data, colWidths=[4*inch, 2.4*inch])
                patient_qr_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (0, 0), 'LEFT'),    # Patient info left aligned
                    ('ALIGN', (1, 0), (1, 0), 'RIGHT'),   # QR code right aligned
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),  # Both top aligned
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                    ('TOPPADDING', (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                ]))
                
                story.append(patient_qr_table)
            else:
                # Fallback: Just add patient info if QR code fails
                story.append(Paragraph(patient_info, normal_style))
                
        except Exception as e:
            logger.error(f"Error creating patient info and QR layout: {e}")
            # Fallback: Just add patient info
            story.append(Paragraph(patient_info, normal_style))
        
        story.append(Spacer(1, 0.25*inch))  # Increased spacing before Rx symbol
        
        # Rx Symbol
        story.append(Paragraph("<b><font size='24'>Rx</font></b>", normal_style))
        story.append(Spacer(1, 0.25*inch))  # Increased spacing to prevent collision with table
        
        # Medications Table
        medications = prescription_data.get('data', {}).get('medications', [])
        if not medications:
            medications = prescription_data.get('medications', [])
        
        # Parse medications if it's a JSON string  
        if isinstance(medications, str):
            try:
                import json
                medications = json.loads(medications)
            except:
                logger.warning("Failed to parse medications JSON string")
                medications = []
            
        # Create table data with proper headers matching your design
        table_data = [['Medicine Name', 'Dosage', 'Qty', 'Frequency', 'Duration', 'Notes']]  # Header
        
        if medications and len(medications) > 0:
            for idx, med in enumerate(medications):
                # Medicine name with numbering only - no notes under the name
                med_name = f"{idx + 1}) {med.get('name', 'Not specified')}"
                
                # Individual components
                dosage = med.get('dose') or med.get('dosage') or '-'
                quantity = med.get('quantity') or med.get('qty') or '-'
                frequency = med.get('frequency') or '-'
                
                # Duration - show start to end date format with proper spacing
                duration = ""
                if med.get('startDate') and med.get('endDate'):
                    duration = f"{med.get('startDate')} to {med.get('endDate')}"
                elif med.get('duration'):
                    duration = med.get('duration')
                elif med.get('startDate'):
                    duration = f"Start: {med.get('startDate')}"
                else:
                    duration = "As prescribed"
                
                # Notes - handle long text properly
                notes = med.get('notes') or med.get('instructions') or '-'
                
                table_data.append([med_name, dosage, quantity, frequency, duration, notes])
        else:
            # Fallback: try to extract from prescription_content or other fields
            logger.info("No structured medications found, trying fallback extraction")
            
            # Check if there's basic prescription info to extract
            med_name = prescription_data.get('medication_name', 'Prescribed Medication')
            dosage = prescription_data.get('dosage', 'As prescribed')
            duration = prescription_data.get('duration', 'As directed')
            
            table_data.append([f"1) {med_name}", dosage, '-', '-', duration, '-'])
        
        # Create and add the medication table with improved column widths for better spacing
        table = Table(table_data, colWidths=[1.6*inch, 0.8*inch, 0.4*inch, 0.9*inch, 1.4*inch, 1.3*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),  # Reduced header font size
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 7),  # Reduced body font size
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        story.append(table)
        story.append(Spacer(1, 0.3*inch))  # Increased spacing after table
        
        # Advice Given Section - Use doctor's notes from prescription approval
        # Priority: doctor_notes (from approval form) > generalInstructions > fallback
        doctor_notes = prescription_data.get('doctor_notes') or prescription_data.get('doctorNotes')
        general_instructions = prescription_data.get('generalInstructions') or prescription_data.get('data', {}).get('generalInstructions')
        
        if doctor_notes or general_instructions:
            # Prioritize doctor's notes from the prescription approval form
            advice_content = doctor_notes or general_instructions or "Follow medication instructions as prescribed."
            advice_text = f"""
            <b>Advice Given:</b><br/>
            {advice_content}
            """
            
            # Create advice box with background
            advice_table = Table([[advice_text]], colWidths=[6*inch])
            advice_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.Color(0.97, 0.97, 0.97)),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('PADDING', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            
            story.append(advice_table)
            story.append(Spacer(1, 0.2*inch))
        
        # Doctor Signature Area with PTR and License numbers
        doctor_name = f"Dr. {doctor_data.get('first_name', '')} {doctor_data.get('last_name', '')}".strip()
        if not doctor_name or doctor_name == "Dr.":
            doctor_name = doctor_data.get('name', 'Medical Officer')
        
        # Get PTR and License numbers from doctor data or clinic settings
        # Leave PTR No. blank as requested
        ptr_no = "_____________"  # Blank line for PTR number
        license_no = doctor_data.get('license_number') or doctor_data.get('license_no') or 'LIC-XXXXXXX'
        
        signature_content = f"""
        <para align="right">
        <br/><br/><br/>
        _________________________________<br/>
        <b>{doctor_name}</b><br/>
        PTR No.: {ptr_no}<br/>
        License No.: {license_no}
        </para>
        """
        story.append(Paragraph(signature_content, normal_style))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
        
    except Exception as e:
        logger.error(f"Error creating prescription PDF from template: {e}")
        import traceback
        logger.error(f"PDF creation error traceback: {traceback.format_exc()}")
        return None


def generate_and_save_pdf_from_html(html_content, filename, document_id=None):
    """
    Generate PDF from HTML content and save it to the media directory
    Returns the file path where the PDF was saved
    """
    try:
        import tempfile
        from django.conf import settings
        
        # Create media directory structure for PDFs
        pdf_dir = os.path.join(settings.MEDIA_ROOT, 'medical_documents', 'prescriptions')
        os.makedirs(pdf_dir, exist_ok=True)
        
        # Generate unique filename
        if document_id:
            pdf_filename = f"prescription_{document_id}_{filename}"
        else:
            from datetime import datetime
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            pdf_filename = f"prescription_{timestamp}_{filename}"
        
        pdf_path = os.path.join(pdf_dir, pdf_filename)
        
        # Use ReportLab to generate PDF directly from prescription data
        logger.info("Generating PDF using ReportLab")
        
        # Try to extract prescription data from HTML
        try:
            import re
            from bs4 import BeautifulSoup
            
            # Parse HTML to extract prescription data
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Try to create PDF using ReportLab fallback
            result_path = generate_pdf_with_reportlab_fallback(html_content, pdf_path)
            if result_path:
                logger.info(f"PDF generated successfully: {result_path}")
                return result_path
            else:
                logger.warning("ReportLab PDF generation failed")
                return None
                
        except ImportError:
            logger.warning("BeautifulSoup not available, creating simple PDF")
            # Create a simple PDF without HTML parsing
            return create_simple_prescription_pdf(pdf_path, html_content)
        
    except Exception as e:
        logger.error(f"Error generating PDF from HTML: {str(e)}")
        import traceback
        logger.error(f"PDF generation error traceback: {traceback.format_exc()}")
        return None


def generate_pdf_with_reportlab_fallback(html_content, pdf_path):
    """
    Generate prescription PDF using ReportLab to match the professional template
    """
    try:
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
        
        # Create PDF document
        doc = SimpleDocTemplate(pdf_path, 
                              pagesize=A4, 
                              topMargin=0.75*inch,
                              bottomMargin=0.75*inch,
                              leftMargin=1*inch,
                              rightMargin=1*inch)
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        header_style = ParagraphStyle(
            'CustomHeader',
            parent=styles['Heading1'],
            fontSize=16,
            alignment=TA_CENTER,
            spaceAfter=20
        )
        
        subheader_style = ParagraphStyle(
            'CustomSubHeader',
            parent=styles['Normal'],
            fontSize=12,
            alignment=TA_CENTER,
            spaceAfter=10
        )
        
        prescription_id_style = ParagraphStyle(
            'PrescriptionID',
            parent=styles['Normal'],
            fontSize=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
            spaceAfter=20
        )
        
        rx_style = ParagraphStyle(
            'RxStyle',
            parent=styles['Heading1'],
            fontSize=24,
            fontName='Helvetica-Bold',
            spaceAfter=20
        )
        
        # Try to parse HTML content or use defaults
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Extract prescription information
            patient_name = "Patient Name"
            prescription_id = "RX-" + str(int(time.time()))[-8:]
            doctor_name = "Dr. Health Nexus"
            
            # Try to extract from HTML
            if soup:
                # Look for patient name
                patient_elem = soup.find(string=re.compile(r'Patient:'))
                if patient_elem:
                    patient_name = patient_elem.parent.get_text().replace('Patient:', '').strip()
                
                # Look for prescription ID
                id_elem = soup.find(string=re.compile(r'PRESCRIPTION ID:'))
                if id_elem:
                    prescription_id = id_elem.replace('PRESCRIPTION ID:', '').strip()
                
                # Look for doctor name
                doctor_elem = soup.find(string=re.compile(r'Dr\.'))
                if doctor_elem:
                    doctor_name = doctor_elem.strip()
            
        except ImportError:
            # Default values if BeautifulSoup is not available
            patient_name = "Patient Name"
            prescription_id = "RX-" + str(int(time.time()))[-8:]
            doctor_name = "Dr. Health Nexus"
        
        # Header
        story.append(Paragraph("Health Nexus Medical Center", header_style))
        story.append(Spacer(1, 10))
        
        # QR Code for prescription verification
        try:
            # Create prescription data for QR code
            qr_prescription_data = {
                'prescription_number': prescription_id,
                'patient_name': patient_name,
                'id': prescription_id
            }
            qr_buffer = generate_prescription_qr_code(qr_prescription_data)
            if qr_buffer:
                qr_img = Image(ImageReader(qr_buffer), width=0.8*inch, height=0.8*inch)
                qr_img.hAlign = 'CENTER'
                story.append(qr_img)
            else:
                story.append(Paragraph("[QR CODE UNAVAILABLE]", subheader_style))
        except Exception as qr_error:
            logger.error(f"Error adding QR code: {qr_error}")
            story.append(Paragraph("[QR CODE ERROR]", subheader_style))
        
        story.append(Spacer(1, 20))
        
        # Prescription ID
        story.append(Paragraph(f"PRESCRIPTION ID: {prescription_id}", prescription_id_style))
        
        # Location and Date
        story.append(Paragraph("Medical Center Address", subheader_style))
        story.append(Paragraph(f"Prescribed on: {datetime.now().strftime('%B %d, %Y')}", subheader_style))
        story.append(Paragraph(f"{datetime.now().strftime('%I:%M %p')} PHT", subheader_style))
        story.append(Spacer(1, 20))
        
        # Patient Info
        patient_info = f"""
        <b>Patient:</b> {patient_name}<br/>
        <b>Age:</b> N/A years old<br/>
        <b>Gender:</b> Not specified
        """
        story.append(Paragraph(patient_info, styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Rx Symbol
        story.append(Paragraph("Rx", rx_style))
        
        # Medication Table
        table_data = [
            ['Medicine Name', 'Dosage', 'Duration'],
            ['Sample Medication', 'As prescribed', 'As directed']
        ]
        
        medication_table = Table(table_data, colWidths=[3*inch, 2*inch, 2*inch])
        medication_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(medication_table)
        story.append(Spacer(1, 30))
        
        # Advice Given section
        advice_text = "Follow medication instructions as prescribed."
        story.append(Paragraph("<b>Advice Given:</b>", styles['Normal']))
        story.append(Paragraph(advice_text, styles['Normal']))
        story.append(Spacer(1, 60))
        
        # Doctor signature
        signature_style = ParagraphStyle(
            'Signature',
            parent=styles['Normal'],
            alignment=TA_RIGHT,
            fontSize=12
        )
        story.append(Paragraph("_" * 30, signature_style))
        story.append(Paragraph(doctor_name, signature_style))
        
        # Build PDF
        doc.build(story)
        logger.info(f"PDF generated successfully using ReportLab: {pdf_path}")
        return pdf_path
        
    except Exception as e:
        logger.error(f"Error generating PDF with ReportLab: {str(e)}")
        import traceback
        logger.error(f"ReportLab error traceback: {traceback.format_exc()}")
        return None


def create_simple_prescription_pdf(pdf_path, html_content):
    """
    Create a simple prescription PDF without HTML parsing
    """
    try:
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import inch
        
        doc = SimpleDocTemplate(pdf_path, pagesize=A4, topMargin=0.75*inch)
        story = []
        styles = getSampleStyleSheet()
        
        # Simple prescription layout
        story.append(Paragraph("ELECTRONIC PRESCRIPTION", styles['Title']))
        story.append(Spacer(1, 20))
        story.append(Paragraph(f"Prescription Date: {datetime.now().strftime('%B %d, %Y')}", styles['Normal']))
        story.append(Spacer(1, 20))
        story.append(Paragraph("Prescribed medications and instructions as per doctor's orders.", styles['Normal']))
        
        doc.build(story)
        return pdf_path
        
    except Exception as e:
        logger.error(f"Error creating simple PDF: {str(e)}")
        return None
