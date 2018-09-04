var config = require('../config'),
    MongoClient = require('mongodb').MongoClient,
    assert = require('assert'),
    _ = require('underscore'),
	async = require('async');


var posts = {
    getPost: function(req, res) {
        var that = this;
        var postID = parseInt(req.params.postID.split("-")[0]);
        MongoClient.connect(config.mongodb.url, function(err, db) {
            assert.equal(null, err);
            console.log("Connected successfully to mongodb server");
        
            // Get the blogposts collection
            var collection = db.collection('blogposts');
            async.parallel({
                nextPost: that.getNextPost.bind(null, postID, collection),
                prevPost: that.getPrevPost.bind(null, postID, collection)
            }, function(err, results){
                if (err) {
                    res.status(404);
                    res.send(err);
                } else {
                    // Find all blogposts
                    collection.find({postID: postID}).toArray(function(err, posts) {
                        assert.equal(err, null);
                        var post = posts[0];
                        post.previousPost = results.prevPost;
                        post.nextPost = results.nextPost
                        res.send(post);
                    });
                }
            });
    
            
        });
    },


    /*
	Why not have this logic clientside? (i.e. nextPostID = postID++)
	The Client has no knowledge of the state of the database such as
	whether or not there is a next or previous post, or whether or not
	entries have been deleted.
    */
    getNextPost: function(postID, collection, callback) {
        // Find all blogposts
        collection.find({}).toArray(function(err, posts) {
            assert.equal(err, null);
            var foundPost = false;
    
            _.sortBy(posts, 'postID'); // Order posts by post ID
            _.forEach(posts, function(e, i, list) {
                if (e.postID === postID) {
                    foundPost = true;
                    if (list.length <= i + 1) {
                        return callback(null, null);
                    } else {
                        return callback(null, list[i + 1]);
                    }
                }
            });
            if (!foundPost) {
                callback("Requested post " + postID + " not found", null);
            }
        });
    },

    getPrevPost: function(postID, collection, callback) {
        // Find all blogposts
        collection.find({}).toArray(function(err, posts) {
            assert.equal(err, null);
            var foundPost = false;
            
            _.sortBy(posts, 'postID'); // Order posts by post ID 
            _.forEach(posts, function(e, i, list) {
                if (e.postID === postID) {
                    foundPost = true;
                    if (i <= 0) {
                        return callback(null, null);
                    } else {
                        return callback(null, list[i - 1]);
                    }
                }
            });
            if (!foundPost) {
                callback("Requested post " + postID + " not found", null);
            }
        });
    },

    getAllPosts: function(req, res) {
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
    },

    getPostsByAuthor: function(req, res) {
        var authorID = parseInt(req.params.authorID);
        MongoClient.connect(config.mongodb.url, function(err, db) {
            assert.equal(null, err);
            console.log("Connected successfully to mongodb server");
        
            // Get the blogposts collection
            var collection = db.collection('blogposts');
            // Find all blogposts
            collection.find({"author.authorID": authorID}).toArray(function(err, posts) {
                assert.equal(err, null);
                res.send(posts);
            });
        });
    },

    getPostsWithTags: function(req, res) {
        var tags = req.query.tags.split(',');
        MongoClient.connect(config.mongodb.url, function(err, db) {
            assert.equal(null, err);
            console.log("Connected successfully to mongodb server");
            // Get the blogposts collection
            var collection = db.collection('blogposts');
            // Find all blogposts
            collection.find({}).toArray(function(err, posts) {
                assert.equal(err, null);
                var matchedPosts = [];
                _.forEach(posts, function(post, i, posts) {
                    for (var j = 0; j < tags.length; j++) {
                        if (post.tags.includes(tags[j])) {
                            return matchedPosts.push(post);
                        }
                    }
                });
                if (matchedPosts.length <= 0) {
                    res.status(404).send('No posts with the following tags found: ' + tags.join(" "));
                } else {
                    res.send(matchedPosts);
                }
            });
        });
    }
}

module.exports = posts;