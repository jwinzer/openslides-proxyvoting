(function () {

'use strict';

angular.module('OpenSlidesApp.openslides_proxyvoting.site', [
    'OpenSlidesApp.openslides_proxyvoting'
])

.config([
    'mainMenuProvider',
    'gettext',
    function (mainMenuProvider, gettext) {
        mainMenuProvider.register({
            'ui_sref': 'openslides_proxyvoting.delegate.list',
            'img_class': 'thumbs-o-up',
            'title': 'Stimmrechte',
            'weight': 510,
            'perm': 'openslides_proxyvoting.can_manage'
        });
    }
])

.config([
    '$stateProvider',
    function ($stateProvider) {
        $stateProvider
        .state('openslides_proxyvoting', {
            url: '/proxyvoting',
            abstract: true,
            template: "<ui-view/>"
        })
        .state('openslides_proxyvoting.delegate', {
            abstract: true,
            template: "<ui-view/>"
        })
        .state('openslides_proxyvoting.delegate.list', {

        })
    }
])

}());