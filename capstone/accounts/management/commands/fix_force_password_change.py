from django.core.management.base import BaseCommand
from accounts.models import CustomUser

class Command(BaseCommand):
    help = 'Fix force_password_change for existing users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset-all',
            action='store_true',
            help='Reset force_password_change to False for all existing users',
        )

    def handle(self, *args, **options):
        if options['reset_all']:
            # Reset force_password_change for all users
            users = CustomUser.objects.filter(force_password_change=True)
            count = users.count()
            
            self.stdout.write(f"Found {count} users with force_password_change=True")
            
            for user in users:
                self.stdout.write(f"  - {user.username} ({user.email}) - force_password_change: {user.force_password_change}")
            
            confirm = input("Do you want to reset force_password_change to False for all these users? (y/N): ")
            if confirm.lower() == 'y':
                users.update(force_password_change=False)
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully reset force_password_change for {count} users')
                )
            else:
                self.stdout.write("Operation cancelled")
        else:
            # Just list users with force_password_change=True
            users = CustomUser.objects.filter(force_password_change=True)
            self.stdout.write(f"Users with force_password_change=True:")
            
            for user in users:
                self.stdout.write(f"  - {user.username} ({user.email}) - Created: {user.date_joined}")
