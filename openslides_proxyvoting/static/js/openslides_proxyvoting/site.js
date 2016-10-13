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
            resolve: {
                delegates: function (Delegate) {
                    return Delegate.findAll();
                },
                users: function (User) {
                    return User.findAll();
                },
                categories: function (Category) {
                    return Category.findAll();
                },
                proxies: function (VotingProxy) {
                    return VotingProxy.findAll();
                }
            }
        })
    }
])
    
// Service for generic delegate form (update only)
.factory('DelegateForm', [
    'Delegate',
    'User',
    'Keypad',
    function (Delegate, User, Keypad) {
        return {
            getDialog: function (delegate) {
                return {
                    template: 'static/templates/openslides_proxyvoting/delegate-form.html',
                    controller: 'DelegateUpdateCtrl',
                    className: 'ngdialog-theme-default',
                    closeByEscape: false,
                    closeByDocument: false,
                    resolve: {
                        delegate: function () {
                            return delegate;
                        }
                    }
                }
            },
            getFormFields: function (id) {
                var reps = User.filter({
                    where: {
                        id: {
                            '!=': id
                        },
                        groups_id : 2
                    },
                    orderBy: ['last_name', 'first_name']
                });
                return [
                    //{
                    //    key: 'keypad.keypad_id',
                    //    type: 'input',
                    //    templateOptions: {
                    //        label: 'Keypad ID',
                    //        type: 'number',
                    //        required: true
                    //    }
                    //},
                    {
                        key: 'proxy_id',
                        type: 'select-single',
                        templateOptions: {
                            label: 'Representative',
                            options: reps,
                            ngOptions: 'option.id as option.full_name for option in to.options',
                            placeholder: '(Representative)'
                        }
                    }
                ];
            }
        }
    }
])
    
.controller('DelegateListCtrl', [
    '$scope',
    '$http',
    'ngDialog',
    'DelegateForm',
    'Delegate',
    'VotingProxy',
    'User',
    'Category',
    function ($scope, $http, ngDialog, DelegateForm, Delegate, VotingProxy, User, Category) {
        Delegate.bindAll({}, $scope, 'delegates');
        // User.bindAll({}, $scope, 'users');
        Category.bindAll({}, $scope, 'categories');
        $scope.alert = {};

        // Set up table sorting.
        $scope.sortColumn = 'delegate';
        $scope.reverse = false;
        $scope.toggleSort = function (column) {
            if ( $scope.sortColumn === column ) {
                $scope.reverse = !$scope.reverse;
            }
            $scope.sortColumn = column;
        };

        // Define custom search filter string.
        $scope.getFilterString = function (delegate) {
            var rep = '', keypad = '';
            if (delegate.proxy) {
                rep = delegate.proxy.rep.full_name;
            }
            if (delegate.keypad) {
                keypad = delegate.keypad.keypad_id;
            }
            return [
                delegate.user.full_name,
                rep,
                keypad
            ].join(' ');
        };

        // Count registered delegates, i.e. delegates without proxy and present with keypad.
        $scope.registered = Delegate.filter({
            where: {
                proxy: {
                    '===': null
                },
                'user.is_present': true,
                keypad: {
                    '!==': null
                }
            }
        }).length;

        // Count represented delegates, i.e. delegates with a proxy.
        $scope.represented = Delegate.filter({
            where: {
                proxy: {
                    '!==': null
                }
            }
        }).length;
        
        // Open edit dialog.
        $scope.openDialog = function (delegate) {
            ngDialog.open(DelegateForm.getDialog(delegate));
        };
    }
])

.controller('DelegateUpdateCtrl', [
    '$scope',
    'Delegate',
    'VotingProxy',
    'DelegateForm',
    'delegate',
    function ($scope, Delegate, VotingProxy, DelegateForm, delegate) {
        $scope.alert = {};

        $scope.model = {
            id: delegate.id,
            user: delegate.user,
            votingproxy_id: delegate.votingproxy_id
        }
        if (delegate.proxy) {
            $scope.model.proxy_id = delegate.proxy.proxy_id;
        }

        // Get all form fields.
        $scope.formFields = DelegateForm.getFormFields(delegate.id);

        $scope.save = function (delegate) {
            if (delegate.votingproxy_id) {
                var proxy = VotingProxy.get(delegate.votingproxy_id);
                if (delegate.proxy_id) {
                    proxy.proxy_id = delegate.proxy_id;
                    // TODO: handle save failure, do not close dialog
                    VotingProxy.save(proxy);
                }
                else {
                    VotingProxy.destroy(proxy).then(
                        function (id) {
                            delegate.votingproxy_id = undefined;
                            Delegate.inject(delegate);
                        }
                    );
                }
            }
            else {
                VotingProxy.create(
                    { delegate_id: delegate.id, proxy_id: delegate.proxy_id },
                    { cacheResponse: true }).then(
                    function (proxy) {
                        delegate.votingproxy_id = proxy.id;
                        delegate.proxy = proxy;
                        Delegate.inject(delegate);
                    }
                );
            }

            $scope.closeThisDialog();
        };
    }
])

}());