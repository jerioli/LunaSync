from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DoctorAvailabilityViewSet, PredefinedTimeSlotViewSet

router = DefaultRouter()
router.register('predefined_slots', PredefinedTimeSlotViewSet, basename='predefined_slots')
router.register('', DoctorAvailabilityViewSet, basename='availability')

urlpatterns = [
    path('', include(router.urls)),
    path('time-slots/', DoctorAvailabilityViewSet.as_view({'get': 'time_slots'}), name='time-slots'),
    path('available_dates/', DoctorAvailabilityViewSet.as_view({'get': 'available_dates'}), name='available-dates'),
    path('available_times/', DoctorAvailabilityViewSet.as_view({'get': 'available_times'}), name='available-times')
]  