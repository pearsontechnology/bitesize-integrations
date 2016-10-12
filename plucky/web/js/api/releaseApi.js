import fetchWrap from './fetchwrapper';

export default {
	getRelease: function(projectName) {
		return fetchWrap(`/api/release/?projectName=${projectName}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});
	},

	pushReleaseToEnv: function(id, env) {
		return fetchWrap(`/api/release/${id}/deploy?env=${env}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
}