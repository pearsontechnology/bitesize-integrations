'use strict';

let express = require('express');
let app = express();
let config = require('config');
let bodyParser = require('body-parser');
let logger = require('./src/utility/logger');
let path = require('path');
let projectController = require('./src/controllers/projectController');
let releaseController = require('./src/controllers/releaseController');

app.use(bodyParser.json());

app.use(express.static('web'));

app.use('/api/project', projectController);
app.use('/api/release', releaseController);

// log out some basic information
app.listen(config.appConfig.port, function() {
	logger.info('App listening on port ' + config.appConfig.port + '!');
});
