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
                votingProxies: function (VotingProxy) {
                    return VotingProxy.findAll();
                },
                votingShares: function (VotingShare) {
                    return VotingShare.findAll();
                }
            }
        })
        .state('openslides_proxyvoting.delegate.import', {
            url: '/import',
            controller: 'VotingShareImportCtrl',
            resolve: {
                users: function (User) {
                    return User.findAll(); // User.find({ groups_id: 2});  // TODO: limit to Delegate group?
                },
                categories: function (Category) {
                    return Category.findAll();
                },
                votingShares: function (VotingShare) {
                    return VotingShare.findAll();
                }
            }
        })
        .state('openslides_proxyvoting.delegate.attendance', {
            url: '/attendance',
            controller: 'DelegateAttendanceCtrl',
            resolve: {
                categories: function (Category) {
                    return Category.findAll();
                }
            }
        })
        .state('openslides_proxyvoting.absenteevote', {
            url: '/absenteevote',
            abstract: true,
            template: "<ui-view/>"
        })
        .state('openslides_proxyvoting.absenteevote.list', {
            resolve: {
                absenteeVotes: function (AbsenteeVote) {
                    AbsenteeVote.findAll();
                },
                users: function (User) {
                    return User.findAll();
                },
                motions: function (Motion) {
                    return Motion.findAll();
                }
            }
        })
        .state('openslides_proxyvoting.absenteevote.import', {
            url: '/import',
            controller: 'AbsenteevoteImportCtrl',
            resolve: {
                users: function (User) {
                    return User.findAll();
                },
                motions: function (Motion) {
                    return Motion.findAll();
                },
                absenteeVotes: function (AbsenteeVote) {
                    return AbsenteeVote.findAll();
                }
            }
        })
        // TODO: Add, edit absentee vote.
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
                            label: gettextCatalog.getString('Sitznummer'),
                            options: Seat.filter({ orderBy: 'id' }),
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
                            label: gettextCatalog.getString('Vertreten durch'),
                            options: otherDelegates,
                            ngOptions: 'option.id as option.full_name for option in to.options',
                            placeholder: '(' + gettextCatalog.getString('Keine Vertretung') + ')'
                        }
                    },
                    {
                        key: 'mandates_id',
                        type: 'select-multiple',
                        templateOptions: {
                            label: gettextCatalog.getString('Vollmachten für'),
                            options: otherDelegates,
                            ngOptions: 'option.id as option.full_name for option in to.options',
                            placeholder: '(' + gettextCatalog.getString('Keine Vollmachten') + ')'
                        }
                    }
                ];
            }
        }
    }
])
    
