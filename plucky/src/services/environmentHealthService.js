const logger = require('../utility/logger');
const requestET = require('../utility/requestET');


module.exports = {
	getEnvironmentHealth: function(url, env) {
		return new Promise((resolve, reject) => {
			requestET({
		        url,
		        method: 'GET'
		    }, (err, payload) => {
		    	if(err && err.output && err.output.statusCode) {
		    		return resolve({
		    			state: 'error',
		    			detail: err.output.statusCode,
		    			env
		    		});
		    	}
		    	if(err && !err.output) {
		    		return resolve({
		    			state: 'error',
		    			detail: '500',
		    			env
		    		});
		    	}

		    	resolve({
		    		state: 'ok',
		    		detail:payload,
		    		env
		    	});
		    });
		});
		
	}
}