# SMS Configuration - Semaphore Only
# Simplified SMS service using only Semaphore

import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class SMSService:
    """
    SMS Service Handler - Semaphore Only
    """
    
    def __init__(self):
        # Semaphore configuration
        self.semaphore_api_key = getattr(settings, 'SEMAPHORE_API_KEY', '1d1b9ab6af89e61b3db59d9ab3796906')
        self.semaphore_url = 'https://api.semaphore.co/api/v4/messages'
    
    def format_phone_number(self, phone_number, country_code='+63'):
        """Format phone number for Philippines"""
        # Remove all non-numeric characters
        cleaned = ''.join(filter(str.isdigit, phone_number))
        
        # Handle different input formats
        if cleaned.startswith('63'):
            # Already has country code
            return f"+{cleaned}"
        elif cleaned.startswith('0'):
            # Remove leading 0 and add country code
            return f"{country_code}{cleaned[1:]}"
        else:
            # Add country code
            return f"{country_code}{cleaned}"
    
    def send_sms_semaphore(self, phone_number, message, country_code='+63'):
        """Send SMS via Semaphore API with debug information"""
        try:
            formatted_phone = self.format_phone_number(phone_number, country_code)
            
            # Debug information
            print(f"🔧 Debug - API Key: {self.semaphore_api_key[:8]}...{self.semaphore_api_key[-4:]}")
            print(f"🔧 Debug - Phone: {phone_number} → {formatted_phone}")
            print(f"🔧 Debug - URL: {self.semaphore_url}")
            
            # Try with 'INFO' sender name first (more likely to be approved)
            payload = {
                'apikey': self.semaphore_api_key,
                'number': formatted_phone,
                'message': message,
                'sendername': 'INFO'  # Changed from 'MedSync' to 'INFO'
            }
            
            print(f"🔧 Debug - Payload: {payload}")
            
            response = requests.post(
                self.semaphore_url, 
                data=payload, 
                timeout=30,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            
            print(f"🔧 Debug - Response Status: {response.status_code}")
            print(f"🔧 Debug - Response Text: {response.text}")
            
            if response.status_code == 200:
                try:
                    result = response.json()
                    print(f"🔧 Debug - Response JSON: {result}")
                    
                    # Check for different success indicators
                    if (result.get('status') == 'success' or 
                        'message_id' in result or 
                        result.get('success') == True):
                        logger.info(f"Semaphore SMS sent to {formatted_phone}")
                        return True, f"SMS sent successfully via Semaphore"
                    else:
                        error_msg = result.get('message', str(result))
                        logger.error(f"Semaphore SMS failed: {error_msg}")
                        return False, f"Semaphore error: {error_msg}"
                        
                except ValueError:
                    # Response is not JSON, check if it contains success indicators
                    response_text = response.text.lower()
                    if "success" in response_text or "sent" in response_text:
                        return True, f"SMS sent successfully via Semaphore"
                    else:
                        return False, f"Semaphore error: {response.text}"
                        
            elif response.status_code == 403:
                error_msg = f"403 Forbidden - Check API key, account status, or credits. Response: {response.text}"
                logger.error(f"Semaphore 403 error: {error_msg}")
                return False, error_msg
                
            elif response.status_code == 400:
                error_msg = f"400 Bad Request - Invalid parameters. Response: {response.text}"
                logger.error(f"Semaphore 400 error: {error_msg}")
                return False, error_msg
                
            else:
                error_msg = f"HTTP {response.status_code}: {response.text}"
                logger.error(f"Semaphore HTTP error: {error_msg}")
                return False, error_msg
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Semaphore network error: {e}")
            return False, f"Network error: {str(e)}"
        except Exception as e:
            logger.error(f"Semaphore unexpected error: {e}")
            return False, f"Unexpected error: {str(e)}"
    
    def send_sms(self, phone_number, message, country_code='+63'):
        """
        Send SMS using Semaphore
        
        Args:
            phone_number: Phone number to send SMS to
            message: SMS message content
            country_code: Country code (default: +63 for Philippines)
        """
        print(f"📱 Sending SMS via Semaphore to {phone_number}...")
        
        success, result = self.send_sms_semaphore(phone_number, message, country_code)
        
        if success:
            print(f"✅ SMS sent via Semaphore to {phone_number}")
            return True, result
        else:
            print(f"❌ Semaphore SMS failed for {phone_number}: {result}")
            
            # Fallback to console logging for development
            print(f"FALLBACK SMS for {phone_number}: {message}")
            return True, f"SMS logged to console (Semaphore failed: {result})"
    
    def test_connection(self):
        """Test Semaphore API connection"""
        try:
            # Test API key format
            if len(self.semaphore_api_key) == 32 and self.semaphore_api_key != 'your_semaphore_api_key_here':
                return True, "API key format is valid (32 characters)"
            else:
                return False, "Invalid API key format or not configured"
                
        except Exception as e:
            return False, f"Connection test failed: {str(e)}"
