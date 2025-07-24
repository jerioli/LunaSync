from django.db import models
from django.core.exceptions import ValidationError

class AWSCredentials(models.Model):
    """Store AWS credentials securely in database"""
    name = models.CharField(max_length=100, default="AWS Textract Config", unique=True)
    aws_access_key_id = models.CharField(max_length=200, help_text="AWS Access Key ID")
    aws_secret_access_key = models.CharField(max_length=200, help_text="AWS Secret Access Key")
    aws_region = models.CharField(max_length=50, default="us-east-1", help_text="AWS Region")
    is_active = models.BooleanField(default=True, help_text="Use these credentials")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "AWS Credentials"
        verbose_name_plural = "AWS Credentials"
        
    def __str__(self):
        return f"{self.name} ({self.aws_region})"
    
    def clean(self):
        # Ensure only one active configuration
        if self.is_active:
            if AWSCredentials.objects.filter(is_active=True).exclude(id=self.id).exists():
                raise ValidationError("Only one AWS configuration can be active at a time.")
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    @classmethod
    def get_active_credentials(cls):
        """Get the currently active AWS credentials"""
        try:
            return cls.objects.get(is_active=True)
        except cls.DoesNotExist:
            return None
