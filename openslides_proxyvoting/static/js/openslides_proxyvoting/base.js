(function () {

'use strict';

angular.module('OpenSlidesApp.openslides_proxyvoting', [
    'OpenSlidesApp.users',
    'OpenSlidesApp.motions',
    'OpenSlidesApp.openslides_votecollector'
])

.factory('VotingShare', [
    'DS',
    'User',
    'Category',
    function (DS, User, Category) {
        return DS.defineResource({
            name: 'openslides_proxyvoting/votingshare',
            relations: {
                belongsTo: {
                    'users/user': {
                        localField: 'user',
                        localKey: 'delegate_id'
                    },
                    'motions/category': {
                        localField: 'category',
                        localKey: 'category_id'
                    }
                }
            }
        });
    }
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

.factory('AbsenteeVote', [
    'DS',
    'User',
    'Motion',
    function (DS, User, Motion) {
        return DS.defineResource({
            name: 'openslides_proxyvoting/absenteevote',
            relations: {
                belongsTo: {
                    'users/user': {
                        localField: 'user',
                        localKey: 'delegate_id'
                    },
                    'motions/motion': {
                        localField: 'motion',
                        localKey: 'motion_id'
                    }
                }
            },
            computed: {
                motion_title: function () {
                    return this.motion !== undefined ? this.motion.getTitle() : null;
                }
            }
        });
    }
])

.factory('Delegate', [
    'DS',
    'User',
    'Keypad',
    'VotingProxy',
    'VotingShare',
    function (DS, User, Keypad, VotingProxy, VotingShare) {
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
                updateKeypad: function (promises, onFailed) {
                    // Update keypad with this.keypad_id, this.seat.
                    var kp = this.getKeypad();
                    if (this.keypad_id) {
                        if (kp) {
                            // Update keypad.
                            kp.keypad_id = this.keypad_id;
                            kp.seat_id = this.seat_id;
                            promises.push(Keypad.save(kp).then(null, function (error) {
                                onFailed(error);
                                Keypad.refresh(kp);
                            }));
                        }
                        else {
                            // Create keypad.
                            promises.push(Keypad.create({
                                user_id: this.id,
                                keypad_id: this.keypad_id,
                                seat_id: this.seat_id
                            }).then(null, onFailed));
                        }
                    }
                    else if (kp) {
                        // Destroy keypad.
                        promises.push(Keypad.destroy(kp));
                    }
                },
                updateProxy: function (promises) {
                    // Update proxy to this.proxy_id.
                    var vp = this.getProxy();
                    if (this.proxy_id) {
                        if (vp) {
                            // Update vp.
                            vp.proxy_id = this.proxy_id;
                            promises.push(VotingProxy.save(vp));
                        }
                        else {
                            // Create vp.
                            promises.push(VotingProxy.create({
                                delegate_id: this.id,
                                proxy_id: this.proxy_id
                            }));
                        }
                    }
                    else if (vp) {
                        // Destroy vp.
                        promises.push(VotingProxy.destroy(vp));
                    }
                },
                deleteAllMandates: function (promises) {
                    angular.forEach(this.getMandates(), function (vp) {
                        promises.push(VotingProxy.destroy(vp));
                    });
                },
                updateMandates: function (promises) {
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
                    angular.forEach(this.mandates_id, function (id) {
                        var vps = VotingProxy.filter({ delegate_id: id });
                        if (vps.length > 0) {
                            // Update existing foreign mandate.
                            vps[0].proxy_id = this.id;
                            promises.push(VotingProxy.save(vps[0]));
                        }
                        else if (m < mandates.length) {
                            // Update existing mandate.
                            var vp = mandates[m++];
                            vp.delegate_id = id;
                            vp.proxy_id = this.id;
                            promises.push(VotingProxy.save(vp));
                        }
                        else {
                            // Create new mandate.
                            promises.push(VotingProxy.create({
                                delegate_id: id,
                                proxy_id: this.id
                            }));
                        }
                    }, this);

                    // Delete left-over mandates.
                    for (; m < mandates.length; m++) {
                        promises.push(VotingProxy.destroy(mandates[m].id));
                    }
                },
                getShares: function (category_id) {
                    var vss = VotingShare.filter({
                        delegate_id: this.id,
                        category_id: category_id
                    });
                    return vss.length == 1 ? vss[0].shares : null;
                }
            }
        });
    }
])

.run([
    'VotingShare',
    'VotingProxy',
    'AbsenteeVote',
    'Delegate',
    function (VotingShare, VotingProxy, AbsenteeVote, Delegate) {}
])

}());
