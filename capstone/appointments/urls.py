from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AppointmentCreateView, AppointmentListView, AppointmentApproveView, AppointmentUpdateStatusView

urlpatterns = [
    path('create/', AppointmentCreateView.as_view(), name='appointment-create'),
    path('list/', AppointmentListView.as_view(), name='appointment-list'),
    path('approve/<int:appointment_id>/', AppointmentApproveView.as_view(), name='appointment-approve'),
    path('update-status/<int:appointment_id>/', AppointmentUpdateStatusView.as_view(), name='appointment-update-status'),
]