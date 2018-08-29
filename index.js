var config = require('./config'),
    MongoClient = require('mongodb').MongoClient,
    assert = require('assert'),
    fs = require('fs'),
    request = require('request'),
	_ = require('underscore'),
	async = require('async'),
    handlebars = require('handlebars'),
    express = require('express');


const app = express();

// Allow CORS
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


if (config.devMode) {
	app.get('/', (req, res) => res.send('Hello World!'))
}

app.listen(config.express.port, () => console.log('App listening on port ' + config.express.port))

app.get('/posts/', function(req, res) {
    getAllPosts(req, res)
});

app.get('/posts/:postID', function(req, res) {
    getPost(req, res);
});

app.get('/authors/', function(req, res) {
    getAllAuthors(req, res);
});

app.get('/authors/:authorID', function(req, res) {
    getAuthor(req, res);
});

var getPost = function(req, res) {
    var postID = parseInt(req.params.postID.split("-")[0]);
    MongoClient.connect(config.mongodb.url, function(err, db) {
        assert.equal(null, err);
        console.log("Connected successfully to mongodb server");
    
        // Get the blogposts collection
		var collection = db.collection('blogposts');
		
		async.parallel({
			nextPost: getNextPost.bind(null, postID, collection),
			prevPost: getPrevPost.bind(null, postID, collection)
		}, function(err, results){
			// Find all blogposts
			collection.find({postID: postID}).toArray(function(err, posts) {
				assert.equal(err, null);
				var post = posts[0];
				post.previousPost = results.prevPost;
				post.nextPost = results.nextPost
				res.send(post);
			});
		});

        
    });
}

/*
	Why not have this logic clientside? (i.e. nextPostID = postID++)
	The Client has no knowledge of the state of the database such as
	whether or not there is a next or previous post, or whether or not
	entries have been deleted.
*/
var getNextPost = function(postID, collection, callback) {
	// Find all blogposts
	collection.find({}).toArray(function(err, posts) {
		assert.equal(err, null);
		
		_.sortBy(posts, 'postID'); // Order posts by post ID 
		_.forEach(posts, function(e, i, list) {
			if (e.postID === postID) {
				if (list.length <= i + 1) {
					callback(null, null);
				} else {
					callback(null, list[i + 1]);
				}
			}
		})
	});
}

var getPrevPost = function(postID, collection, callback) {
	// Find all blogposts
	collection.find({}).toArray(function(err, posts) {
		assert.equal(err, null);
		
		_.sortBy(posts, 'postID'); // Order posts by post ID 
		_.forEach(posts, function(e, i, list) {
			if (e.postID === postID) {
				if (i <= 0) {
					callback(null, null);
				} else {
					callback(null, list[i - 1]);
				}
			}
		})
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

var getPostsByAuthor = function(req, res) {
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
}

var getAuthor = function(req, res) {
	var authorID = parseInt(req.params.authorID);
    MongoClient.connect(config.mongodb.url, function(err, db) {
        assert.equal(null, err);
        console.log("Connected successfully to mongodb server");
    
        // Get the authors collection
		var collection = db.collection('authors');

		// Find all specific author
		collection.find({authorID: authorID}).toArray(function(err, authors) {
			assert.equal(err, null);
			var author = authors[0];
			res.send(author);
		});
    });
}

var getAllAuthors = function(req, res) {
	var authorID = parseInt(req.params.authorID);
    MongoClient.connect(config.mongodb.url, function(err, db) {
        assert.equal(null, err);
        console.log("Connected successfully to mongodb server");
    
        // Get the authors collection
		var collection = db.collection('authors');

		// Find all specific author
		collection.find({}).toArray(function(err, authors) {
			assert.equal(err, null);
			res.send(authors);
		});
    });
}