'use strict';

const logger = require('../utility/logger');
const utils = require('../utility/utils');
const requestET = require('../utility/requestET');
const Boom = require('boom');
const async = require('async');

const statusFromColor = (color)=>{
	switch(color){
		case('red'):
		return 'error';
		case('blue'):
		return 'ok';
		default:
		return color;
	}
};

const camelToUnderscore = (str)=>{
	return (str.replace(/\W+/g, '_')
		.replace(/([a-z\d])([A-Z])/g, '$1_$2'))
		.toUpperCase();
};

class Jenkins {
	constructor(options){
		/*
		this.creds = options.username?{
			username: options.username || false,
			password: options.password || false,
		}:false;
		*/
		this.auth = options.auth || false;
		this.url = (options.url||options.uri).replace(/\/$/, '');
	}

	getJobs(options, callback){
		//const container = options && options.container?`/${options.container}`:'';
		const url = options && options.container?`${this.url}/job/${options.container}/api/json/`:`${this.url}/api/json/`;
		requestET({
				url,//: `${this.url}${container}/api/json/`,
				auth: this.auth,
				method: 'GET',
		}, (error, payload)=>{
			if(error){
				return callback(error);
			}
			if(payload.error){
				let err = Boom.badRequest(payload.error);
				err.output.statusCode = 500;
				return callback(error);
			}
			return callback(null, payload.jobs.map((job)=>{return Object.assign(job, {status: statusFromColor(job.color)});}));
		});
	}

	findKey(key, keys){
		const keyl = key.length;
		const ukey = key.toUpperCase();
		const ckey = camelToUnderscore(key);
		const ckeyl = ckey.length;
		const calcWeight = (s1, s2)=>{
			const l = s1.length;
			var w = 0;
			for(var i = 0; i<l; i++){
				if(s1[i]===s2[i]){
					w = w + 2;
				}else if(s1[i].toUpperCase()===s2[i]){
					w = w + 1;
				}
			}
			return w;
		};
		var match = keys.filter((ekey)=>{
			if(ekey === key){
				return true;
			}
			if(ekey === ckey){
				return true;
			}
			if((keyl === ekey.length) && (ekey.toUpperCase() === ukey)){
				return true;
			}
			if((ckeyl === ekey.length) && (ekey.toUpperCase() === ckey)){
				return true;
			}
			return false;
		}).map((match)=>{
			const weight = calcWeight(match, match.length===keyl?key:ckey);
			return {
				match,
				weight
			}
		}).reduce((curr, next)=>{
			if(next.weight > curr.weight){
				return next;
			}
			return curr;
		}, {weight: 0});
		return match.match;
	}

	reformJobParams(passedParams, expectedParams){
		if((typeof(passedParams)==='object') && Array.isArray(passedParams.parameters)){
			passedParams = passedParams.parameters.reduce((params, curr)=>{
				params[curr.name] = curr.value;
				return params;
			}, {});
		}
		const jobParams = Object.keys(passedParams).reduce((params, key)=>{
			const newKey = this.findKey(key, expectedParams);
			if(newKey){
				params[newKey] = passedParams[key];
			}
			return params;
		}, {});
		return jobParams;
	}

	queryJob(options, callback){
		const jobName = options.jobName;
		requestET({
			url: `${this.url}/job/${jobName}/api/json`,
			auth: this.auth,
			method: 'GET',
		}, (error, payload)=>{
			if(error){
				return callback(error);
			}
			if(payload && payload.error){
				let err = Boom.badRequest(payload.error);
				err.output.statusCode = 500;
				return callback(err);
			}
			return callback(null, payload);
		});
	}

	getJobParams(options, callback){
		const jobName = options.jobName;
		const passedParams = options.passedParams;
		requestET({
			url: `${this.url}/job/${jobName}/api/json`,
			auth: this.auth,
			method: 'GET',
		}, (error, payload)=>{
			if(error){
				return callback(error);
			}

			const jobParams = (()=>{
				if(payload && payload.actions && payload.actions[0] && payload.actions[0].parameterDefinitions){
					return payload.actions[0].parameterDefinitions;
				}
				if(payload && payload.property && payload.property[0] && payload.property[0].parameterDefinitions){
					return payload.property[0].parameterDefinitions;
				}
				return [];
			})();
			let params = jobParams.map((param)=>{
				const info = {
					name: param.name,
					default: param.defaultParameterValue.value||'',
				};
				return info;
			}).reduce((params, curr)=>{
				params[curr.name]=curr.default;
				return params;
			}, {});
			params = utils.defaults(params, this.reformJobParams(passedParams||{}, Object.keys(params)));
			return callback(null, params);
		});
	}

	getJobParameters(options, callback){
		const jobName = options.jobName;
		const payload = options.payload;
		const passedParams = payload||{};
		this.getJobParams({jobName, passedParams}, (err, params)=>{
			if(err){
				return callback(err);
			}
			const parameters = {parameters: Object.keys(params).map((key)=>{return {name: key, value: params[key]}})};
			return callback(null, parameters);
		});
	}

