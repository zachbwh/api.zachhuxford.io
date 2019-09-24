var config = require('../config'),
    request = require('request'),
	async = require('async');

var lastfm = {
    getFriendsInfoAndRecentTracks: function(req, res) {
        var getFriendsQueryString = `https://ws.audioscrobbler.com/2.0/?method=user.getfriends&user=${config.lastfm.username}&api_key=${config.lastfm.apiKey}&format=json`;
        request(getFriendsQueryString, function(err, response, body) {
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
                });

                var getRecentTrackTasks = [];
                var getRecentTrackTask = function(username, cb) {
                    var queryString = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${config.lastfm.apiKey}&format=json&limit=1`;
                    request(queryString, function(err, response, body) {
                        if (err) {
                            cb(err);
                        }
                        if (response.statusCode === 200) {
                            cb(null, body)
                        }
                    });

                }
                friendsList.forEach(function(friend) {
                    getRecentTrackTasks.push(getRecentTrackTask.bind(null, friend.name));
                });

                async.parallelLimit(getRecentTrackTasks, 10, function(err, data) {
                    data.forEach(function(recentTrack, index) {
                        friendsList[index].recenttrack = JSON.parse(recentTrack).recenttracks.track[0];
                    });
                    friendsList = friendsList.sort(function(a, b) {
                        if (a.recenttrack['@attr'] && a.recenttrack['@attr'].nowplaying && (!b.recenttrack['@attr'] || !b.recenttrack['@attr'].nowplaying)) {
                            return -1;
                        } else if ((!a.recenttrack['@attr']  || !a.recenttrack['@attr'].nowplaying) && b.recenttrack['@attr'] && b.recenttrack['@attr'].nowplaying) {
                            return 1;
                        } else if (a.recenttrack['@attr'] && a.recenttrack['@attr'].nowplaying && b.recenttrack['@attr'] && b.recenttrack['@attr'].nowplaying) {
                            return 0;
                        }
                        return a.recenttrack.date.uts < b.recenttrack.date.uts ? 1 : a.recenttrack.date.uts > b.recenttrack.date.uts ? -1 : 0;
                    });
                    res.status(200).json(friendsList);
                });
            }
        });
    },
    getMyRecentTrack: function(req, res) {
        var queryString = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${config.lastfm.username}&api_key=${config.lastfm.apiKey}&format=json&limit=1`;
        request(queryString, function(err, response, body) {
            if (response.statusCode === 200) {
                var recentTrack = JSON.parse(body);
                recentTrack = recentTrack.recenttracks.track[0];
                res.status(200).json(recentTrack);
            }
        });
    }
}

module.exports = lastfm;