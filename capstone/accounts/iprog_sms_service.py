# iProg SMS Service for OTP
import os
import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class IProgSMSService:
    """
    iProg SMS Service for OTP functionality
    """
    
    def __init__(self):
        # Get iProg credentials from environment variables or settings
        self.api_token = getattr(settings, 'IPROG_API_TOKEN', os.getenv('IPROG_API_TOKEN'))
        self.api_url = getattr(settings, 'IPROG_API_URL', os.getenv('IPROG_API_URL', 'https://sms.iprogtech.com/api/v1/sms_messages'))
        self.sms_provider = getattr(settings, 'IPROG_SMS_PROVIDER', os.getenv('IPROG_SMS_PROVIDER', '0'))
        
        if not self.api_token:
            logger.warning("iProg API token not configured. SMS will use fallback method.")
            self.is_configured = False
        else:
            self.is_configured = True
            logger.info("iProg SMS service initialized successfully")
    
    def format_phone_number(self, phone_number, country_code='+63'):
        """
        Format phone number for Philippines
        
        Args:
            phone_number (str): Phone number to format
            country_code (str): Country code (default: +63 for Philippines)
            
        Returns:
            str: Formatted phone number
        """
        # Remove all non-numeric characters
        cleaned = ''.join(filter(str.isdigit, phone_number))
        
        # Handle different input formats
        if cleaned.startswith('63'):
            # Already has country code, remove + if present
            return cleaned
        elif cleaned.startswith('0'):
            # Remove leading 0 and add country code (without +)
            return f"63{cleaned[1:]}"
        else:
            # Add country code (without +)
            return f"63{cleaned}"
    
    def send_otp_sms(self, phone_number, otp_code, country_code='+63'):
        """
        Send OTP via iProg SMS API
        
        Args:
            phone_number (str): Phone number to send OTP to
            otp_code (str): 6-digit OTP code
            country_code (str): Country code (default: +63 for Philippines)
            
        Returns:
            tuple: (success: bool, message: str, message_id: str or None)
        """
        if not self.is_configured:
            return self._fallback_sms(phone_number, otp_code)
        
        try:
            formatted_phone = self.format_phone_number(phone_number, country_code)
            
            # Create OTP message
            message_body = f"""MedSync Verification Code

Your OTP code is: {otp_code}

This code expires in 5 minutes.
Do not share this code with anyone.

MedSync Healthcare"""
            
            # Prepare API payload (JSON format)
            payload = {
                'api_token': self.api_token,
                'phone_number': formatted_phone,
                'message': message_body,
                'sms_provider': int(self.sms_provider)
            }
            
            # Debug information
            logger.info(f"iProg SMS API Request - Phone: {phone_number} → {formatted_phone}")
            logger.info(f"iProg SMS API Request - API Token: {self.api_token[:8]}...{self.api_token[-4:] if len(self.api_token) > 8 else 'short'}")
            
            # Send SMS via iProg API (JSON POST)
            headers = {'Content-Type': 'application/json'}
            response = requests.post(self.api_url, json=payload, headers=headers, timeout=30)
            
            logger.info(f"iProg SMS API Response - Status: {response.status_code}")
            logger.info(f"iProg SMS API Response - Body: {response.text}")
            
            if response.status_code == 200:
                try:
                    response_data = response.json()
                    
                    # Check if iProg API indicates success (status: 200)
                    if response_data.get('status') == 200:
                        message_id = response_data.get('message_id', 'iprog_sent')
                        success_message = response_data.get('message', 'SMS sent successfully')
                        logger.info(f"iProg SMS sent successfully to {formatted_phone}. Message ID: {message_id}")
                        return True, success_message, message_id
                    else:
                        error_msg = response_data.get('message', 'Unknown error')
                        logger.error(f"iProg SMS API error: {error_msg}")
                        return self._fallback_sms(phone_number, otp_code, f"iProg API error: {error_msg}")
                        
                except ValueError as json_error:
                    logger.error(f"iProg SMS API invalid JSON response: {json_error}")
                    return self._fallback_sms(phone_number, otp_code, "Invalid JSON response")
            else:
                logger.error(f"iProg SMS API HTTP error: {response.status_code} - {response.text}")
                return self._fallback_sms(phone_number, otp_code, f"HTTP {response.status_code}")
            
        except requests.exceptions.Timeout:
            logger.error(f"iProg SMS API timeout for {phone_number}")
            return self._fallback_sms(phone_number, otp_code, "API timeout")
        except requests.exceptions.ConnectionError:
            logger.error(f"iProg SMS API connection error for {phone_number}")
            return self._fallback_sms(phone_number, otp_code, "Connection error")
        except Exception as e:
            logger.error(f"iProg SMS failed for {phone_number}: {e}")
            return self._fallback_sms(phone_number, otp_code, str(e))
    
    def _fallback_sms(self, phone_number, otp_code, error_reason="iProg not configured"):
        """Fallback method when iProg is not available"""
        logger.warning(f"Using fallback SMS method for {phone_number} - Reason: {error_reason}")
        print(f"""
🔔 SMS FALLBACK - DEVELOPMENT MODE
📱 To: {phone_number}
🔐 OTP Code: {otp_code}
⏰ Expires in: 5 minutes
❌ iProg Error: {error_reason}
        """)
        return True, f"SMS sent via fallback method (iProg error: {error_reason})", None
    
    def verify_phone_number(self, phone_number):
        """
        Basic phone number validation for Philippines
        
        Args:
            phone_number (str): Phone number to verify
            
        Returns:
            tuple: (is_valid: bool, formatted_number: str, info: dict)
        """
        try:
            formatted = self.format_phone_number(phone_number)
            
            # Basic Philippines mobile number validation
            # Philippines mobile numbers: 63 + 9xx-xxx-xxxx (10 digits after 63)
            if len(formatted) == 12 and formatted.startswith('639'):
                return True, f"+{formatted}", {"carrier": "Philippines Mobile", "type": "mobile"}
            elif len(formatted) == 11 and formatted.startswith('632'):
                return True, f"+{formatted}", {"carrier": "Philippines Landline", "type": "landline"}
            else:
                return False, f"+{formatted}", {"carrier": "Unknown", "type": "unknown"}
                
        except Exception as e:
            logger.error(f"Phone verification failed: {e}")
            return False, phone_number, {"carrier": "Unknown", "type": "error"}
    
    def get_balance(self):
        """
        Get SMS balance from iProg (if API supports it)
        
        Returns:
            tuple: (success: bool, balance: str or None, message: str)
        """
        if not self.is_configured:
            return False, None, "iProg not configured"
        
        # Note: This would depend on iProg's specific balance check endpoint
        # You may need to update this based on iProg's actual API documentation
        try:
            balance_url = getattr(settings, 'IPROG_BALANCE_URL', 'https://api.iprog.com.ph/api/balance')
            
            payload = {
                'apikey': self.api_key
            }
            
            response = requests.post(balance_url, data=payload, timeout=10)
            
            if response.status_code == 200:
                balance_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {'balance': response.text}
                balance = balance_data.get('balance', 'Unknown')
                return True, balance, "Balance retrieved successfully"
            else:
                return False, None, f"Balance check failed: HTTP {response.status_code}"
                
        except Exception as e:
            logger.error(f"Balance check failed: {e}")
            return False, None, f"Balance check error: {str(e)}"


# Create global instance
iprog_sms_service = IProgSMSService()
