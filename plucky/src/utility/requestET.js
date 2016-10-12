'use strict';

const async = require('async');
const Boom = require('boom');
const logger = require('./logger');
let request = require('request');

module.exports = (options, callback)=>{ // Request with basic error trapping built in
  logger.info('Outbound started: ', options);
  if(options.host){
	options.headers = options.headers || {};
	options.headers.host = options.host;
  }
  if(options.auth){
	switch(options.auth.type){
	  case('userpass'):
		options.auth = options.auth.userpass;
		break;
	  default:
		options.auth = options.auth[options.auth.type];
	}
  }
  options.url = ((url)=>{
	let parts = url.split('?');
	const prefix = parts.shift();
	let prefixParts = prefix.split('://');
	const protocol = prefixParts.shift();
	prefixParts = prefixParts.map((s)=>s.replace(/\/\//g, '\/'));
	prefixParts.unshift(protocol);
	parts.unshift(prefixParts.join('://'));
	return parts.join('?');
  })(options.url);
  request(options, (error, resp, payload)=>{
	logger.info('Outbound completed: ', options, error || payload);
	if(error){
	  let err = Boom.badRequest(error);
	  err.output.statusCode = 500;
	  return callback(error);
	}
	if(!payload){
	  return callback(null, payload);
	}
	if(options.returnRaw){
	  return callback(null, payload);
	}
	try{
	  const info = JSON.parse(payload);
	  if(info && info.error){
		const err = Boom.badRequest(info.error);
		err.output.statusCode = 500;
		return callback(err);
	  }
	  return callback(null, info);
	} catch(e) {
	  if(payload.indexOf('HTTP ERROR ')>-1){
		const reCode = /HTTP ERROR ([0-9]+)/;
		const reReason = /Reason:\n<pre>(.*?)<\/pre>/;
		const code = reCode.exec(payload)[1];
		const reason = reReason.exec(payload)[1].trim();
		let err = Boom.badRequest(reason);
		err.output.statusCode = +code;
		return callback(err);
	  }
	  const err = Boom.badRequest(payload);
	  return callback(err);
	}
  });
};