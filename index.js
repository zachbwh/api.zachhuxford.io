#!/usr/bin/env nodejs
var config = require('./config'),
    MongoClient = require('mongodb').MongoClient,
    assert = require('assert'),
    express = require('express'),
    app = express(),
    http = require('http').createServer(app),
    io = require('socket.io')(http),
    posts = require('./src/posts'),
    LastFmController = require('./src/lastfm');

// Allow CORS
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


if (config.devMode) {
    app.get('/', (req, res) => res.send('Hello World!'))
}

http.listen(config.express.port, function () {
    console.log(`listening on *:${config.express.port}`);
});

app.get('/posts/', function (req, res) {
    posts.getAllPosts(req, res)
});

app.get('/posts/tags/', function (req, res) {
    posts.getPostsWithTags(req, res);
});

app.get('/posts/:postID', function (req, res) {
    posts.getPost(req, res);
});

app.get('/authors/', function (req, res) {
    getAllAuthors(req, res);
});

app.get('/authors/:authorID', function (req, res) {
    getAuthor(req, res);
});

app.get('/lastfm/getFriends', function (req, res) {
    LastFmController.getFriendsInfoAndRecentTracks(req, res);
});

app.get('/lastfm/getMyRecentTrack', function (req, res) {
    LastFmController.getMyRecentTrack(req, res);
});

io.on('connection', function (socket) {
    console.log('a user connected');
    io.emit("connected", "A User Connected");
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
});

var LastFmController = new LastFmController({
    pollRecentTrackCb: function (recentTrack, username) {
        var shouldNotifyListeners = false;
        // Listeners should only be updated if there is a change to the most recent track
        if (!this.recentTracks[username]) {
            shouldNotifyListeners = true;
        } else if (JSON.stringify(this.recentTracks[username]) !== JSON.stringify(recentTrack)) {
            shouldNotifyListeners = true;
        }

        if (shouldNotifyListeners) {
            this.recentTracks[username] = recentTrack;
            console.log("notifying listeners of recent track change");
            io.of("/lastfm").emit("recent-track-update", JSON.stringify(recentTrack));
        }
    },
    pollFriendsRecentTracksCb: function(username, friendRecentTrack) {
        var shouldNotifyListeners = false;
        
        if (!this.recentTracks[username]) {
            shouldNotifyListeners = true;
        } else if (JSON.stringify(this.recentTracks[username]) !== JSON.stringify(friendRecentTrack)) {
            shouldNotifyListeners = true;
        }

        if (shouldNotifyListeners) {
            this.recentTracks[username] = friendRecentTrack;
            console.log(`notifying listeners of ${username}'s recent track change`);
            io.of("/lastfmcreep").emit("recent-track-update", JSON.stringify(friendRecentTrack));
        }
    }
});

var getAuthor = function (req, res) {
    var authorID = parseInt(req.params.authorID);
    MongoClient.connect(config.mongodb.url, function (err, db) {
        assert.equal(null, err);
        console.log("Connected successfully to mongodb server");

        // Get the authors collection
        var collection = db.collection('authors');

        // Find all specific author
        collection.find({ authorID: authorID }).toArray(function (err, authors) {
            assert.equal(err, null);
            var author = authors[0];
            res.send(author);
        });
    });
}

var getAllAuthors = function (req, res) {
    var authorID = parseInt(req.params.authorID);
    MongoClient.connect(config.mongodb.url, function (err, db) {
        assert.equal(null, err);
        console.log("Connected successfully to mongodb server");

        // Get the authors collection
        var collection = db.collection('authors');

        // Find all specific author
        collection.find({}).toArray(function (err, authors) {
            assert.equal(err, null);
            res.send(authors);
        });
    });
}