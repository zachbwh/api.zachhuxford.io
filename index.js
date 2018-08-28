var config = require('./config'),
    MongoClient = require('mongodb').MongoClient,
    assert = require('assert'),
    fs = require('fs'),
    request = require('request'),
    _ = require('underscore'),
    handlebars = require('handlebars'),
    express = require('express');


const app = express();

app.get('/', (req, res) => res.send('Hello World!'))
app.listen(config.express.port, () => console.log('App listening on port ' + config.express.port))

app.get('/posts/', function(req, res) {
    getAllPosts(req, res)
});

app.get('/posts/:postID', function(req, res) {
    getPost(req, res);
});

var getPost = function(req, res) {
    var postID = parseInt(req.params.postID.split("-")[0]);
    MongoClient.connect(config.mongodb.url, function(err, db) {
        assert.equal(null, err);
        console.log("Connected successfully to mongodb server");
    
        // Get the blogposts collection
        var collection = db.collection('blogposts');
        // Find all blogposts
        collection.find({postID: postID}).toArray(function(err, posts) {
            assert.equal(err, null);
            var post = posts[0];
            res.send(post);
        });
    });
}

var getAllPosts = function(req, res) {
    MongoClient.connect(config.mongodb.url, function(err, db) {
        assert.equal(null, err);
        console.log("Connected successfully to mongodb server");
    
        // Get the blogposts collection
        var collection = db.collection('blogposts');
        // Find all blogposts
        collection.find({}).toArray(function(err, posts) {
            assert.equal(err, null);
            res.send(posts);

        });
    });
}