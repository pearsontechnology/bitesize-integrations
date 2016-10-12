import fetchWrap from './fetchwrapper';

export default {
	buildProject: function(projectName, version) {
		return fetchWrap(`/api/project/${projectName}/?version=${version}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
}