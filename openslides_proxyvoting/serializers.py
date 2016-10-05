from openslides.users.models import User
from openslides.utils.rest_api import ModelSerializer

from .models import AbsenteeVote, VotingProxy, VotingShare


class VotingShareSerializer(ModelSerializer):
    class Meta:
        model = VotingShare
        fields = ('id', 'delegate', 'category', 'shares', )


class VotingProxySerializer(ModelSerializer):
    class Meta:
        model = VotingProxy
        fields = ('delegate', 'proxy', )


class AbsenteeVoteSerializer(ModelSerializer):
    class Meta:
        model = AbsenteeVote
        fields = ('id', 'motion', 'delegate', 'vote', )


class DelegateSerializer(ModelSerializer):
    votingproxy = VotingProxySerializer(read_only=True)
    shares = VotingShareSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ('id', 'votingproxy', 'shares', )
