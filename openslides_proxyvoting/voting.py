from openslides.users.models import User

from .models import AbsenteeVote, MotionPollBallot, VotingShare


def get_authorized_voter(delegate, proxies=None):
    """
    Find the authorized voter of a delegate by recursively stepping through the proxy chain.

    :param delegate: User object
    :param proxies: List of proxy IDs found so far, used to eliminate circular references
    :return: authorized user (the last one in the proxy chain)
    """
    if hasattr(delegate, 'votingproxy'):
        voter = delegate.votingproxy.proxy
        if proxies is None:
            proxies = []
        elif voter.id in proxies:
            # ERROR: We have a circular reference. Delete the voting proxy to fix it.
            # TODO: log error
            voter.delete()
            return None

        # Add voter id to proxies list.
        proxies.append(voter.id)

        # Recursively step through the proxy chain.
        return get_authorized_voter(voter, proxies)

    # Delegate is only authorized if a keypad has been assigned.
    return delegate if hasattr(delegate, 'keypad') else None


class Ballot:
    """
    Creates, deletes, updates MotionPollBallot objects for a given MotionPoll object.
    Registers votes including proxy votes.
    """

    # TODO: Add un-weighed voting (category=None).
    # TODO: Add shares precision. Proposal: category.name 'MEA-3'

    def __init__(self, poll):
        """
        Creates a Ballot instance for a given MotionPoll object.
        :param poll: MotionPoll
        """
        self.poll = poll
        self.admitted_delegates = None
        self.new_ballots = None
        self.updated = 0
        self._clear_result()

    def delete_ballots(self):
        """
        Deletes all MotionPollBallot objects of the current poll.

        :return: Number of ballots deleted.
        """
        self.updated, l = MotionPollBallot.objects.filter(poll=self.poll).delete()
        self._clear_result()
        return self.updated

    def create_absentee_ballots(self):
        """
        Creates MotionPollBallot objects for all voting delegates who have cast an absentee vote.

        :return: Number of ballots created.
        """
        # Get a list of delegate IDs who have voting rights (shares) for the given motion.
        # TODO: Does the proxy have to be present (user.is_present) for an absentee vote to be counted?
        delegates = User.objects.filter(
            shares__category=self.poll.motion.category,
            shares__shares__gt=0
        ).values_list('id', flat=True)

        qs = AbsenteeVote.objects.filter(
            motion=self.poll.motion, delegate__in=delegates)
        self.updated = 0
        for absentee_vote in qs:
            # TODO: Call bulk_create unless post_save signal is required?
            MotionPollBallot.objects.update_or_create(
                poll=self.poll, delegate=absentee_vote.delegate, defaults={'vote': absentee_vote.vote})
            self.updated += 1
        return self.updated

    def register_vote(self, keypad, vote, commit=True):
        """
        Register a vote and all proxy votes by creating MotionPollBallot objects for the voter and any delegate
        represented by the voter.

        :param keypad: Keypad ID
        :param vote: Vote, typically 'Y', 'N', 'A'
        :param commit: if True saves new MotionPollBallot instances else caches them in self.new_ballots
        :return: Number of ballots created or updated.
        """
        self.commit = commit
        self.updated = 0
        # Get delegate user the keypad is assigned to.
        # NOTE: We allow a delegate to vote even if he has a proxy! The rule is not to assign a keypad to a
        # delegate represented by a proxy but we don't enforce this rule here.
        try:
            voter = User.objects.get(keypad__keypad_id=keypad)
        except User.DoesNotExist:
            # TODO: Log this.
            return self.updated

        # Get a list of delegate IDs who have voting rights (shares) for the given motion and haven't cast an
        # absentee ballot.
        self.admitted_delegates = User.objects.filter(
            shares__category=self.poll.motion.category,
            shares__shares__gt=0
        ).exclude(
            absenteevote__motion=self.poll.motion
        ).values_list('id', flat=True)

        if commit and self.new_ballots is None:
            self.new_ballots = []
        self._register_proxy_votes(voter, vote)
        return self.updated

    def save_ballots(self):
        """
        Bulk saves cached motion poll ballots.
        :return:
        """
        if self.new_ballots:
            MotionPollBallot.objects.bulk_create(self.new_ballots)

    def count_votes(self):
        """
        Counts the votes of all MotionPollBallot objects for the given poll and saves the result
        in a RESULT dictionary.

        :return: Result
        """
        # Create a dict (key: delegate, value: shares).
        # Example: {1: Decimal('1.000000'), 2: Decimal('45.120000'}
        qs = VotingShare.objects.filter(category_id=self.poll.motion.category_id)
        shares = dict(qs.values_list('delegate', 'shares'))

        # Convert the ballots into a list of (delegate, vote) tuples.
        # Example: [(1, 'Y'), (2, 'N')]
        qs = MotionPollBallot.objects.filter(poll=self.poll)
        votes = qs.values_list('delegate', 'vote')

        # Sum up the votes.
        self._clear_result()
        for vote in votes:
            k = vote[1]
            sh = shares[vote[0]]
            self.result[k][0] += 1
            self.result[k][1] += sh
            self.result['casted'][0] += 1
            self.result['casted'][1] += sh
        self.result['valid'] = self.result['casted']
        return self.result

    def _register_proxy_votes(self, voter, vote):
        self._create_ballot(voter, vote)
        for proxy in voter.mandates.all():
            self._register_proxy_votes(proxy.delegate, vote)

    def _create_ballot(self, delegate, vote):
        if delegate.id in self.admitted_delegates:
            try:
                mpb = MotionPollBallot.objects.get(poll=self.poll, delegate=delegate)
                mpb.vote = vote
                mpb.save()
            except MotionPollBallot.DoesNotExist:
                mpb = MotionPollBallot(poll=self.poll, delegate=delegate)
            mpb.vote = vote
            if mpb.pk or self.new_ballots is None:
                mpb.save()
            else:
                self.new_ballots.append(mpb)
            self.updated += 1

    def _clear_result(self):
        from decimal import Decimal
        self.result = {
            'Y': [0, Decimal(0)],  # [heads, shares]
            'N': [0, Decimal(0)],
            'A': [0, Decimal(0)],
            'casted': [0, Decimal(0)],
            'valid': [0, Decimal(0)],
            'invalid': [0, Decimal(0)]
        }

