"""
Security Utilities for Health Nexus
Input validation, sanitization, and security helper functions
"""

import re
import bleach
import html
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _
from django.conf import settings
import logging

logger = logging.getLogger('security')


class InputValidator:
    """
    Comprehensive input validation for healthcare applications
    """
    
    @staticmethod
    def validate_patient_name(name):
        """Validate patient name input"""
        if not name or not name.strip():
            raise ValidationError(_('Patient name is required.'))
        
        # Remove extra whitespace
        name = name.strip()
        
        # Check length
        if len(name) > 100:
            raise ValidationError(_('Patient name cannot exceed 100 characters.'))
        
        # Check for valid characters (letters, spaces, hyphens, apostrophes)
        if not re.match(r"^[A-Za-z\s\-'\.]+$", name):
            raise ValidationError(_('Patient name contains invalid characters.'))
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'<script',
            r'javascript:',
            r'on\w+\s*=',
            r'DROP\s+TABLE',
            r'SELECT\s+.*FROM',
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, name, re.IGNORECASE):
                logger.warning(f"Suspicious pattern detected in patient name: {name}")
                raise ValidationError(_('Patient name contains invalid content.'))
        
        return name
    
    @staticmethod
    def validate_email(email):
        """Validate email address"""
        if not email or not email.strip():
            raise ValidationError(_('Email address is required.'))
        
        email = email.strip().lower()
        
        # Basic email regex
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise ValidationError(_('Enter a valid email address.'))
        
        # Check for suspicious patterns
        if any(pattern in email for pattern in ['<script', 'javascript:', 'on']):
            raise ValidationError(_('Email contains invalid content.'))
        
        return email
    
    @staticmethod
    def validate_phone_number(phone):
        """Validate phone number"""
        if not phone or not phone.strip():
            raise ValidationError(_('Phone number is required.'))
        
        # Remove all non-digit characters
        phone_digits = re.sub(r'\D', '', phone)
        
        # Check length (10-15 digits)
        if len(phone_digits) < 10 or len(phone_digits) > 15:
            raise ValidationError(_('Phone number must be 10-15 digits long.'))
        
        return phone_digits
    
    @staticmethod
    def validate_medical_record_number(mrn):
        """Validate medical record number"""
        if not mrn or not mrn.strip():
            raise ValidationError(_('Medical record number is required.'))
        
        mrn = mrn.strip()
        
        # Check format (alphanumeric, max 20 characters)
        if not re.match(r'^[A-Za-z0-9]+$', mrn):
            raise ValidationError(_('Medical record number must be alphanumeric.'))
        
        if len(mrn) > 20:
            raise ValidationError(_('Medical record number cannot exceed 20 characters.'))
        
        return mrn.upper()
    
    @staticmethod
    def validate_medical_text(text):
        """Validate medical text content (notes, descriptions, etc.)"""
        if not text:
            return ''
        
        # Remove potentially dangerous HTML tags
        allowed_tags = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li']
        allowed_attributes = {}
        
        cleaned_text = bleach.clean(
            text,
            tags=allowed_tags,
            attributes=allowed_attributes,
            strip=True
        )
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'<script',
            r'javascript:',
            r'on\w+\s*=',
            r'DROP\s+TABLE',
            r'SELECT\s+.*FROM',
            r'UNION\s+SELECT',
            r'exec\s*\(',
            r'eval\s*\(',
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, cleaned_text, re.IGNORECASE):
                logger.warning(f"Suspicious pattern detected in medical text: {pattern}")
                raise ValidationError(_('Text contains potentially harmful content.'))
        
        return cleaned_text
    
    @staticmethod
    def validate_file_upload(file):
        """Validate file uploads"""
        if not file:
            raise ValidationError(_('File is required.'))
        
        # Check file size
        max_size = getattr(settings, 'FILE_UPLOAD_MAX_MEMORY_SIZE', 5 * 1024 * 1024)  # 5MB
        if file.size > max_size:
            raise ValidationError(_('File size exceeds maximum allowed size.'))
        
        # Check file type
        allowed_types = getattr(settings, 'ALLOWED_MEDICAL_FILE_TYPES', [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/tiff',
        ])
        
        if file.content_type not in allowed_types:
            raise ValidationError(_('File type not allowed.'))
        
        # Check file extension
        allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif']
        file_extension = file.name.lower().split('.')[-1]
        if f'.{file_extension}' not in allowed_extensions:
            raise ValidationError(_('File extension not allowed.'))
        
        # Check for suspicious file names
        suspicious_patterns = [
            r'\.exe$',
            r'\.bat$',
            r'\.cmd$',
            r'\.scr$',
            r'\.vbs$',
            r'\.js$',
            r'\.php$',
            r'\.jsp$',
            r'\.asp$',
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, file.name, re.IGNORECASE):
                logger.warning(f"Suspicious file upload attempt: {file.name}")
                raise ValidationError(_('File type not allowed.'))
        
        return file


