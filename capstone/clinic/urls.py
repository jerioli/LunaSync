from django.urls import path
from .views import ClinicBrandingView, ReviewCreateView, FAQListView
from .views_new import CurrentClinicView, CurrentDoctorView

urlpatterns = [
    path('', ClinicBrandingView.as_view(), name='clinic-settings'),
    path('reviews/', ReviewCreateView.as_view(), name='review-create'),
    path('faqs/', FAQListView.as_view(), name='faq-list'),
    path('current/', CurrentClinicView.as_view(), name='current-clinic'),
] 