var config = require('./config'),
	MongoClient = require('mongodb').MongoClient,
	assert = require('assert'),
	async = require('async'),
    _ = require('underscore'),
    fs = require('fs');


// Connection URL
var url = config.mongodb.url;

// Use connect method to connect to the server
MongoClient.connect(url, function(err, db) {
  	assert.equal(null, err);
  	console.log("Connected successfully to server");

  	var body = fs.readFileSync('./resources/blog1body.html', 'utf8');
//   console.log(body);

	var blogpost = {
		title: "If zachhuxford.io Is So Good, Why Isn't There a zachhuxford.io 2?", // Plaintext
		date: "1535854325", // Unixtime (seconds)
		postID: 1,
		urlTitle: "If_zachhuxford.io_Is_So_Good_Why_Isnt_There_a_zachhuxford.io_2",
		author: {
			name: "Zach Huxford",
			authorID: "0"
		},
		tags: [
			"webdev",
			"react",
			"reactjs",
			"mongo",
			"mongodb",
			"node",
			"nodejs",
			"blog"
		],
		/*
			handlebars will be used to inject the image links into the body
			"thumbnail" will be used when a thumnail of the article is generated
			if a thumbnail doesn't exist, the first image will be used by default
		*/
		images: {
			oldHomePage: "https://s3-ap-southeast-2.amazonaws.com/blog-zachhuxford-io/blog/posts/2-If_zachhuxford.io_Is_So_Good_Why_Isnt_There_a_zachhuxford.io_2/Screenshot+from+2018-09-02+17-15-55.png"
		},
		body: body, // InnerHTML
		disqusID: "1511044085"

	}

	async.waterfall([
			function(callback) {
				callback(null, db, blogpost);
			},
			getNewBlogpostID,
			insertBlogpost
		], function(result) {
			console.log(result);
			db.close();
		});

});

var getNewBlogpostID = function(db, blogpost, callback) {
	// Get the blogposts collection
	var collection = db.collection('blogposts');
  
	// Find all blogposts
	collection.find({}).toArray(function(err, posts) {
		assert.equal(err, null);
		
		_.sortBy(posts, 'postID');
	var latestPost = posts[posts.length - 1],
		latestPostID = 0;

    if (latestPost) {
		latestPostID = latestPost.postID;
	}
	
	callback(null, db, blogpost, latestPostID);
	});
}

var insertBlogpost = function(db, blogpost, latestPostID, callback) {
	blogpost.postID = latestPostID + 1;
	blogpost.disqusID = blogpost.postID;

	var collection = db.collection('blogposts');
	collection.insertMany([
		blogpost
	], function(err, result) {
		callback(null, result);
	});
}

