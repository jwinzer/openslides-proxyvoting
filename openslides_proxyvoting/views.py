from decimal import Decimal

from django.http.response import JsonResponse
from django.shortcuts import Http404
from django.views import View
from rest_framework.response import Response

from openslides.motions.models import Category
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
from .voting import find_authorized_voter, is_registered


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
        # Delegates are users belonging to the Delegates group.
        qs = User.objects.filter(groups=2)
        serializer = DelegateSerializer(qs, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        raise Http404


class AttendanceView(View):
    http_method_names = ['get']

    def get(self, request):
        total_shares = {
            'heads': [0, 0, 0, 0]  # [all, attending, in person, represented]
        }
        categories = Category.objects.values_list('name', flat=True)
        for cat in categories:
            total_shares[cat] = [Decimal(0), Decimal(0), Decimal(0), Decimal(0)]

        qs = User.objects.filter(groups=2)
        for delegate in qs:
            # Exclude delegates without shares who are only proxies.
            if not VotingShare.objects.filter(delegate=delegate, shares__gt=0).exists():
                continue

            total_shares['heads'][0] += 1

            # Find the authorized voter.
            auth_voter = find_authorized_voter(delegate)

            # If auth_voter is delegate himself set index to 2 (in person) else 3 (represented).
            i = 2 if auth_voter == delegate else 3
            attending = is_registered(auth_voter)
            if attending:
                total_shares['heads'][i] += 1

            # Add shares to total.
            qs = VotingShare.objects.filter(delegate=delegate).prefetch_related('category')
            for vs in qs:
                total_shares[vs.category.name][0] += vs.shares
                if attending:
                    total_shares[vs.category.name][i] += vs.shares

        for k in total_shares.keys():
            total_shares[k][1] = total_shares[k][2] + total_shares[k][3]

        return JsonResponse(total_shares)
