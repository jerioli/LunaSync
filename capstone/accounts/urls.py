from django.urls import path
from accounts.views import (
    StaffCreateView, DoctorListView, ReceptionistListView, AdminListView, 
    StaffLoginView, PasswordResetRequestView, PasswordResetConfirmView,
    PasswordChangeView, UserProfileUpdateView, UserPreferencesView
)

urlpatterns = [
    path('staff/', StaffCreateView.as_view(), name='create-staff'),  # Matches /api/staff/
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
]