(function () {

'use strict';

angular.module('OpenSlidesApp.openslides_proxyvoting', [
    'OpenSlidesApp.users',
    'OpenSlidesApp.motions',
    'OpenSlidesApp.openslides_votecollector'
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

.factory('DelegateUpdate', [
    // TODO: remove?
    'Delegate',
    'VotingProxy',
    function (Delegate, VotingProxy) {
        return {
            saveProxy: function (delegate) {
                var vp = delegate.getProxy();
                if (delegate.proxy_id) {
                    if (vp) {
                        // Update vp.
                        vp.proxy_id = delegate.proxy_id;
                        VotingProxy.save(vp).then(
                            function (vp) {
                                Delegate.save(delegate);
                            }
                        );
                    }
                    else {
                        // Create vp.
                        VotingProxy.create(
                            { delegate_id: delegate.id, proxy_id: delegate.proxy_id },
                            { cacheResponse: true }
                        ).then(
                            function (vp) {
                                Delegate.save(delegate);
                            }
                        );
                    }
                }
                else if (vp) {
                    // Destroy vp.
                    VotingProxy.destroy(vp).then(
                        function (id) {
                            Delegate.save(delegate);
                        }
                    );
                }
                Delegate.save(delegate);
            }
        }
    }
])

.factory('Delegate', [
    'DS',
    'User',
    'Keypad',
    'VotingProxy',
    function (DS, User, Keypad, VotingProxy) {
        return DS.defineResource({
            name: 'openslides_proxyvoting/delegate',
            relations: {
                belongsTo: {
                    'users/user': {
                        localField: 'user',
                        localKey: 'id'
                    }
                }
            },
            computed: {
                // computed is not updated when proxies change
                proxy: function () {
                    return this.getProxy();
                },
                keypad: function () {
                    return this.getKeypad();
                },
                status: function () {
                    return this.getStatus();
                }
            },
            methods: {
                getStatus: function () {
                    if (this.getProxy() !== null) {
                        return 'has_proxy';
                    }
                    if (this.getKeypad() !== null && this.user !== undefined && this.user.is_present) {
                        return 'can_vote';
                    }
                    return 'inactive';
                },
                getKeypad: function () {
                    var kps = Keypad.filter({ user_id: this.id });
                    return kps.length > 0 ? kps[0] : null;
                },
                getProxy: function () {
                    var vps = VotingProxy.filter({ delegate_id: this.id });
                    return vps.length > 0 ? vps[0] : null;
                },
                getMandates: function () {
                    return VotingProxy.filter({ proxy_id: this.id })
                },
                updateKeypad: function () {
                    // Update keypad with this.keypad_id, this.seat.
                    // TODO: Catch create/save failures.
                    var kp = this.getKeypad();
                    if (this.keypad_id) {
                        if (kp) {
                            // Update keypad.
                            kp.keypad_id = this.keypad_id;
                            kp.seat_id = this.seat_id;
                            Keypad.save(kp);
                        }
                        else {
                            // Create keypad.
                            Keypad.create({
                                user_id: this.id,
                                keypad_id: this.keypad_id,
                                seat_id: this.seat_id
                            });
                        }
                    }
                    else if (kp) {
                        // Destroy keypad.
                        Keypad.destroy(kp);
                    }
                },
                updateProxy: function () {
                    // Update proxy to this.proxy_id.
                    var vp = this.getProxy();
                    if (this.proxy_id) {
                        if (vp) {
                            // Update vp.
                            vp.proxy_id = this.proxy_id;
                            VotingProxy.save(vp);
                        }
                        else {
                            // Create vp.
                            VotingProxy.create({
                                delegate_id: this.id,
                                proxy_id: this.proxy_id
                            });
                        }
                    }
                    else if (vp) {
                        // Destroy vp.
                        VotingProxy.destroy(vp);
                    }
                },
                deleteAllMandates: function () {
                    var mandates = this.getMandates();
                    for (var i = 0; i < mandates.length; i++) {
                        VotingProxy.destroy(mandates[i]);
                    }
                },
                updateMandates: function () {
                    // Update mandates to this.mandates_id list.
                    // Re-use existing mandates.
                    var m = 0,
                        mandates = VotingProxy.filter({
                        where: {
                            delegate_id: {
                                'notIn': this.mandates_id
                            },
                            proxy_id: {
                                '==': this.id
                            }
                        }
                    });
                    for (var i = 0; i < this.mandates_id.length; i++) {
                        var id = this.mandates_id[i],
                            vps = VotingProxy.filter({ delegate_id: id });
                        if (vps.length > 0) {
                            // Update existing foreign mandate.
                            vps[0].proxy_id = this.id;
                            VotingProxy.save(vps[0]);
                        }
                        else if (m < mandates.length) {
                            // Update existing mandate.
                            var vp = mandates[m++];
                            vp.delegate_id = id;
                            vp.proxy_id = this.id;
                            VotingProxy.save(vp);
                        }
                        else {
                            // Create new mandate.
                            VotingProxy.create({
                                delegate_id: id,
                                proxy_id: this.id
                            });
                        }
                    };

                    // Delete left-over mandates.
                    for (; m < mandates.length; m++) {
                        VotingProxy.destroy(mandates[m].id);
                    }
                },
                getShares: function (category_id) {
                    var votingShare = _.find(this.shares, function (shares) {
                        return shares.category_id == category_id;
                    });
                    // FIXME: Allow floating point shares.
                    return votingShare !== undefined ? votingShare.shares.split('.')[0] : null;
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
