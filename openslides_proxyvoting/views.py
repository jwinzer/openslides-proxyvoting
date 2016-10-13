from rest_framework.response import Response

from openslides.users.models import User
from openslides.utils.rest_api import ModelViewSet

from .access_permissions import (
    AbsenteeVoteAccessPermissions,
    DelegateAccessPermissions,
    VotingProxyAccessPermissions,
    VotingShareAccessPermissions
)
from .models import AbsenteeVote, VotingProxy, VotingShare
from .serializers import DelegateSerializer


class VotingShareViewSet(ModelViewSet):
    access_permissions = VotingShareAccessPermissions()
    queryset = VotingShare.objects.all()

    def check_view_permissions(self):
        return self.get_access_permissions().check_permissions(self.request.user)


class VotingProxyViewSet(ModelViewSet):
    access_permissions = VotingProxyAccessPermissions()
    queryset = VotingProxy.objects.all()

    def check_view_permissions(self):
        return self.get_access_permissions().check_permissions(self.request.user)


class AbsenteeVoteViewSet(ModelViewSet):
    access_permissions = AbsenteeVoteAccessPermissions()
    queryset = AbsenteeVote.objects.all()

    def check_view_permissions(self):
        return self.get_access_permissions().check_permissions(self.request.user)


class DelegateViewSet(ModelViewSet):
    access_permissions = DelegateAccessPermissions()
    queryset = User.objects.all()

    def check_view_permissions(self):
        return self.get_access_permissions().check_permissions(self.request.user)

    def list(self, request, *args, **kwargs):
        # NOTE: Override is necessary otherwise related fields are not listed.
        # TODO: Limit users to delegates group?
        qs = User.objects.filter(groups=2)
        serializer = DelegateSerializer(qs, many=True)
        return Response(serializer.data)
