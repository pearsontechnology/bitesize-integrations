'use strict';

let MongoClient = require('mongodb').MongoClient;
let config = require('config');
let connection;

let url = config.get('dbConfig').url;
MongoClient.connect(url, function(err, db) {
    if(err) {
    	throw new Error(err);
    }
    if(config.auth) {
        db.authenticate(config.get('user'), config.get('token'), function(err, res) {
            console.log('authenticated correctly to server.');
            connection = db;
        });
        return;
    }
    connection = db;   
});

module.exports = {
	getConnection: function() {
		return connection;
	}
}