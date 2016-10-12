'use strict'; 

let db = require('../persistence/mongoConnection');
let collection = 'release';
let Mongo = require('mongodb');


module.exports =  {

	getReleases: function(projectName) {
		return new Promise((resolve, reject) => {
			db.getConnection().collection(collection).find({projectName: projectName}).toArray((err, docs) => {
				if(err) {
					return reject(err);
				}
				resolve(docs);
			});
		});
	},

	insertRelease: function(release) {
		return new Promise((resolve, reject) => {
			db.getConnection().collection(collection).insert(release, {}, (err, docs) => {
				if(err) {
					return reject(err);
				}
				resolve(docs.ops[0]);
			});
		});
	},

	getReleasesById: function(releaseId) {
		return new Promise((resolve, reject) => {
			let ObjectId = new Mongo.ObjectID(releaseId);
			db.getConnection().collection(collection).findOne({_id: ObjectId}, (err, doc) => {
				if(err) {
					return reject(err);
				}
				resolve(doc);
			});
		});
	},

	updateRelease: function(releaseId, updates) {
		return new Promise((resolve, reject) => {
			let ObjectId = new Mongo.ObjectID(releaseId);
			db.getConnection().collection(collection).update({_id: ObjectId}, {'$set': updates}, (err, doc) => {
				if(err) {
					return reject(err);
				}
				resolve(doc);
			});
		});
	},
};