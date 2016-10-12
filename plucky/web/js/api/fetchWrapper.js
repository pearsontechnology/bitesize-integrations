/*
 *	Making a Fetch that will just go ahead and reject the response as a json response
 *  if the status code isn't within the acceptable range.
*/
export default (url, options) => {
	return new Promise(function (resolve, reject) {
		fetch(url, options).then(function (res) {
			let normalResponse = true;
			if (res.status >= 400) {
				normalResponse = false;
			}
			const contentType = res.headers.get('content-type');
			if (contentType && contentType.indexOf('application/json') !== -1) {
				res.json().then(function (parsedData) {
					if (normalResponse) {
						return resolve(parsedData);
					}
					reject(parsedData);
				});
			} else {
				reject(res.text());
			}
		}).catch(function (err) {
			reject(err);
		});
	});
};
