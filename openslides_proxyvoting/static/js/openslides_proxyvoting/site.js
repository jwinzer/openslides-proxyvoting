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
                keypads: function (Keypad) {
                    return Keypad.findAll();
                },
                seats: function (Seat) {
                    return Seat.findAll();
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
    'gettextCatalog',
    'User',
    'Seat',
    function (gettextCatalog, User, Seat) {
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
                var otherDelegates = User.filter({
                    where: {
                        id: {
                            '!=': id
                        },
                        groups_id : 2
                    },
                    orderBy: ['last_name', 'first_name']
                });
                return [
                    {
                        key: 'keypad_id',
                        type: 'input',
                        templateOptions: {
                            label: gettextCatalog.getString('Keypad ID'),
                            type: 'number',
                        }
                    },
                    {
                        key: 'seat_id',
                        type: 'select-single',
                        templateOptions: {
                            label: gettextCatalog.getString('Seat'),
                            options: Seat.getAll(),
                            ngOptions: 'option.id as option.number for option in to.options',
                            placeholder: gettextCatalog.getString('--- Select seat ---')
                        }
                    },
                    {
                        key: 'is_present',
                        type: 'checkbox',
                        templateOptions: {
                            label: gettextCatalog.getString('Present')
                        }
                    },
                    {
                        key: 'proxy_id',
                        type: 'select-single',
                        templateOptions: {
                            label: gettextCatalog.getString('Represented by (proxy)'),
                            options: otherDelegates,
                            ngOptions: 'option.id as option.full_name for option in to.options',
                            placeholder: '(' + gettextCatalog.getString('No proxy') + ')'
                        }
                    },
                    {
                        key: 'mandates_id',
                        type: 'select-multiple',
                        templateOptions: {
                            label: gettextCatalog.getString('Mandates'),
                            options: otherDelegates,
                            ngOptions: 'option.id as option.full_name for option in to.options',
                            placeholder: '(' + gettextCatalog.getString('No mandates') + ')'
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
            var rep = '', keypad = '', vp = delegate.getProxy();
            if (vp) {
                rep = vp.rep.full_name;
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
        //$scope.registered = function () {
        //    var count = 0;
        //    Delegate.getAll().forEach(function (delegate) {
        //        if (delegate.getProxy() === null && delegate.user.is_present && delegate.keypad !== null) {
        //            count++;
        //        }
        //    })
        //    return count;
        //};

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
    'User',
    'DelegateForm',
    'delegate',
    function ($scope, Delegate, User, DelegateForm, delegate) {
        $scope.alert = {};

        var kp = delegate.getKeypad(),
            vp = delegate.getProxy();
        delegate.keypad_id = kp ? kp.keypad_id : null;
        delegate.seat_id = kp ? kp.seat_id : null;
        delegate.is_present = delegate.user.is_present;
        delegate.proxy_id = vp ? vp.proxy_id : null;
        delegate.mandates_id = delegate.getMandates().map(function (vp) { return vp.delegate_id });

        $scope.model = delegate;

        // Get all form fields.
        $scope.formFields = DelegateForm.getFormFields(delegate.id);

        $scope.save = function (delegate) {
            delegate.updateKeypad();
            delegate.updateMandates();
            delegate.updateProxy();

            delegate.user.is_present = delegate.is_present;
            User.save(delegate.id);

            // TODO: call save after all is done to validate. Process failure.
            Delegate.save(delegate);


            $scope.closeThisDialog();
        };
    }
])

}());