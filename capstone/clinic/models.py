from django.db import models

class ClinicSettings(models.Model):
    clinic_name = models.CharField(max_length=255, default="HealthNexus Medical Center")
    address = models.CharField(max_length=255, default="123 Health Avenue, Medical District")
    city = models.CharField(max_length=100, default="Cityville")
    state = models.CharField(max_length=100, default="California")
    zip = models.CharField(max_length=20, default="12345")
    phone = models.CharField(max_length=20, default="(123) 456-7890")
    email = models.EmailField(default="info@healthnexus.com")
    website = models.CharField(max_length=255, default="www.healthnexus.com")
    primary_color = models.CharField(max_length=7, default="#1976d2")  # Default blue
    logo = models.ImageField(upload_to='branding/', null=True, blank=True)
    healthcare_professionals_image = models.ImageField(upload_to='branding/', null=True, blank=True)
    clinic_building_image = models.ImageField(upload_to='branding/', null=True, blank=True)
    hero_title = models.CharField(max_length=255, default="Your Health Is Our Priority")
    hero_subtitle = models.TextField(default="Our clinic is dedicated to providing exceptional healthcare services with a patient-centered approach. Schedule your appointment today.")
    about_title = models.CharField(max_length=255, default="About Our Clinic")
    about_text = models.TextField(default="Founded in 2010, HealthNexus has grown to become one of the leading healthcare providers in the region. Our mission is to deliver accessible, high-quality healthcare services in a compassionate environment.")
    services = models.JSONField(default=list, blank=True)  # List of service dicts: title, description, details
    google_maps_embed_url = models.URLField(max_length=1000, blank=True, null=True, help_text="Google Maps embed URL for the clinic location")

    class Meta:
        db_table = 'clinic_settings'

    def __str__(self):
        return self.clinic_name 

class FAQ(models.Model):
    clinic = models.ForeignKey(ClinicSettings, related_name='faqs', on_delete=models.CASCADE)
    question = models.CharField(max_length=255)
    answer = models.TextField()

    class Meta:
        db_table = 'faqs'

class Review(models.Model):
    clinic = models.ForeignKey(ClinicSettings, related_name='reviews', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    rating = models.PositiveSmallIntegerField(default=5)
    comment = models.TextField()
    date = models.CharField(max_length=100)

    class Meta:
        db_table = 'reviews'