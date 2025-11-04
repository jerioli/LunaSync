"""
Django management command to test OTP email functionality with comprehensive debugging
"""

from django.core.management.base import BaseCommand
from django.conf import settings
import logging

# Set up logging to see debug output
logging.basicConfig(level=logging.DEBUG)

class Command(BaseCommand):
    help = 'Test OTP email functionality with detailed debugging'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            default='jeri.olivarez@gmail.com',
            help='Email address to send test OTP to'
        )
        parser.add_argument(
            '--otp',
            type=str,
            default='123456',
            help='Test OTP code to send'
        )
        parser.add_argument(
            '--test-connection-only',
            action='store_true',
            help='Only test SMTP connection without sending email'
        )

    def handle(self, *args, **options):
        email = options['email']
        otp = options['otp']
        test_connection_only = options['test_connection_only']
        
        self.stdout.write(self.style.SUCCESS('🚀 Starting OTP Email Debug Test'))
        self.stdout.write(f"📧 Target Email: {email}")
        self.stdout.write(f"🔢 Test OTP: {otp}")
        self.stdout.write("=" * 60)
        
        try:
            # Import the OTP debugger
            from accounts.otp_logger import otp_email_debugger
            
            if test_connection_only:
                self.stdout.write("🔍 Testing SMTP connection only...")
                success = otp_email_debugger.test_smtp_connection()
                
                if success:
                    self.stdout.write(
                        self.style.SUCCESS("✅ SMTP connection test passed!")
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR("❌ SMTP connection test failed!")
                    )
            else:
                self.stdout.write("🔍 Testing full OTP email sending process...")
                
                # Run the comprehensive debug test
                success, message, debug_details = otp_email_debugger.debug_otp_email_send(
                    to_email=email,
                    otp_code=otp,
                    identifier_type='email'
                )
                
                # Display results
                self.stdout.write("\n" + "=" * 60)
                self.stdout.write("📊 TEST RESULTS SUMMARY")
                self.stdout.write("=" * 60)
                
                if success:
                    self.stdout.write(
                        self.style.SUCCESS(f"✅ SUCCESS: {message}")
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(f"❌ FAILED: {message}")
                    )
                
                self.stdout.write(f"📋 Steps Completed: {len(debug_details['steps_completed'])}")
                for step in debug_details['steps_completed']:
                    self.stdout.write(f"  ✓ {step}")
                
                if debug_details['warnings']:
                    self.stdout.write(f"⚠️  Warnings: {len(debug_details['warnings'])}")
                    for warning in debug_details['warnings']:
                        self.stdout.write(f"  ⚠️  {warning}")
                
                if debug_details['errors']:
                    self.stdout.write(f"❌ Errors: {len(debug_details['errors'])}")
                    for error in debug_details['errors']:
                        self.stdout.write(f"  ❌ {error}")
                
                # Provide troubleshooting suggestions
                if not success:
                    self.stdout.write("\n" + "💡 TROUBLESHOOTING SUGGESTIONS")
                    self.stdout.write("-" * 40)
                    
                    if any('Authentication' in error for error in debug_details['errors']):
                        self.stdout.write("🔑 Authentication Issues:")
                        self.stdout.write("  - Check EMAIL_HOST_USER and EMAIL_HOST_PASSWORD in .env.production")
                        self.stdout.write("  - Ensure you're using an app-specific password for Gmail")
                        self.stdout.write("  - Verify 2FA is enabled on your Gmail account")
                        
                    if any('Connection' in error for error in debug_details['errors']):
                        self.stdout.write("🌐 Connection Issues:")
                        self.stdout.write("  - Check network connectivity")
                        self.stdout.write("  - Verify SMTP host and port settings")
                        self.stdout.write("  - Check firewall settings")
                        
                    if any('timeout' in error.lower() for error in debug_details['errors']):
                        self.stdout.write("⏱️  Timeout Issues:")
                        self.stdout.write("  - Increase EMAIL_TIMEOUT setting")
                        self.stdout.write("  - Check network stability")
            
            self.stdout.write("\n" + "=" * 60)
            self.stdout.write("🏁 OTP Email Debug Test Completed")
            self.stdout.write("=" * 60)
            
        except ImportError as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Could not import OTP debugger: {e}")
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Unexpected error during test: {e}")
            )
            import traceback
            self.stdout.write(traceback.format_exc())