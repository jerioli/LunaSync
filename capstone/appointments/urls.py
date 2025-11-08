from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AppointmentCreateView, AppointmentListView, AppointmentApproveView, AppointmentUpdateStatusView, AvailableTimeSlotsView, AppointmentDeleteView

urlpatterns = [
    path('create/', AppointmentCreateView.as_view(), name='appointment-create'),
    path('list/', AppointmentListView.as_view(), name='appointment-list'),
    path('', AppointmentListView.as_view(), name='appointment-list-root'),  # Alternative root endpoint
    path('upcoming/', AppointmentListView.as_view(), {'status': 'upcoming'}, name='appointment-upcoming'),
    path('pending/', AppointmentListView.as_view(), {'status': 'pending'}, name='appointment-pending'),
    path('approve/<int:appointment_id>/', AppointmentApproveView.as_view(), name='appointment-approve'),
    path('update-status/<int:appointment_id>/', AppointmentUpdateStatusView.as_view(), name='appointment-update-status'),
    path('delete/<int:appointment_id>/', AppointmentDeleteView.as_view(), name='appointment-delete'),
    path('available-slots/', AvailableTimeSlotsView.as_view(), name='available-time-slots'),
]