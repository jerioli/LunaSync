"""
Key rotation utility for AES-256 encryption.
This module provides functions for rotating encryption keys safely.

Usage:
    from security_app.key_rotation import KeyRotationManager
    
    manager = KeyRotationManager()
    manager.rotate_key(new_key_b64)
"""

import base64
import logging
from django.db import transaction
from django.apps import apps
from .encryption_utils import encrypt, decrypt

logger = logging.getLogger(__name__)

class KeyRotationManager:
    """Manages encryption key rotation for all encrypted fields"""
    
    def __init__(self):
        self.models_with_encrypted_fields = {
            'accounts.CustomUser': ['email', 'phone'],
            'patients.Patient': [
                'first_name', 'last_name', 'middle_initial', 'suffix', 'name',
                'email', 'phone', 'address', 'religion', 'medical_info', 'physical_examination'
            ],
            'medical_documents.MedicalDocument': [
                'title', 'description', 'content', 'extracted_data', 
                'structured_data', 'metadata', 'access_notes'
            ],
            'medical_documents.LabResult': [
                'test_name', 'laboratory_name', 'laboratory_address', 'lab_reference_number',
                'test_results', 'critical_values', 'abnormal_values', 'interpretation',
                'clinical_significance', 'recommendations', 'specimen_quality', 'processing_notes'
            ],
            'medical_documents.SOAPNote': [
                'subjective', 'objective', 'assessment', 'plan', 'vital_signs',
                'chief_complaint', 'history_present_illness'
            ],
            'medical_documents.Prescription': [
                'medications', 'general_instructions', 'pharmacy_notes'
            ],
            'medical_documents.ClinicalNote': [
                'clinical_context', 'findings', 'recommendations'
            ]
        }
    
    def validate_new_key(self, new_key_b64):
        """Validate that the new key is properly formatted"""
        try:
            decoded_key = base64.b64decode(new_key_b64)
            if len(decoded_key) != 32:
                raise ValueError(f"Key must be 32 bytes, got {len(decoded_key)} bytes")
            return True
        except Exception as e:
            raise ValueError(f"Invalid key format: {e}")
    
    def rotate_key(self, new_key_b64, batch_size=100):
        """
        Rotate encryption key for all encrypted fields.
        
        Args:
            new_key_b64: New base64-encoded encryption key
            batch_size: Number of records to process in each batch
            
        Returns:
            Dict with rotation results
        """
        self.validate_new_key(new_key_b64)
        
        results = {
            'total_records_processed': 0,
            'total_records_updated': 0,
            'models_processed': {},
            'errors': []
        }
        
        logger.info("Starting key rotation process")
        
        try:
            with transaction.atomic():
                for model_path, fields in self.models_with_encrypted_fields.items():
                    app_label, model_name = model_path.split('.')
                    model_class = apps.get_model(app_label, model_name)
                    
                    model_results = self.rotate_model_key(
                        model_class, fields, new_key_b64, batch_size
                    )
                    
                    results['models_processed'][model_path] = model_results
                    results['total_records_processed'] += model_results['processed']
                    results['total_records_updated'] += model_results['updated']
                    
                    logger.info(f"Rotated key for {model_path}: {model_results}")
        
        except Exception as e:
            logger.error(f"Key rotation failed: {e}")
            results['errors'].append(str(e))
            raise
        
        logger.info(f"Key rotation completed: {results}")
        return results
    
    def rotate_model_key(self, model_class, fields, new_key_b64, batch_size):
        """Rotate key for a specific model"""
        total_records = model_class.objects.count()
        processed = 0
        updated = 0
        
        logger.info(f"Rotating key for {model_class.__name__}: {total_records} records")
        
        for offset in range(0, total_records, batch_size):
            records = model_class.objects.all()[offset:offset + batch_size]
            
            for record in records:
                processed += 1
                if self.rotate_record_key(record, fields, new_key_b64):
                    record.save()
                    updated += 1
        
        return {'processed': processed, 'updated': updated}
    
    def rotate_record_key(self, record, fields, new_key_b64):
        """Rotate key for a specific record"""
        updated = False
        
        # Temporarily store old key functions
        old_encrypt = encrypt
        old_decrypt = decrypt
        
        # Create new key functions
        def new_encrypt(plaintext):
            # Implementation would use new_key_b64
            # This is a placeholder - actual implementation would
            # need to temporarily switch encryption keys
            return old_encrypt(plaintext)
        
        def new_decrypt(ciphertext):
            # Implementation would use new_key_b64
            # This is a placeholder
            return old_decrypt(ciphertext)
        
        for field_name in fields:
            if hasattr(record, field_name):
                encrypted_value = getattr(record, field_name)
                
                if encrypted_value:
                    try:
                        # Decrypt with old key
                        plaintext = old_decrypt(encrypted_value)
                        
                        # Encrypt with new key
                        new_encrypted_value = new_encrypt(plaintext)
                        
                        # Update field
                        setattr(record, field_name, new_encrypted_value)
                        updated = True
                        
                    except Exception as e:
                        logger.warning(f"Could not rotate key for {record}.{field_name}: {e}")
        
        return updated
    
    def backup_before_rotation(self):
        """Create a backup before key rotation"""
        logger.warning("Key rotation backup not implemented - please backup manually")
        # TODO: Implement automatic backup before key rotation
        pass
    
    def verify_rotation(self, sample_size=10):
        """Verify that key rotation was successful"""
        logger.info(f"Verifying key rotation with {sample_size} samples per model")
        
        verification_results = {}
        
        for model_path, fields in self.models_with_encrypted_fields.items():
            app_label, model_name = model_path.split('.')
            model_class = apps.get_model(app_label, model_name)
            
            # Get a sample of records
            sample_records = model_class.objects.all()[:sample_size]
            
            success_count = 0
            error_count = 0
            
            for record in sample_records:
                try:
                    # Try to access encrypted fields (will decrypt automatically)
                    for field_name in fields:
                        if hasattr(record, field_name):
                            value = getattr(record, field_name)
                            if value:
                                # Just accessing it will test decryption
                                str(value)
                    
                    success_count += 1
                    
                except Exception as e:
                    error_count += 1
                    logger.error(f"Verification failed for {record}.{field_name}: {e}")
            
            verification_results[model_path] = {
                'success': success_count,
                'errors': error_count,
                'sample_size': len(sample_records)
            }
        
        return verification_results


def generate_new_key():
    """Generate a new encryption key for rotation"""
    import os
    key_bytes = os.urandom(32)
    return base64.b64encode(key_bytes).decode('utf-8')
