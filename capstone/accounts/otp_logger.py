"""
Comprehensive OTP Email Debugging Logger
This module provides detailed logging for OTP email functionality to help diagnose 
why emails are not being sent during login processes.
"""

import logging
import smtplib
import socket
import time
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.core.exceptions import ImproperlyConfigured
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import ssl

# Create dedicated logger for OTP email debugging
logger = logging.getLogger('otp_email')

class OTPEmailDebugger:
    """
    Comprehensive OTP email debugging class that provides detailed logging
    for every step of the email sending process.
    """
    
    def __init__(self):
        self.logger = logger
        self.smtp_config = self._validate_smtp_config()
    
    def _validate_smtp_config(self):
        """
        Validate and log all SMTP configuration settings
        """
        config = {}
        
        self.logger.info("=" * 60)
        self.logger.info("[DEBUG] VALIDATING SMTP CONFIGURATION")
        self.logger.info("=" * 60)
        
        # Check EMAIL_BACKEND
        backend = getattr(settings, 'EMAIL_BACKEND', None)
        config['backend'] = backend
        self.logger.info(f"[EMAIL] EMAIL_BACKEND: {backend}")
        
        if backend != 'django.core.mail.backends.smtp.EmailBackend':
            self.logger.warning(f"[WARNING] EMAIL_BACKEND is not SMTP: {backend}")
        
        # Check SMTP Host
        host = getattr(settings, 'EMAIL_HOST', None)
        config['host'] = host
        self.logger.info(f"[NETWORK] EMAIL_HOST: {host}")
        
        if not host:
            self.logger.error("[ERROR] EMAIL_HOST is not configured!")
            
        # Check SMTP Port
        port = getattr(settings, 'EMAIL_PORT', None)
        config['port'] = port
        self.logger.info(f"[PORT] EMAIL_PORT: {port}")
        
        # Check TLS/SSL settings
        use_tls = getattr(settings, 'EMAIL_USE_TLS', False)
        use_ssl = getattr(settings, 'EMAIL_USE_SSL', False)
        config['use_tls'] = use_tls
        config['use_ssl'] = use_ssl
        self.logger.info(f"[TLS] EMAIL_USE_TLS: {use_tls}")
        self.logger.info(f"[SSL] EMAIL_USE_SSL: {use_ssl}")
        
        if use_tls and use_ssl:
            self.logger.warning("[WARNING] Both TLS and SSL are enabled - this may cause conflicts!")
        
        # Check authentication
        username = getattr(settings, 'EMAIL_HOST_USER', None)
        password = getattr(settings, 'EMAIL_HOST_PASSWORD', None)
        config['username'] = username
        config['password'] = '***HIDDEN***' if password else None
        
        self.logger.info(f"[USER] EMAIL_HOST_USER: {username}")
        self.logger.info(f"[PASSWORD] EMAIL_HOST_PASSWORD: {'[SET]' if password else '[NOT_SET]'}")
        
        if not username or not password:
            self.logger.error("[ERROR] Email authentication credentials are incomplete!")
        
        # Check timeout
        timeout = getattr(settings, 'EMAIL_TIMEOUT', None)
        config['timeout'] = timeout
        self.logger.info(f"[TIMEOUT] EMAIL_TIMEOUT: {timeout}")
        
        # Check from email
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None)
        config['from_email'] = from_email
        self.logger.info(f"[FROM] DEFAULT_FROM_EMAIL: {from_email}")
        
        self.logger.info("=" * 60)
        
        return config
    
    def test_smtp_connection(self):
        """
        Test SMTP server connection step by step
        """
        self.logger.info("[PROCESS] TESTING SMTP CONNECTION")
        self.logger.info("-" * 40)
        
        try:
            # Test basic socket connection
            self.logger.info(f"[NETWORK] Testing socket connection to {self.smtp_config['host']}:{self.smtp_config['port']}")
            
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(10)
            result = sock.connect_ex((self.smtp_config['host'], self.smtp_config['port']))
            sock.close()
            
            if result == 0:
                self.logger.info("[SUCCESS] Socket connection successful")
            else:
                self.logger.error(f"[ERROR] Socket connection failed with code: {result}")
                return False
                
            # Test SMTP connection
            self.logger.info("[PROCESS] Establishing SMTP connection...")
            
            if self.smtp_config['use_ssl']:
                smtp_server = smtplib.SMTP_SSL(self.smtp_config['host'], self.smtp_config['port'])
                self.logger.info("[SSL] Using SSL connection")
            else:
                smtp_server = smtplib.SMTP(self.smtp_config['host'], self.smtp_config['port'])
                self.logger.info("[SMTP] Using plain SMTP connection")
                
                if self.smtp_config['use_tls']:
                    self.logger.info("[PROCESS] Starting TLS...")
                    smtp_server.starttls()
                    self.logger.info("[SUCCESS] TLS enabled")
            
            # Test authentication
            if self.smtp_config['username'] and settings.EMAIL_HOST_PASSWORD:
                self.logger.info("[PROCESS] Testing authentication...")
                smtp_server.login(self.smtp_config['username'], settings.EMAIL_HOST_PASSWORD)
                self.logger.info("[SUCCESS] Authentication successful")
            
            smtp_server.quit()
            self.logger.info("[SUCCESS] SMTP connection test completed successfully")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            self.logger.error(f"[ERROR] SMTP Authentication failed: {e}")
            self.logger.error("[HINT] Check your email credentials and app-specific password")
            return False
        except smtplib.SMTPConnectError as e:
            self.logger.error(f"[ERROR] SMTP Connection failed: {e}")
            self.logger.error("[HINT] Check your SMTP host and port settings")
            return False
        except smtplib.SMTPException as e:
            self.logger.error(f"[ERROR] SMTP Error: {e}")
            return False
        except socket.timeout:
            self.logger.error("[ERROR] Connection timeout - check network connectivity")
            return False
        except Exception as e:
            self.logger.error(f"[ERROR] Unexpected error during SMTP test: {e}")
            return False
    
    def debug_otp_email_send(self, to_email, otp_code, identifier_type='email'):
        """
        Send OTP email with comprehensive debugging
        
        Args:
            to_email: Recipient email address
            otp_code: The OTP code to send
            identifier_type: Type of identifier ('email' or 'phone')
        
        Returns:
            tuple: (success: bool, message: str, details: dict)
        """
        self.logger.info("=" * 80)
        self.logger.info(f"[START] STARTING OTP EMAIL SEND DEBUG SESSION")
        self.logger.info(f"[EMAIL] To: {to_email}")
        self.logger.info(f"[CODE] OTP: {otp_code}")
        self.logger.info(f"[TYPE] Type: {identifier_type}")
        self.logger.info("=" * 80)
        
        debug_details = {
            'timestamp': str(time.time()),
            'to_email': to_email,
            'otp_code': otp_code,
            'identifier_type': identifier_type,
            'steps_completed': [],
            'errors': [],
            'warnings': []
        }
        
        try:
            # Step 1: Validate email address
            self.logger.info("[STEP1] STEP 1: Validating email address")
            if not to_email or '@' not in to_email:
                error_msg = f"Invalid email address: {to_email}"
                self.logger.error(f"❌ {error_msg}")
                debug_details['errors'].append(error_msg)
                return False, error_msg, debug_details
            
            self.logger.info(f"[SUCCESS] Email address validation passed: {to_email}")
            debug_details['steps_completed'].append('email_validation')
            
            # Step 2: Check clinic settings
            self.logger.info("[STEP2] STEP 2: Loading clinic settings")
            try:
                from clinic.models import ClinicSettings
                clinic_settings = ClinicSettings.objects.first()
                if clinic_settings:
                    clinic_name = clinic_settings.clinic_name
                    self.logger.info(f"[SUCCESS] Clinic settings loaded: {clinic_name}")
                else:
                    clinic_name = 'HealthNexus Medical Center'
                    self.logger.warning("⚠️  No clinic settings found, using default")
                    debug_details['warnings'].append('No clinic settings found')
            except Exception as e:
                clinic_name = 'HealthNexus Medical Center'
                self.logger.warning(f"⚠️  Failed to load clinic settings: {e}")
                debug_details['warnings'].append(f'Failed to load clinic settings: {e}')
            
            debug_details['steps_completed'].append('clinic_settings')
            
            # Step 3: Test SMTP connection
            self.logger.info("🔍 STEP 3: Testing SMTP connection")
            if not self.test_smtp_connection():
                error_msg = "SMTP connection test failed"
                self.logger.error(f"❌ {error_msg}")
                debug_details['errors'].append(error_msg)
                return False, error_msg, debug_details
            
            debug_details['steps_completed'].append('smtp_connection_test')
            
            # Step 4: Prepare email content
            self.logger.info("🔍 STEP 4: Preparing email content")
            subject = f'Verification Code - {clinic_name}'
            
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">🔐 Verification Code</h1>
                </div>
                <div style="padding: 30px; background: white;">
                    <h2 style="color: #2563eb;">Account Verification</h2>
                    <p>Use the verification code below to complete your request:</p>
                    <div style="background: #f8fafc; border: 2px solid #2563eb; border-radius: 12px; padding: 30px; text-align: center;">
                        <div style="font-size: 36px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">
                            {otp_code}
                        </div>
                    </div>
                    <p style="color: #666; margin-top: 20px;">
                        <strong>Important:</strong> This code expires in 10 minutes.
                    </p>
                </div>
            </body>
            </html>
            """
            
            plain_content = f"""
            Verification Code - {clinic_name}
            
            Your verification code is: {otp_code}
            
            This code expires in 10 minutes.
            """
            
            self.logger.info("✅ Email content prepared successfully")
            debug_details['steps_completed'].append('email_content_preparation')
            
            # Step 5: Send email using Django's EmailMultiAlternatives
            self.logger.info("🔍 STEP 5: Sending email using Django EmailMultiAlternatives")
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=plain_content,
                from_email=settings.EMAIL_HOST_USER,
                to=[to_email]
            )
            email.attach_alternative(html_content, "text/html")
            
            self.logger.info(f"📧 From: {settings.EMAIL_HOST_USER}")
            self.logger.info(f"📧 To: {to_email}")
            self.logger.info(f"📧 Subject: {subject}")
            
            # Attempt to send
            self.logger.info("🔄 Attempting to send email...")
            send_result = email.send()
            
            if send_result:
                self.logger.info(f"✅ Email sent successfully! Django send() returned: {send_result}")
                debug_details['steps_completed'].append('email_sent_successfully')
                return True, "OTP email sent successfully", debug_details
            else:
                error_msg = "Email send failed - Django send() returned 0"
                self.logger.error(f"❌ {error_msg}")
                debug_details['errors'].append(error_msg)
                return False, error_msg, debug_details
                
        except smtplib.SMTPAuthenticationError as e:
            error_msg = f"SMTP Authentication Error: {e}"
            self.logger.error(f"❌ {error_msg}")
            self.logger.error("💡 Suggestions:")
            self.logger.error("   - Check EMAIL_HOST_USER and EMAIL_HOST_PASSWORD")
            self.logger.error("   - Ensure you're using an app-specific password for Gmail")
            self.logger.error("   - Verify 2FA is enabled on your Gmail account")
            debug_details['errors'].append(error_msg)
            return False, error_msg, debug_details
            
        except smtplib.SMTPRecipientsRefused as e:
            error_msg = f"SMTP Recipients Refused: {e}"
            self.logger.error(f"❌ {error_msg}")
            self.logger.error("💡 Check if the recipient email address is valid")
            debug_details['errors'].append(error_msg)
            return False, error_msg, debug_details
            
        except smtplib.SMTPServerDisconnected as e:
            error_msg = f"SMTP Server Disconnected: {e}"
            self.logger.error(f"❌ {error_msg}")
            self.logger.error("💡 Check network connectivity and SMTP server status")
            debug_details['errors'].append(error_msg)
            return False, error_msg, debug_details
            
        except Exception as e:
            error_msg = f"Unexpected error sending OTP email: {e}"
            self.logger.error(f"❌ {error_msg}")
            self.logger.exception("Full traceback:")
            debug_details['errors'].append(error_msg)
            return False, error_msg, debug_details
        
        finally:
            self.logger.info("=" * 80)
            self.logger.info("🏁 OTP EMAIL DEBUG SESSION COMPLETED")
            self.logger.info(f"✅ Steps completed: {', '.join(debug_details['steps_completed'])}")
            if debug_details['errors']:
                self.logger.info(f"❌ Errors: {len(debug_details['errors'])}")
            if debug_details['warnings']:
                self.logger.info(f"⚠️  Warnings: {len(debug_details['warnings'])}")
            self.logger.info("=" * 80)

# Global instance for easy access
otp_email_debugger = OTPEmailDebugger()