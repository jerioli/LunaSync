from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import FAQ
from .serializers import FAQSerializer

class FAQListCreateView(APIView):
    def get(self, request):
        faqs = FAQ.objects.filter(is_active=True)
        serializer = FAQSerializer(faqs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = FAQSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class FAQDetailView(APIView):
    def get(self, request, pk):
        try:
            faq = FAQ.objects.get(pk=pk)
            serializer = FAQSerializer(faq)
            return Response(serializer.data)
        except FAQ.DoesNotExist:
            return Response({'error': 'FAQ not found'}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, pk):
        try:
            faq = FAQ.objects.get(pk=pk)
            serializer = FAQSerializer(faq, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except FAQ.DoesNotExist:
            return Response({'error': 'FAQ not found'}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        try:
            faq = FAQ.objects.get(pk=pk)
            faq.delete()
            return Response({'message': 'FAQ deleted'}, status=status.HTTP_204_NO_CONTENT)
        except FAQ.DoesNotExist:
            return Response({'error': 'FAQ not found'}, status=status.HTTP_404_NOT_FOUND) 