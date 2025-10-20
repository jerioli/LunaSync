from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import ClinicSettings, FAQ, Review
from .serializers import ClinicSettingsSerializer, ReviewSerializer
from django.core.mail import send_mail, EmailMessage, EmailMultiAlternatives
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class CurrentClinicView(APIView):
    permission_classes = [AllowAny]  # Allow any user to access clinic info
    
    def get(self, request):
        clinic_settings = ClinicSettings.objects.first()
        if clinic_settings:
            serializer = ClinicSettingsSerializer(clinic_settings)
            return Response(serializer.data)
        return Response({'error': 'No clinic found'}, status=status.HTTP_404_NOT_FOUND)

@method_decorator(csrf_exempt, name='dispatch')
class CurrentDoctorView(APIView):
    permission_classes = [AllowAny]  # Allow any user, but check authentication in method
    
    def get(self, request):
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
            
        # Return current user data regardless of role
        return Response({
            'id': request.user.id,
            'name': f"{request.user.first_name} {request.user.last_name}",
            'email': request.user.email,
            'role': request.user.role
        })

class ClinicBrandingView(APIView):
    def get(self, request):
        clinic_settings = ClinicSettings.objects.first()
        serializer = ClinicSettingsSerializer(clinic_settings)
        return Response(serializer.data)

    def put(self, request):
        clinic_settings = ClinicSettings.objects.first()
        data = request.data.copy()
        faqs_data = data.pop('faqs', [])
        reviews_data = data.pop('reviews', [])
        serializer = ClinicSettingsSerializer(clinic_settings, data=data, partial=True)
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
    def send_review_email(self, review_data):
        """Send HTML email notification for new review"""
        try:
            # Get clinic settings from database for email configuration
            clinic = ClinicSettings.objects.first()
            if clinic and clinic.email:
                clinic_email = clinic.email  # Use clinic's configured email as sender
                clinic_name = clinic.clinic_name or 'Clinic'
            else:
                # Fallback to Django settings if no clinic email is configured
                clinic_email = getattr(settings, 'EMAIL_HOST_USER', settings.DEFAULT_FROM_EMAIL)
                clinic_name = 'Clinic'
            
            print(f"Sending review notification TO: {clinic_email}")
            print(f"Using clinic email AS SENDER: {clinic_email}")
            print(f"Review data: {review_data}")
            
            # Create HTML content
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">New Patient Review Received</h2>
                    
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="margin-top: 0; color: #856404;">📧 Patient Contact Information</h3>
                        <p style="margin: 5px 0;"><strong>Patient Email:</strong> <a href="mailto:{review_data['email']}" style="color: #0066cc; text-decoration: none;">{review_data['email']}</a></p>
                        <p style="margin: 5px 0;"><strong>Patient Name:</strong> {review_data['name']}</p>
                        <p style="font-size: 14px; color: #856404; margin-top: 10px;">
                            💡 <em>To reply to this patient, simply click "Reply" to this email or use the email address above.</em>
                        </p>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Review Details:</h3>
                        <p><strong>Rating:</strong> {'⭐' * review_data['rating']} ({review_data['rating']}/5)</p>
                        <p><strong>Date:</strong> {review_data['date']}</p>
                    </div>
                    
                    <div style="background: #fff; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0;">
                        <h4>Review Comment:</h4>
                        <p style="font-style: italic; font-size: 16px;">"{review_data['comment']}"</p>
                    </div>
                    
                    <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; color: #0369a1; font-weight: bold;">📋 Action Required:</p>
                        <p style="margin: 5px 0; color: #0369a1;">Consider responding to this patient to thank them for their feedback and maintain good patient relationships.</p>
                    </div>
                    
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        This review has been automatically saved to your clinic management system.<br>
                        <em>This email was sent from your {clinic_name} review system.</em>
                    </p>
                </div>
            </body>
            </html>
            """
            
            # Create email with clinic's email as sender
            subject = f'New {review_data["rating"]}-Star Review from {review_data["name"]} ({review_data["email"]})'
            print(f"Email subject: {subject}")
            
            # Use the clinic's email as the sender (this will be the "From" address patients see)
            msg = EmailMultiAlternatives(
                subject=subject,
                body=f"New review from {review_data['name']} ({review_data['email']}): {review_data['comment']}",
                from_email=f"{clinic_name} <{clinic_email}>",  # Clinic's email as sender
                to=[clinic_email],  # Send to the same clinic email (internal notification)
                reply_to=[review_data['email']],  # Patient email for replies
                headers={
                    'X-Patient-Email': review_data['email'],
                    'X-Patient-Name': review_data['name'],
                }
            )
            
            msg.attach_alternative(html_content, "text/html")
            print("Attempting to send email...")
            result = msg.send()
            print(f"Email send result: {result}")
            
            if result == 1:
                print("Email sent successfully!")
                return True
            else:
                print("Email send failed - no messages sent")
                return False
            
        except Exception as e:
            print(f'Failed to send review email: {e}')
            logger.error(f'Failed to send review email: {e}')
            return False

    def get(self, request):
        clinic_settings = ClinicSettings.objects.first()
        if clinic_settings:
            reviews = clinic_settings.reviews.all()
            serializer = ReviewSerializer(reviews, many=True)
            return Response(serializer.data)
        return Response([])
    
    def post(self, request):
        try:
            clinic_settings = ClinicSettings.objects.first()
            data = request.data.copy()
            data['clinic'] = clinic_settings.id
            serializer = ReviewSerializer(data=data)
            if serializer.is_valid():
                review = serializer.save(clinic=clinic_settings)
                
                # Send email notification
                email_sent = self.send_review_email(request.data)
                
                response_data = {
                    'message': 'Review submitted successfully',
                    'review_id': review.id,
                    'email_sent': email_sent
                }
                
                return Response(response_data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f'Error creating review: {e}')
            return Response({
                'error': 'Failed to submit review'
            }, status=status.HTTP_400_BAD_REQUEST)