	getJobStatus(options, callback){
		const jobName = options.jobName;
		requestET({
			url: `${this.url}/job/${jobName}/api/json`,
			auth: this.auth,
			method: 'GET',
		}, (error, payload)=>{
			if(error){
				return callback(error);
			}
			const busy = ((!!payload.inQueue) || (!!payload.queueItem));
			if(payload.builds.length===0){
				return callback(null, 'idle');
			}
			requestET({
				method: 'GET',
				auth: this.auth,
				url: payload.builds[0].url+'api/json',
			}, (error, payload)=>{
				if(error){
					return callback(error);
				}
				if(payload.building){
					return callback(null, 'building');
				}
				if(busy){
					return callback(null, 'inqueue');
				}
				if(payload.result === 'FAILURE'){
					return callback(null, 'failed');
				}
				return callback(null, 'idle');
			});
		});
	}

	getJobOutput(options, callback){
		const jobName = options.jobName;
		const jobNumber = options.jobNumber;
		requestET({
			method: 'GET',
			auth: this.auth,
			url: `${this.url}/job/${jobName}/${jobNumber}/consoleText`,
			returnRaw: true
		}, (error, payload)=>{
			if(error){
				return callback(error);
			}
			return callback(null, {
				link: `${this.url}/job/${jobName}/${jobNumber}/console`,
				output: payload,
			});
		});
	}

	getLatestJobNumber(options, callback){
		const jobName = options.jobName;
		requestET({
			method: 'GET',
			auth: this.auth,
			url: `${this.url}/job/${jobName}/api/json`,
		}, (error, payload)=>{
			if(error){
				return callback(error);
			}
			if(!payload.lastBuild){
				return callback(new Error(`"${jobName}" never built before`));
			}
			return callback(null, {
				link: payload.lastBuild.url,
				lastBuildNumber: payload.lastBuild.number
			});
		});
	}

	startJob(options, callback){
		const jobName = options.jobName;
		const passedParams = options.params || {};
		this.getJobParams({jobName, passedParams}, (err, params)=>{
			if(err){
				return callback(err);
			}
			const parameters = Object.keys(params).map((key)=>key+'='+encodeURIComponent(params[key])).join('&');
			const cmd = Object.keys(params).length===0?'build':'buildWithParameters';
			requestET({
				url: `${this.url}/job/${jobName}/${cmd}/api/json?${parameters}`,
				auth: this.auth,
				method: 'POST',
			}, function(err, result) {

				callback(err, result) 
			});
		});
	}

	waitForIdle(options, callback){
		const check = ()=>this.getJobStatus(options, (err, status)=>{
				if(err){
					return callback(err);
				}
				logger.info('Status: ', '"'+status+'"', (status!=='idle'), (status!=='failed'));
				if((status!=='idle')&&(status!=='failed')){
					return setTimeout(check, 10000);
				}
				callback(null, status);
			});
		check();
	}

	executeJob(options, callback){
		this.waitForIdle(options, (err)=>{
			if(err){
				return callback(err);
			}
			this.startJob(options, (err)=>{
				if(err){
					return callback(err);
				}
				setTimeout(()=>this.waitForIdle(options, callback), 10000);
			});
		});
	}

	executeJobs(jobs, callback){
		if(!Array.isArray(jobs)){
			return callback(Boom.badRequest(`Must supply a list of jobs to execute.`));
		}
		let last = false;
		async.eachSeries(jobs, (cfg, next)=>{
			const jobConfig = typeof(cfg)==='string'?{
				jobName: cfg
			}:cfg;
			if(jobConfig.wait){
				const timeout = +(jobConfig.wait||1000);
				logger.info('Sleeping for'+timeout);
				return setTimeout(()=>{
					logger.info('Continuing');
					return next();
				}, timeout);
			}
			this.executeJob(jobConfig, (err, status)=>{
				if(err){
					return next(err);
				}
				last = status;
				return next();
			});
		}, (err)=>{
			if(err){
				return callback(err);
			}
			callback(null, last);
		});
	}
};

// wrapping all of the jenkins calls into promises since i don't want to touch that code 
// since it seems to already works
module.exports = {
	getJobs: function(config) {
		const jenkins = new Jenkins({
			url: config.url,
			auth: jenkins.auth
		});

		return new Promise(function(resolve, reject) {
			jenkins.getJobs({}, function(err, result) {
				if(err) {
					return reject(err);
				}
				resolve(result);
			});
		});
	},
	executeJob: function(config, job, params) {
		const jenkins = new Jenkins({
			url: config.url,
			auth: config.auth
		});

		return new Promise(function(resolve, reject) {
			jenkins.executeJob({jobName: job, params }, function(err, result) {
				if(err) {
					return reject(err);
				}

				resolve(result);
			});
		});
	},
	waitForIdle: function(config, job) {
		const jenkins = new Jenkins({
			url: config.url,
			auth: config.auth
		});

		return new Promise(function(resolve, reject) {
			jenkins.waitForIdle({jobName: job}, function(err, result) {
				if(err) {
					return reject(err);
				}
				resolve(result);
			});
		});
	},
	executeJobs: function(config, jobs) {
		const jenkins = new Jenkins({
			url: config.url,
			auth: config.auth
		});

		return new Promise(function(resolve, reject) {
			jenkins.executeJobs(jobs, function(err, result) {
				if(err) {
					return reject(err);
				}

				resolve(result);
			});
		});
	}
};
