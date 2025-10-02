from django.urls import path
from .views import ClinicBrandingView, ReviewCreateView
from .views_new import CurrentClinicView, CurrentDoctorView

urlpatterns = [
    path('', ClinicBrandingView.as_view(), name='clinic-settings'),
    path('reviews/', ReviewCreateView.as_view(), name='review-create'),
    path('current/', CurrentClinicView.as_view(), name='current-clinic'),
] 