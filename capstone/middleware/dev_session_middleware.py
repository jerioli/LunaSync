from django.contrib.auth import get_user_model
from django.utils.deprecation import MiddlewareMixin

CustomUser = get_user_model()

class DevSessionMiddleware(MiddlewareMixin):
    """
    Development middleware to handle session authentication issues
    between localhost:8080 (frontend) and localhost:8000 (backend)
    """
    
    def process_request(self, request):
        # Only for API requests
        if not request.path.startswith('/api/'):
            return None
            
        # Skip if user is already authenticated
        if request.user.is_authenticated:
            return None
            
        # Check if there's a session ID in headers (for development)
        session_id = request.headers.get('X-Session-ID') or request.GET.get('session_id')
        
        if session_id:
            from django.contrib.sessions.models import Session
            try:
                session = Session.objects.get(session_key=session_id)
                user_id = session.get_decoded().get('_auth_user_id')
                if user_id:
                    user = CustomUser.objects.get(id=user_id)
                    request.user = user
                    print(f"[DEV SESSION] Authenticated user {user.username} via session ID {session_id}")
            except (Session.DoesNotExist, CustomUser.DoesNotExist):
                pass
                
        return None
