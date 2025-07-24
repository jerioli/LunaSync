"""
Secure Views with Enhanced Security Measures
Example implementation of security features in views
"""

from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.views.decorators.cache import never_cache
from django.utils.decorators import method_decorator
from django.views.generic import View
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings
import json
import logging
import hashlib
import time
from datetime import datetime, timedelta

from .security_utils import (
    InputValidator, HTMLSanitizer, SQLInjectionDetector, 
    XSSDetector, CaptchaValidator
)

logger = logging.getLogger('security')


class SecureLoginView(View):
    """
    Secure login view with brute force protection
    """
    
    @method_decorator(csrf_exempt)
    @method_decorator(never_cache)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    
    def post(self, request):
        """Handle secure login"""
        try:
            # Parse JSON data
            data = json.loads(request.body)
            email = data.get('email', '').strip()
            password = data.get('password', '')
            captcha_token = data.get('captcha_token', '')
            
            # Get client IP
            client_ip = self.get_client_ip(request)
            
            # Check for brute force attempts
            if self.is_brute_force_detected(client_ip, email):
                logger.warning(f"Brute force attack detected from {client_ip} for {email}")
                return JsonResponse({
                    'success': False,
                    'error': 'Too many failed login attempts. Please try again later.',
                    'lockout_remaining': self.get_lockout_remaining(client_ip, email)
                }, status=429)
            
            # Validate inputs
            try:
                email = InputValidator.validate_email(email)
                if not password:
                    raise ValidationError('Password is required.')
            except ValidationError as e:
                return JsonResponse({
                    'success': False,
                    'error': str(e)
                }, status=400)
            
            # Check for XSS/SQL injection
            if SQLInjectionDetector.detect_sql_injection(email) or \
               XSSDetector.detect_xss(email):
                logger.warning(f"Malicious login attempt from {client_ip}")
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid login credentials.'
                }, status=400)
            
            # Validate CAPTCHA if required
            if self.should_require_captcha(client_ip, email):
                try:
                    CaptchaValidator.validate_recaptcha(captcha_token, client_ip)
                except ValidationError as e:
                    return JsonResponse({
                        'success': False,
                        'error': str(e),
                        'require_captcha': True
                    }, status=400)
            
            # Authenticate user
            user = authenticate(request, username=email, password=password)
            
            if user is not None:
                if user.is_active:
                    login(request, user)
                    
                    # Clear failed attempts
                    self.clear_failed_attempts(client_ip, email)
                    
                    # Log successful login
                    logger.info(f"Successful login for {email} from {client_ip}")
                    
                    return JsonResponse({
                        'success': True,
                        'user': {
                            'id': user.id,
                            'email': user.email,
                            'name': user.get_full_name(),
                            'role': getattr(user, 'role', 'user')
                        }
                    })
                else:
                    return JsonResponse({
                        'success': False,
                        'error': 'Account is disabled.'
                    }, status=403)
            else:
                # Record failed attempt
                self.record_failed_attempt(client_ip, email)
                
                # Log failed login
                logger.warning(f"Failed login attempt for {email} from {client_ip}")
                
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid login credentials.',
                    'require_captcha': self.should_require_captcha(client_ip, email)
                }, status=401)
        
        except json.JSONDecodeError:
            return JsonResponse({
                'success': False,
                'error': 'Invalid JSON data.'
            }, status=400)
        except Exception as e:
            logger.error(f"Login error: {e}")
            return JsonResponse({
                'success': False,
                'error': 'An error occurred during login.'
            }, status=500)
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def is_brute_force_detected(self, client_ip, email):
        """Check if brute force attack is detected"""
        # Check IP-based lockout
        ip_key = f'failed_login_ip_{client_ip}'
        ip_attempts = cache.get(ip_key, 0)
        
        # Check email-based lockout
        email_key = f'failed_login_email_{hashlib.md5(email.encode()).hexdigest()}'
        email_attempts = cache.get(email_key, 0)
        
        # Lockout thresholds
        ip_threshold = 10  # 10 attempts per IP
        email_threshold = 5  # 5 attempts per email
        
        return ip_attempts >= ip_threshold or email_attempts >= email_threshold
    
    def record_failed_attempt(self, client_ip, email):
        """Record failed login attempt"""
        # Record IP-based attempt
        ip_key = f'failed_login_ip_{client_ip}'
        ip_attempts = cache.get(ip_key, 0) + 1
        cache.set(ip_key, ip_attempts, 3600)  # 1 hour
        
        # Record email-based attempt
        email_key = f'failed_login_email_{hashlib.md5(email.encode()).hexdigest()}'
        email_attempts = cache.get(email_key, 0) + 1
        cache.set(email_key, email_attempts, 3600)  # 1 hour
    
    def clear_failed_attempts(self, client_ip, email):
        """Clear failed login attempts"""
        ip_key = f'failed_login_ip_{client_ip}'
        email_key = f'failed_login_email_{hashlib.md5(email.encode()).hexdigest()}'
        
        cache.delete(ip_key)
        cache.delete(email_key)
    
    def should_require_captcha(self, client_ip, email):
        """Determine if CAPTCHA should be required"""
        ip_key = f'failed_login_ip_{client_ip}'
        email_key = f'failed_login_email_{hashlib.md5(email.encode()).hexdigest()}'
        
        ip_attempts = cache.get(ip_key, 0)
        email_attempts = cache.get(email_key, 0)
        
        # Require CAPTCHA after 3 failed attempts
        return ip_attempts >= 3 or email_attempts >= 3
    
    def get_lockout_remaining(self, client_ip, email):
        """Get remaining lockout time in seconds"""
        ip_key = f'failed_login_ip_{client_ip}'
        email_key = f'failed_login_email_{hashlib.md5(email.encode()).hexdigest()}'
        
        ip_ttl = cache.ttl(ip_key)
        email_ttl = cache.ttl(email_key)
        
        return max(ip_ttl, email_ttl)


