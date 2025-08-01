# Twilio SMS Service for OTP
import os
from twilio.rest import Client
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class TwilioSMSService:
    """
    Twilio SMS Service for OTP functionality with Verify API support
    """
    
    def __init__(self):
        # Get Twilio credentials from environment variables or settings
        self.account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', os.getenv('TWILIO_ACCOUNT_SID'))
        self.auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', os.getenv('TWILIO_AUTH_TOKEN'))
        self.from_number = getattr(settings, 'TWILIO_PHONE_NUMBER', os.getenv('TWILIO_PHONE_NUMBER'))
        self.verify_service_sid = getattr(settings, 'TWILIO_VERIFY_SERVICE_SID', os.getenv('TWILIO_VERIFY_SERVICE_SID'))
        
        if not all([self.account_sid, self.auth_token]):
            logger.warning("Twilio credentials not fully configured. SMS will use fallback method.")
            self.client = None
        else:
            try:
                self.client = Client(self.account_sid, self.auth_token)
                logger.info("Twilio client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")
                self.client = None
                logger.info("Twilio client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")
                self.client = None
    
    def format_phone_number(self, phone_number, country_code='+63'):
        """Format phone number for international format"""
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
    
    def send_verification_code(self, phone_number, country_code='+63'):
        """
        Send verification code using Twilio Verify API (generates its own code)
        
        Args:
            phone_number (str): Phone number to send verification to
            country_code (str): Country code (default: +63 for Philippines)
            
        Returns:
            tuple: (success: bool, message: str, sid: str or None)
        """
        if not self.client or not self.verify_service_sid or self.verify_service_sid == 'your_actual_verify_service_sid_here':
            return False, "Twilio Verify not configured", None
        
        try:
            formatted_phone = self.format_phone_number(phone_number, country_code)
            
            verification = self.client.verify.v2.services(self.verify_service_sid).verifications.create(
                to=formatted_phone,
                channel='sms'
            )
            
            logger.info(f"Twilio Verify SMS sent to {formatted_phone}. SID: {verification.sid}")
            return True, f"Verification SMS sent via Twilio Verify", verification.sid
            
        except Exception as e:
            logger.error(f"Twilio Verify failed for {phone_number}: {e}")
            return False, str(e), None
    
    def verify_code(self, phone_number, code, country_code='+63'):
        """
        Verify code using Twilio Verify API
        
        Args:
            phone_number (str): Phone number to verify
            code (str): Verification code entered by user
            country_code (str): Country code (default: +63 for Philippines)
            
        Returns:
            tuple: (success: bool, message: str)
        """
        if not self.client or not self.verify_service_sid:
            return False, "Twilio Verify not configured"
        
        try:
            formatted_phone = self.format_phone_number(phone_number, country_code)
            
            verification_check = self.client.verify.v2.services(self.verify_service_sid).verification_checks.create(
                to=formatted_phone,
                code=code
            )
            
            if verification_check.status == 'approved':
                logger.info(f"Twilio Verify code verified for {formatted_phone}")
                return True, "Code verified successfully"
            else:
                logger.warning(f"Twilio Verify code failed for {formatted_phone}: {verification_check.status}")
                return False, f"Verification failed: {verification_check.status}"
                
        except Exception as e:
            logger.error(f"Twilio Verify check failed for {phone_number}: {e}")
            return False, str(e)

    def send_otp_sms(self, phone_number, otp_code, country_code='+63'):
        """
        Send OTP via Twilio SMS or Verify API
        
        Args:
            phone_number (str): Phone number to send OTP to
            otp_code (str): 6-digit OTP code (ignored if using Verify API)
            country_code (str): Country code (default: +63 for Philippines)
            
        Returns:
            tuple: (success: bool, message: str, sid: str or None)
        """
        if not self.client:
            return self._fallback_sms(phone_number, otp_code)
        
        # Try Twilio Verify API first if service SID is configured
        if self.verify_service_sid and self.verify_service_sid != 'your_actual_verify_service_sid_here':
            success, message, sid = self.send_verification_code(phone_number, country_code)
            if success:
                return success, message, sid
            # If Verify fails, continue to regular SMS
        
        # Try regular SMS if Verify fails or is not configured
        try:
            formatted_phone = self.format_phone_number(phone_number, country_code)
            
            # Create SMS message
            message_body = f"""🏥 MedSync Verification Code

Your OTP code is: {otp_code}

This code expires in 5 minutes.
Do not share this code with anyone.

MedSync Healthcare"""
            
            # Send SMS via Twilio
            message = self.client.messages.create(
                body=message_body,
                from_=self.from_number,
                to=formatted_phone
            )
            
            logger.info(f"Twilio SMS sent successfully to {formatted_phone}. SID: {message.sid}")
            
            return True, f"SMS sent successfully via Twilio", message.sid
            
        except Exception as e:
            logger.error(f"Twilio SMS failed for {phone_number}: {e}")
            return self._fallback_sms(phone_number, otp_code)
    
    def _fallback_sms(self, phone_number, otp_code):
        """Fallback method when Twilio is not available"""
        logger.warning(f"Using fallback SMS method for {phone_number}")
        print(f"""
🔔 SMS FALLBACK - DEVELOPMENT MODE
📱 To: {phone_number}
🔐 OTP Code: {otp_code}
⏰ Expires in: 5 minutes
        """)
        return True, "SMS sent via fallback method (development)", None
    
    def verify_phone_number(self, phone_number):
        """
        Verify if phone number is valid using Twilio Lookup API
        
        Args:
            phone_number (str): Phone number to verify
            
        Returns:
            tuple: (is_valid: bool, formatted_number: str, carrier_info: dict)
        """
        if not self.client:
            formatted = self.format_phone_number(phone_number)
            return True, formatted, {"carrier": "Unknown", "type": "Unknown"}
        
        try:
            formatted_phone = self.format_phone_number(phone_number)
            
            # Use Twilio Lookup API to verify number
            phone_info = self.client.lookups.v1.phone_numbers(formatted_phone).fetch(
                type=['carrier']
            )
            
            carrier_info = {
                "carrier": phone_info.carrier.get('name', 'Unknown') if phone_info.carrier else 'Unknown',
                "type": phone_info.carrier.get('type', 'Unknown') if phone_info.carrier else 'Unknown',
                "country_code": phone_info.country_code,
                "national_format": phone_info.national_format
            }
            
            logger.info(f"Phone number {formatted_phone} verified successfully")
            return True, phone_info.phone_number, carrier_info
            
        except Exception as e:
            logger.warning(f"Phone verification failed for {phone_number}: {e}")
            # Return formatted number even if verification fails
            formatted = self.format_phone_number(phone_number)
            return False, formatted, {"carrier": "Unknown", "type": "Unknown"}
    
    def get_message_status(self, message_sid):
        """
        Get status of sent message
        
        Args:
            message_sid (str): Twilio message SID
            
        Returns:
            dict: Message status information
        """
        if not self.client or not message_sid:
            return {"status": "unknown", "error": "Client not available or no SID"}
        
        try:
            message = self.client.messages(message_sid).fetch()
            
            return {
                "status": message.status,
                "error_code": message.error_code,
                "error_message": message.error_message,
                "date_sent": message.date_sent,
                "date_updated": message.date_updated,
                "price": message.price,
                "price_unit": message.price_unit
            }
            
        except Exception as e:
            logger.error(f"Failed to get message status for {message_sid}: {e}")
            return {"status": "error", "error": str(e)}

# Global instance
twilio_service = TwilioSMSService()
