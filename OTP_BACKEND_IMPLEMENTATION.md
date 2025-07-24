# OTP Authentication Backend Implementation Guide

This file documents the required Django backend endpoints for OTP authentication.

## Required API Endpoints

### 1. Send OTP Endpoint
**POST** `/api/auth/send-otp/`

**Request Body:**
```json
{
  "identifier": "user@example.com" | "+1234567890",
  "identifier_type": "email" | "phone"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expires_in": 300
}
```

### 2. Verify OTP Endpoint
**POST** `/api/auth/verify-otp/`

**Request Body:**
```json
{
  "identifier": "user@example.com" | "+1234567890",
  "identifier_type": "email" | "phone",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "john_doe",
    "name": "John Doe",
    "email": "user@example.com",
    "phone": "+1234567890",
    "role": "doctor"
  },
  "access_token": "jwt_access_token",
  "refresh_token": "jwt_refresh_token"
}
```

## Django Models Extension

Add phone field to User model:
```python
class User(AbstractUser):
    phone = models.CharField(max_length=20, blank=True, null=True)
    # ... other fields
```

## OTP Model
```python
class OTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    identifier = models.CharField(max_length=255)  # email or phone
    identifier_type = models.CharField(max_length=10, choices=[('email', 'Email'), ('phone', 'Phone')])
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
```

## Implementation Notes

1. **OTP Generation**: Use 6-digit random numbers
2. **Expiration**: 5 minutes (300 seconds)
3. **Rate Limiting**: Implement rate limiting to prevent spam
4. **Security**: Hash OTP codes in database
5. **Email/SMS**: Integrate with email service (SendGrid) and SMS service (Twilio)
6. **Validation**: Validate email format and phone number format
7. **User Lookup**: Find users by email or phone number
8. **JWT Tokens**: Return JWT access and refresh tokens on successful verification

## Error Responses

```json
{
  "success": false,
  "message": "Invalid OTP or expired",
  "error": "verification_failed"
}
```

```json
{
  "success": false,
  "message": "User not found with this identifier",
  "error": "user_not_found"
}
```

```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "error": "rate_limit_exceeded"
}
```
