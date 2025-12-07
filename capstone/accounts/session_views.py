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
import pyotp
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import CustomUser
import json
import logging

# Create logger for session views
logger = logging.getLogger('accounts')
import logging

logger = logging.getLogger(__name__)

def generate_otp():
    """Generate a secure 6-digit OTP using pyotp library"""
    # For simple 6-digit numeric OTP, we can use pyotp.random_base32() 
    # and generate a HOTP (HMAC-based OTP) for better randomness
    secret = pyotp.random_base32()
    hotp = pyotp.HOTP(secret, digits=6)
    # Use current timestamp as counter for uniqueness
    import time
    counter = int(time.time()) 
    otp = hotp.at(counter)
    return otp


# --- 2FA Session Login View ---
class   SessionLoginView(APIView):
    """
    Step 1: Authenticate credentials, send OTP, require OTP verification before login
    """
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            email = request.data.get('email')
            username = request.data.get('username')
            password = request.data.get('password')

            print(f"[DEBUG] 2FA Login attempt - Email: {email}, Username: {username}")

            user = None
            if email:
                # Check if the email field actually contains a valid email format
                import re
                email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                if re.match(email_pattern, email):
                    # Use email parameter for proper email authentication
                    user = authenticate(request, email=email, password=password)
                else:
                    # If email field doesn't contain valid email, treat it as username
                    user = authenticate(request, username=email, password=password)
            elif username:
                # Use username parameter which can handle both username and email
                user = authenticate(request, username=username, password=password)

            if user and user.is_active:
                # Check if 2FA is enabled for this user
                if not getattr(user, 'otp_enabled', True):
                    # 2FA is disabled - log in directly without OTP
                    from django.contrib.auth import login
                    user.backend = 'django.contrib.auth.backends.ModelBackend'
                    login(request, user)
                    
                    request.session['user_id'] = user.id
                    request.session['username'] = user.username
                    request.session['role'] = getattr(user, 'role', 'doctor')
                    request.session['login_time'] = str(timezone.now())
                    request.session.save()
                    
                    return Response({
                        'success': True,
                        '2fa_required': False,
                        'user': {
                            'id': user.id,
                            'name': user.get_full_name() or user.username,
                            'email': user.email,
                            'username': user.username,
                            'role': getattr(user, 'role', 'doctor'),
                            'can_manage_appointments': getattr(user, 'can_manage_appointments', False),
                            'can_manage_patients': getattr(user, 'can_manage_patients', False),
                            'can_manage_staff': getattr(user, 'can_manage_staff', False),
                            'can_view_reports': getattr(user, 'can_view_reports', False),
                            'can_manage_clinic_settings': getattr(user, 'can_manage_clinic_settings', False),
                            'can_manage_inventory': getattr(user, 'can_manage_inventory', False),
                            'can_manage_permissions': getattr(user, 'can_manage_permissions', False),
                            'can_access_integrations': getattr(user, 'can_access_integrations', False),
                            'can_view_audit_logs': getattr(user, 'can_view_audit_logs', False),
                            'can_view_usage_reports': getattr(user, 'can_view_usage_reports', False),
                            'can_access_security_testing': getattr(user, 'can_access_security_testing', False),
                        },
                        'session_id': request.session.session_key,
                        'message': 'Login successful',
                        'force_password_change': getattr(user, 'force_password_change', False)
                    })
                
                # 2FA is enabled - proceed with OTP flow
                # Store pending user ID in session (do not log in yet)
                request.session['pending_2fa_user_id'] = user.id
                request.session.save()

                # Generate and send OTP (reuse SendOTPView logic)
                identifier = user.email if user.email else user.phone
                identifier_type = 'email' if user.email else 'phone'

                # Generate 6-digit OTP using pyotp library
                otp = generate_otp()
                from django.core.cache import cache
                cache_key = f"otp_{identifier}_{identifier_type}"
                cache.set(cache_key, otp, 300)  # 5 minutes

                # Send OTP
                otp_sent = False
                logger.info(f"🔄 [2FA LOGIN] Attempting to send OTP to {identifier_type}: {identifier}")

                try:
                    if identifier_type == 'email':
                        try:
                            from clinic.models import ClinicSettings
                            clinic_settings = ClinicSettings.objects.first()
                        except:
                            clinic_settings = None
                        
                        logger.info(f"📧 [2FA LOGIN] Sending OTP email to {identifier}")
                        from appointments.email_utils import send_otp_email
                        otp_result = send_otp_email(identifier, otp, clinic_settings)
                        
                        if isinstance(otp_result, tuple):
                            success, message = otp_result
                        else:
                            success, message = otp_result, ''
                        
                        otp_sent = success
                        
                        if success:
                            logger.info(f"✅ [2FA LOGIN] OTP email sent successfully to {identifier}")
                        else:
                            logger.error(f"❌ [2FA LOGIN] Failed to send OTP email to {identifier}: {message}")
                            
                    elif identifier_type == 'phone':
                        logger.info(f"📱 [2FA LOGIN] Sending OTP SMS to {identifier}")
                        from accounts.iprog_sms_service import iprog_sms_service
                        otp_result = iprog_sms_service.send_otp_sms(identifier, otp)
                        
                        if isinstance(otp_result, tuple):
                            success, message, reference_id = otp_result
                        else:
                            success, message, reference_id = otp_result, '', None
                        
                        otp_sent = success
                        
                        if success:
                            logger.info(f"✅ [2FA LOGIN] OTP SMS sent successfully to {identifier}")
                            if reference_id:
                                logger.info(f"📋 [2FA LOGIN] SMS Reference ID: {reference_id}")
                        else:
                            logger.error(f"❌ [2FA LOGIN] Failed to send OTP SMS to {identifier}: {message}")
                            
                except Exception as e:
                    logger.error(f"❌ [2FA LOGIN] Exception while sending OTP to {identifier}: {e}")
                    logger.exception("Full traceback for 2FA OTP sending error:")

                logger.info(f"📊 [2FA LOGIN] Final OTP sending result for {identifier_type}: {otp_sent}")

                return Response({
                    'success': True,
                    '2fa_required': True,
                    'message': 'OTP sent. Please verify to complete login.',
                    'identifier': identifier,
                    'identifier_type': identifier_type
                })

            print(f"[DEBUG] 2FA Authentication failed for email: {email}, username: {username}")
            return Response({
                'success': False,
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)

        except Exception as e:
            print(f"[DEBUG] 2FA Login error: {str(e)}")
            return Response({
                'success': False,
                'error': 'Login failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def clear_user_sessions(self, user):
        try:
            user_sessions = Session.objects.all()
            for session in user_sessions:
                data = session.get_decoded()
                if data.get('_auth_user_id') == str(user.id):
                    session.delete()
        except Exception as e:
            logger.warning(f"Failed to clear user sessions: {str(e)}")


# --- 2FA OTP Verification View ---
class SessionOTPVerifyView(APIView):
    """
    Step 2: Verify OTP and complete login (create session)
    """
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            logger.info("[2FA VERIFY] SessionOTPVerifyView.post called")
            logger.info(f"[2FA VERIFY] Request data: {request.data}")
            logger.info(f"[2FA VERIFY] Session data: {dict(request.session.items())}")
            
            identifier = request.data.get('identifier')
            identifier_type = request.data.get('identifier_type')
            otp = request.data.get('otp')

            # Enhanced validation logging
            if not identifier:
                logger.error("[2FA VERIFY] Missing identifier")
                return Response({
                    'success': False,
                    'error': 'identifier is required'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            if not identifier_type:
                logger.error("[2FA VERIFY] Missing identifier_type")
                return Response({
                    'success': False,
                    'error': 'identifier_type is required'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            if not otp:
                logger.error("[2FA VERIFY] Missing otp")
                return Response({
                    'success': False,
                    'error': 'otp is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            logger.info(f"[2FA VERIFY] Verifying OTP for {identifier_type}: {identifier}")
            logger.info(f"[2FA VERIFY] Received OTP: {otp}")

            # Check OTP from cache
            from django.core.cache import cache
            cache_key = f"otp_{identifier}_{identifier_type}"
            stored_otp = cache.get(cache_key)
            
            logger.info(f"[2FA VERIFY] Cache key: {cache_key}")
            logger.info(f"[2FA VERIFY] Stored OTP: {stored_otp}")
            logger.info(f"[2FA VERIFY] Received OTP: {otp}")
            logger.info(f"[2FA VERIFY] OTP Match: {stored_otp == otp}")
            
            if not stored_otp:
                logger.error("[2FA VERIFY] No OTP found in cache - expired or never generated")
                return Response({
                    'success': False,
                    'error': 'OTP expired or not found. Please request a new OTP.'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            # Convert both to strings and strip whitespace for comparison
            stored_otp_str = str(stored_otp).strip()
            received_otp_str = str(otp).strip()
            
            if stored_otp_str != received_otp_str:
                logger.error(f"[2FA VERIFY] OTP mismatch - stored: '{stored_otp_str}', received: '{received_otp_str}'")
                return Response({
                    'success': False,
                    'error': 'Invalid OTP. Please check the code and try again.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Find pending user from session OR find user by identifier (for forgot password flow)
            pending_user_id = request.session.get('pending_2fa_user_id')
            logger.info(f"[2FA VERIFY] Pending user ID from session: {pending_user_id}")
            
            from accounts.models import CustomUser
            user = None
            
            if pending_user_id:
                # Login flow: Get user from session
                try:
                    user = CustomUser.objects.get(id=pending_user_id)
                    logger.info(f"[2FA VERIFY] Found user from session: {user.email} (ID: {user.id})")
                except CustomUser.DoesNotExist:
                    logger.error(f"[2FA VERIFY] User not found for ID: {pending_user_id}")
                    return Response({
                        'success': False,
                        'error': 'User not found.'
                    }, status=status.HTTP_404_NOT_FOUND)
            else:
                # Forgot password flow: Find user by identifier (handle encrypted fields)
                logger.info(f"[2FA VERIFY] No pending user in session - searching by {identifier_type}: {identifier}")
                
                if identifier_type == 'email':
                    # Search through all users for matching email (encrypted field)
                    for u in CustomUser.objects.all():
                        if u.email and u.email.lower() == identifier.lower():
                            user = u
                            logger.info(f"[2FA VERIFY] Found user by email: {user.username}")
                            break
                elif identifier_type == 'phone':
                    # Search through all users for matching phone (encrypted field)
                    for u in CustomUser.objects.all():
                        if u.phone and u.phone == identifier:
                            user = u
                            logger.info(f"[2FA VERIFY] Found user by phone: {user.username}")
                            break
                
                if not user:
                    logger.error(f"[2FA VERIFY] User not found with {identifier_type}: {identifier}")
                    return Response({
                        'success': False,
                        'error': 'User not found.'
                    }, status=status.HTTP_404_NOT_FOUND)

            # Verify the identifier matches the user
            if identifier_type == 'email' and user.email != identifier:
                logger.error(f"[2FA VERIFY] Email mismatch - user: {user.email}, identifier: {identifier}")
                return Response({
                    'success': False,
                    'error': 'Invalid request. Please login again.'
                }, status=status.HTTP_400_BAD_REQUEST)
            elif identifier_type == 'phone' and user.phone != identifier:
                logger.error(f"[2FA VERIFY] Phone mismatch - user: {user.phone}, identifier: {identifier}")
                return Response({
                    'success': False,
                    'error': 'Invalid request. Please login again.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Clear OTP and pending state
            logger.info(f"[2FA VERIFY] OTP verification successful - clearing cache and session data")
            cache.delete(cache_key)
            
            # Only clear pending_2fa_user_id if it exists (login flow)
            if 'pending_2fa_user_id' in request.session:
                del request.session['pending_2fa_user_id']
                logger.info(f"[2FA VERIFY] Cleared pending_2fa_user_id from session")

            # Clear any existing sessions for this user
            self.clear_user_sessions(user)

            # Save session with error handling FIRST
            try:
                request.session.save()
                logger.info(f"[2FA VERIFY] Session saved successfully. Session ID: {request.session.session_key}")
            except Exception as e:
                logger.warning(f"[2FA VERIFY] Session save error: {e}. Creating new session...")
                # If session save fails, create a new session
                request.session.flush()
                request.session.create()
                request.session.save()

            # Log in the user AFTER session is stable
            from django.contrib.auth import login
            # Set backend for multi-backend compatibility
            user.backend = 'django.contrib.auth.backends.ModelBackend'
            login(request, user)
            
            # Set additional session data AFTER login
            request.session['user_id'] = user.id
            request.session['username'] = user.username
            request.session['role'] = getattr(user, 'role', 'doctor')
            request.session['login_time'] = str(timezone.now())
            request.session.save()

            logger.info(f"[2FA VERIFY] ✅ User {user.username} logged in successfully. Session ID: {request.session.session_key}")

            return Response({
                'success': True,
                'user': {
                    'id': user.id,
                    'name': user.get_full_name() or user.username,
                    'email': user.email,
                    'username': user.username,
                    'role': getattr(user, 'role', 'doctor'),
                    'can_manage_appointments': getattr(user, 'can_manage_appointments', False),
                    'can_manage_patients': getattr(user, 'can_manage_patients', False),
                    'can_manage_staff': getattr(user, 'can_manage_staff', False),
                    'can_view_reports': getattr(user, 'can_view_reports', False),
                    'can_manage_clinic_settings': getattr(user, 'can_manage_clinic_settings', False),
                    'can_manage_inventory': getattr(user, 'can_manage_inventory', False),
                    'can_manage_permissions': getattr(user, 'can_manage_permissions', False),
                    'can_access_integrations': getattr(user, 'can_access_integrations', False),
                    'can_view_audit_logs': getattr(user, 'can_view_audit_logs', False),
                    'can_view_usage_reports': getattr(user, 'can_view_usage_reports', False),
                    'can_access_security_testing': getattr(user, 'can_access_security_testing', False),
                },
                'session_id': request.session.session_key,
                'message': 'Login successful',
                'force_password_change': getattr(user, 'force_password_change', False)
            })

        except Exception as e:
            logger.error(f"[2FA VERIFY] ❌ Exception during OTP verification: {str(e)}")
            logger.exception("Full traceback for 2FA OTP verification error:")
            return Response({
                'success': False,
                'error': 'OTP verification failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def clear_user_sessions(self, user):
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
                        'can_manage_appointments': getattr(request.user, 'can_manage_appointments', False),
                        'can_manage_patients': getattr(request.user, 'can_manage_patients', False),
                        'can_manage_staff': getattr(request.user, 'can_manage_staff', False),
                        'can_view_reports': getattr(request.user, 'can_view_reports', False),
                        'can_manage_clinic_settings': getattr(request.user, 'can_manage_clinic_settings', False),
                        'can_manage_inventory': getattr(request.user, 'can_manage_inventory', False),
                        'can_manage_permissions': getattr(request.user, 'can_manage_permissions', False),
                        'can_access_integrations': getattr(request.user, 'can_access_integrations', False),
                        'can_view_audit_logs': getattr(request.user, 'can_view_audit_logs', False),
                        'can_view_usage_reports': getattr(request.user, 'can_view_usage_reports', False),
                        'can_access_security_testing': getattr(request.user, 'can_access_security_testing', False),
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
