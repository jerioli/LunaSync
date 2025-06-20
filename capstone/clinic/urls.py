from django.urls import path
from .views import ClinicBrandingView, ReviewCreateView

urlpatterns = [
    path('', ClinicBrandingView.as_view(), name='clinic-settings'),
    path('reviews/', ReviewCreateView.as_view(), name='review-create'),
] 