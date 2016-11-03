from django.core.management.base import LabelCommand

from openslides.users.models import User
from openslides_votecollector.models import Seat


class Command(LabelCommand):
    help = 'Create seating plan.'

    def handle_label(self, label, **options):
        count = User.objects.exclude(keypad=None).update(is_present=label)
        print('Set is_present to %s on %d rows' % (label, count))
