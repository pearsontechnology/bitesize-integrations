import fetchWrap from './fetchWrapper';

export default {
	getEnvironments: function() {
		return fetchWrap(`/api/project`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});
	},

	getEnvironmentHealth: function(projectName) {
		return fetchWrap(`/api/project/${projectName}/health`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
}