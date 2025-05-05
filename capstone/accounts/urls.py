from django.urls import path
from accounts.views import StaffCreateView

urlpatterns = [
    path('staff/', StaffCreateView.as_view(), name='create-staff'),  # Matches /api/staff/
]