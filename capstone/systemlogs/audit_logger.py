from django.utils import timezone
from django.contrib.auth import get_user_model
from systemlogs.models import AuditLog
import json

User = get_user_model()

class AuditLogger:
    """
    Utility class for creating audit log entries
    """
    
    @staticmethod
    def get_client_ip(request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    @staticmethod
    def log_action(
        user=None,
        action=None,
        resource_type=None,
        resource_id=None,
        resource_name=None,
        description=None,
        details=None,
        old_values=None,
        new_values=None,
        request=None
    ):
        """
        Create an audit log entry
        
        Args:
            user: User instance who performed the action
            action: Action type (CREATE, UPDATE, DELETE, etc.)
            resource_type: Type of resource affected (PATIENT, USER, etc.)
            resource_id: ID of the affected resource
            resource_name: Name/description of the resource
            description: Human-readable description of the action
            details: Additional structured data
            old_values: Previous values (for updates)
            new_values: New values (for updates)
            request: Django request object (for IP, user agent, etc.)
        """
        try:
            # Extract user email
            user_email = ''
            if user and hasattr(user, 'email'):
                user_email = user.email
            elif user and hasattr(user, 'username'):
                user_email = user.username
            
            # Extract request metadata
            ip_address = None
            user_agent = ''
            session_key = ''
            
            if request:
                ip_address = AuditLogger.get_client_ip(request)
                user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]  # Limit length
                if hasattr(request, 'session'):
                    session_key = request.session.session_key or ''
            
            # Create audit log entry
            audit_log = AuditLog.objects.create(
                user=user,
                user_email=user_email,
                action=action,
                resource_type=resource_type,
                resource_id=str(resource_id) if resource_id else '',
                resource_name=resource_name or '',
                description=description or '',
                details=details or {},
                old_values=old_values or {},
                new_values=new_values or {},
                ip_address=ip_address,
                user_agent=user_agent,
                session_key=session_key
            )
            
            # Mark the request as already logged to prevent duplicates from middleware
            if request:
                if not hasattr(request, '_audit_logged'):
                    request._audit_logged = set()
                # Create a unique key for this specific log entry
                log_key = f"{action}:{resource_type}:{resource_id or 'no-id'}"
                request._audit_logged.add(log_key)
            
            print(f"[AUDIT] {audit_log}")  # Optional: log to console for debugging
            return audit_log
            
        except Exception as e:
            print(f"[AUDIT ERROR] Failed to create audit log: {e}")
            return None
    
    @staticmethod
    def log_user_action(user, action, description, request=None, **kwargs):
        """Convenience method for user-related actions"""
        return AuditLogger.log_action(
            user=user,
            action=action,
            resource_type='USER',
            description=description,
            request=request,
            **kwargs
        )
    
    @staticmethod
    def log_patient_action(user, action, patient_id, patient_name, description, request=None, **kwargs):
        """Convenience method for patient-related actions"""
        return AuditLogger.log_action(
            user=user,
            action=action,
            resource_type='PATIENT',
            resource_id=patient_id,
            resource_name=patient_name,
            description=description,
            request=request,
            **kwargs
        )
    
    @staticmethod
    def log_staff_action(user, action, staff_id, staff_name, description, request=None, **kwargs):
        """Convenience method for staff-related actions"""
        return AuditLogger.log_action(
            user=user,
            action=action,
            resource_type='STAFF',
            resource_id=staff_id,
            resource_name=staff_name,
            description=description,
            request=request,
            **kwargs
        )
    
    @staticmethod
    def log_auth_action(user, action, description, request=None, **kwargs):
        """Convenience method for authentication-related actions"""
        return AuditLogger.log_action(
            user=user,
            action=action,
            resource_type='AUTHENTICATION',
            description=description,
            request=request,
            **kwargs
        )
    
    @staticmethod
    def log_permission_change(user, target_user, old_permissions, new_permissions, request=None):
        """Log permission changes with before/after values"""
        return AuditLogger.log_action(
            user=user,
            action='PERMISSION_CHANGE',
            resource_type='PERMISSIONS',
            resource_id=target_user.id,
            resource_name=f"{target_user.username} ({target_user.email})",
            description=f"Updated permissions for {target_user.username}",
            old_values=old_permissions,
            new_values=new_permissions,
            request=request
        )