class HTMLSanitizer:
    """
    HTML sanitization for user-generated content
    """
    
    @staticmethod
    def sanitize_html(html_content):
        """Sanitize HTML content"""
        if not html_content:
            return ''
        
        # Allowed tags for medical content
        allowed_tags = [
            'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ol', 'ul', 'li', 'table', 'tr', 'td', 'th', 'tbody', 'thead',
            'blockquote', 'pre', 'code', 'span', 'div'
        ]
        
        allowed_attributes = {
            'span': ['class'],
            'div': ['class'],
            'table': ['class'],
            'tr': ['class'],
            'td': ['class', 'colspan', 'rowspan'],
            'th': ['class', 'colspan', 'rowspan'],
        }
        
        # Clean HTML
        cleaned = bleach.clean(
            html_content,
            tags=allowed_tags,
            attributes=allowed_attributes,
            strip=True
        )
        
        return cleaned
    
    @staticmethod
    def strip_html(html_content):
        """Strip all HTML tags and return plain text"""
        if not html_content:
            return ''
        
        # Remove all HTML tags
        cleaned = bleach.clean(html_content, tags=[], strip=True)
        
        # Decode HTML entities
        cleaned = html.unescape(cleaned)
        
        return cleaned


class SQLInjectionDetector:
    """
    SQL injection detection and prevention
    """
    
    SQL_INJECTION_PATTERNS = [
        r'(\bUNION\b.*\bSELECT\b)',
        r'(\bSELECT\b.*\bFROM\b)',
        r'(\bINSERT\b.*\bINTO\b)',
        r'(\bUPDATE\b.*\bSET\b)',
        r'(\bDELETE\b.*\bFROM\b)',
        r'(\bDROP\b.*\bTABLE\b)',
        r'(\bCREATE\b.*\bTABLE\b)',
        r'(\bALTER\b.*\bTABLE\b)',
        r'(\bEXEC\b.*\()',
        r'(\bsp_\w+)',
        r'(\bxp_\w+)',
        r'(--|\#|/\*|\*/)',
        r'(\bOR\b.*=.*)',
        r'(\bAND\b.*=.*)',
        r'(\b1\s*=\s*1\b)',
        r'(\b1\s*=\s*0\b)',
        r'(\'\s*OR\s*\'\w*\'\s*=\s*\'\w*\')',
        r'(\'\s*;\s*DROP\s*TABLE\s*)',
    ]
    
    @classmethod
    def detect_sql_injection(cls, input_string):
        """Detect potential SQL injection attempts"""
        if not input_string:
            return False
        
        input_upper = input_string.upper()
        
        for pattern in cls.SQL_INJECTION_PATTERNS:
            if re.search(pattern, input_upper, re.IGNORECASE):
                logger.warning(f"SQL injection attempt detected: {input_string[:100]}")
                return True
        
        return False
    
    @classmethod
    def sanitize_sql_input(cls, input_string):
        """Sanitize input to prevent SQL injection"""
        if not input_string:
            return ''
        
        # Check for SQL injection
        if cls.detect_sql_injection(input_string):
            raise ValidationError(_('Input contains potentially harmful SQL code.'))
        
        # Basic sanitization
        sanitized = input_string.replace("'", "''")  # Escape single quotes
        sanitized = sanitized.replace('"', '""')     # Escape double quotes
        
        return sanitized


class XSSDetector:
    """
    Cross-site scripting (XSS) detection and prevention
    """
    
    XSS_PATTERNS = [
        r'<script[^>]*>.*?</script>',
        r'<iframe[^>]*>.*?</iframe>',
        r'<object[^>]*>.*?</object>',
        r'<embed[^>]*>',
        r'<applet[^>]*>.*?</applet>',
        r'javascript:',
        r'vbscript:',
        r'on\w+\s*=',
        r'expression\s*\(',
        r'eval\s*\(',
        r'document\.cookie',
        r'document\.write',
        r'window\.location',
        r'<img[^>]*src\s*=\s*["\']?javascript:',
        r'<link[^>]*href\s*=\s*["\']?javascript:',
    ]
    
    @classmethod
    def detect_xss(cls, input_string):
        """Detect potential XSS attempts"""
        if not input_string:
            return False
        
        for pattern in cls.XSS_PATTERNS:
            if re.search(pattern, input_string, re.IGNORECASE):
                logger.warning(f"XSS attempt detected: {input_string[:100]}")
                return True
        
        return False
    
    @classmethod
    def sanitize_xss_input(cls, input_string):
        """Sanitize input to prevent XSS"""
        if not input_string:
            return ''
        
        # Check for XSS
        if cls.detect_xss(input_string):
            raise ValidationError(_('Input contains potentially harmful script code.'))
        
        # HTML encode dangerous characters
        sanitized = html.escape(input_string)
        
        return sanitized


class CaptchaValidator:
    """
    CAPTCHA validation for bot protection
    """
    
    @staticmethod
    def validate_recaptcha(response_token, client_ip=None):
        """Validate Google reCAPTCHA response"""
        import requests
        
        if not response_token:
            raise ValidationError(_('CAPTCHA verification is required.'))
        
        secret_key = getattr(settings, 'RECAPTCHA_PRIVATE_KEY', '')
        if not secret_key:
            logger.error("reCAPTCHA secret key not configured")
            return True  # Skip validation if not configured
        
        # Verify with Google
        verification_url = 'https://www.google.com/recaptcha/api/siteverify'
        data = {
            'secret': secret_key,
            'response': response_token,
            'remoteip': client_ip,
        }
        
        try:
            response = requests.post(verification_url, data=data, timeout=10)
            result = response.json()
            
            if not result.get('success'):
                logger.warning(f"reCAPTCHA validation failed: {result.get('error-codes')}")
                raise ValidationError(_('CAPTCHA verification failed. Please try again.'))
            
            return True
        
        except requests.RequestException as e:
            logger.error(f"reCAPTCHA validation error: {e}")
            # Allow request to proceed if reCAPTCHA service is unavailable
            return True
