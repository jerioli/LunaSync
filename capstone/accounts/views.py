from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import CustomUserSerializer
from .models import CustomUser
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth import authenticate, login
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.conf import settings
import random
import string
import secrets
import requests
import logging
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class StaffCreateView(APIView):
    def post(self, request):
        serializer = CustomUserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Send email with credentials if requested
            if request.data.get('send_email', False):
                temp_password = request.data.get('temp_password', request.data.get('password'))
                try:
                    # Get clinic settings for email branding
                    try:
                        from clinic.models import ClinicSettings
                        clinic_settings = ClinicSettings.objects.first()
                        clinic_name = clinic_settings.name if clinic_settings else "Health Nexus"
                    except:
                        clinic_name = "Health Nexus"
                        clinic_settings = None
                    
                    # Use the clinic email sender function
                    from appointments.email_utils import send_notification_email_with_clinic_sender
                    
                    # Create email content
                    subject = f'Your Account Credentials - {clinic_name}'
                    message = f'''
Hello {user.get_full_name()},

Your account has been created successfully!

Login Credentials:
Email: {user.email}
Username: {user.username}
Temporary Password: {temp_password}

Please log in and change your password immediately for security.

Login URL: http://localhost:3000/login

Best regards,
{clinic_name} Team
                    '''
                    
                    html_content = f'''
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                            .header {{ background-color: #2563eb; color: white; padding: 20px; text-align: center; }}
                            .content {{ padding: 20px; background-color: #f9fafb; }}
                            .credentials {{ background-color: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0; }}
                            .footer {{ padding: 20px; text-align: center; color: #666; font-size: 12px; }}
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>{clinic_name}</h1>
                            </div>
                            <div class="content">
                                <h2>Account Created Successfully</h2>
                                <p>Hello {user.get_full_name()},</p>
                                <p>Your account has been created successfully!</p>
                                
                                <div class="credentials">
                                    <h3>Login Credentials:</h3>
                                    <p><strong>Email:</strong> {user.email}</p>
                                    <p><strong>Username:</strong> {user.username}</p>
                                    <p><strong>Temporary Password:</strong> {temp_password}</p>
                                </div>
                                
                                <p>Please log in and change your password immediately for security.</p>
                                <p><strong>Login URL:</strong> <a href="http://localhost:3000/login">http://localhost:3000/login</a></p>
                            </div>
                            <div class="footer">
                                <p>Best regards,<br>{clinic_name} Team</p>
                            </div>
                        </div>
                    </body>
                    </html>
                    '''
                    
                    success, error_msg = send_notification_email_with_clinic_sender(
                        user.email, 
                        subject, 
                        message, 
                        html_content, 
                        clinic_settings
                    )
                    
                    if not success:
                        print(f"Failed to send email: {error_msg}")
                        
                except Exception as e:
                    print(f"Failed to send email: {e}")
            
            return Response({'message': 'Staff member created successfully!'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class StaffDetailView(APIView):
    def get(self, request, user_id):
        user = get_object_or_404(CustomUser, id=user_id)
        serializer = CustomUserSerializer(user)
        return Response(serializer.data)
    
    def patch(self, request, user_id):
        user = get_object_or_404(CustomUser, id=user_id)
        serializer = CustomUserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Staff member updated successfully',
                'data': serializer.data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, user_id):
        user = get_object_or_404(CustomUser, id=user_id)
        user.delete()
        return Response({
            'success': True,
            'message': 'Staff member deleted successfully'
        })

class StaffPermissionsView(APIView):
    def patch(self, request, user_id):
        user = get_object_or_404(CustomUser, id=user_id)
        
        # Update permissions
        permissions = request.data.get('permissions', {})
        user.can_manage_appointments = permissions.get('can_manage_appointments', user.can_manage_appointments)
        user.can_manage_patients = permissions.get('can_manage_patients', user.can_manage_patients)
        user.can_manage_staff = permissions.get('can_manage_staff', user.can_manage_staff)
        user.can_view_reports = permissions.get('can_view_reports', user.can_view_reports)
        user.can_manage_clinic_settings = permissions.get('can_manage_clinic_settings', user.can_manage_clinic_settings)
        
        user.save()
        
        serializer = CustomUserSerializer(user)
        return Response({
            'success': True,
            'message': 'Permissions updated successfully',
            'data': serializer.data
        })
    
class PasswordChangeView(APIView):
    def post(self, request):
        # Get user from email in request or from authenticated user
        email = request.data.get('email') or request.data.get('username')
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        if not current_password or not new_password:
            return Response({
                'error': 'Both current_password and new_password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # If no email provided and user is authenticated, use authenticated user
        if hasattr(request, 'user') and request.user.is_authenticated:
            user = request.user
        elif email:
            # Find user by email
            try:
                user = CustomUser.objects.get(email=email)
            except CustomUser.DoesNotExist:
                return Response({
                    'error': 'User not found'
                }, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({
                'error': 'Email is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if current password is correct
        if not user.check_password(current_password):
            return Response({
                'error': 'Current password is incorrect'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate new password length
        if len(new_password) < 8:
            return Response({
                'error': 'New password must be at least 8 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Set new password
        user.set_password(new_password)
        user.force_password_change = False  # Reset the flag after password change
        user.save()
        
        return Response({
            'success': True,
            'message': 'Password changed successfully'
        })

class UserProfileUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def patch(self, request):
        user = request.user
        data = request.data
        
        # Update allowed fields
        if 'name' in data:
            # Split full name into first and last name
            name_parts = data['name'].split(' ', 1)
            user.first_name = name_parts[0] if name_parts else ''
            user.last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'email' in data:
            user.email = data['email']
        if 'phone' in data:
            user.phone = data['phone']
        
        user.save()
        
        # Return updated user data
        serializer = CustomUserSerializer(user)
        return Response({
            'success': True,
            'message': 'Profile updated successfully',
            'user': serializer.data
        })

class UserPreferencesView(APIView):
    permission_classes = [IsAuthenticated]
    
    def patch(self, request):
        user = request.user
        preferences = request.data.get('notifications', {})
        
        # Store preferences in a JSON field or create a UserPreferences model
        # For now, we'll just return success
        # In a real app, you'd save these to a UserPreferences model
        
        return Response({
            'success': True,
            'message': 'Preferences updated successfully'
        })
    
class DoctorListView(APIView):
    def get(self, request):
        doctors = CustomUser.objects.filter(role='doctor')
        serializer = CustomUserSerializer(doctors, many=True)
        return Response(serializer.data)

class ReceptionistListView(APIView):
    def get(self, request):
        receptionists = CustomUser.objects.filter(role='receptionist')
        serializer = CustomUserSerializer(receptionists, many=True)
        return Response(serializer.data)

class AdminListView(APIView):
    def get(self, request):
        admins = CustomUser.objects.filter(role='admin')
        serializer = CustomUserSerializer(admins, many=True)
        return Response(serializer.data)

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def login_view(request):
    # Handle both email and username login
    email = request.data.get('email')
    username = request.data.get('username')
    password = request.data.get('password')
    
    # If email is provided, find user by email and use their username for authentication
    if email and not username:
        try:
            user_obj = CustomUser.objects.get(email=email)
            username = user_obj.username
        except CustomUser.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
    
    user = authenticate(username=username, password=password)
    
    if user:
        # Actually log the user in to create a session
        login(request, user)
        
        # Generate tokens (for now using dummy tokens, you can implement JWT later)
        access_token = f"access_token_for_user_{user.id}"
        refresh_token = f"refresh_token_for_user_{user.id}"
        
        return Response({
            'success': True,
            'id': user.id,
            'name': user.get_full_name() or user.username,
            'email': user.email,
            'username': user.username,
            'role': user.role if hasattr(user, 'role') else 'doctor',
            'access': access_token,
            'refresh': refresh_token
        })
    
    return Response({
        'success': False,
        'error': 'Invalid credentials'
    }, status=status.HTTP_401_UNAUTHORIZED)

class PasswordResetRequestView(APIView):
    def post(self, request):
        email = request.data.get('email')
        User = get_user_model()
        try:
            user = User.objects.get(email=email)
            token = PasswordResetTokenGenerator().make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_link = f"http://localhost:8080/reset-password/{uid}/{token}/"
            
            # Get clinic settings for email branding
            try:
                from clinic.models import ClinicSettings
                clinic_settings = ClinicSettings.objects.first()
                clinic_name = clinic_settings.name if clinic_settings else "MedSync"
            except:
                clinic_name = "MedSync"
                clinic_settings = None
            
            # Use the clinic email sender function
            from appointments.email_utils import send_notification_email_with_clinic_sender
            
            subject = f'Password Reset - {clinic_name}'
            message = f'Click the link to reset your password: {reset_link}'
            
            html_content = f'''
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #2563eb; color: white; padding: 20px; text-align: center; }}
                    .content {{ padding: 20px; background-color: #f9fafb; }}
                    .button {{ background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }}
                    .footer {{ padding: 20px; text-align: center; color: #666; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>{clinic_name}</h1>
                    </div>
                    <div class="content">
                        <h2>Password Reset Request</h2>
                        <p>You requested a password reset for your account.</p>
                        <p>Click the button below to reset your password:</p>
                        
                        <a href="{reset_link}" class="button">Reset Password</a>
                        
                        <p>If you didn't request this reset, please ignore this email.</p>
                        <p>This link will expire in 24 hours.</p>
                    </div>
                    <div class="footer">
                        <p>Best regards,<br>{clinic_name} Team</p>
                    </div>
                </div>
            </body>
            </html>
            '''
            
            success, error_msg = send_notification_email_with_clinic_sender(
                email, 
                subject, 
                message, 
                html_content, 
                clinic_settings
            )
            
            if success:
                return Response({'success': True, 'message': 'Password reset link sent.'})
            else:
                return Response({'success': False, 'message': 'Failed to send email.'}, status=500)
                
        except User.DoesNotExist:
            return Response({'success': False, 'message': 'No user found with this email address.'}, status=404)

class PasswordResetConfirmView(APIView):
    def post(self, request, uidb64, token):
        User = get_user_model()
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
            if PasswordResetTokenGenerator().check_token(user, token):
                new_password = request.data.get('new_password')
                user.set_password(new_password)
                user.save()
                return Response({'success': True, 'message': 'Password has been reset.'})
            else:
                return Response({'success': False, 'message': 'Invalid or expired token.'}, status=400)
        except Exception:
            return Response({'success': False, 'message': 'Invalid request.'}, status=400)

@method_decorator(csrf_exempt, name='dispatch')
class StaffLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        otp_method = request.data.get('otp_method')  # 'email' or 'sms'
        step = request.data.get('step', 'credentials')  # 'credentials' or 'otp'

        if step == 'credentials':
            # Step 1: Validate credentials
            if not email or not password:
                return Response({
                    'error': 'Please provide both email/username and password'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Use username parameter to trigger EmailOrUsernameBackend
            user = authenticate(request, username=email, password=password)

            if user is not None:
                # Store user info in session for OTP verification
                request.session['pending_user_id'] = user.id
                request.session['pending_login'] = True
                
                return Response({
                    'success': True,
                    'step': 'otp_method_selection',
                    'message': 'Credentials valid. Please choose OTP delivery method.',
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'name': user.name,
                        'role': user.role,
                        'phone': getattr(user, 'phone', None)
                    }
                })
            
            return Response({
                'success': False,
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)

        elif step == 'send_otp':
            # Step 2: Send OTP to chosen method
            if not otp_method:
                return Response({
                    'error': 'Please specify OTP delivery method (email or sms)'
                }, status=status.HTTP_400_BAD_REQUEST)

            user_id = request.session.get('pending_user_id')
            if not user_id or not request.session.get('pending_login'):
                return Response({
                    'error': 'Invalid session. Please login again.'
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                user = CustomUser.objects.get(id=user_id)
            except CustomUser.DoesNotExist:
                return Response({
                    'error': 'User not found'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Generate OTP
            import random
            import string
            otp = ''.join(random.choices(string.digits, k=6))
            
            # Store OTP in cache
            cache.set(f'login_otp_{user.id}', otp, timeout=300)  # 5 minutes
            cache.set(f'login_otp_method_{user.id}', otp_method, timeout=300)

            if otp_method == 'email':
                # Send OTP via email using smtplib for better control
                try:
                    # Get clinic settings for email branding
                    try:
                        from clinic.models import ClinicSettings
                        clinic_settings = ClinicSettings.objects.first()
                    except:
                        clinic_settings = None
                    
                    # Use the new email function
                    from appointments.email_utils import send_otp_email
                    success, message = send_otp_email(user.email, otp, clinic_settings)
                    
                    if not success:
                        logger.error(f"Failed to send OTP email: {message}")
                        return Response({
                            'success': False,
                            'error': 'Failed to send OTP email. Please try SMS instead.'
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                    return Response({
                        'success': True,
                        'step': 'otp_verification',
                        'message': f'Verification code sent to {user.email}',
                        'method': 'email'
                    })
                except Exception as e:
                    logger.error(f"Error in OTP email sending: {str(e)}")
                    return Response({
                        'error': 'Failed to send email verification code'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            elif otp_method == 'sms':
                # Send OTP via SMS using iProg
                if not hasattr(user, 'phone') or not user.phone:
                    return Response({
                        'error': 'No phone number associated with this account'
                    }, status=status.HTTP_400_BAD_REQUEST)

                from .iprog_sms_service import iprog_sms_service
                success, message, reference_id = iprog_sms_service.send_otp_sms(user.phone, otp)
                
                if success:
                    return Response({
                        'success': True,
                        'step': 'otp_verification',
                        'message': f'Verification code sent to {user.phone}',
                        'method': 'sms'
                    })
                else:
                    return Response({
                        'error': 'Failed to send SMS verification code'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            else:
                return Response({
                    'error': 'Invalid OTP method. Use "email" or "sms"'
                }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'error': 'Invalid request'
        }, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class CompleteLoginView(APIView):
    """Complete login after OTP verification"""
    permission_classes = [AllowAny]

    def post(self, request):
        otp = request.data.get('otp')
        
        if not otp:
            return Response({
                'error': 'Please provide the verification code'
            }, status=status.HTTP_400_BAD_REQUEST)

        user_id = request.session.get('pending_user_id')
        if not user_id or not request.session.get('pending_login'):
            return Response({
                'error': 'Invalid session. Please login again.'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get stored OTP and method
        stored_otp = cache.get(f'login_otp_{user.id}')
        otp_method = cache.get(f'login_otp_method_{user.id}')

        if not stored_otp:
            return Response({
                'error': 'Verification code expired. Please request a new one.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Verify OTP based on method used
        verification_success = False
        
        if otp_method == 'sms':
            # Use Django OTP verification (iProg is just for sending)
            verification_success = (stored_otp == otp)
        else:
            # Email OTP verification
            verification_success = (stored_otp == otp)

        if verification_success:
            # Complete the login
            from django.contrib.auth import login
            login(request, user)
            
            # Clear session data and cache
            request.session.pop('pending_user_id', None)
            request.session.pop('pending_login', None)
            cache.delete(f'login_otp_{user.id}')
            cache.delete(f'login_otp_method_{user.id}')
            
            return Response({
                'success': True,
                'message': 'Login successful',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'name': user.name,
                    'role': user.role
                }
            })
        else:
            return Response({
                'success': False,
                'error': 'Invalid verification code'
            }, status=status.HTTP_400_BAD_REQUEST)


# Add OTP functionality

class UserListView(APIView):
    """General users endpoint for OTP user lookup"""
    def get(self, request):
        users = CustomUser.objects.all()
        serializer = CustomUserSerializer(users, many=True)
        return Response(serializer.data)

class SendOTPView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        identifier = request.data.get('identifier')
        identifier_type = request.data.get('identifier_type')
        
        if not identifier or not identifier_type:
            return Response({
                'success': False,
                'error': 'identifier and identifier_type are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find user by email or phone
        try:
            if identifier_type == 'email':
                user = CustomUser.objects.get(email=identifier)
            elif identifier_type == 'phone':
                user = CustomUser.objects.get(phone=identifier)
            else:
                return Response({
                    'success': False,
                    'error': 'identifier_type must be email or phone'
                }, status=status.HTTP_400_BAD_REQUEST)
        except CustomUser.DoesNotExist:
            return Response({
                'success': False,
                'error': 'No user found with this identifier'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Generate 6-digit OTP
        otp = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
        
        # Store OTP in cache with 5-minute expiration
        cache_key = f"otp_{identifier}_{identifier_type}"
        cache.set(cache_key, otp, 300)  # 5 minutes
        
        # Send OTP via email or SMS
        try:
            if identifier_type == 'email':
                # Get clinic settings for email branding
                try:
                    from clinic.models import ClinicSettings
                    clinic_settings = ClinicSettings.objects.first()
                except:
                    clinic_settings = None
                
                # Use the new email function
                from appointments.email_utils import send_otp_email
                success, message = send_otp_email(identifier, otp, clinic_settings)
                
                if not success:
                    logger.error(f"Failed to send OTP email: {message}")
                    return Response({
                        'success': False,
                        'error': 'Failed to send OTP email. Please try phone instead.'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            elif identifier_type == 'phone':
                # Use iProg SMS service as primary
                from .iprog_sms_service import iprog_sms_service
                
                success, message, reference_id = iprog_sms_service.send_otp_sms(identifier, otp)
                
                if success:
                    print(f"iProg SMS sent to {identifier}: {message}")
                    if reference_id:
                        print(f"iProg Reference ID: {reference_id}")
                else:
                    print(f"iProg SMS failed for {identifier}: {message}")
                    # Additional fallback to Semaphore if needed
                    try:
                        from .sms_config import SMSService
                        sms_service = SMSService()
                        message = f'Your MedSync verification code is: {otp}. This code expires in 5 minutes.'
                        success, result = sms_service.send_sms(identifier, message, country_code='+63')
                        print(f"Semaphore fallback result: {result}")
                    except Exception as fallback_error:
                        print(f"All SMS methods failed: {fallback_error}")
                        print(f"FINAL FALLBACK SMS for {identifier}: {otp}")
                
        except Exception as e:
            print(f"Failed to send OTP: {e}")
            # For demo purposes, still return success
            pass
        
        return Response({
            'success': True,
            'message': 'OTP sent successfully',
            'expires_in': 300
        })

class VerifyOTPView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        identifier = request.data.get('identifier')
        identifier_type = request.data.get('identifier_type')
        otp = request.data.get('otp')
        
        if not identifier or not identifier_type or not otp:
            return Response({
                'success': False,
                'error': 'identifier, identifier_type, and otp are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check OTP from cache first (for fallback/development mode)
        cache_key = f"otp_{identifier}_{identifier_type}"
        stored_otp = cache.get(cache_key)
        
        # If phone number, use Django OTP verification (iProg is just for sending)
        if identifier_type == 'phone':
            # Use Django OTP verification only
            if not stored_otp:
                return Response({
                    'success': False,
                    'error': 'OTP expired or not found'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if stored_otp != otp:
                return Response({
                    'success': False,
                    'error': 'Invalid OTP'
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Email verification - use Django OTP verification only
            if not stored_otp:
                return Response({
                    'success': False,
                    'error': 'OTP expired or not found'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if stored_otp != otp:
                return Response({
                    'success': False,
                    'error': 'Invalid OTP'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find user
        try:
            if identifier_type == 'email':
                user = CustomUser.objects.get(email=identifier)
            elif identifier_type == 'phone':
                user = CustomUser.objects.get(phone=identifier)
            else:
                return Response({
                    'success': False,
                    'error': 'identifier_type must be email or phone'
                }, status=status.HTTP_400_BAD_REQUEST)
        except CustomUser.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Clear the OTP from cache
        cache.delete(cache_key)
        
        # Return user data (similar to login response)
        return Response({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'name': user.get_full_name() or user.username,
                'email': user.email,
                'role': user.role,
                'accessToken': 'dummy_access_token',  # In production, generate JWT token
                'refreshToken': 'dummy_refresh_token'  # In production, generate refresh token
            }
        })

class ResetPasswordOTPView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        identifier = request.data.get('identifier')
        identifier_type = request.data.get('identifier_type')
        new_password = request.data.get('new_password')
        
        if not identifier or not identifier_type or not new_password:
            return Response({
                'success': False,
                'error': 'identifier, identifier_type, and new_password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate password length
        if len(new_password) < 8:
            return Response({
                'success': False,
                'error': 'Password must be at least 8 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find user
        try:
            if identifier_type == 'email':
                user = CustomUser.objects.get(email=identifier)
            elif identifier_type == 'phone':
                user = CustomUser.objects.get(phone=identifier)
            else:
                return Response({
                    'success': False,
                    'error': 'identifier_type must be email or phone'
                }, status=status.HTTP_400_BAD_REQUEST)
        except CustomUser.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            # Update user password
            user.set_password(new_password)
            user.save()
            
            logger.info(f"Password reset successfully for user {user.username} via OTP")
            
            return Response({
                'success': True,
                'message': 'Password has been reset successfully'
            })
            
        except Exception as e:
            logger.error(f"Error resetting password for user {user.username}: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to reset password. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)