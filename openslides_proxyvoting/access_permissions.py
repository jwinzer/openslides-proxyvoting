from openslides.utils.access_permissions import BaseAccessPermissions


class VotingShareAccessPermissions(BaseAccessPermissions):
    def check_permissions(self, user):
        return user.has_perm('openslides_proxyvoting.can_manage')

    def get_serializer_class(self, user=None):
        from .serializers import VotingShareSerializer
        return VotingShareSerializer


class VotingProxyAccessPermissions(BaseAccessPermissions):
    def check_permissions(self, user):
        return user.has_perm('openslides_proxyvoting.can_manage')

    def get_serializer_class(self, user=None):
        from .serializers import VotingProxySerializer
        return VotingProxySerializer


class AbsenteeVoteAccessPermissions(BaseAccessPermissions):
    def check_permissions(self, user):
        return user.has_perm('openslides_proxyvoting.can_manage')

    def get_serializer_class(self, user=None):
        from .serializers import AbsenteeVoteSerializer
        return AbsenteeVoteSerializer


class DelegateAccessPermissions(BaseAccessPermissions):
    def check_permissions(self, user):
        return user.has_perm('openslides_proxyvoting.can_manage')

    def get_serializer_class(self, user=None):
        from .serializers import DelegateSerializer
        return DelegateSerializer
