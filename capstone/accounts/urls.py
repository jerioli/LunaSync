from django.urls import path
from accounts.views import StaffCreateView, DoctorListView, StaffLoginView, PasswordResetRequestView, PasswordResetConfirmView

urlpatterns = [
    path('staff/', StaffCreateView.as_view(), name='create-staff'),  # Matches /api/staff/
    path('doctors/', DoctorListView.as_view(), name='doctor-list'),  # Matches /api/doctors/
    path('staff/create/', StaffCreateView.as_view(), name='staff-create'),
    path('staff/login/', StaffLoginView.as_view(), name='staff-login'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset-confirm/<uidb64>/<token>/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]