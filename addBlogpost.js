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
		title: "How To: Install HTK On Ubuntu 17.04", // Plaintext
		date: "1511092800", // Unixtime (seconds)
		postID: 1,
		urlTitle: "How_To_Install_HTK_On_Ubuntu_17.04",
		author: {
			name: "Zach Huxford",
			authorID: "0"
		},
		tags: [
			"HTK",
			"Ubuntu",
			"Ubuntu17.04",
			"linux",
			"HowTo",
			"install",
			"rant",
			"tatai",
			"softeng206",
			"UoA",
			"UniversityOfAuckland",
			"SoftwareEngineering",
			"SE"
		],
		/*
			handlebars will be used to inject the image links into the body
			"thumbnail" will be used when a thumnail of the article is generated
			if a thumbnail doesn't exist, the first image will be used by default
		*/
		images: {
			questionScreen: "https://s3-ap-southeast-2.amazonaws.com/blog-zachhuxford-io/blog/posts/1-HOW-TO-Install-HTK-on-Ubuntu-17.04/question_screen.png"
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

	var collection = db.collection('blogposts');
	collection.insertMany([
		blogpost
	], function(err, result) {
		callback(null, result);
	});
}

