"""
Management command to encrypt existing plaintext data in the database.

This command should be run once after implementing the encryption system
to migrate existing plaintext data to encrypted format.

Usage:
    python manage.py encrypt_existing_data
    python manage.py encrypt_existing_data --model=Patient
    python manage.py encrypt_existing_data --dry-run
"""

from django.core.management.base import BaseCommand, CommandError
from django.apps import apps
from django.db import transaction
from django.conf import settings
import json
import logging

# Configure logging to prevent sensitive data leakage
logging.getLogger().setLevel(logging.WARNING)

class Command(BaseCommand):
    help = 'Encrypt existing plaintext data in the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--model',
            type=str,
            help='Encrypt data for a specific model (e.g., Patient, CustomUser, MedicalDocument)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be encrypted without making changes',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Process records in batches (default: 100)',
        )

    def handle(self, *args, **options):
        if not getattr(settings, 'ENCRYPTION_KEY', None):
            raise CommandError('ENCRYPTION_KEY not found in settings. Please set it in your .env file.')

        # Define models and their encrypted fields
        models_to_encrypt = {
            'accounts.CustomUser': {
                'model': apps.get_model('accounts', 'CustomUser'),
                'fields': ['email', 'phone']
            },
            'patients.Patient': {
                'model': apps.get_model('patients', 'Patient'),
                'fields': ['first_name', 'last_name', 'middle_initial', 'suffix', 'name', 
                          'email', 'phone', 'address', 'religion', 'medical_info', 'physical_examination']
            },
            'medical_documents.MedicalDocument': {
                'model': apps.get_model('medical_documents', 'MedicalDocument'),
                'fields': ['title', 'description', 'content', 'extracted_data', 'structured_data', 
                          'metadata', 'access_notes']
            },
            'medical_documents.LabResult': {
                'model': apps.get_model('medical_documents', 'LabResult'),
                'fields': ['test_name', 'laboratory_name', 'laboratory_address', 'lab_reference_number',
                          'test_results', 'critical_values', 'abnormal_values', 'interpretation',
                          'clinical_significance', 'recommendations', 'specimen_quality', 'processing_notes']
            },
            'medical_documents.SOAPNote': {
                'model': apps.get_model('medical_documents', 'SOAPNote'),
                'fields': ['subjective', 'objective', 'assessment', 'plan', 'vital_signs',
                          'chief_complaint', 'history_present_illness']
            },
            'medical_documents.Prescription': {
                'model': apps.get_model('medical_documents', 'Prescription'),
                'fields': ['medications', 'general_instructions', 'pharmacy_notes']
            },
            'medical_documents.ClinicalNote': {
                'model': apps.get_model('medical_documents', 'ClinicalNote'),
                'fields': ['clinical_context', 'findings', 'recommendations']
            }
        }

        # Filter by specific model if requested
        if options['model']:
            model_key = None
            for key in models_to_encrypt.keys():
                if key.endswith(f".{options['model']}"):
                    model_key = key
                    break
            
            if not model_key:
                raise CommandError(f"Model '{options['model']}' not found in encryption list")
            
            models_to_encrypt = {model_key: models_to_encrypt[model_key]}

        total_processed = 0
        total_updated = 0

        for model_name, model_info in models_to_encrypt.items():
            self.stdout.write(f"\nProcessing {model_name}...")
            
            model_class = model_info['model']
            fields = model_info['fields']
            
            # Get all records in batches
            total_records = model_class.objects.count()
            self.stdout.write(f"Total records: {total_records}")
            
            if total_records == 0:
                self.stdout.write("No records to process.")
                continue

            batch_size = options['batch_size']
            processed = 0
            updated = 0

            for offset in range(0, total_records, batch_size):
                records = model_class.objects.all()[offset:offset + batch_size]
                
                if options['dry_run']:
                    for record in records:
                        processed += 1
                        needs_update = self.check_if_needs_encryption(record, fields)
                        if needs_update:
                            updated += 1
                            self.stdout.write(f"  Would encrypt record {record.pk}")
                else:
                    with transaction.atomic():
                        for record in records:
                            processed += 1
                            if self.encrypt_record(record, fields):
                                record.save()
                                updated += 1

                # Show progress
                self.stdout.write(f"  Processed: {processed}/{total_records}")

            self.stdout.write(
                self.style.SUCCESS(f"✓ {model_name}: {updated} records encrypted (of {processed} processed)")
            )
            total_processed += processed
            total_updated += updated

        action = "Would encrypt" if options['dry_run'] else "Encrypted"
        self.stdout.write(
            self.style.SUCCESS(f"\n{action} {total_updated} records total (of {total_processed} processed)")
        )

    def check_if_needs_encryption(self, record, fields):
        """Check if any field needs encryption (contains plaintext)"""
        from security_app.encryption_utils import decrypt
        
        for field_name in fields:
            if hasattr(record, field_name):
                value = getattr(record, field_name)
                if value:
                    try:
                        # Try to decrypt - if it fails, it's probably plaintext
                        decrypt(str(value))
                    except:
                        # Can't decrypt, probably plaintext
                        return True
        return False

    def encrypt_record(self, record, fields):
        """Encrypt fields in a record if they contain plaintext data"""
        from security_app.encryption_utils import encrypt, decrypt
        
        updated = False
        
        for field_name in fields:
            if hasattr(record, field_name):
                value = getattr(record, field_name)
                if value:
                    try:
                        # Try to decrypt - if it works, already encrypted
                        decrypt(str(value))
                    except:
                        # Can't decrypt, encrypt it
                        if field_name in ['medical_info', 'physical_examination', 'extracted_data', 
                                        'structured_data', 'metadata', 'test_results', 'critical_values', 
                                        'abnormal_values', 'vital_signs', 'medications']:
                            # JSON fields - convert to string if needed
                            if isinstance(value, (dict, list)):
                                value = json.dumps(value)
                        
                        encrypted_value = encrypt(str(value))
                        setattr(record, field_name, encrypted_value)
                        updated = True
        
        return updated
