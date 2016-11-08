from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^proxyvoting/attendance/shares/$',
        views.AttendanceView.as_view(),
        name='attendance')
]
