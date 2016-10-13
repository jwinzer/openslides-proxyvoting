from django.db import IntegrityError
from django.core.management.base import BaseCommand

from openslides.motions.models import Category, Motion, MotionPoll
from openslides.users.models import User, Group
from openslides_proxyvoting import models
from openslides_votecollector.models import Keypad


class Command(BaseCommand):
    help = 'Create test data.'

    def handle(self, *args, **options):
        # Create categories.
        categories = (
            (1, 'Objekte'),
            (2, 'MEA'),
        )
        for c in categories:
            try:
                cat = Category(pk=c[0], name=c[1])
                cat.save()
                print('Created %s' % cat)
            except IntegrityError:
                pass

        # Delete and create delegates.
        count, o = User.objects.filter(groups__name='Delegates').delete()
        models.VotingShare.objects.all().delete()
        print('>> Deleted %d delegates' % count)
        delegates = (
            (10, 'Adam', 'Apfel', 1, 10.10),
            (11, 'Bert', 'Brenner', 2, 11.11),
            (12, 'Chris', 'Christ', 0, 12.12),
            (20, 'Dorothee', 'Dörner', 4, 0),
            (21, 'Elisabeth', 'Engler', 3, 21.21),
            (22, 'Frieda', 'Fischer', 2, 22.22),
        )
        delegates_group = Group.objects.get(name='Delegates')
        for d in delegates:
            user = User(id=d[0], username=d[1], last_name=d[1], first_name=d[2], is_active=True, is_present=True)
            user.save()
            user.groups.add(delegates_group)
            user.save()
            print('Created %s' % user)
            vs = models.VotingShare(delegate=user, category_id=1, shares=d[3])
            vs.save()
            print('Created %s' % vs)
            vs = models.VotingShare(delegate=user, category_id=2, shares=d[4])
            vs.save()
            print('Created %s' % vs)

        # Delete and create keypads.
        count, o = Keypad.objects.all().delete()
        print('>> Deleted %d keypads' % count)
        for d in delegates:
            kp = Keypad(user_id=d[0], keypad_id=d[0] + 100, seat_id=d[0])
            kp.save()
            print('Created %s' % kp)
