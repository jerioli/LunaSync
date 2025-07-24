from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import ClinicSettings, FAQ, Review
from .serializers import ClinicSettingsSerializer, ReviewSerializer
from django.core.mail import send_mail, EmailMessage
from django.conf import settings

class ClinicBrandingView(APIView):
    def get(self, request):
        settings = ClinicSettings.objects.first()
        serializer = ClinicSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request):
        settings = ClinicSettings.objects.first()
        data = request.data.copy()
        faqs_data = data.pop('faqs', [])
        reviews_data = data.pop('reviews', [])
        serializer = ClinicSettingsSerializer(settings, data=data, partial=True)
        if serializer.is_valid():
            instance = serializer.save()
            # Update FAQs
            if faqs_data is not None:
                instance.faqs.all().delete()
                for faq in faqs_data:
                    if faq.get('question', '').strip() and faq.get('answer', '').strip():
                        FAQ.objects.create(clinic=instance, **faq)
            # Update Reviews
            if reviews_data is not None:
                instance.reviews.all().delete()
                for review in reviews_data:
                    Review.objects.create(clinic=instance, **review)
            # Return updated data
            return Response(ClinicSettingsSerializer(instance).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ReviewCreateView(APIView):
    def get(self, request):
        """
        GET: Retrieve all clinic reviews
        """
        reviews = Review.objects.all().order_by('-id')  # Order by most recent (highest ID first)
        serializer = ReviewSerializer(reviews, many=True)
        return Response(serializer.data)

    def post(self, request):
        clinic_settings = ClinicSettings.objects.first()
        data = request.data.copy()
        data['clinic'] = clinic_settings.id
        serializer = ReviewSerializer(data=data)
        if serializer.is_valid():
            review = serializer.save(clinic=clinic_settings)
            # Send email to DEFAULT_FROM_EMAIL, reply-to patient
            subject = f"New Patient Review from {review.name}"
            message = review.comment
            from django.conf import settings as django_settings
            from_email = django_settings.DEFAULT_FROM_EMAIL
            to_email = [django_settings.DEFAULT_FROM_EMAIL]  # Always send to your Gmail
            reply_to = [getattr(review, 'email', '')] if getattr(review, 'email', '') else None
            email = EmailMessage(
                subject=subject,
                body=message,
                from_email=from_email,
                to=to_email,
                reply_to=reply_to if reply_to else None,
            )
            email.send(fail_silently=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST) 