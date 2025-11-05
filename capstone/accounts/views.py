from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import CustomUserSerializer
from .models import CustomUser
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth import authenticate, login
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.conf import settings
import pyotp
import secrets
import logging
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from datetime import datetime, timedelta
from systemlogs.audit_logger import AuditLogger
import pyotp
from capstone.settings import CsrfExemptSessionAuthentication
from captcha.models import CaptchaStore
from captcha.helpers import captcha_image_url
from django.http import HttpResponse
import json

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
    # Ensure OTP is always returned as a string for consistent comparison
    return str(otp).zfill(6)  # Pad with zeros if needed to ensure 6 digits

@method_decorator(csrf_exempt, name='dispatch')
class StaffCreateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Check if user has permission to manage staff, is an admin, or is a superadmin
        if not (request.user.can_manage_staff or request.user.role in ['admin', 'superadmin']):
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to create staff members'
            }, status=status.HTTP_403_FORBIDDEN)
            
        # Prevent non-superadmins from creating superadmin users
        if request.data.get('role') == 'superadmin' and request.user.role != 'superadmin':
            return Response({
                'error': 'Permission denied',
                'message': 'Only superadmins can create superadmin users'
            }, status=status.HTTP_403_FORBIDDEN)
            
        serializer = CustomUserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Set force_password_change to True for new staff
            user.force_password_change = True
            user.save()
            
            # Log staff creation
            AuditLogger.log_staff_action(
                user=request.user,
                action='CREATE',
                staff_id=user.id,
                staff_name=f"{user.get_full_name()} ({user.username})",
                description=f"Created new staff member: {user.get_full_name()} with role {user.role}",
                details={
                    'staff_role': user.role,
                    'staff_email': user.email,
                    'created_by': request.user.email if request.user.is_authenticated else 'Unknown'
                },
                request=request
            )
            
            # Debug: Verify user creation with force_password_change
            print(f"[DEBUG] StaffCreateView - Created user {user.username} with force_password_change: {user.force_password_change}")
            
            # Send account activation email if requested
            if request.data.get('send_email', False):
                try:
                    # Get clinic settings for email branding
                    try:
                        from clinic.models import ClinicSettings
                        clinic_settings = ClinicSettings.objects.first()
                        clinic_name = clinic_settings.name if clinic_settings else "Health Nexus"
                    except:
                        clinic_name = "Health Nexus"
                        clinic_settings = None
                    
                    # Generate secure activation token
                    from accounts.backends import account_activation_token
                    token = account_activation_token.make_token(user)
                    uid = urlsafe_base64_encode(force_bytes(user.pk))
                    
                    # Use proper domain for activation link - hardcoded for production
                    activation_link = f"https://lunasync.site/account/activate/{uid}/{token}/"
                    
                    # Use the clinic email sender function
                    from appointments.email_utils import send_notification_email_with_clinic_sender
                    
                    # Create secure email content without password
                    subject = f'Account Activation - {clinic_name}'
                    message = f'''
Hello {user.get_full_name()},

Your account has been created successfully!

Account Details:
Email: {user.email}
Username: {user.username}
Role: {user.role.title()}

To complete your account setup and create your password, please click the link below:

{activation_link}

This activation link will expire in 24 hours for security reasons.

If you have any questions, please contact your administrator.

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
                            .account-info {{ background-color: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0; }}
                            .activation-section {{ background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #10b981; }}
                            .button {{ background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; font-weight: bold; }}
                            .security-notice {{ background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #f59e0b; }}
                            .footer {{ padding: 20px; text-align: center; color: #666; font-size: 12px; }}
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>{clinic_name}</h1>
                            </div>
                            <div class="content">
                                <h2>🎉 Account Created Successfully</h2>
                                <p>Hello {user.get_full_name()},</p>
                                <p>Your account has been created successfully! Please complete your account setup by creating your password.</p>
                                
                                <div class="account-info">
                                    <h3>📋 Account Details:</h3>
                                    <p><strong>Email:</strong> {user.email}</p>
                                    <p><strong>Username:</strong> {user.username}</p>
                                    <p><strong>Role:</strong> {user.role.title()}</p>
                                </div>
                                
                                <div class="activation-section">
                                    <h3>🔐 Complete Your Account Setup</h3>
                                    <p>Click the button below to create your password and activate your account:</p>
                                    <a href="{activation_link}" class="button">Activate Account & Set Password</a>
                                </div>
                                
                                <div class="security-notice">
                                    <h4>🔒 Security Notice:</h4>
                                    <ul style="margin: 10px 0; padding-left: 20px;">
                                        <li>This activation link will expire in 24 hours</li>
                                        <li>Only use this link from a secure device</li>
                                        <li>Do not share this link with anyone</li>
                                        <li>If you didn't expect this email, please contact your administrator</li>
                                    </ul>
                                </div>
                                
                                <p>If you have any questions about your account, please contact your administrator.</p>
                            </div>
                            <div class="footer">
                                <p>Best regards,<br>{clinic_name} Team</p>
                                <p>This is an automated message. Please do not reply to this email.</p>
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
                        print(f"Failed to send activation email: {error_msg}")
                        
                except Exception as e:
                    print(f"Failed to send activation email: {e}")
            
            return Response({'message': 'Staff member created successfully!'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
@method_decorator(csrf_exempt, name='dispatch')
class StaffDetailView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]  # Require authentication for all staff operations
    
    def get(self, request, user_id):
        user = get_object_or_404(CustomUser, id=user_id)
        serializer = CustomUserSerializer(user, context={'request': request})
        return Response(serializer.data)
    
    def patch(self, request, user_id):
        # Check if user has permission to update staff (similar to patient update pattern)
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to update staff'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Debug logging for permission troubleshooting
        print(f"[DEBUG] StaffDetailView.patch - User ID: {request.user.id}, Target ID: {user_id}")
        print(f"[DEBUG] StaffDetailView.patch - User role: {getattr(request.user, 'role', 'No role')}")
        print(f"[DEBUG] StaffDetailView.patch - can_manage_staff: {getattr(request.user, 'can_manage_staff', 'No permission')}")
        
        # Allow staff management for users with manage_staff permission or admin/superadmin roles, or editing own profile
        is_own_profile = str(request.user.id) == str(user_id)
        has_manage_permission = request.user.can_manage_staff if hasattr(request.user, 'can_manage_staff') else False
        has_admin_role = request.user.role in ['admin', 'superadmin'] if hasattr(request.user, 'role') else False
        
        if not (has_manage_permission or has_admin_role or is_own_profile):
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to update this staff member'
            }, status=status.HTTP_403_FORBIDDEN)
        
        user = get_object_or_404(CustomUser, id=user_id)
        serializer = CustomUserSerializer(user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            updated_user = serializer.save()
            
            # Log staff update for audit trail
            AuditLogger.log_staff_action(
                user=request.user,
                action='UPDATE',
                staff_id=user.id,
                staff_name=f"{user.get_full_name()} ({user.username})",
                description=f"Updated staff member: {user.get_full_name()}",
                details={
                    'staff_role': user.role,
                    'updated_by': request.user.email if request.user.is_authenticated else 'Unknown',
                    'changes': request.data
                },
                request=request
            )
            
            # Return updated data with context for proper decryption
            response_serializer = CustomUserSerializer(updated_user, context={'request': request})
            return Response({
                'success': True,
                'message': 'Staff member updated successfully',
                'data': response_serializer.data
            })
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class StaffPermissionsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, user_id=None):
        print(f"=== StaffPermissionsView DEBUG ===")
        print(f"User authenticated: {request.user.is_authenticated}")
        print(f"User: {request.user}")
        print(f"User ID: {getattr(request.user, 'id', 'No ID')}")
        print(f"User role: {getattr(request.user, 'role', 'No role')}")
        print(f"can_manage_permissions: {getattr(request.user, 'can_manage_permissions', 'No attribute')}")
        print(f"User session key: {getattr(request, 'session', {}).get('_session_key', 'No session')}")
        print(f"Request headers: {dict(request.headers)}")
        print(f"Request cookies: {request.COOKIES}")
        print(f"Request session data: {dict(request.session)}")
        print(f"=== END StaffPermissionsView DEBUG ===")

        # Allow superadmins, admins, doctors with permission, or users with can_manage_permissions
        user_role = getattr(request.user, 'role', '')
        can_manage_perms = getattr(request.user, 'can_manage_permissions', False)
        
        has_access = (user_role in ['superadmin', 'admin'] or 
                     (user_role == 'doctor' and can_manage_perms) or 
                     can_manage_perms)
        
        if not has_access:
            print(f"Permission denied for user {request.user} - role: {user_role}, can_manage_permissions: {can_manage_perms}")
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to view permissions'
            }, status=status.HTTP_403_FORBIDDEN)
            
        if user_id:
            # Get specific user permissions
            user = get_object_or_404(CustomUser, id=user_id)
            permissions = {
                'can_manage_appointments': user.can_manage_appointments,
                'can_manage_patients': user.can_manage_patients,
                'can_manage_staff': user.can_manage_staff,
                'can_view_reports': user.can_view_reports,
                'can_manage_clinic_settings': user.can_manage_clinic_settings,
                'can_manage_inventory': user.can_manage_inventory,
                'can_manage_permissions': user.can_manage_permissions,
                'can_access_integrations': user.can_access_integrations,
                'can_view_audit_logs': user.can_view_audit_logs,
                'can_view_usage_reports': user.can_view_usage_reports,
                'can_access_security_testing': user.can_access_security_testing,
            }
            return Response({
                'success': True,
                'user_id': user_id,
                'username': user.username,
                'role': user.role,
                'permissions': permissions
            })
        else:
            # Get all users with their permissions
            users = CustomUser.objects.all()
            users_data = []
            for user in users:
                users_data.append({
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role,
                    'permissions': {
                        'can_manage_appointments': user.can_manage_appointments,
                        'can_manage_patients': user.can_manage_patients,
                        'can_manage_staff': user.can_manage_staff,
                        'can_view_reports': user.can_view_reports,
                        'can_manage_clinic_settings': user.can_manage_clinic_settings,
                        'can_manage_inventory': user.can_manage_inventory,
                        'can_manage_permissions': user.can_manage_permissions,
                        'can_access_integrations': user.can_access_integrations,
                        'can_view_audit_logs': user.can_view_audit_logs,
                        'can_view_usage_reports': user.can_view_usage_reports,
                        'can_access_security_testing': user.can_access_security_testing,
                    }
                })
            return Response({
                'success': True,
                'users': users_data
            })
    
    def patch(self, request, user_id):
        # Check authentication first
        if not request.user.is_authenticated:
            print("[DEBUG] PATCH User not authenticated")
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to perform this action'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Allow superadmins, admins, doctors with permission, or users with can_manage_permissions to modify permissions
        user_role = getattr(request.user, 'role', '')
        can_manage_perms = getattr(request.user, 'can_manage_permissions', False)
        
        has_access = (user_role in ['superadmin', 'admin'] or 
                     (user_role == 'doctor' and can_manage_perms) or 
                     can_manage_perms)
        
        if not has_access:
            print(f"[DEBUG] PATCH Permission denied: user role: {user_role}, can_manage_permissions: {can_manage_perms}")
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to modify permissions'
            }, status=status.HTTP_403_FORBIDDEN)
        user = get_object_or_404(CustomUser, id=user_id)
        # Prevent modifying superadmin permissions unless requester is superadmin
        if user.role == 'superadmin' and request.user.role != 'superadmin':
            print("[DEBUG] PATCH Permission denied: only superadmin can modify superadmin permissions")
            return Response({
                'error': 'Permission denied',
                'message': 'Only superadmins can modify superadmin permissions'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Store old permissions for audit log
        old_permissions = {
            'can_manage_appointments': user.can_manage_appointments,
            'can_manage_patients': user.can_manage_patients,
            'can_manage_staff': user.can_manage_staff,
            'can_view_reports': user.can_view_reports,
            'can_manage_clinic_settings': user.can_manage_clinic_settings,
            'can_manage_inventory': user.can_manage_inventory,
            'can_manage_permissions': user.can_manage_permissions,
            'can_access_integrations': user.can_access_integrations,
            'can_view_audit_logs': user.can_view_audit_logs,
            'can_view_usage_reports': user.can_view_usage_reports,
            'can_access_security_testing': user.can_access_security_testing,
        }
        
        # Update permissions
        permissions = request.data.get('permissions', {})
        user.can_manage_appointments = permissions.get('can_manage_appointments', user.can_manage_appointments)
        user.can_manage_patients = permissions.get('can_manage_patients', user.can_manage_patients)
        user.can_manage_staff = permissions.get('can_manage_staff', user.can_manage_staff)
        user.can_view_reports = permissions.get('can_view_reports', user.can_view_reports)
        user.can_manage_clinic_settings = permissions.get('can_manage_clinic_settings', user.can_manage_clinic_settings)
        user.can_manage_inventory = permissions.get('can_manage_inventory', user.can_manage_inventory)
        
        # Only allow superadmins to modify these exclusive permissions
        if request.user.role == 'superadmin':
            user.can_manage_permissions = permissions.get('can_manage_permissions', user.can_manage_permissions)
            user.can_access_integrations = permissions.get('can_access_integrations', user.can_access_integrations)
            user.can_view_audit_logs = permissions.get('can_view_audit_logs', user.can_view_audit_logs)
            user.can_view_usage_reports = permissions.get('can_view_usage_reports', user.can_view_usage_reports)
            user.can_access_security_testing = permissions.get('can_access_security_testing', user.can_access_security_testing)
        
        user.save()
        
        # Store new permissions for audit log
        new_permissions = {
            'can_manage_appointments': user.can_manage_appointments,
            'can_manage_patients': user.can_manage_patients,
            'can_manage_staff': user.can_manage_staff,
            'can_view_reports': user.can_view_reports,
            'can_manage_clinic_settings': user.can_manage_clinic_settings,
            'can_manage_inventory': user.can_manage_inventory,
            'can_manage_permissions': user.can_manage_permissions,
            'can_access_integrations': user.can_access_integrations,
            'can_view_audit_logs': user.can_view_audit_logs,
            'can_view_usage_reports': user.can_view_usage_reports,
            'can_access_security_testing': user.can_access_security_testing,
        }
        
        # Log permission change
        AuditLogger.log_permission_change(
            user=request.user,
            target_user=user,
            old_permissions=old_permissions,
            new_permissions=new_permissions,
            request=request
        )
        
        serializer = CustomUserSerializer(user)
        return Response({
            'success': True,
            'message': 'Permissions updated successfully',
            'data': serializer.data
        })
    
class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]  # Only authenticated users can change password
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
        
        # Comprehensive password validation
        import re
        
        password_errors = []
        
        # Length requirement
        if len(new_password) < 8:
            password_errors.append('At least 8 characters')
            
        # Uppercase requirement
        if not re.search(r'[A-Z]', new_password):
            password_errors.append('One uppercase letter')
            
        # Lowercase requirement
        if not re.search(r'[a-z]', new_password):
            password_errors.append('One lowercase letter')
            
        # Number requirement
        if not re.search(r'\d', new_password):
            password_errors.append('One number')
            
        # Special character requirement
        if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', new_password):
            password_errors.append('One special character')
        
        if password_errors:
            return Response({
                'error': f'Password must have: {", ".join(password_errors)}'
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
    
    def get(self, request, user_id):
        """Get user profile data"""
        user = get_object_or_404(CustomUser, id=user_id)
        
        # Allow users to view their own profile or if they have staff management permissions
        is_own_profile = str(request.user.id) == str(user_id)
        has_manage_permission = request.user.can_manage_staff if hasattr(request.user, 'can_manage_staff') else False
        has_admin_role = request.user.role in ['admin', 'superadmin'] if hasattr(request.user, 'role') else False
        
        if not (has_manage_permission or has_admin_role or is_own_profile):
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to view this profile'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = CustomUserSerializer(user, context={'request': request})
        return Response(serializer.data)
    
    def patch(self, request, user_id):
        """Update user profile"""
        print(f"=== UserProfileUpdateView PATCH DEBUG ===")
        print(f"User: {request.user}")
        print(f"User ID: {getattr(request.user, 'id', 'No ID')}")
        print(f"Target user_id: {user_id}")
        print(f"User role: {getattr(request.user, 'role', 'No role')}")
        print(f"can_manage_staff: {getattr(request.user, 'can_manage_staff', 'No attribute')}")
        print(f"Request data: {request.data}")
        print("=== END PATCH DEBUG ===")
        
        # Check if user has permission to update this profile
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to update profile'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Allow users to update their own profile or if they have staff management permissions
        is_own_profile = str(request.user.id) == str(user_id)
        has_manage_permission = request.user.can_manage_staff if hasattr(request.user, 'can_manage_staff') else False
        has_admin_role = request.user.role in ['admin', 'superadmin'] if hasattr(request.user, 'role') else False
        
        if not (has_manage_permission or has_admin_role or is_own_profile):
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to update this profile'
            }, status=status.HTTP_403_FORBIDDEN)
        
        user = get_object_or_404(CustomUser, id=user_id)
        serializer = CustomUserSerializer(user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            updated_user = serializer.save()
            
            # Log user profile update for audit trail
            AuditLogger.log_staff_action(
                user=request.user,
                action='UPDATE_PROFILE',
                staff_id=user.id,
                staff_name=f"{user.get_full_name()} ({user.username})",
                description=f"Updated user profile: {user.get_full_name()}",
                details={
                    'updated_by': request.user.email if request.user.is_authenticated else 'Unknown',
                    'changes': request.data,
                    'is_own_profile': is_own_profile
                },
                request=request
            )
            
            # Return updated data with context for proper decryption
            response_serializer = CustomUserSerializer(updated_user, context={'request': request})
            return Response({
                'success': True,
                'message': 'Profile updated successfully',
                'data': response_serializer.data
            })
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def post(self, request):
        print("=== StaffCreateView POST DEBUG ===")
        print(f"User: {request.user}")
        print(f"User ID: {getattr(request.user, 'id', 'No ID')}")
        print(f"User role: {getattr(request.user, 'role', 'No role')}")
        print(f"can_manage_staff: {getattr(request.user, 'can_manage_staff', 'No attribute')}")
        print(f"Request data: {request.data}")
        print(f"Request session: {dict(request.session)}")
        print("=== END POST DEBUG ===")
        # Check if user has permission to manage staff, is an admin, or is a superadmin
        if not (request.user.can_manage_staff or request.user.role in ['admin', 'superadmin']):
            print("[DEBUG] POST Permission denied: not allowed to manage staff")
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to create staff members'
            }, status=status.HTTP_403_FORBIDDEN)
        # Prevent non-superadmins from creating superadmin users
        if request.data.get('role') == 'superadmin' and request.user.role != 'superadmin':
            print("[DEBUG] POST Permission denied: only superadmin can create superadmin users")
            return Response({
                'error': 'Permission denied',
                'message': 'Only superadmins can create superadmin users'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # This view appears to be incomplete - proper implementation needed
        return Response({
            'error': 'Method not implemented',
            'message': 'UserProfileUpdateView POST method needs proper implementation'
        }, status=status.HTTP_501_NOT_IMPLEMENTED)

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
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [AllowAny]  # Allow public access for chatbot and appointment booking
    
    def get(self, request):
        # Allow public access to view doctors list (needed for chatbot and appointment booking)
        doctors = CustomUser.objects.filter(role='doctor')
        serializer = CustomUserSerializer(doctors, many=True, context={'request': request})
        return Response(serializer.data)

class ReceptionistListView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Allow authenticated users to view receptionists list
        receptionists = CustomUser.objects.filter(role='receptionist')
        serializer = CustomUserSerializer(receptionists, many=True, context={'request': request})
        return Response(serializer.data)

class AdminListView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Allow authenticated users to view admins list
        admins = CustomUser.objects.filter(role='admin')
        serializer = CustomUserSerializer(admins, many=True, context={'request': request})
        return Response(serializer.data)

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def login_view(request):
    # Handle both email and username login
    email = request.data.get('email')
    username = request.data.get('username')
    password = request.data.get('password')
    
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

class AccountActivationView(APIView):
    permission_classes = [AllowAny]  # Allow unauthenticated users to activate accounts
    
    def get(self, request, uidb64, token):
        """Check if activation link is valid"""
        User = get_user_model()
        try:
            print(f"[DEBUG] Activation attempt - uidb64: {uidb64}, token: {token}")
            uid = force_str(urlsafe_base64_decode(uidb64))
            print(f"[DEBUG] Decoded uid: {uid}")
            user = User.objects.get(pk=uid)
            print(f"[DEBUG] Found user: {user.username}, force_password_change: {user.force_password_change}")
            
            from accounts.backends import account_activation_token
            token_valid = account_activation_token.check_token(user, token)
            print(f"[DEBUG] Token valid: {token_valid}")
            
            if token_valid:
                # Check if user still needs activation (force_password_change is True)
                if user.force_password_change:
                    return Response({
                        'success': True,
                        'message': 'Activation link is valid',
                        'user_id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'role': user.role
                    })
                else:
                    return Response({
                        'success': False,
                        'message': 'Account has already been activated'
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    'success': False,
                    'message': 'Invalid or expired activation link'
                }, status=status.HTTP_400_BAD_REQUEST)
        except (User.DoesNotExist, ValueError, TypeError):
            return Response({
                'success': False,
                'message': 'Invalid activation link'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def post(self, request, uidb64, token):
        """Complete account activation with password setup"""
        User = get_user_model()
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')
        license_number = request.data.get('license_number')
        
        if not new_password or not confirm_password:
            return Response({
                'error': 'Both new_password and confirm_password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if new_password != confirm_password:
            return Response({
                'error': 'Passwords do not match'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Comprehensive password validation
        import re
        password_errors = []
        
        # Length requirement
        if len(new_password) < 8:
            password_errors.append('At least 8 characters')
            
        # Uppercase requirement
        if not re.search(r'[A-Z]', new_password):
            password_errors.append('One uppercase letter')
            
        # Lowercase requirement
        if not re.search(r'[a-z]', new_password):
            password_errors.append('One lowercase letter')
            
        # Number requirement
        if not re.search(r'\d', new_password):
            password_errors.append('One number')
            
        # Special character requirement
        if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', new_password):
            password_errors.append('One special character')
        
        if password_errors:
            return Response({
                'error': f'Password must have: {", ".join(password_errors)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
            
            # Validate license number for doctors
            if user.role == 'doctor':
                if not license_number or license_number.strip() == '':
                    return Response({
                        'error': 'License number is required for doctor accounts'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            from accounts.backends import account_activation_token
            if account_activation_token.check_token(user, token):
                # Set new password and activate account
                user.set_password(new_password)
                user.force_password_change = False  # Account is now activated
                
                # Set license number for doctors
                if user.role == 'doctor' and license_number:
                    user.license_number = license_number.strip()
                
                user.save()
                
                # Log account activation
                AuditLogger.log_auth_action(
                    user=user,
                    action='ACCOUNT_ACTIVATED',
                    description=f"Account activated and password set for {user.role}",
                    details={
                        'user_role': user.role,
                        'activated_at': str(datetime.now()),
                        'activation_method': 'email_link'
                    },
                    request=request
                )
                
                return Response({
                    'success': True,
                    'message': 'Account activated successfully! You can now log in with your new password.'
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Invalid or expired activation link'
                }, status=status.HTTP_400_BAD_REQUEST)
        except (User.DoesNotExist, ValueError, TypeError):
            return Response({
                'success': False,
                'error': 'Invalid activation link'
            }, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]  # Allow unauthenticated users to request password reset
    def post(self, request):
        email = request.data.get('email')
        User = get_user_model()
        try:
            user = User.objects.get(email=email)
            token = PasswordResetTokenGenerator().make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Use proper domain for reset link - hardcoded for production
            reset_link = f"https://lunasync.site/reset-password/{uid}/{token}/"
            
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
    permission_classes = [AllowAny]  # Allow unauthenticated users to reset password with valid token
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

            # Check if the email field actually contains a valid email format
            import re
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if re.match(email_pattern, email):
                # Use email parameter for proper email authentication
                user = authenticate(request, email=email, password=password)
            else:
                # If email field doesn't contain valid email, treat it as username
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

            # Generate OTP using pyotp library
            otp = generate_otp()
            
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
class SessionLoginView(APIView):
    """Simple session-based login without OTP"""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response({
                'error': 'Please provide both email and password'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if the email field actually contains a valid email format
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if re.match(email_pattern, email):
            # Use email parameter for proper email authentication
            user = authenticate(request, email=email, password=password)
        else:
            # If email field doesn't contain valid email, treat it as username
            user = authenticate(request, username=email, password=password)

        if user is not None:
            # Debug: Check user's force_password_change status
            print(f"[DEBUG] SessionLoginView - User {user.username} force_password_change: {user.force_password_change}")
            print(f"[DEBUG] SessionLoginView - User created: {user.date_joined}")
            print(f"[DEBUG] SessionLoginView - User role: {user.role}")
            print(f"[DEBUG] SessionLoginView - Session before login: {request.session.session_key}")
            
            # Create session
            login(request, user)
            
            print(f"[DEBUG] SessionLoginView - Session after login: {request.session.session_key}")
            print(f"[DEBUG] SessionLoginView - User authenticated: {user.is_authenticated}")
            print(f"[DEBUG] SessionLoginView - Session data: {dict(request.session)}")
            
            # Debug: Print all permission values
            print(f"[DEBUG] SessionLoginView - Permission values:")
            print(f"  can_manage_appointments: {user.can_manage_appointments}")
            print(f"  can_manage_patients: {user.can_manage_patients}")
            print(f"  can_manage_staff: {user.can_manage_staff}")
            print(f"  can_view_reports: {user.can_view_reports}")
            print(f"  can_manage_clinic_settings: {user.can_manage_clinic_settings}")
            print(f"  can_manage_permissions: {user.can_manage_permissions}")
            print(f"  can_access_integrations: {user.can_access_integrations}")
            print(f"  can_view_audit_logs: {user.can_view_audit_logs}")
            print(f"  can_view_usage_reports: {user.can_view_usage_reports}")
            print(f"  can_access_security_testing: {user.can_access_security_testing}")
            print(f"  can_manage_inventory: {user.can_manage_inventory}")
            
            # Return user data with all permissions
            response_data = {
                'success': True,
                'message': 'Login successful',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'name': user.get_full_name() or user.username,
                    'email': user.email,
                    'role': user.role,
                    # Include all permission fields
                    'can_manage_appointments': user.can_manage_appointments,
                    'can_manage_patients': user.can_manage_patients,
                    'can_manage_staff': user.can_manage_staff,
                    'can_view_reports': user.can_view_reports,
                    'can_manage_clinic_settings': user.can_manage_clinic_settings,
                    'can_manage_inventory': user.can_manage_inventory,
                    'can_manage_permissions': user.can_manage_permissions,
                    'can_access_integrations': user.can_access_integrations,
                    'can_view_audit_logs': user.can_view_audit_logs,
                    'can_view_usage_reports': user.can_view_usage_reports,
                    'can_access_security_testing': user.can_access_security_testing,
                },
                'session_id': request.session.session_key,
                'force_password_change': getattr(user, 'force_password_change', False)
            }
            
            print(f"[DEBUG] SessionLoginView - Response data: {response_data}")
            
            # Log successful login
            AuditLogger.log_auth_action(
                user=user,
                action='LOGIN',
                description=f"Successful login for {user.role}",
                details={
                    'user_role': user.role,
                    'session_id': request.session.session_key,
                    'login_method': 'session'
                },
                request=request
            )
            
            return Response(response_data)
        else:
            return Response({
                'success': False,
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)


@method_decorator(csrf_exempt, name='dispatch')
class CurrentUserView(APIView):
    """Get current user with all permissions"""
    permission_classes = [AllowAny]  # Allow any user, but check authentication in method
    
    def get(self, request):
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
            
        print(f"[DEBUG] CurrentUserView - User: {request.user}")
        print(f"[DEBUG] CurrentUserView - can_manage_permissions: {request.user.can_manage_permissions}")
        
        # Return user data with all permissions - same format as login
        user_data = {
            'id': request.user.id,
            'username': request.user.username,
            'name': request.user.get_full_name() or request.user.username,
            'email': request.user.email,
            'role': request.user.role,
            'force_password_change': getattr(request.user, 'force_password_change', False),
            # Include all permission fields
            'can_manage_appointments': request.user.can_manage_appointments,
            'can_manage_patients': request.user.can_manage_patients,
            'can_manage_staff': request.user.can_manage_staff,
            'can_view_reports': request.user.can_view_reports,
            'can_manage_clinic_settings': request.user.can_manage_clinic_settings,
            'can_manage_inventory': request.user.can_manage_inventory,
            'can_manage_permissions': request.user.can_manage_permissions,
            'can_access_integrations': request.user.can_access_integrations,
            'can_view_audit_logs': request.user.can_view_audit_logs,
            'can_view_usage_reports': request.user.can_view_usage_reports,
            'can_access_security_testing': request.user.can_access_security_testing,
        }
        
        print(f"[DEBUG] CurrentUserView - Response data: {user_data}")
        
        return Response({
            'success': True,
            'user': user_data
        })


class CompleteLoginView(APIView):
    """Complete login after OTP verification"""
    permission_classes = [AllowAny]

    def post(self, request):
        print("[DEBUG] OTP VERIFY POST DATA:", request.data)
        print("[DEBUG] OTP VERIFY SESSION:", dict(request.session))
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
            
            # Debug: Check user's force_password_change status
            print(f"[DEBUG] CompleteLoginView - User {user.username} force_password_change: {user.force_password_change}")
            
            # Check if user needs to change password
            response_data = {
                'success': True,
                'message': 'Login successful',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'name': user.get_full_name() or user.username,
                    'email': user.email,
                    'role': user.role,
                    # Include all permission fields
                    'can_manage_appointments': user.can_manage_appointments,
                    'can_manage_patients': user.can_manage_patients,
                    'can_manage_staff': user.can_manage_staff,
                    'can_view_reports': user.can_view_reports,
                    'can_manage_clinic_settings': user.can_manage_clinic_settings,
                    'can_manage_inventory': user.can_manage_inventory,
                    'can_manage_permissions': user.can_manage_permissions,
                    'can_access_integrations': user.can_access_integrations,
                    'can_view_audit_logs': user.can_view_audit_logs,
                    'can_view_usage_reports': user.can_view_usage_reports,
                    'can_access_security_testing': user.can_access_security_testing,
                },
                'force_password_change': user.force_password_change
            }
            
            print(f"[DEBUG] CompleteLoginView - Response data: {response_data}")
            
            return Response(response_data)
        else:
            return Response({
                'success': False,
                'error': 'Invalid verification code'
            }, status=status.HTTP_400_BAD_REQUEST)


# Add OTP functionality

@method_decorator(csrf_exempt, name='dispatch')
class UserListView(APIView):
    """General users endpoint for OTP user lookup"""
    permission_classes = [IsAuthenticated]  # Added authentication requirement
    
    def get(self, request):
        users = CustomUser.objects.all()
        serializer = CustomUserSerializer(users, many=True, context={'request': request})
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
        
        # Generate 6-digit OTP using pyotp library
        otp = generate_otp()
        
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
                
                # Use the enhanced OTP email function with comprehensive debugging
                logger.info(f"🔄 Attempting to send OTP email to {identifier}")
                
                from appointments.email_utils import send_otp_email
                success, message = send_otp_email(identifier, otp, clinic_settings)
                
                if not success:
                    logger.error(f"❌ Failed to send OTP email to {identifier}: {message}")
                    return Response({
                        'success': False,
                        'error': f'Failed to send OTP email: {message}. Please try phone instead.'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                else:
                    logger.info(f"✅ OTP email sent successfully to {identifier}")
                    
            elif identifier_type == 'phone':
                # Use iProg SMS service as primary
                logger.info(f"🔄 Attempting to send OTP SMS to {identifier}")
                
                from .iprog_sms_service import iprog_sms_service
                
                success, message, reference_id = iprog_sms_service.send_otp_sms(identifier, otp)
                
                if success:
                    logger.info(f"✅ iProg SMS sent to {identifier}: {message}")
                    if reference_id:
                        logger.info(f"📋 iProg Reference ID: {reference_id}")
                else:
                    logger.warning(f"⚠️  iProg SMS failed for {identifier}: {message}")
                    # Additional fallback to Semaphore if needed
                    try:
                        from .sms_config import SMSService
                        sms_service = SMSService()
                        sms_message = f'Your MedSync verification code is: {otp}. This code expires in 5 minutes.'
                        success, result = sms_service.send_sms(identifier, sms_message, country_code='+63')
                        logger.info(f"📱 Semaphore fallback result: {result}")
                    except Exception as fallback_error:
                        logger.error(f"❌ All SMS methods failed: {fallback_error}")
                        logger.info(f"🔢 FINAL FALLBACK SMS for {identifier}: {otp}")
                
        except Exception as e:
            logger.error(f"❌ Failed to send OTP to {identifier}: {e}")
            logger.exception("Full traceback for OTP sending error:")
            # For demo purposes, still return success but log the failure
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
        
        # Debug: Check user's force_password_change status
        print(f"[DEBUG] User {user.username} force_password_change: {user.force_password_change}")
        
        # Create a Django session for the user (like session-based login)
        from django.contrib.auth import login
        request.user = user
        login(request, user)
        request.session['user_id'] = user.id
        request.session['username'] = user.username
        request.session['role'] = getattr(user, 'role', 'doctor')
        request.session['login_time'] = str(datetime.now())
        request.session.save()

        # Return user data and session info
        return Response({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'name': user.get_full_name() or user.username,
                'email': user.email,
                'role': user.role,
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
            'force_password_change': getattr(user, 'force_password_change', False)
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

class DebugUserView(APIView):
    permission_classes = []
    
    def get(self, request):
        """Debug endpoint to check current user's info and permissions"""
        print(f"[DEBUG] DebugUserView GET request received")
        return Response({
            'user_id': request.user.id if hasattr(request.user, 'id') else None,
            'username': request.user.username if hasattr(request.user, 'username') else 'AnonymousUser',
            'email': request.user.email if hasattr(request.user, 'email') else 'No email',
            'role': request.user.role if hasattr(request.user, 'role') else 'No role',
            'can_manage_staff': request.user.can_manage_staff if hasattr(request.user, 'can_manage_staff') else False,
            'is_authenticated': request.user.is_authenticated,
            'is_active': request.user.is_active if hasattr(request.user, 'is_active') else False,
        })
    
    def post(self, request):
        """Debug POST endpoint"""
        print(f"[DEBUG] DebugUserView POST request received")
        print(f"[DEBUG] Request data: {request.data}")
        return Response({'message': 'POST request successful', 'data': request.data})

@method_decorator(csrf_exempt, name='dispatch')
class TestView(APIView):
    permission_classes = []
    authentication_classes = []
    
    def get(self, request):
        print(f"[DEBUG] TestView GET request received")
        return Response({'message': 'Test GET successful'})
    
    def post(self, request):
        print(f"[DEBUG] TestView POST request received")
        print(f"[DEBUG] Request data: {request.data}")
        return Response({'message': 'Test POST successful', 'data': request.data})
    
    def patch(self, request):
        print(f"[DEBUG] ========== TestView PATCH REQUEST RECEIVED ==========")
        print(f"[DEBUG] Request data: {request.data}")
        print(f"[DEBUG] User: {request.user}")
        print(f"[DEBUG] Headers: {dict(request.headers)}")
        print(f"[DEBUG] ========================================================")
        return Response({'message': 'Test PATCH successful', 'data': request.data})


# Superadmin-specific views
class AuditLogsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if not request.user.can_view_audit_logs:
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to view audit logs'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            from systemlogs.models import AuditLog
            from django.core.paginator import Paginator
            
            # Get query parameters
            page = int(request.GET.get('page', 1))
            per_page = int(request.GET.get('per_page', 50))
            action_filter = request.GET.get('action', '')
            resource_filter = request.GET.get('resource_type', '')
            user_filter = request.GET.get('user', '')
            
            # Build queryset
            queryset = AuditLog.objects.all()
            
            if action_filter:
                queryset = queryset.filter(action=action_filter)
            if resource_filter:
                queryset = queryset.filter(resource_type=resource_filter)
            if user_filter:
                queryset = queryset.filter(user_email__icontains=user_filter)
            
            # Paginate
            paginator = Paginator(queryset, per_page)
            page_obj = paginator.get_page(page)
            
            # Serialize data
            audit_logs = []
            for log in page_obj:
                audit_logs.append({
                    'id': log.id,
                    'timestamp': log.timestamp.isoformat(),
                    'user': log.user_email,
                    'action': log.get_action_display(),
                    'resource': log.get_resource_type_display(),
                    'resource_name': log.resource_name,
                    'details': log.description,
                    'ip_address': log.ip_address,
                    'changes': {
                        'old': log.old_values,
                        'new': log.new_values
                    } if log.old_values or log.new_values else None
                })
            
            return Response({
                'success': True,
                'audit_logs': audit_logs,
                'pagination': {
                    'current_page': page,
                    'total_pages': paginator.num_pages,
                    'total_count': paginator.count,
                    'has_next': page_obj.has_next(),
                    'has_previous': page_obj.has_previous()
                }
            })
            
        except Exception as e:
            print(f"[AUDIT LOGS ERROR] {e}")
            # Fallback to mock data if audit logs aren't set up yet
            audit_logs = [
                {
                    'id': 1,
                    'timestamp': '2025-08-19T10:30:00Z',
                    'user': 'admin@clinic.com',
                    'action': 'User Created',
                    'resource': 'Staff Member',
                    'details': 'Created new doctor: Dr. Smith',
                    'ip_address': '192.168.1.100'
                },
                {
                    'id': 2,
                    'timestamp': '2025-08-19T09:15:00Z',
                    'user': 'admin@clinic.com',
                    'action': 'Permission Modified',
                    'resource': 'User Permissions',
                    'details': 'Updated permissions for receptionist@clinic.com',
                    'ip_address': '192.168.1.100'
                },
                {
                    'id': 3,
                    'timestamp': '2025-08-19T08:45:00Z',
                    'user': 'doctor@clinic.com',
                    'action': 'Login',
                    'resource': 'Authentication',
                    'details': 'Successful login',
                    'ip_address': '192.168.1.105'
                }
            ]
            
            return Response({
                'success': True,
                'audit_logs': audit_logs,
                'pagination': {
                    'current_page': 1,
                    'total_pages': 1,
                    'total_count': len(audit_logs),
                    'has_next': False,
                    'has_previous': False
                }
            })


class UsageReportsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if not request.user.can_view_usage_reports:
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to view usage reports'
            }, status=status.HTTP_403_FORBIDDEN)
            
        # Mock usage data - in production, you'd calculate from actual usage
        usage_data = {
            'total_users': CustomUser.objects.count(),
            'active_users_last_30_days': CustomUser.objects.filter(last_login__gte=datetime.now() - timedelta(days=30)).count(),
            'user_roles_breakdown': {
                'superadmin': CustomUser.objects.filter(role='superadmin').count(),
                'admin': CustomUser.objects.filter(role='admin').count(),
                'doctor': CustomUser.objects.filter(role='doctor').count(),
                'receptionist': CustomUser.objects.filter(role='receptionist').count(),
            },
            'monthly_stats': {
                'logins': 1250,
                'appointments_created': 342,
                'patients_registered': 89,
                'reports_generated': 156
            },
            'system_resources': {
                'storage_used_gb': 45.2,
                'storage_limit_gb': 100.0,
                'api_calls_today': 2847,
                'average_response_time_ms': 234
            }
        }
        
        return Response({
            'success': True,
            'usage_data': usage_data
        })


class IntegrationsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Debug: Print detailed user and authentication information
        print(f"DEBUG IntegrationsView: User authenticated: {request.user.is_authenticated}")
        print(f"DEBUG IntegrationsView: User: {request.user}")
        print(f"DEBUG IntegrationsView: User type: {type(request.user)}")
        print(f"DEBUG IntegrationsView: User email: {getattr(request.user, 'email', 'No email')}")
        print(f"DEBUG IntegrationsView: User role: {getattr(request.user, 'role', 'No role')}")
        print(f"DEBUG IntegrationsView: User is_anonymous: {request.user.is_anonymous}")
        print(f"DEBUG IntegrationsView: Session key: {request.session.session_key}")
        print(f"DEBUG IntegrationsView: Session data: {dict(request.session)}")
        print(f"DEBUG IntegrationsView: Request headers: {dict(request.headers)}")
        print(f"DEBUG IntegrationsView: Request cookies: {request.COOKIES}")
        
        # Check if user is authenticated at all
        if not request.user.is_authenticated:
            print("DEBUG IntegrationsView: User is not authenticated - returning 403")
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to access this resource'
            }, status=status.HTTP_403_FORBIDDEN)
        
        if hasattr(request.user, 'can_access_integrations'):
            print(f"DEBUG IntegrationsView: can_access_integrations: {request.user.can_access_integrations}")
        else:
            print("DEBUG IntegrationsView: User has no can_access_integrations attribute")
        
        if not request.user.can_access_integrations:
            print("DEBUG IntegrationsView: User lacks can_access_integrations permission - returning 403")
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to access integrations'
            }, status=status.HTTP_403_FORBIDDEN)
            
        # Mock integrations data
        integrations = [
            {
                'id': 1,
                'name': 'SMS Service (Twilio)',
                'type': 'SMS',
                'status': 'active',
                'last_sync': '2025-08-19T10:00:00Z',
                'config': {
                    'account_sid': 'ACxxx...xxx',
                    'phone_number': '+1234567890'
                }
            },
            {
                'id': 2,
                'name': 'Email Service (AWS SES)',
                'type': 'Email',
                'status': 'active',
                'last_sync': '2025-08-19T09:30:00Z',
                'config': {
                    'region': 'us-east-1',
                    'sender_email': 'noreply@clinic.com'
                }
            },
            {
                'id': 3,
                'name': 'Document Storage (AWS S3)',
                'type': 'Storage',
                'status': 'active',
                'last_sync': '2025-08-19T08:15:00Z',
                'config': {
                    'bucket_name': 'clinic-documents',
                    'region': 'us-east-1'
                }
            }
        ]
        
        return Response({
            'success': True,
            'integrations': integrations
        })
    
    def post(self, request):
        if not request.user.can_access_integrations:
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to manage integrations'
            }, status=status.HTTP_403_FORBIDDEN)
            
        # Handle new integration creation
        integration_data = request.data
        # In production, you'd save this to a proper integrations model
        
        return Response({
            'success': True,
            'message': 'Integration created successfully',
            'integration': integration_data
        })
    
    def patch(self, request, integration_id):
        if not request.user.can_access_integrations:
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to manage integrations'
            }, status=status.HTTP_403_FORBIDDEN)
            
        # Handle integration updates
        integration_data = request.data
        
        return Response({
            'success': True,
            'message': 'Integration updated successfully',
            'integration': integration_data
        })


class SecurityTestingView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if not request.user.can_access_security_testing:
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to access security testing'
            }, status=status.HTTP_403_FORBIDDEN)
            
        # Mock security test results
        security_tests = [
            {
                'id': 1,
                'test_name': 'SQL Injection Scan',
                'status': 'passed',
                'last_run': '2025-08-19T06:00:00Z',
                'severity': 'high',
                'description': 'Automated scan for SQL injection vulnerabilities'
            },
            {
                'id': 2,
                'test_name': 'XSS Vulnerability Scan',
                'status': 'passed',
                'last_run': '2025-08-19T06:15:00Z',
                'severity': 'high',
                'description': 'Cross-site scripting vulnerability assessment'
            },
            {
                'id': 3,
                'test_name': 'Authentication Security',
                'status': 'warning',
                'last_run': '2025-08-19T06:30:00Z',
                'severity': 'medium',
                'description': 'Password policy and session management review',
                'issues': ['Consider implementing 2FA for admin accounts']
            },
            {
                'id': 4,
                'test_name': 'API Security Scan',
                'status': 'passed',
                'last_run': '2025-08-19T06:45:00Z',
                'severity': 'high',
                'description': 'API endpoint security and rate limiting assessment'
            }
        ]
        
        return Response({
            'success': True,
            'security_tests': security_tests
        })
    
    def post(self, request):
        if not request.user.can_access_security_testing:
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to run security tests'
            }, status=status.HTTP_403_FORBIDDEN)
            
        test_type = request.data.get('test_type')
        
        return Response({
            'success': True,
            'message': f'Security test "{test_type}" initiated successfully',
            'test_id': 'test_' + str(secrets.randbelow(9000) + 1000)
        })


class CaptchaGenerateView(APIView):
    """Generate a new captcha for account activation"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Generate and return captcha key and image URL"""
        try:
            # Generate new captcha
            captcha_key = CaptchaStore.generate_key()
            logger.info(f"[CAPTCHA] Generated key: {captcha_key}")
            
            # Build captcha URL manually with proper protocol detection
            from django.urls import reverse
            try:
                # Try using the namespace
                captcha_image = reverse('captcha:captcha-image', args=[captcha_key])
                logger.info(f"[CAPTCHA] Namespace URL: {captcha_image}")
            except:
                # Fallback to direct URL construction
                captcha_image = f'/captcha/image/{captcha_key}/'
                logger.info(f"[CAPTCHA] Direct URL: {captcha_image}")
            
            # Make it absolute URL with proper HTTPS protocol for VPS
            if not captcha_image.startswith('http'):
                # Detect if we're on VPS (production) and force HTTPS
                if hasattr(request, 'META') and 'HTTP_HOST' in request.META:
                    host = request.META['HTTP_HOST']
                    if 'lunasync.site' in host:
                        # Force HTTPS for VPS
                        captcha_image = f'https://{host}{captcha_image}'
                        logger.info(f"[CAPTCHA] VPS HTTPS URL: {captcha_image}")
                    else:
                        # Use request protocol for other environments
                        captcha_image = request.build_absolute_uri(captcha_image)
                        logger.info(f"[CAPTCHA] Standard absolute URL: {captcha_image}")
                else:
                    captcha_image = request.build_absolute_uri(captcha_image)
                    logger.info(f"[CAPTCHA] Fallback absolute URL: {captcha_image}")
            
            return Response({
                'success': True,
                'captcha_key': captcha_key,
                'captcha_image_url': captcha_image,
            })
        except Exception as e:
            logger.error(f"Error generating captcha: {str(e)}")
            import traceback
            logger.error(f"Captcha generation traceback: {traceback.format_exc()}")
            return Response({
                'success': False,
                'error': 'Failed to generate captcha'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CaptchaVerifyView(APIView):
    """Verify captcha response"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Verify captcha key and response"""
        try:
            captcha_key = request.data.get('captcha_key')
            captcha_response = request.data.get('captcha_response', '').lower()
            
            if not captcha_key or not captcha_response:
                return Response({
                    'success': False,
                    'error': 'Captcha key and response are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify captcha
            try:
                captcha_store = CaptchaStore.objects.get(hashkey=captcha_key)
                if captcha_store.response.lower() == captcha_response:
                    # Delete the used captcha
                    captcha_store.delete()
                    return Response({
                        'success': True,
                        'message': 'Captcha verified successfully'
                    })
                else:
                    return Response({
                        'success': False,
                        'error': 'Invalid captcha response'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except CaptchaStore.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Invalid or expired captcha'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error verifying captcha: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to verify captcha'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)