class SecurePatientCreateView(View):
    """
    Secure patient creation view with input validation
    """
    
    @method_decorator(login_required)
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    
    def post(self, request):
        """Create new patient with security validation"""
        try:
            # Parse JSON data
            data = json.loads(request.body)
            
            # Validate all inputs
            validated_data = self.validate_patient_data(data)
            
            # Create patient (using your existing model)
            # patient = Patient.objects.create(**validated_data)
            
            # Log patient creation
            logger.info(f"Patient created by {request.user.email}: {validated_data['name']}")
            
            return JsonResponse({
                'success': True,
                'message': 'Patient created successfully',
                'patient_id': 'patient.id'  # Replace with actual patient ID
            })
        
        except ValidationError as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=400)
        except Exception as e:
            logger.error(f"Patient creation error: {e}")
            return JsonResponse({
                'success': False,
                'error': 'An error occurred while creating the patient.'
            }, status=500)
    
    def validate_patient_data(self, data):
        """Validate patient data"""
        validated = {}
        
        # Validate required fields
        required_fields = ['name', 'email', 'phone', 'date_of_birth']
        for field in required_fields:
            if field not in data or not data[field]:
                raise ValidationError(f'{field.replace("_", " ").title()} is required.')
        
        # Validate name
        validated['name'] = InputValidator.validate_patient_name(data['name'])
        
        # Validate email
        validated['email'] = InputValidator.validate_email(data['email'])
        
        # Validate phone
        validated['phone'] = InputValidator.validate_phone_number(data['phone'])
        
        # Validate date of birth
        try:
            dob = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
            if dob > timezone.now().date():
                raise ValidationError('Date of birth cannot be in the future.')
            validated['date_of_birth'] = dob
        except ValueError:
            raise ValidationError('Invalid date format. Use YYYY-MM-DD.')
        
        # Validate optional fields
        if 'address' in data and data['address']:
            validated['address'] = InputValidator.validate_medical_text(data['address'])
        
        if 'medical_history' in data and data['medical_history']:
            validated['medical_history'] = InputValidator.validate_medical_text(data['medical_history'])
        
        if 'mrn' in data and data['mrn']:
            validated['mrn'] = InputValidator.validate_medical_record_number(data['mrn'])
        
        return validated


class SecureFileUploadView(View):
    """
    Secure file upload view with virus scanning and validation
    """
    
    @method_decorator(login_required)
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    
    def post(self, request):
        """Handle secure file upload"""
        try:
            # Check if file was uploaded
            if 'file' not in request.FILES:
                return JsonResponse({
                    'success': False,
                    'error': 'No file uploaded.'
                }, status=400)
            
            uploaded_file = request.FILES['file']
            
            # Validate file
            try:
                InputValidator.validate_file_upload(uploaded_file)
            except ValidationError as e:
                return JsonResponse({
                    'success': False,
                    'error': str(e)
                }, status=400)
            
            # Generate secure filename
            secure_filename = self.generate_secure_filename(uploaded_file.name)
            
            # Save file securely
            file_path = self.save_file_securely(uploaded_file, secure_filename)
            
            # Log file upload
            logger.info(f"File uploaded by {request.user.email}: {secure_filename}")
            
            return JsonResponse({
                'success': True,
                'message': 'File uploaded successfully',
                'file_path': file_path,
                'filename': secure_filename
            })
        
        except Exception as e:
            logger.error(f"File upload error: {e}")
            return JsonResponse({
                'success': False,
                'error': 'An error occurred during file upload.'
            }, status=500)
    
    def generate_secure_filename(self, original_filename):
        """Generate secure filename"""
        import uuid
        import os
        
        # Get file extension
        _, ext = os.path.splitext(original_filename)
        
        # Generate unique filename
        unique_filename = f"{uuid.uuid4()}{ext}"
        
        return unique_filename
    
    def save_file_securely(self, uploaded_file, filename):
        """Save file to secure location"""
        import os
        from django.conf import settings
        
        # Create secure upload directory
        upload_dir = os.path.join(settings.MEDIA_ROOT, 'secure_uploads')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Full file path
        file_path = os.path.join(upload_dir, filename)
        
        # Save file
        with open(file_path, 'wb+') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)
        
        # Set secure permissions
        os.chmod(file_path, 0o600)  # Read/write for owner only
        
        return file_path
