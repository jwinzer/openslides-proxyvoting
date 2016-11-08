from django.db import models

from openslides.motions.models import Category, Motion, MotionPoll
from openslides.users.models import User
from openslides.utils.models import RESTModelMixin

from .access_permissions import (
    AbsenteeVoteAccessPermissions,
    VotingShareAccessPermissions,
    VotingProxyAccessPermissions,
)


class VotingShare(RESTModelMixin, models.Model):
    access_permissions = VotingShareAccessPermissions()

    delegate = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shares')
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    shares = models.DecimalField(max_digits=15, decimal_places=6)

    class Meta:
        default_permissions = ()
        unique_together = ('delegate', 'category')

    def __str__(self):
        return '%s, %s, %s' % (self.delegate, self.category, self.shares)


class VotingProxy(RESTModelMixin, models.Model):
    access_permissions = VotingProxyAccessPermissions()

    delegate = models.OneToOneField(User, on_delete=models.CASCADE)
    proxy = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mandates')

    class Meta:
        default_permissions = ()
        # TODO: Review permissions.
        permissions = (
            ('can_manage', 'Can manage proxy voting'),
        )

    def __str__(self):
        return '%s >> %s' % (self.delegate, self.proxy)


class AbsenteeVote(RESTModelMixin, models.Model):
    access_permissions = AbsenteeVoteAccessPermissions()

    motion = models.ForeignKey(Motion, on_delete=models.CASCADE)
    delegate = models.ForeignKey(User, on_delete=models.CASCADE)
    vote = models.CharField(max_length=1)

    class Meta:
        default_permissions = ()
        unique_together = ('motion', 'delegate')

    def __str__(self):
        return '%s, %s, %s' % (self.motion, self.delegate, self.vote)


class MotionPollBallot(models.Model):
    poll = models.ForeignKey(MotionPoll, on_delete=models.CASCADE)
    delegate = models.ForeignKey(User, on_delete=models.CASCADE, related_name='delegate_set')
    # voter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='voter_set')
    # keypad = models.IntegerField(default=0)
    vote = models.CharField(max_length=1, blank=True)
    # shares = models.DecimalField(max_digits=15, decimal_places=6)

    class Meta:
        default_permissions = ()
        unique_together = ('poll', 'delegate')

    def __str__(self):
        return '%s, %s, %s' % (self.poll, self.delegate, self.vote)
