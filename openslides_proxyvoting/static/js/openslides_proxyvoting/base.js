(function () {

'use strict';

angular.module('OpenSlidesApp.openslides_proxyvoting', [
    'OpenSlidesApp.users',
    'OpenSlidesApp.motions'
])

.factory('VotingProxy', [
    'DS',
    'User',
    function (DS, User) {
        return DS.defineResource({
            name: 'openslides_proxyvoting/votingproxy',
            relations: {
                belongsTo: {
                    'users/user': {
                        localField: 'rep',
                        localKey: 'proxy_id'
                    }
                }
            }
        });
    }
])

.factory('Delegate', [
    'DS',
    'User',
    function (DS, User) {
        return DS.defineResource({
            name: 'openslides_proxyvoting/delegate',
            relations: {
                belongsTo: {
                    'users/user': {
                        localField: 'user',
                        localKey: 'id'
                    },
                    'openslides_proxyvoting/votingproxy': {
                        localField: 'proxy',
                        localKey: 'votingproxy_id'
                    }
                }
            },
            computed: {
                status: function () {
                    return this.getStatus();
                }
            },
            methods: {
                getStatus: function () {
                    if (this.proxy !== undefined) {
                        return 'has_proxy';
                    }
                    if (this.keypad !== null && this.user !== undefined && this.user.is_present) {
                        return 'can_vote';
                    }
                    return 'inactive';
                },
                // TODO: Use a VotingProxy and VotingShare DS in order to get auto updates.
                getShares: function (category_id) {
                    var votingShare = _.find(this.shares, function (shares) {
                        return shares.category_id == category_id;
                    });
                    // FIXME: Allow floating point shares.
                    return votingShare ? votingShare.shares.split('.')[0] : null;
                }
            }
        });
    }
])

.run([
    'VotingProxy',
    'Delegate',
    function (VotingProxy, Delegate) {}
])

}());
