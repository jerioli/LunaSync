"""
Security Middleware for Health Nexus
Custom middleware for additional security measures
"""

import json
import logging
import time
from collections import defaultdict
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.core.cache import cache
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import SuspiciousOperation

User = get_user_model()
logger = logging.getLogger('security')

class SecurityMiddleware(MiddlewareMixin):
    """
    Custom security middleware for additional protection
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.blocked_ips = set()
        self.suspicious_patterns = [
            'DROP TABLE',
            'SELECT * FROM',
            'UNION SELECT',
            '<script>',
            'javascript:',
            'onload=',
            'eval(',
            'document.cookie',
        ]
        super().__init__(get_response)
    
    def process_request(self, request):
        """Process incoming requests for security threats"""
        
        # Get client IP
        client_ip = self.get_client_ip(request)
        
        # Check if IP is blocked
        if self.is_ip_blocked(client_ip):
            logger.warning(f"Blocked IP attempted access: {client_ip}")
            return JsonResponse({
                'error': 'Access denied',
                'message': 'Your IP has been temporarily blocked due to suspicious activity'
            }, status=403)
        
        # Check for suspicious patterns in request
        if self.contains_suspicious_content(request):
            logger.warning(f"Suspicious request detected from {client_ip}: {request.path}")
            self.increment_suspicious_activity(client_ip)
            return JsonResponse({
                'error': 'Invalid request',
                'message': 'Request contains potentially malicious content'
            }, status=400)
        
        # Rate limiting check
        if self.is_rate_limited(request, client_ip):
            logger.warning(f"Rate limit exceeded for {client_ip}")
            return JsonResponse({
                'error': 'Rate limit exceeded',
                'message': 'Too many requests. Please try again later.'
            }, status=429)
        
        return None
    
    def get_client_ip(self, request):
        """Get the real client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def is_ip_blocked(self, ip):
        """Check if IP is in blocked list"""
        return cache.get(f'blocked_ip_{ip}', False)
    
    def block_ip(self, ip, duration=3600):
        """Block an IP for specified duration (default 1 hour)"""
        cache.set(f'blocked_ip_{ip}', True, duration)
        self.blocked_ips.add(ip)
        logger.warning(f"IP {ip} has been blocked for {duration} seconds")
    
    def contains_suspicious_content(self, request):
        """Check if request contains suspicious patterns"""
        # Check URL parameters
        for key, value in request.GET.items():
            if any(pattern.lower() in str(value).lower() for pattern in self.suspicious_patterns):
                return True
        
        # Check POST data
        if request.method == 'POST':
            try:
                if hasattr(request, 'body'):
                    body = request.body.decode('utf-8')
                    if any(pattern.lower() in body.lower() for pattern in self.suspicious_patterns):
                        return True
            except:
                pass
        
        # Check headers
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        if any(pattern.lower() in user_agent.lower() for pattern in self.suspicious_patterns):
            return True
        
        return False
    
    def increment_suspicious_activity(self, ip):
        """Increment suspicious activity counter for IP"""
        key = f'suspicious_activity_{ip}'
        count = cache.get(key, 0) + 1
        cache.set(key, count, 3600)  # Keep for 1 hour
        
        # Block IP if threshold exceeded
        threshold = getattr(settings, 'SUSPICIOUS_ACTIVITY_THRESHOLD', 5)
        if count >= threshold:
            self.block_ip(ip, 3600)  # Block for 1 hour
    
    def is_rate_limited(self, request, ip):
        """Check if request should be rate limited"""
        # Different limits for different endpoints
        limits = {
            '/api/auth/login/': ('10/minute', 600),
            '/api/auth/password-reset/': ('5/minute', 300),
            '/api/ocr/': ('20/hour', 3600),
            'default': ('100/hour', 3600)
        }
        
        # Get appropriate limit
        path = request.path
        limit_key = next((k for k in limits.keys() if k in path), 'default')
        limit_str, window = limits[limit_key]
        
        # Parse limit
        count, period = limit_str.split('/')
        count = int(count)
        
        # Check current usage
        cache_key = f'rate_limit_{ip}_{path}'
        current_count = cache.get(cache_key, 0)
        
        if current_count >= count:
            return True
        
        # Increment counter
        cache.set(cache_key, current_count + 1, window)
        return False


