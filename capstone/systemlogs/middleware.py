from django.utils.deprecation import MiddlewareMixin
from systemlogs.audit_logger import AuditLogger
import json

class AuditMiddleware(MiddlewareMixin):
    """
    Middleware to automatically log certain API requests
    """
    
    # Actions that should be logged automatically
    LOG_PATHS = {
        '/api/auth/session-login/': ('LOGIN', 'User login'),
        '/api/auth/session-logout/': ('LOGOUT', 'User logout'),
        '/api/auth/password-change/': ('PASSWORD_CHANGE', 'Password change'),
    }
    
    # HTTP methods that indicate data changes
    CHANGE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_response(self, request, response):
        """Process response and log relevant actions"""
        
        # Only log for API endpoints
        if not request.path.startswith('/api/'):
            return response
        
        # Only log successful requests (2xx status codes)
        if not (200 <= response.status_code < 300):
            return response
        
        try:
            # Log specific endpoints
            if request.path in self.LOG_PATHS:
                action, description = self.LOG_PATHS[request.path]
                AuditLogger.log_auth_action(
                    user=request.user if request.user.is_authenticated else None,
                    action=action,
                    description=description,
                    request=request
                )
            
            # Log data modification requests
            elif request.method in self.CHANGE_METHODS:
                self._log_data_change(request, response)
                
        except Exception as e:
            print(f"[AUDIT MIDDLEWARE ERROR] {e}")
        
        return response
    
    def _log_data_change(self, request, response):
        """Log data modification requests"""
        
        if not request.user.is_authenticated:
            return
        
        # Only audit actions by staff members (doctor, receptionist, admin, superadmin)
        # Skip patient-initiated requests
        staff_roles = ['doctor', 'receptionist', 'admin', 'superadmin']
        if hasattr(request.user, 'role') and request.user.role not in staff_roles:
            return
        
        # Determine resource type and action based on URL
        path_parts = request.path.strip('/').split('/')
        
        if len(path_parts) < 2:
            return
        
        # Map URL patterns to resource types
        resource_mapping = {
            'patients': 'PATIENT',
            'staff': 'STAFF',
            'appointments': 'APPOINTMENT',
            'prescriptions': 'PRESCRIPTION',
            'medical-documents': 'MEDICAL_DOCUMENT',
            'medical-requests': 'MEDICAL_REQUEST',
            'permissions': 'PERMISSIONS',
        }
        
        resource_type = None
        for key, value in resource_mapping.items():
            if key in request.path:
                resource_type = value
                break
        
        if not resource_type:
            return
        
        # Determine action based on HTTP method
        method_action_map = {
            'POST': 'CREATE',
            'PUT': 'UPDATE',
            'PATCH': 'UPDATE',
            'DELETE': 'DELETE'
        }
        
        action = method_action_map.get(request.method, 'UPDATE')
        
        # Create description
        description = f"{action.lower().title()} {resource_type.lower().replace('_', ' ')}"
        
        # Try to extract resource ID from URL
        resource_id = None
        if len(path_parts) > 2 and path_parts[-1].isdigit():
            resource_id = path_parts[-1]
        
        # Log the action
        AuditLogger.log_action(
            user=request.user,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            details={'method': request.method, 'path': request.path},
            request=request
        )
