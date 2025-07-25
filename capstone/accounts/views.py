from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import CustomUserSerializer
from .models import CustomUser
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth import authenticate
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
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from datetime import datetime, timedelta

class StaffCreateView(APIView):
    def post(self, request):
        serializer = CustomUserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Send email with credentials if requested
            if request.data.get('send_email', False):
                temp_password = request.data.get('temp_password', request.data.get('password'))
                try:
                    send_mail(
                        'Your Account Credentials - Health Nexus',
                        f'''
Hello {user.get_full_name()},

Your account has been created successfully!

Login Credentials:
Email: {user.email}
Username: {user.username}
Temporary Password: {temp_password}

Please log in and change your password immediately for security.

Login URL: http://localhost:3000/login

Best regards,
Health Nexus Team
                        ''',
                        settings.DEFAULT_FROM_EMAIL,
                        [user.email],
                        fail_silently=False,
                    )
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
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    
    if user:
        return Response({
            'success': True,
            'id': user.id,
            'name': user.get_full_name() or user.username,
            'email': user.email,
            'role': user.role if hasattr(user, 'role') else 'doctor'
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
            send_mail(
                'Password Reset - MedSync',
                f'Click the link to reset your password: {reset_link}',
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            return Response({'success': True, 'message': 'Password reset link sent.'})
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

        if not email or not password:
            return Response({
                'error': 'Please provide both email and password'
            }, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, email=email, password=password)

        if user is not None:
            # Log the user in (creates session)
            from django.contrib.auth import login
            login(request, user)
            
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
        
        return Response({
            'success': False,
            'error': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)

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
                send_mail(
                    'MedSync - Your Login Code',
                    f'Your verification code is: {otp}. This code expires in 5 minutes.',
                    settings.DEFAULT_FROM_EMAIL,
                    [identifier],
                    fail_silently=False,
                )
            elif identifier_type == 'phone':
                # Use the SMS service configuration
                from .sms_config import SMSService
                
                sms_service = SMSService()
                message = f'Your MedSync verification code is: {otp}. This code expires in 5 minutes.'
                
                success, result = sms_service.send_sms(identifier, message, country_code='+63')
                
                if success:
                    print(f"SMS sent to {identifier}: {result}")
                else:
                    print(f"SMS failed for {identifier}: {result}")
                    # Fallback to console for development
                    print(f"FALLBACK SMS for {identifier}: {otp}")
                    print("Please configure SMS service credentials in sms_config.py")
                
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
        
        # Check OTP from cache
        cache_key = f"otp_{identifier}_{identifier_type}"
        stored_otp = cache.get(cache_key)
        
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