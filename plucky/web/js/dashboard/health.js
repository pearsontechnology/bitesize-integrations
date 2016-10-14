import React from 'react';
import environmentApi from '../api/environmentApi';

class EnvironmentHealth extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			healthList: []
		};
		const refresh = setInterval(this.getHealth.bind(this), 5000);
	}

	componentWillMount() {
		this.getHealth();
	}

	getHealth() {
		environmentApi.getEnvironmentHealth(this.props.project).then((health) => {
			this.setState({
				healthList: health
			});
		}).catch(err => {
			console.log(err);
		});
	}

	render() {
		let envList = [];
		this.state.healthList.forEach((healthObj) => {
			envList.push(
				<div key={`${healthObj.env}-${this.props.project}`}>
					{healthObj.env}: {healthObj.detail.version ? healthObj.detail.version : `${healthObj.detail} ${healthObj.state}`}
				</div>
			);
		});
		return (
			<div>
				{envList}
			</div>
		);
	}
}

export default EnvironmentHealth;