.controller('DelegateListCtrl', [
    '$scope',
    'ngDialog',
    'DelegateForm',
    'Delegate',
    'User',
    'Keypad',
    'VotingProxy',
    'Category',
    function ($scope, ngDialog, DelegateForm, Delegate, User, Keypad, VotingProxy, Category) {
        Delegate.bindAll({}, $scope, 'delegates');
        Category.bindAll({}, $scope, 'categories');
        $scope.alert = {};

        // Handle table column sorting.
        $scope.sortColumn = 'last_name';
        $scope.reverse = false;
        $scope.toggleSort = function (column) {
            if ( $scope.sortColumn === column ) {
                $scope.reverse = !$scope.reverse;
            }
            $scope.sortColumn = column;
        };

        // Set up pagination.
        $scope.currentPage = 1;
        $scope.itemsPerPage = 50;
        $scope.limitBegin = 0;
        $scope.pageChanged = function () {
            $scope.limitBegin = ($scope.currentPage - 1) * $scope.itemsPerPage;
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

        // Open edit dialog.
        $scope.openDialog = function (delegate) {
            ngDialog.open(DelegateForm.getDialog(delegate));
        };

        // Count attending, represented and absent delegates.
        $scope.$watch(function () {
            return User.lastModified() + Keypad.lastModified() + VotingProxy.lastModified();
        }, function () {
            $scope.attendingCount = Keypad.filter({ 'user.is_present': true }).length;
            $scope.representedCount = VotingProxy.getAll().length;
            $scope.absentCount = Math.max(0,
                $scope.delegates.length - $scope.attendingCount - $scope.representedCount);
        });
    }
])

.controller('DelegateUpdateCtrl', [
    '$scope',
    '$q',
    'Delegate',
    'User',
    'DelegateForm',
    'delegate',
    function ($scope, $q, Delegate, User, DelegateForm, delegate) {
        var kp = delegate.getKeypad(),
            vp = delegate.getProxy(),
            message,
            onFailed = function (error) {
                for (var e in error.data) {
                    message += e + ': ' + error.data[e] + ' ';
                }
            };

        delegate.keypad_id = kp ? kp.keypad_id : null;
        delegate.seat_id = kp ? kp.seat_id : null;
        delegate.is_present = delegate.user.is_present;
        delegate.proxy_id = vp ? vp.proxy_id : null;
        delegate.mandates_id = delegate.getMandates().map(function (vp) { return vp.delegate_id });

        $scope.alert = {};
        $scope.model = delegate;

        // Get all form fields.
        $scope.formFields = DelegateForm.getFormFields(delegate.id);

        $scope.save = function (delegate) {
            message = '';
            $scope.alert = {};

            // Check for circular proxy reference.
            if (delegate.mandates_id.indexOf(delegate.proxy_id) >= 0) {
                message = User.get(delegate.proxy_id).full_name +
                    ' kann nicht gleichzeitig Vertreter und Vollmachtgeber sein.'
                $scope.alert = {type: 'danger', msg: message, show: true};
                return;
            }

            // Update keypad, proxy, mandates, user and collect their promises.
            var promises = [];
            delegate.updateKeypad(promises, onFailed);
            delegate.updateProxy(promises);
            delegate.updateMandates(promises);

            delegate.user.is_present = delegate.is_present;
            promises.push(User.save(delegate.id));

            // Wait until all promises have been resolved before closing dialog.
            $q.all(promises).then(function () {
                if (message) {
                    $scope.alert = {type: 'danger', msg: message, show: true};
                }
                else {
                    $scope.closeThisDialog();
                }
            });
        };


    }
])

.controller('DelegateAttendanceCtrl', [
    '$scope',
    '$http',
    'Category',
    function ($scope, $http, Category) {
        Category.bindAll({}, $scope, 'categories');

        $http.get('/proxyvoting/attendance/shares/').then(function (success) {
            $scope.attendance = success.data;
        });
    }
])

.controller('VotingShareImportCtrl', [
    '$scope',
    'gettext',
    'VotingShare',
    'User',
    'Category',
    function ($scope, gettext, VotingShare, User, Category) {
        $scope.delegateShares = [];

        // Initialize csv settings.
        $scope.separator = ',';
        $scope.encoding = 'UTF-8';
        $scope.encodingOptions = ['UTF-8', 'ISO-8859-1'];
        $scope.csv = {
            content: null,
            header: true,
            headerVisible: false,
            separator: $scope.separator,
            separatorVisible: false,
            encoding: $scope.encoding,
            encodingVisible: false,
            accept: '.csv, .txt',
            result: null
        };

        // Set csv file encoding.
        $scope.setEncoding = function () {
            $scope.csv.encoding = $scope.encoding;
        };

        // Set csv separator.
        $scope.setSeparator = function () {
            $scope.csv.separator = $scope.separator;
        };

        // Process csv file once it's loaded.
        // csv format: number, first_name, last_name, category, shares
        $scope.$watch('csv.result', function () {
            $scope.delegateShares = [];
            var rePattern = /^"(.*)"$/;
            angular.forEach($scope.csv.result, function (record) {
                var delegateShare = {};

                // Get user data removing text separator (double quotes).
                if (record.number) {
                    delegateShare.number = record.number.replace(rePattern, '$1');
                }
                if (record.first_name) {
                    delegateShare.first_name = record.first_name.replace(rePattern, '$1');
                    delegateShare.last_name = '';
                }
                if (record.last_name) {
                    delegateShare.last_name = record.last_name.replace(rePattern, '$1');
                    if (delegateShare.first_name === undefined) {
                        delegateShare.first_name = '';
                    }
                }

                // Validate user: Does user exist in store?
                var users = User.filter(delegateShare);
                if (users.length == 1) {
                    delegateShare.delegate_id = users[0].id;
                    delegateShare.first_name = users[0].first_name;
                    delegateShare.last_name = users[0].last_name;
                }
                else {
                    delegateShare.importerror = true;
                    delegateShare.user_error = gettext('Error: Delegate not found.');
                }

                // Get and validate category.
                if (record.category) {
                    delegateShare.category = record.category.replace(rePattern, '$1');
                    var cats = Category.filter({name: delegateShare.category});
                    if (cats.length == 1) {
                        delegateShare.category_id = cats[0].id;
                    }
                    else {
                        delegateShare.importerror = true;
                        delegateShare.category_error = gettext('Error: Category not found.');
                    }
                }
                else {
                    delegateShare.importerror = true;
                    delegateShare.category_error = gettext('Error: No category provided.');
                }

                // Get and validate shares.
                if (record.shares) {
                    delegateShare.shares = record.shares.replace(rePattern, '$1');
                    if (isNaN(parseFloat(delegateShare.shares))) {
                        delegateShare.importerror = true;
                        delegateShare.shares_error = gettext('Error: Not a valid number.');
                    }
                }
                else {
                    delegateShare.importerror = true;
                    delegateShare.shares_error = gettext('Error: No number provided.');
                }

                $scope.delegateShares.push(delegateShare);
            });
        });

        // Import validated voting shares.
        $scope.import = function () {
            $scope.csvImporting = true;
            angular.forEach($scope.delegateShares, function (delegateShare) {
                if (!delegateShare.importerror) {
                    var vss = VotingShare.filter({
                        delegate_id: delegateShare.delegate_id,
                        category_id: delegateShare.category_id
                    });
                    if (vss.length == 1) {
                        vss[0].shares = delegateShare.shares;
                        VotingShare.save(vss[0]).then(function (success) {
                            delegateShare.imported = true;
                        });
                    }
                    else {
                        VotingShare.create({
                            delegate_id: delegateShare.delegate_id,
                            category_id: delegateShare.category_id,
                            shares: delegateShare.shares
                        }).then(function (success) {
                            delegateShare.imported = true;
                        });
                    }
                }
            });
            // TODO: only display rows that have not yet been imported
            $scope.csvImported = true;
        };

        // Clear csv import preview.
        $scope.clear = function () {
            $scope.csv.result = null;
        };
    }
])

.controller('AbsenteevoteListCtrl', [
    '$scope',
    'ngDialog',
    'AbsenteeVote',
    function ($scope, ngDialog, AbsenteeVote) {
        AbsenteeVote.bindAll({}, $scope, 'absenteeVotes');
        $scope.alert = {};

        // Handle table column sorting.
        $scope.sortColumn = 'last_name';
        $scope.reverse = false;
        $scope.toggleSort = function (column) {
            if ( $scope.sortColumn === column ) {
                $scope.reverse = !$scope.reverse;
            }
            $scope.sortColumn = column;
        };

        // Define custom search filter string.
        $scope.getFilterString = function (absenteeVote) {
            return [
                absenteeVote.user.full_name,
                absenteeVote.motion_title,
                absenteeVote.vote
            ].join(' ');
        };

        // Set up pagination.
        $scope.currentPage = 1;
        $scope.itemsPerPage = 20;
        $scope.limitBegin = 0;
        $scope.pageChanged = function () {
            $scope.limitBegin = ($scope.currentPage - 1) * $scope.itemsPerPage;
        };

        // *** Delete mode functions. ***
        $scope.isDeleteMode = false;
        // Update all checkboxes.
        $scope.checkAll = function () {
            angular.forEach($scope.absenteeVotes, function (absenteeVote) {
                absenteeVote.selected = $scope.selectedAll;
            });
        };
        // Uncheck all checkboxes if delete mode is closed.
        $scope.uncheckAll = function () {
            if (!$scope.isDeleteMode) {
                $scope.selectedAll = false;
                angular.forEach($scope.absenteeVotes, function (absenteeVote) {
                    absenteeVote.selected = false;
                });
            }
        };
        // Delete selected absentee votes.
        $scope.deleteMultiple = function () {
            angular.forEach($scope.absenteeVotes, function (absenteeVote) {
                if (absenteeVote.selected)
                    AbsenteeVote.destroy(absenteeVote.id);
            });
            $scope.isDeleteMode = false;
            $scope.uncheckAll();
        };
        // Delete single absentee vote.
        $scope.delete = function (absenteeVote) {
            AbsenteeVote.destroy(absenteeVote.id);
        };
    }
])

.controller('AbsenteevoteImportCtrl', [
    '$scope',
    'gettext',
    'AbsenteeVote',
    'User',
    'Motion',
    function ($scope, gettext, AbsenteeVote, User, Motion) {
        $scope.delegateVotes = [];

        // Initialize csv settings.
        $scope.separator = ',';
        $scope.encoding = 'UTF-8';
        $scope.encodingOptions = ['UTF-8', 'ISO-8859-1'];
        $scope.csv = {
            content: null,
            header: true,
            headerVisible: false,
            separator: $scope.separator,
            separatorVisible: false,
            encoding: $scope.encoding,
            encodingVisible: false,
            accept: '.csv, .txt',
            result: null
        };

        // Set csv file encoding.
        $scope.setEncoding = function () {
            $scope.csv.encoding = $scope.encoding;
        };

        // Set csv separator.
        $scope.setSeparator = function () {
            $scope.csv.separator = $scope.separator;
        };
        // Process csv file once it's loaded.
        // csv format: number, first_name, last_name, motion, vote
        // TODO: Add column motion_identifier.
        $scope.$watch('csv.result', function () {
            $scope.delegateVotes = [];
            var rePattern = /^"(.*)"$/;
            angular.forEach($scope.csv.result, function (record) {
                var delegateVote = {};

                // Get user data removing text separator (double quotes).
                if (record.number) {
                    delegateVote.number = record.number.replace(rePattern, '$1');
                }
                if (record.first_name) {
                    delegateVote.first_name = record.first_name.replace(rePattern, '$1');
                    delegateVote.last_name = '';
                }
                if (record.last_name) {
                    delegateVote.last_name = record.last_name.replace(rePattern, '$1');
                    if (delegateVote.first_name === undefined) {
                        delegateVote.first_name = '';
                    }
                }

                // Validate user: Does user exist in store?
                var users = User.filter(delegateVote);
                if (users.length == 1) {
                    delegateVote.delegate_id = users[0].id;
                    delegateVote.first_name = users[0].first_name;
                    delegateVote.last_name = users[0].last_name;
                }
                else {
                    delegateVote.importerror = true;
                    delegateVote.user_error = gettext('Error: Delegate not found.');
                }

                // Get and validate motion.
                if (record.motion) {
                    delegateVote.motion_title = record.motion.replace(rePattern, '$1');
                    angular.forEach(Motion.getAll(), function (motion) {
                        if (motion.getTitle() == this.motion_title) {
                            this.motion_id = motion.id;
                        }
                    }, delegateVote);
                    if (delegateVote.motion_id === undefined) {
                        delegateVote.importerror = true;
                        delegateVote.motion_error = gettext('Error: Motion not found.');
                    }
                }
                else {
                    delegateVote.importerror = true;
                    delegateVote.motion_error = gettext('Error: No motion provided.');
                }

                // Get and validate vote.
                if (record.vote) {
                    delegateVote.vote = record.vote.replace(rePattern, '$1');
                    if (['Y', 'N', 'A'].indexOf(delegateVote.vote) == -1) {
                        delegateVote.importerror = true;
                        delegateVote.vote_error = gettext('Error: Invalid vote.');
                    }
                }
                else {
                    delegateVote.importerror = true;
                    delegateVote.vote_error = gettext('Error: No vote provided.');
                }

                $scope.delegateVotes.push(delegateVote);
            });
        });

        // Import validated absentee votes.
        $scope.import = function () {
            $scope.csvImporting = true;
            angular.forEach($scope.delegateVotes, function (delegateVote) {
                if (!delegateVote.importerror) {
                    var avs = AbsenteeVote.filter({
                        delegate_id: delegateVote.delegate_id,
                        motion_id: delegateVote.motion_id
                    });
                    if (avs.length == 1) {
                        avs[0].vote = delegateVote.vote;
                        AbsenteeVote.save(avs[0]).then(function (success) {
                            delegateVote.imported = true;
                        });
                    }
                    else {
                        AbsenteeVote.create({
                            delegate_id: delegateVote.delegate_id,
                            motion_id: delegateVote.motion_id,
                            vote: delegateVote.vote
                        }).then(function (success) {
                            delegateVote.imported = true;
                        });
                    }
                }
            });
            $scope.csvImported = true;
        };

        // Clear csv import preview.
        $scope.clear = function () {
            $scope.csv.result = null;
        };
    }
])

}());