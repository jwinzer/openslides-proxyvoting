from django.apps import AppConfig

from . import __description__, __verbose_name__, __version__


class ProxyVotingAppConfig(AppConfig):
    name = 'openslides_proxyvoting'
    verbose_name = __verbose_name__
    description = __description__
    version = __version__
    angular_site_module = True
    angular_projector_module = False
    js_files = [
        'static/js/openslides_proxyvoting/site.js',
        'static/js/openslides_proxyvoting/base.js'
    ]

    def ready(self):
        from openslides.core.signals import post_permission_creation
        from openslides.utils.rest_api import router
        from .signals import add_permissions_to_builtin_groups
        from .views import (
            AbsenteeVoteViewSet,
            DelegateViewSet,
            VotingShareViewSet,
            VotingProxyViewSet
        )

        # Connect signals.
        post_permission_creation.connect(
            add_permissions_to_builtin_groups,
            dispatch_uid='proxyvoting_add_permissions_to_builtin_groups'
        )

        # Register viewsets.
        router.register(self.get_model('VotingShare').get_collection_string(), VotingShareViewSet)
        router.register(self.get_model('VotingProxy').get_collection_string(), VotingProxyViewSet)
        router.register(self.get_model('AbsenteeVote').get_collection_string(), AbsenteeVoteViewSet)
        router.register('openslides_proxyvoting/delegate', DelegateViewSet, 'delegate')

        # TODO: Provide plugin urlpatterns to application configuration