class RateLimitMiddleware(MiddlewareMixin):
    """
    Advanced rate limiting middleware
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.rate_limits = defaultdict(lambda: defaultdict(list))
        super().__init__(get_response)
    
    def process_request(self, request):
        """Process request for rate limiting"""
        
        if not getattr(settings, 'RATELIMIT_ENABLE', True):
            return None
        
        # Get client identifier
        client_id = self.get_client_identifier(request)
        
        # Check rate limit
        if self.is_rate_limited(request, client_id):
            return JsonResponse({
                'error': 'Rate limit exceeded',
                'message': 'Too many requests. Please slow down.',
                'retry_after': 60
            }, status=429)
        
        return None
    
    def get_client_identifier(self, request):
        """Get unique identifier for client"""
        # Use user ID if authenticated, otherwise IP
        if request.user.is_authenticated:
            return f'user_{request.user.id}'
        else:
            return f'ip_{self.get_client_ip(request)}'
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def is_rate_limited(self, request, client_id):
        """Check if client has exceeded rate limit"""
        
        # Get rate limit for this endpoint
        rate_limit = self.get_rate_limit(request.path)
        if not rate_limit:
            return False
        
        count, period = rate_limit
        now = time.time()
        
        # Clean old entries
        cutoff = now - period
        self.rate_limits[client_id][request.path] = [
            timestamp for timestamp in self.rate_limits[client_id][request.path]
            if timestamp > cutoff
        ]
        
        # Check if limit exceeded
        if len(self.rate_limits[client_id][request.path]) >= count:
            return True
        
        # Record this request
        self.rate_limits[client_id][request.path].append(now)
        return False
    
    def get_rate_limit(self, path):
        """Get rate limit for specific path"""
        custom_limits = getattr(settings, 'CUSTOM_RATE_LIMITS', {})
        
        # Check for specific path limits
        for pattern, limit in custom_limits.items():
            if pattern in path:
                return self.parse_rate_limit(limit)
        
        # Default limit
        return self.parse_rate_limit('100/hour')
    
    def parse_rate_limit(self, limit_str):
        """Parse rate limit string (e.g., '10/minute')"""
        try:
            count, period = limit_str.split('/')
            count = int(count)
            
            period_seconds = {
                'second': 1,
                'minute': 60,
                'hour': 3600,
                'day': 86400
            }
            
            return count, period_seconds.get(period, 3600)
        except:
            return None


class AuditMiddleware(MiddlewareMixin):
    """
    HIPAA-compliant audit logging middleware
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.audit_logger = logging.getLogger('audit')
        super().__init__(get_response)
    
    def process_request(self, request):
        """Log request details for audit trail"""
        
        if not getattr(settings, 'AUDIT_LOG_ENABLED', False):
            return None
        
        # Skip static files and health checks
        if self.should_skip_audit(request):
            return None
        
        # Create audit log entry
        audit_data = {
            'timestamp': timezone.now().isoformat(),
            'user_id': request.user.id if request.user.is_authenticated else None,
            'user_email': request.user.email if request.user.is_authenticated else None,
            'ip_address': self.get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'method': request.method,
            'path': request.path,
            'query_params': dict(request.GET),
            'session_key': request.session.session_key if hasattr(request, 'session') else None,
        }
        
        # Store in request for response processing
        request.audit_data = audit_data
        
        return None
    
    def process_response(self, request, response):
        """Log response details for audit trail"""
        
        if not hasattr(request, 'audit_data'):
            return response
        
        # Add response data to audit log
        request.audit_data.update({
            'response_status': response.status_code,
            'response_size': len(response.content) if hasattr(response, 'content') else 0,
            'processing_time': time.time() - getattr(request, 'start_time', time.time()),
        })
        
        # Log the audit data
        self.audit_logger.info(json.dumps(request.audit_data))
        
        return response
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def should_skip_audit(self, request):
        """Check if request should be skipped from audit logging"""
        skip_paths = [
            '/static/',
            '/media/',
            '/favicon.ico',
            '/health/',
            '/ping/',
        ]
        
        return any(request.path.startswith(path) for path in skip_paths)


class CSPMiddleware(MiddlewareMixin):
    """
    Content Security Policy middleware
    """
    
    def process_response(self, request, response):
        """Add CSP headers to response"""
        
        if not settings.DEBUG:
            # Strict CSP for production
            csp_policy = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https:; "
                "connect-src 'self' https://api.your-domain.com; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self';"
            )
        else:
            # Relaxed CSP for development
            csp_policy = (
                "default-src 'self' 'unsafe-inline' 'unsafe-eval' localhost:*; "
                "connect-src 'self' ws://localhost:* http://localhost:* https://localhost:*;"
            )
        
        response['Content-Security-Policy'] = csp_policy
        return response
