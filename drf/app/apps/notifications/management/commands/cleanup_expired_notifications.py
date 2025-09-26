from django.core.management.base import BaseCommand
from apps.notifications.services import NotificationService


class Command(BaseCommand):
    help = 'Cleanup expired notifications'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be cleaned up without actually doing it',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No changes will be made')
            )
            # In dry run mode, we would just count expired notifications
            # For now, we'll just show the command
            self.stdout.write('Would cleanup expired notifications')
        else:
            try:
                result = NotificationService.cleanup_expired_notifications()
                self.stdout.write(
                    self.style.SUCCESS(f'Success: {result}')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error: {str(e)}')
                )
