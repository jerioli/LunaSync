"""
Session Management Views for Health Nexus
Handles session creation, validation, and cleanup
"""

from django.contrib.auth import authenticate, login, logout
from django.contrib.sessions.models import Session
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import CustomUser
import json
import logging

logger = logging.getLogger(__name__)

class SessionLoginView(APIView):
    """
    Enhanced login view with proper session management
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            email = request.data.get('email')
            username = request.data.get('username')
            password = request.data.get('password')
            
            print(f"[DEBUG] Login attempt - Email: {email}, Username: {username}")
            
            # Use the custom authentication backend that handles email/username
            user = None
            
            if email:
                # Try authenticating with email using our custom backend
                print(f"[DEBUG] Attempting authentication with email: {email}")
                user = authenticate(request, username=email, password=password)
                print(f"[DEBUG] Email authentication result: {user}")
            elif username:
                # Try authenticating with username
                print(f"[DEBUG] Attempting authentication with username: {username}")
                user = authenticate(request, username=username, password=password)
                print(f"[DEBUG] Username authentication result: {user}")
            
            if user and user.is_active:
                # Clear any existing sessions for this user
                self.clear_user_sessions(user)
                
                # Create new session
                login(request, user)
                
                # Set session variables
                request.session['user_id'] = user.id
                request.session['username'] = user.username
                request.session['role'] = getattr(user, 'role', 'doctor')
                request.session['login_time'] = str(timezone.now())
                
                # Force session save
                request.session.save()
                
                logger.info(f"User {user.username} logged in successfully. Session ID: {request.session.session_key}")
                
                return Response({
                    'success': True,
                    'user': {
                        'id': user.id,
                        'name': user.get_full_name() or user.username,
                        'email': user.email,
                        'username': user.username,
                        'role': getattr(user, 'role', 'doctor'),
                    },
                    'session_id': request.session.session_key,
                    'message': 'Login successful'
                })
            
            print(f"[DEBUG] Authentication failed for email: {email}, username: {username}")
            return Response({
                'success': False,
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
            
        except Exception as e:
            print(f"[DEBUG] Login error: {str(e)}")
            return Response({
                'success': False,
                'error': 'Login failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def clear_user_sessions(self, user):
        """Clear all existing sessions for a user"""
        try:
            user_sessions = Session.objects.all()
            for session in user_sessions:
                data = session.get_decoded()
                if data.get('_auth_user_id') == str(user.id):
                    session.delete()
        except Exception as e:
            logger.warning(f"Failed to clear user sessions: {str(e)}")

class SessionStatusView(APIView):
    """
    Check current session status
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            if request.user.is_authenticated:
                return Response({
                    'authenticated': True,
                    'user': {
                        'id': request.user.id,
                        'name': request.user.get_full_name() or request.user.username,
                        'email': request.user.email,
                        'username': request.user.username,
                        'role': getattr(request.user, 'role', 'doctor'),
                    },
                    'session_id': request.session.session_key,
                    'session_data': {
                        'user_id': request.session.get('user_id'),
                        'username': request.session.get('username'),
                        'role': request.session.get('role'),
                        'login_time': request.session.get('login_time'),
                    }
                })
            else:
                return Response({
                    'authenticated': False,
                    'session_id': request.session.session_key if hasattr(request, 'session') else None
                })
                
        except Exception as e:
            logger.error(f"Session status error: {str(e)}")
            return Response({
                'authenticated': False,
                'error': 'Session check failed'
            })

class SessionLogoutView(APIView):
    """
    Logout and clear session
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            session_key = request.session.session_key
            user_id = getattr(request.user, 'id', None) if request.user.is_authenticated else None
            
            # Logout user
            logout(request)
            
            # Clear session data
            if hasattr(request, 'session'):
                request.session.flush()
            
            logger.info(f"User {user_id} logged out. Session {session_key} cleared.")
            
            return Response({
                'success': True,
                'message': 'Logged out successfully'
            })
            
        except Exception as e:
            logger.error(f"Logout error: {str(e)}")
            return Response({
                'success': False,
                'error': 'Logout failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SessionValidationView(APIView):
    """
    Validate session for protected routes
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({
            'valid': True,
            'user_id': request.user.id,
            'session_id': request.session.session_key
        })

# Function-based views for backwards compatibility
@csrf_exempt
@require_http_methods(["POST"])
def session_login(request):
    """Function-based login view"""
    view = SessionLoginView()
    return view.post(request)

@csrf_exempt
@require_http_methods(["GET"])
def session_status(request):
    """Function-based session status view"""
    view = SessionStatusView()
    return view.get(request)

@csrf_exempt
@require_http_methods(["POST"])
def session_logout(request):
    """Function-based logout view"""
    view = SessionLogoutView()
    return view.post(request)
