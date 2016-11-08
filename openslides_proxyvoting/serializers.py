from rest_framework import serializers

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
        fields = ('id', 'delegate', 'proxy', )


class AbsenteeVoteSerializer(ModelSerializer):
    class Meta:
        model = AbsenteeVote
        fields = ('id', 'motion', 'delegate', 'vote', )


class DelegateSerializer(ModelSerializer):
    proxy_id = serializers.IntegerField(source='votingproxy.proxy_id', allow_null=True)

    class Meta:
        model = User
        fields = ('id', 'proxy_id', )
        read_only_fields = ('id', 'proxy_id', )
