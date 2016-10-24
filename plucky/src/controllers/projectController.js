'use strict';

const express = require('express'),
	router = express.Router(),
	config = require('config'),
	yaml = require('../persistence/yaml'),
	jenkins = require('../persistence/jenkins'),
	sys = require('util'),
	execFile = require('child_process').execFile,
	exec = require('child_process').exec,
	releaseService = require('../services/releaseService'),
	logger = require('../utility/logger'),
	environmentHealthService = require('../services/environmentHealthService');

const updateHedBuildFiles = () => {
	return new Promise((resolve, reject) => {
		exec('git pull', (error, stdout) => {
			if (error) {
			    return reject(error);
		  	}
		  	console.log(stdout);
			resolve();
		});
	});
};


// get all the projects available
router.get('/', function(req, res) {
	res.status(200).send(config.projects);
});

// kick off createbuild.sh file which will subsequently kick off a build for jenkins
router.post('/:name', function(req, res) {
	// patch, minor, major version changes
	if(req.query.version !== 'p' && req.query.version !== 'm' && req.query.version !== 'M') {
		return res.status(400).send('Bad request, version change must be patch \'p\', minor \'m\', or Major \'M\'  ');	
	}

	const project = config.projects.find((prj) => {
		return prj.name === req.params.name;
	});

	if(!project) {
		return res.sendStatus(404);
	}

	const startDirectory = process.cwd();
	process.chdir(project.bitesizeFiles);
	let releaseVersion;
	// this is going to go away anwyays so not going to bother cleaning up
	updateHedBuildFiles().then(() => {
		// starts the creatBuild.sh jobs
		const child = execFile('./createbuild.sh', ['pull', `-${req.query.version}`], (err, stdout, stderr) => {
			if (err) {
				logger.error(err);
				return res.sendStatus(400);
			}
			// this is an ugly way to get the final version number that was created..but i can fix it later if we need to
			releaseVersion = stdout.match(/Created bitesize build for version:\s\d+.\d+.\d+/)[0].match(/\d+.\d+.\d+/)[0];
			let releaseId; 

			//create the release object and store it in mongodb
			releaseService.insertRelease({
				version: releaseVersion,
				projectName: project.name,
				projectBuilt: !project.needsBuildBeforeDeploy,
				releaseEnv: {},
				environmentOrder: yaml.getOrderedEnvironments(project),
			}).then((doc) => {
				// immediately send the document but the UI will need to refresh to know if the
				// build finishes or fails
				res.status(201).send(doc);
				releaseId = doc._id;

				return jenkins.executeJob(project.jenkins, 'seed-job');
			}).then((seedJobResult) => {
				if(seedJobResult === 'failed') {
					releaseService.updateRelease(releaseId, {projectBuilt: 'failed'}).then(function(doc) {
						logger.info('release set to failed');
					});
					return new Error('Build failed');
				}

				const jobs = [];

				// run all the jobs that for building hed-console
				yaml.getBuildProjects(project).components.forEach((asset) => {
					const skipBuilds = project.skipBuilds.indexOf(asset.name);
					if(skipBuilds === -1) {
						jobs.push(jenkins.executeJob(project.jenkins, asset.name));
					}
				});

				return Promise.all(jobs);
			}).then((result) => {
				for(let i = 0; i < result.length; i++) {
					if( result[i] === 'failed') {
						releaseService.updateRelease(releaseId, {projectBuilt: 'failed'}).then(function(doc) {
							logger.info('release set to failed');
						});
						return new Error('Build failed');
					}
				}

				return jenkins.executeJob(project.jenkins, 'console-docker-image');
			}).then(() => {
				return releaseService.updateRelease(releaseId, {
					projectBuilt: true,
					releaseEnv: {
						dev: 'inprogress'
					}
				}).then(function(doc) {
					logger.info('release got updated');
				});
			}).then(() => {
				// kick of dev-deploy automatically
				return jenkins.executeJob(project.jenkins, `dev-deploy`, {console_VERSION:releaseVersion});
			}).then((result) => {
				let releaseStatus = 'completed';
				
				if(result === 'failed') {
					releaseStatus = 'failed';
				}

				return releaseService.updateRelease(releaseObj._id, {releaseEnv: { dev: releaseStatus }});
			}).catch((err) => {
				logger.error('error', err);
			});
		});
		process.chdir(startDirectory);
	}).catch((err) => {
		logger.error('error in updating hed-repo', err);
		process.chdir(startDirectory);
	})
	
	// go back to the original directory or we are screwed!

});

router.get('/:name/health', function(req, res) {
	const project = config.projects.find((prj) => {
		return prj.name === req.params.name;
	});

	if(!project) {
		return res.sendStatus(404);
	}

	const promiseList = [];
	project.environmentHealth.forEach((envHealth) => {
		promiseList.push(environmentHealthService.getEnvironmentHealth(envHealth.route, envHealth.env));
	});
	
	Promise.all(promiseList).then((result) => {
		res.status(200).send(result);
	});
});

module.exports = router;
