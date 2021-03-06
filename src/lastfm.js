var config = require('../config'),
    request = require('request'),
	async = require('async');

class LastFmController {
    constructor(options) {
        var that = this;
        this.pollRecentTrackCb = options.pollRecentTrackCb.bind(this);
        this.pollMyRecentTrack();
        this.pollMyTopAlbums();

        this.pollFriendsRecentTracksCb = options.pollFriendsRecentTracksCb.bind(this);
        this.getFriendsList(config.lastfm.username, function(err) {
            if (err) {
                throw new Error(err);
            }
            that.pollFriendsRecentTracks();
        });
        this.recentTracks = {};
        this.websocketListeners = 0;
    }

    getFriendsList(username, cb) {
        var that = this;
        var getFriendsQueryString = `https://ws.audioscrobbler.com/2.0/?method=user.getfriends&user=${username}&api_key=${config.lastfm.apiKey}&format=json`;
        request(getFriendsQueryString, function(err, response, body) {
            if (err) {
                return cb(err);
            }
            if (response.statusCode === 200) {
                var friendsList = JSON.parse(body).friends.user;
                friendsList.forEach(function(friend, index, friends) {
                    delete friend.bootstrap;
                    delete friend.country;
                    friend.image = friend.image.find(function(image) {
                        return image.size === "large";
                    });
                    delete friend.playcount;
                    delete friend.playlists;
                    delete friend.registered;
                    delete friend.subscriber;
                    delete friend.type;

                    friends[index] = friend;
                    that.friends = friends;
                });
                return cb();
            } else {
                return cb(response.statusMessage);
            }
        });
    }

    loadMyRecentTrack() {
        return Object.values(this.recentTracks).filter(recentTrack => typeof recentTrack.recenttrack === "undefined")[0];
    }

    getRecentTrack(username, cb) {
        var queryString = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${config.lastfm.apiKey}&format=json&limit=1`;
        request(queryString, function(err, response, body) {
            if (err) {
                return cb(err, username);
            }
            var body = JSON.parse(body);
            if (body.error) {
                if (config.devMode) {
                    console.log(body.message);
                }
                return cb(body.message, username);
            }
            if (response.statusCode === 200) {
                var recentTrack = body;
                recentTrack = recentTrack.recenttracks.track[0];

                delete recentTrack.image;
                if (recentTrack.date && recentTrack.date["#text"]) {
                    delete recentTrack.date["#text"];
                }
                delete recentTrack.url;
                delete recentTrack.streamable;

                return cb(null, username, recentTrack)
            } else {
                return cb(response.statusMessage, username)
            }
        });
    }

    pollMyRecentTrack() {
        var that = this;
        setInterval(function() {
            that.getRecentTrack(config.lastfm.username, function(err, username, recentTrack) {
                if (!err) {
                    if (typeof that.pollRecentTrackCb === "function") {
                        that.pollRecentTrackCb(recentTrack, username);
                    }
                }
            });
        }, 5000);
    }

    getFriendsRecentTracks(isPolling, gotFriendRecentTrackCb, task, cb) {
        var that = this;
        var getRecentTrackTasks = [];
        var getRecentTrackTask = function(friend, cb) {
            that.getRecentTrack(friend.name, function(err, username, recentTrack) {
                if (err) {
                    return cb(err);
                }
                var friendRecentTrack = JSON.parse(JSON.stringify(friend));
                friendRecentTrack.recenttrack = recentTrack;
                if (gotFriendRecentTrackCb && typeof gotFriendRecentTrackCb === "function") {
                    gotFriendRecentTrackCb(username, friendRecentTrack);
                }
                cb(null, friendRecentTrack);
            });
        }
        this.friends.forEach(function(friend) {
            getRecentTrackTasks.push(getRecentTrackTask.bind(null, friend));
        });

        if (this.websocketListeners > 0) {
            // 4 is only kinda a magic number to prevent the  API rate limiting from kicking in
            async.parallelLimit(getRecentTrackTasks, 4, function(err, data) {
                if (cb && typeof cb === "function") {
                    if (err) {
                        return cb(err);
                    }
                    return cb(null, data);
                }
            });
        } else {
            // To avoid rate limiting, only poll one at a time with a 20 sec wait between bursts if there are no current listeners
            setTimeout(function() {
                async.parallelLimit(getRecentTrackTasks, 1, function(err, data) {
                    if (cb && typeof cb === "function") {
                        if (err) {
                            return cb(err);
                        }
                        return cb(null, data);
                    }
                });
            }, 20000);
        }
    }

    loadFriendRecentTracks() {
        return Object.values(this.recentTracks).filter(recentTrack => typeof recentTrack.recenttrack !== "undefined");
    }

    pollFriendsRecentTracks() {
        var that = this;
        this.queue = async.queue(that.getFriendsRecentTracks.bind(that, true, that.pollFriendsRecentTracksCb), 1);

        var pushToQueue = function() {
            // Adds another task to the queue when the first is completed
            console.log("task is empty, pushing next task");
            that.queue.push({}, pushToQueue);
        }
        that.queue.push({}, pushToQueue);

        this.queue.drain(function() {
            console.log("queue drained");
            that.queue.push({}, pushToQueue);
        });

        this.queue.error(function(err) {
            console.log("queue experienced the error: ", err);
            that.queue.push({}, pushToQueue);
        });
    }

    getTopAlbums(username, cb) {
        var queryString = `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${username}&api_key=${config.lastfm.apiKey}&format=json&period=3month`;
        request(queryString, function(err, response, body) {
            if (err) {
                return cb(err, username);
            }
            var body = JSON.parse(body);
            if (body.error) {
                if (config.devMode) {
                    console.log(body.message);
                }
                return cb(body.message, username);
            }
            if (response.statusCode === 200) {
                var topAlbums = body.topalbums.album;

                topAlbums.forEach(function(album) {
                    album.artist = album.artist.name;
                    delete album["@attr"];
                    delete album.url;
                    delete album.mbid;
                    album.image = album.image.filter(image => image.size === "large" || image.size === "extralarge");
                });

                return cb(null, username, topAlbums)
            } else {
                return cb(response.statusMessage, username)
            }
        });
    }

    getMyTopAlbums(req, res) {
        if (this.myTopAlbums && this.myTopAlbums.length > 0) {
            res.json(this.myTopAlbums);
        } else {
            res.json({error: "No top albums cached yet"});
        }
    }

    pollMyTopAlbums() {
        var that = this;
        setTimeout(function() {
            that.getTopAlbums(config.lastfm.username, function(err, username, topAlbums) {
                if (!err) {
                    that.myTopAlbums = topAlbums;
                }
            });
        }, 3000); // set timeout to avoid rate limiting during initial load
        setInterval(function() {
            that.getTopAlbums(config.lastfm.username, function(err, username, topAlbums) {
                if (!err) {
                    that.myTopAlbums = topAlbums;
                }
            });
        }, 259200000); // Interval is every three days
    }
}

module.exports = LastFmController;