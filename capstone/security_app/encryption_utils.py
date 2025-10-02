import base64
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from django.conf import settings

def get_encryption_key():
    """Safely load and decode the encryption key from settings"""
    key_str = getattr(settings, 'ENCRYPTION_KEY', '')
    
    if not key_str or key_str == 'REPLACE_WITH_YOUR_32_BYTE_BASE64_KEY':
        raise ValueError(
            "ENCRYPTION_KEY not properly configured. Please set a valid base64-encoded 32-byte key in your .env file."
        )
    
    try:
        # Decode the base64 key
        key = base64.b64decode(key_str)
        if len(key) != 32:
            raise ValueError(f"Encryption key must be 32 bytes, got {len(key)} bytes")
        return key
    except Exception as e:
        raise ValueError(f"Invalid encryption key format: {e}")

# Load key from settings (should be 32 bytes for AES-256)
ENCRYPTION_KEY = get_encryption_key()

IV_LENGTH = 16  # 128-bit IV for AES


def generate_iv():
    return os.urandom(IV_LENGTH)


def encrypt(plaintext: str) -> str:
    if not plaintext:
        return ''
    
    try:
        # Get fresh key in case of lazy loading issues
        key = get_encryption_key()
        iv = generate_iv()
        cipher = Cipher(algorithms.AES(key), modes.CFB(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(plaintext.encode()) + encryptor.finalize()
        return base64.b64encode(iv + ciphertext).decode()
    except Exception as e:
        raise ValueError(f"Encryption failed: {e}")


def decrypt(ciphertext_b64: str) -> str:
    if not ciphertext_b64:
        return ''
    
    # Quick check if this looks like encrypted data
    if not is_encrypted(ciphertext_b64):
        # This is probably plaintext data, return as-is
        return ciphertext_b64
    
    try:
        # Get fresh key in case of lazy loading issues
        key = get_encryption_key()
        data = base64.b64decode(ciphertext_b64)
        
        # Check if we have enough data for IV
        if len(data) < IV_LENGTH:
            # This might be plaintext data, return as-is
            return ciphertext_b64
        
        iv = data[:IV_LENGTH]
        ciphertext = data[IV_LENGTH:]
        
        # Validate IV length
        if len(iv) != IV_LENGTH:
            # Invalid IV, might be plaintext or corrupted data
            return ciphertext_b64
            
        cipher = Cipher(algorithms.AES(key), modes.CFB(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        plaintext = decryptor.update(ciphertext) + decryptor.finalize()
        return plaintext.decode()
    except Exception as e:
        # If decryption fails, this might be plaintext data from before encryption was implemented
        # Return the original value
        return ciphertext_b64


def is_encrypted(data_str):
    """Check if a string appears to be encrypted data"""
    if not data_str:
        return False
    
    try:
        # Try to decode as base64 - encrypted data should be base64
        decoded = base64.b64decode(data_str)
        # Should have at least IV length + some ciphertext
        return len(decoded) > IV_LENGTH
    except:
        # If it's not valid base64, it's probably plaintext
        return False

def rotate_key(new_key_b64):
    # Placeholder for future key rotation logic
    pass
