"""
URL configuration for OCR API endpoints
"""
from django.urls import path

from .textract_lab_analysis import textract_lab_analysis

urlpatterns = [
    path('textract-lab-analysis/', textract_lab_analysis, name='textract_lab_analysis'),
    path('analyze-lab-image/', textract_lab_analysis, name='analyze_lab_image'),  # Add alias for frontend compatibility
]
