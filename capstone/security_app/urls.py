from django.urls import path
from .views import SecurityStatusAPIView

urlpatterns = [
    path('api/security-status/', SecurityStatusAPIView.as_view(), name='security-status'),
]
