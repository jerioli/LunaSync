"""
Security middleware to prevent sensitive data from being logged
and enforce additional security measures.
"""

import re
import json
import logging
from django.utils.deprecation import MiddlewareMixin
from django.http import HttpResponseForbidden
from django.conf import settings

class SecurityLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to sanitize logs and prevent sensitive data exposure
    """
    
    # Patterns for sensitive data that should not be logged
    SENSITIVE_PATTERNS = [
        r'"password"\s*:\s*"[^"]*"',
        r'"email"\s*:\s*"[^"]*"',
        r'"phone"\s*:\s*"[^"]*"',
        r'"address"\s*:\s*"[^"]*"',
        r'"medical_info"\s*:\s*"[^"]*"',
        r'"medications"\s*:\s*"[^"]*"',
        r'"diagnosis"\s*:\s*"[^"]*"',
        r'Bearer\s+[A-Za-z0-9\-._~+/]+=*',  # JWT tokens
        r'sessionid=[A-Za-z0-9]+',  # Session IDs
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
        
        # Configure secure logging
        self.setup_secure_logging()
    
    def setup_secure_logging(self):
        """Configure logging to use secure formatters"""
        # Get the root logger
        root_logger = logging.getLogger()
        
        # Create a custom formatter that sanitizes sensitive data
        class SecureFormatter(logging.Formatter):
            def format(self, record):
                # Format the log message
                formatted = super().format(record)
                
                # Sanitize sensitive data
                for pattern in SecurityLoggingMiddleware.SENSITIVE_PATTERNS:
                    formatted = re.sub(pattern, '"[REDACTED]"', formatted, flags=re.IGNORECASE)
                
                return formatted
        
        # Apply the secure formatter to all handlers
        secure_formatter = SecureFormatter(
            fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        for handler in root_logger.handlers:
            handler.setFormatter(secure_formatter)
    
    def process_request(self, request):
        """Process incoming requests for security checks"""
        
        # Log request (sanitized)
        self.log_request_safely(request)
        
        # Add security headers
        self.add_security_headers(request)
        
        return None
    
    def process_response(self, request, response):
        """Process outgoing responses"""
        
        # Add security headers to response
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Add CSP header for additional security
        if not settings.DEBUG:
            response['Content-Security-Policy'] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data:; "
                "font-src 'self'; "
                "connect-src 'self';"
            )
        
        return response
    
    def log_request_safely(self, request):
        """Log request information without sensitive data"""
        log_data = {
            'method': request.method,
            'path': request.path,
            'user_id': getattr(request.user, 'id', None) if hasattr(request, 'user') else None,
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'remote_addr': self.get_client_ip(request),
        }
        
        # Don't log request body for security
        if request.method in ['POST', 'PUT', 'PATCH']:
            log_data['has_body'] = bool(request.body)
        
        logging.info(f"Request: {json.dumps(log_data)}")
    
    def add_security_headers(self, request):
        """Add security-related headers to request for processing"""
        # Add timestamp for request tracking
        request.security_timestamp = logging.time.time()
        
        # Add client IP for security logging
        request.client_ip = self.get_client_ip(request)
    
    def get_client_ip(self, request):
        """Get the real client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class EncryptionKeyValidationMiddleware(MiddlewareMixin):
    """
    Middleware to ensure encryption key is properly configured
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
        
        # Validate encryption key on startup
        self.validate_encryption_key()
    
    def validate_encryption_key(self):
        """Validate that encryption key is properly configured"""
        import base64
        
        encryption_key = getattr(settings, 'ENCRYPTION_KEY', None)
        
        if not encryption_key:
            raise ValueError(
                "ENCRYPTION_KEY is not set. Please add it to your .env file. "
                "Generate a 32-byte key with: python -c \"import base64, os; print(base64.b64encode(os.urandom(32)).decode())\""
            )
        
        if encryption_key == 'REPLACE_WITH_YOUR_32_BYTE_BASE64_KEY':
            raise ValueError(
                "ENCRYPTION_KEY is set to placeholder value. Please generate a real key with: "
                "python -c \"import base64, os; print(base64.b64encode(os.urandom(32)).decode())\""
            )
        
        try:
            decoded_key = base64.b64decode(encryption_key)
            if len(decoded_key) != 32:
                raise ValueError(f"Encryption key must be 32 bytes, got {len(decoded_key)} bytes")
        except Exception as e:
            raise ValueError(f"Invalid encryption key format: {e}")
    
    def process_request(self, request):
        """No per-request processing needed"""
        return None


class DataAccessAuditMiddleware(MiddlewareMixin):
    """
    Middleware to audit access to sensitive data
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_view(self, request, view_func, view_args, view_kwargs):
        """Audit access to sensitive views"""
        
        # List of sensitive endpoints that should be audited
        sensitive_endpoints = [
            '/api/patients/',
            '/api/medical-documents/',
            '/api/accounts/users/',
        ]
        
        # Check if this is a sensitive endpoint
        is_sensitive = any(request.path.startswith(endpoint) for endpoint in sensitive_endpoints)
        
        if is_sensitive and hasattr(request, 'user') and request.user.is_authenticated:
            # Log access to sensitive data
            audit_data = {
                'user_id': request.user.id,
                'username': request.user.username,
                'action': request.method,
                'endpoint': request.path,
                'timestamp': logging.time.time(),
                'client_ip': getattr(request, 'client_ip', 'unknown'),
            }
            
            # Use a separate logger for audit events
            audit_logger = logging.getLogger('security_audit')
            audit_logger.info(f"Data access: {json.dumps(audit_data)}")
        
        return None
