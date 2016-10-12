'use strict';

let bunyan = require('bunyan');
let logger = bunyan.createLogger({
	name: 'plucky',
	streams: [{ stream: process.stdout }]
});

module.exports = logger;