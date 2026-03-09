from django.urls import path
from accounts.views import (
    StaffCreateView, DoctorListView, ReceptionistListView, AdminListView, 
    StaffLoginView, CompleteLoginView, PasswordResetRequestView, PasswordResetConfirmView,
    PasswordChangeView, UserProfileUpdateView, UserPreferencesView, Toggle2FAView,
    StaffDetailView, StaffReactivateView, StaffPermissionsView, UserListView, SendOTPView, VerifyOTPView,
    ResetPasswordOTPView, login_view, DebugUserView, TestView,  # Import the debug and test views
    AuditLogsView,  # Superadmin views
    CurrentUserView, AccountActivationView,  # Add account activation view
    CaptchaGenerateView, CaptchaVerifyView  # Add captcha views
)
from accounts.bulk_patient_staff_views import (
    BulkPatientUploadView, BulkStaffUploadView, BulkImportTemplateView,
    BulkPatientDeleteView, BulkStaffDeleteView
)
from accounts.session_views import (
    SessionLoginView, SessionStatusView, SessionLogoutView, SessionValidationView, SessionOTPVerifyView
)


urlpatterns = [
    path('staff/', StaffCreateView.as_view(), name='create-staff'),  # Matches /api/staff/
    path('staff/list/', UserListView.as_view(), name='staff-list'),  # Matches /api/staff/list/
    path('staff/<int:user_id>/', StaffDetailView.as_view(), name='staff-detail'),
    path('staff/<int:user_id>/reactivate/', StaffReactivateView.as_view(), name='staff-reactivate'),
    path('staff/<int:user_id>/permissions/', StaffPermissionsView.as_view(), name='staff-permissions'),
    path('permissions/', StaffPermissionsView.as_view(), name='permissions-list'),  # GET all permissions
    path('permissions/<int:user_id>/', StaffPermissionsView.as_view(), name='user-permissions'),  # GET/PATCH user permissions
    
    # Current user endpoint
    path('auth/current-user/', CurrentUserView.as_view(), name='current-user'),
    
    path('doctors/', DoctorListView.as_view(), name='doctor-list'),  # Matches /api/doctors/
    path('doctors/current/', CurrentUserView.as_view(), name='current-doctor'),  # Matches /api/doctors/current/
    path('receptionists/', ReceptionistListView.as_view(), name='receptionist-list'),  # Matches /api/receptionists/
    path('admins/', AdminListView.as_view(), name='admin-list'),  # Matches /api/admins/
    
    # Superadmin specific endpoints
    path('audit-logs/', AuditLogsView.as_view(), name='audit-logs'),
    path('staff/create/', StaffCreateView.as_view(), name='staff-create'),
    path('staff/login/', StaffLoginView.as_view(), name='staff-login'),
    path('auth/complete-login/', CompleteLoginView.as_view(), name='complete-login'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset-confirm/<uidb64>/<token>/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    
    # Account activation endpoints
    path('activate/<uidb64>/<token>/', AccountActivationView.as_view(), name='account-activation'),
    
    # Captcha endpoints
    path('captcha/generate/', CaptchaGenerateView.as_view(), name='captcha-generate'),
    path('captcha/verify/', CaptchaVerifyView.as_view(), name='captcha-verify'),
    
    # User settings endpoints
    path('auth/change-password/', PasswordChangeView.as_view(), name='change-password'),
    path('auth/toggle-2fa/', Toggle2FAView.as_view(), name='toggle-2fa'),
    path('users/<int:user_id>/', UserProfileUpdateView.as_view(), name='user-profile-update'),
    path('users/<int:user_id>/preferences/', UserPreferencesView.as_view(), name='user-preferences'),
    
    # General users endpoint for OTP lookup
    path('users/', UserListView.as_view(), name='user-list'),  # Matches /api/users/
    
    # OTP Authentication endpoints
    path('auth/send-otp/', SendOTPView.as_view(), name='send-otp'),  # Matches /api/auth/send-otp/
    path('auth/verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),  # Matches /api/auth/verify-otp/
    path('auth/reset-password-otp/', ResetPasswordOTPView.as_view(), name='reset-password-otp'),  # Matches /api/auth/reset-password-otp/
    
    # Session Management endpoints
    path('auth/session-login/', SessionLoginView.as_view(), name='session-login'),
    path('auth/session-verify-otp/', SessionOTPVerifyView.as_view(), name='session-verify-otp'),
    path('auth/session-status/', SessionStatusView.as_view(), name='session-status'),
    path('auth/session-logout/', SessionLogoutView.as_view(), name='session-logout'),
    path('auth/session-validate/', SessionValidationView.as_view(), name='session-validate'),
    path('login/', login_view, name='login'),  # Backwards compatibility
    
    # Debug endpoint
    path('debug/user/', DebugUserView.as_view(), name='debug-user'),
    path('test/', TestView.as_view(), name='test-view'),
    
    # Bulk operations endpoints
    path('bulk/patients/upload/', BulkPatientUploadView.as_view(), name='bulk-patient-upload'),  # CSV/Excel upload
    path('bulk/staff/upload/', BulkStaffUploadView.as_view(), name='bulk-staff-upload'),  # CSV/Excel upload
    path('bulk/patients/delete/', BulkPatientDeleteView.as_view(), name='bulk-patient-delete'),  # Bulk delete patients
    path('bulk/staff/delete/', BulkStaffDeleteView.as_view(), name='bulk-staff-delete'),  # Bulk delete staff
    path('bulk/template/<str:template_type>/', BulkImportTemplateView.as_view(), name='bulk-template'),  # Download templates
]