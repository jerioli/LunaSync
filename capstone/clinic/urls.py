from django.urls import path
from .views import ClinicBrandingView

urlpatterns = [
    path('branding/', ClinicBrandingView.as_view(), name='clinic-branding'),
] 