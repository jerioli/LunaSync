from rest_framework import serializers
from .models import ClinicSettings, FAQ, Review

class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ['id', 'question', 'answer']

class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['id', 'name', 'rating', 'comment', 'date']

class ClinicSettingsSerializer(serializers.ModelSerializer):
    faqs = FAQSerializer(many=True, required=False)
    reviews = ReviewSerializer(many=True, required=False)
    class Meta:
        model = ClinicSettings
        fields = '__all__'  # includes primary_color and logo 