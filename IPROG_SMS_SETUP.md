# iProg SMS API Setup Guide

## Overview
iProg SMS API has been integrated as the primary SMS service for OTP functionality in your MedSync application. This replaces Twilio as the primary SMS provider while maintaining fallback mechanisms.

## What's Changed

### 1. New iProg SMS Service
- **File**: `accounts/iprog_sms_service.py`
- **Class**: `IProgSMSService`
- **Features**:
  - OTP SMS sending via iProg API
  - Phone number formatting for Philippines (+63)
  - Fallback mechanism to console logging
  - Balance checking capability
  - Comprehensive error handling

### 2. Updated Django Settings
- **File**: `capstone/settings.py`
- **New Settings**:
  ```python
  IPROG_API_TOKEN = os.getenv('IPROG_API_TOKEN', '')
  IPROG_API_URL = os.getenv('IPROG_API_URL', 'https://sms.iprogtech.com/api/v1/sms_messages')
  IPROG_SMS_PROVIDER = os.getenv('IPROG_SMS_PROVIDER', '0')
  ```

### 3. Updated Authentication Views
- **File**: `accounts/views.py`
- **Changed Methods**:
  - `StaffLoginView`: Now uses iProg for SMS OTP
  - `CompleteLoginView`: Simplified OTP verification (Django-based)
  - All OTP verification now uses Django cache system

## Setup Instructions

### Step 1: Get iProg API Credentials
1. Sign up at iProg SMS API portal
2. Obtain your API key
3. Note the API endpoints (usually https://api.iprog.com.ph/api/send)

### Step 2: Environment Configuration
Create or update your `.env` file:
```env
# iProg SMS API Settings
IPROG_API_TOKEN=your_actual_iprog_api_token_here
IPROG_API_URL=https://sms.iprogtech.com/api/v1/sms_messages
IPROG_SMS_PROVIDER=0
```

### Step 3: Test the Integration
Run a test to verify SMS functionality:

```python
# Test iProg SMS Service
from accounts.iprog_sms_service import iprog_sms_service

# Test phone number formatting
formatted = iprog_sms_service.format_phone_number("09123456789")
print(f"Formatted: {formatted}")  # Should output: 639123456789

# Test OTP sending (development mode)
success, message, ref_id = iprog_sms_service.send_otp_sms("09123456789", "123456")
print(f"Success: {success}, Message: {message}")
```

## API Integration Details

### iProg SMS API Request Format
```python
payload = {
    'api_token': 'your_api_token',
    'phone_number': '639123456789',  # Philippines format
    'message': 'Your OTP code is: 123456',
    'sms_provider': 0  # 0 or 1, default: 0
}
```

### Expected Response
```json
{
    "status": 200,
    "message": "Your SMS message has been successfully added to the queue and will be processed shortly.",
    "message_id": "iSms-XHYBk"
}
```

## Phone Number Handling

### Supported Formats
The service automatically converts these formats:
- `09123456789` → `639123456789`
- `+639123456789` → `639123456789` 
- `639123456789` → `639123456789` (no change)

### Validation
- Philippines mobile: 639XXXXXXXXX (12 digits total)
- Philippines landline: 632XXXXXXXX (11 digits total)

## Fallback Mechanisms

### Primary → Secondary → Final
1. **iProg SMS API** (Primary)
2. **Semaphore SMS** (Secondary fallback)
3. **Console Logging** (Development fallback)

### Fallback Triggers
- iProg API key not configured
- Network connection errors
- API response errors
- Timeout issues

## Development vs Production

### Development Mode
- If iProg API key is missing, uses console fallback
- OTP codes displayed in terminal
- Useful for testing without SMS costs

### Production Mode
- Requires valid iProg API credentials
- Real SMS delivery to actual phone numbers
- Error logging to Django logs

## Testing Checklist

### Basic Functionality
- [ ] Phone number formatting works correctly
- [ ] OTP SMS sends successfully
- [ ] OTP verification works in login flow
- [ ] Fallback mechanisms activate when needed
- [ ] Error messages are user-friendly

### Integration Testing
- [ ] Two-factor authentication flow complete
- [ ] Staff login with SMS OTP works
- [ ] Patient registration with SMS works
- [ ] Error handling for invalid numbers
- [ ] Network error handling

## Troubleshooting

### Common Issues

#### 1. "iProg not configured" Error
**Solution**: Check your `.env` file has `IPROG_API_TOKEN` set

#### 2. SMS Not Delivered
**Possible Causes**:
- Invalid API key
- Insufficient balance
- Wrong phone number format
- Network connectivity issues

**Debug Steps**:
1. Check Django logs for detailed error messages
2. Verify phone number format (should be 639XXXXXXXXX)
3. Test with iProg API directly using Postman
4. Check your iProg account balance
5. Verify API token is correct

#### 3. OTP Verification Fails
**Solution**: OTP verification is handled by Django cache, not iProg. Check:
- OTP expiry time (5 minutes default)
- Cache configuration in Django settings
- Time synchronization between systems

### Log Messages to Monitor
```
iProg SMS API Request - Phone: 09123456789 → 639123456789
iProg SMS API Response - Status: 200
iProg SMS sent successfully to 639123456789. Message ID: iSms-XHYBk
```

## Cost Optimization

### SMS Credits Management
- Monitor usage via iProg dashboard
- Set up balance alerts
- Use development mode for testing

### Message Optimization
- OTP messages are already optimized for length
- Standard format reduces confusion
- Clear expiration messaging

## Security Considerations

### API Key Protection
- Never commit API tokens to version control
- Use environment variables only
- Rotate tokens periodically

### Phone Number Privacy
- Numbers are logged for debugging (consider removing in production)
- Implement rate limiting to prevent abuse
- Validate phone numbers before sending

## Migration from Twilio

### What Was Removed
- Twilio Verify API integration
- Twilio SDK dependencies
- Complex verification flows

### What Was Kept
- Same user interface
- Same OTP validation logic
- Fallback to Semaphore SMS
- Development console logging

### Benefits of Switch
- Potentially lower SMS costs for Philippines
- Simpler integration (no complex Verify API)
- Local Philippines SMS provider
- Faster delivery for local numbers

## Support and Maintenance

### Monitoring
Monitor these metrics:
- SMS delivery success rate
- API response times
- Fallback activation frequency
- User completion rates

### Regular Tasks
- Check iProg account balance
- Monitor error logs
- Update API endpoints if changed
- Test fallback mechanisms monthly

## Next Steps

1. **Configure iProg API credentials** in your `.env` file
2. **Test the integration** with your actual phone number
3. **Monitor logs** during initial deployment
4. **Set up balance alerts** in your iProg account
5. **Remove old Twilio code** once fully tested (optional)

---

**Note**: This setup maintains backward compatibility and includes comprehensive fallback mechanisms to ensure SMS OTP functionality remains reliable during the transition to iProg SMS API.
