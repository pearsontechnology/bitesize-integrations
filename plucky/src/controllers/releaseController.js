'use strict';

let express = require('express'),
	router = express.Router(),
	config = require('config'),
	yaml = require('../persistence/yaml'),
	jenkins = require('../persistence/jenkins'),
	sys = require('util'),
	execFile = require('child_process').execFile,
	releaseService = require('../services/releaseService');

router.get('/', function(req, res) {
	if(!req.query.projectName) {
		return res.status(400).send('Bad request, must send project name');	
	}

	releaseService.getReleases(req.query.projectName).then((releaseList) => {
		releaseList.sort((a, b) => {
			const aVersion = a.version.split('.');
			const bVersion = b.version.split('.');
			for(let i = 0;i < 3; i++) {
				var na = Number(aVersion[i]);
				var nb = Number(bVersion[i]);
				if (na > nb) {
					return 1;
				}
				if (nb > na) {
					return -1;
				}
				if (!isNaN(na) && isNaN(nb)) {
					return 1;
				}
				if (isNaN(na) && !isNaN(nb)) {
					return -1;
				}
			}
			return 0;
		}).reverse();
		res.status(200).send(releaseList.slice(0, 5));
	});
});

// get release status
router.get('/:id', function(req, res) {
	releaseService.getReleasesById(req.params.id).then((release) => {
		if(!release) {
			return res.sendStatus(404);
		}

		res.status(200).send(release);
	});
});

// deploy project with env
router.put('/:id/deploy', function(req, res) {
	if(!req.query.env) {
		// shouldn't ever happen since the UI would follow this step.  
		return res.status(400).send('Bad request! env query parameter is required');	
	}

	//for reference in later then calls
	let releaseObj;
	releaseService.getReleasesById(req.params.id).then((release) => {
		releaseObj = release;
		
		const project = config.projects.find((prj) => {
			return prj.name === release.projectName;
		});

		// This can't happen unless someone hacks it
		if(!project) {
			return res.status(500).send('Something terribly wrong has happened');
		}

		// if someone already hit the button and it is in progress....don't do it again
		if(release.releaseEnv[req.query.env] === 'inprogress') {
			return res.status(202).send(release);
		}

		// go ahead and respond with 202 accepted while the release keeps going
		release.releaseEnv[req.query.env] = 'inprogress';
		releaseService.updateRelease(releaseObj._id, {releaseEnv: releaseObj.releaseEnv}).then(() => {
			res.status(202).send(release);
		});

		return jenkins.executeJob(project.jenkins, `${req.query.env}-deploy`, {console_VERSION:release.version});
	}).then((result) => {
		let releaseStatus = 'completed';
		
		if(result === 'failed') {
			releaseStatus = 'failed';
		}

		releaseObj.releaseEnv[req.query.env] = releaseStatus;

		return releaseService.updateRelease(releaseObj._id, {releaseEnv: releaseObj.releaseEnv});
	}).then((doc) => {
		res.status(200).send(releaseObj);
	}).catch((err) => {
		console.log('Error in deploy job:', err);
		res.status(500).send({error: err});
	});
});


module.exports = router;
