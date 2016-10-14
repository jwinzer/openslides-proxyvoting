from rest_framework import serializers

from openslides.users.models import User
from openslides.utils.rest_api import ModelSerializer
from openslides_votecollector.serializers import KeypadSerializer

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
    # TODO: allow only get
    # votingproxy = VotingProxySerializer(read_only=True)
    shares = VotingShareSerializer(many=True, read_only=True)
    # keypad = KeypadSerializer(read_only=True)

    # votingproxy_id = serializers.IntegerField(source='votingproxy.id', allow_null=True)

    class Meta:
        model = User
        fields = ('id', 'shares', )

    def create(self, validated_data):
        return None

    def update(self, instance, validated_data):
        # TODO: validate proxy and mandates
        from openslides.utils.autoupdate import inform_changed_data
        # inform_changed_data(instance)
        return instance

