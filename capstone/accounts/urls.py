from django.urls import path
from accounts.views import (
    StaffCreateView, DoctorListView, ReceptionistListView, AdminListView, 
    StaffLoginView, PasswordResetRequestView, PasswordResetConfirmView,
    PasswordChangeView, UserProfileUpdateView, UserPreferencesView,
    StaffDetailView, StaffPermissionsView, UserListView, SendOTPView, VerifyOTPView
)
from accounts.bulk_patient_staff_views import BulkPatientUploadView, BulkStaffUploadView, BulkImportTemplateView
from accounts.test_auth_views import TestAuthView

urlpatterns = [
    path('staff/', StaffCreateView.as_view(), name='create-staff'),  # Matches /api/staff/
    path('staff/<int:user_id>/', StaffDetailView.as_view(), name='staff-detail'),
    path('staff/<int:user_id>/permissions/', StaffPermissionsView.as_view(), name='staff-permissions'),
    path('doctors/', DoctorListView.as_view(), name='doctor-list'),  # Matches /api/doctors/
    path('receptionists/', ReceptionistListView.as_view(), name='receptionist-list'),  # Matches /api/receptionists/
    path('admins/', AdminListView.as_view(), name='admin-list'),  # Matches /api/admins/
    path('staff/create/', StaffCreateView.as_view(), name='staff-create'),
    path('staff/login/', StaffLoginView.as_view(), name='staff-login'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset-confirm/<uidb64>/<token>/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    
    # User settings endpoints
    path('auth/change-password/', PasswordChangeView.as_view(), name='change-password'),
    path('users/<int:user_id>/', UserProfileUpdateView.as_view(), name='user-profile-update'),
    path('users/<int:user_id>/preferences/', UserPreferencesView.as_view(), name='user-preferences'),
    
    # General users endpoint for OTP lookup
    path('users/', UserListView.as_view(), name='user-list'),  # Matches /api/users/
    
    # OTP Authentication endpoints
    path('auth/send-otp/', SendOTPView.as_view(), name='send-otp'),  # Matches /api/auth/send-otp/
    path('auth/verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),  # Matches /api/auth/verify-otp/
    
    # Test authentication endpoint
    path('auth/test/', TestAuthView.as_view(), name='test-auth'),  # Test JWT authentication
    
    # Bulk operations endpoints
    path('bulk/patients/upload/', BulkPatientUploadView.as_view(), name='bulk-patient-upload'),  # CSV/Excel upload
    path('bulk/staff/upload/', BulkStaffUploadView.as_view(), name='bulk-staff-upload'),  # CSV/Excel upload
    path('bulk/template/<str:template_type>/', BulkImportTemplateView.as_view(), name='bulk-template'),  # Download templates
]