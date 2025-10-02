import os
import io
from django.conf import settings
from django.template.loader import render_to_string
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from clinic.models import ClinicSettings
import logging

logger = logging.getLogger(__name__)

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
        title = Paragraph("ELECTRONIC PRESCRIPTION", title_style)
        story.append(title)
        story.append(Spacer(1, 0.3*inch))
        
        # Add patient information
        patient_dob = prescription_data.get('patient_dob', 'Date not provided')
        issue_date = prescription_data.get('issue_date', 'Date not provided')
        
        patient_info = f"""
        <para>
        <b>Patient Name:</b> {prescription_data.get('patient_name', 'N/A')}<br/>
        <b>Date of Birth:</b> {patient_dob}<br/>
        <b>Prescription Date:</b> {issue_date}<br/>
        </para>
        """
        story.append(Paragraph(patient_info, normal_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Add prescription details
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
