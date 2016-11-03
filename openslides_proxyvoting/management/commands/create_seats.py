from django.core.management.base import LabelCommand

from openslides_votecollector.models import Seat


class Command(LabelCommand):
    help = 'Create seating plan.'

    def handle_label(self, label, **options):
        # Delete all seats.
        Seat.objects.all().delete()

        # Create rows of seats
        try:
            limit = int(label)
        except ValueError:
            limit = None
        seats = []
        number = 1
        for row in range(1, 11):
            for col in (1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23,):
                seats.append(Seat(
                    pk=number,
                    number=number,
                    seating_plan_x_axis=col,
                    seating_plan_y_axis=row
                ))
                number += 1
                if number > limit:
                    break
            if number > limit:
                break

        Seat.objects.bulk_create(seats)
        print('Created %d seats' % Seat.objects.count())
