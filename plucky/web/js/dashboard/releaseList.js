import React from 'react';
import releaseApi from '../api/releaseApi';
import { Step, Stepper, StepButton } from 'material-ui/Stepper';
import WarningIcon from 'material-ui/svg-icons/alert/warning';
import {red500} from 'material-ui/styles/colors';

class ReleaseList extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			releaseList: []
		};

		const getReleaseInterval = setInterval(this.getReleases.bind(this), 5000);
	}

	componentWillMount() {
		this.getReleases();
	}

	getReleases() {
		releaseApi.getRelease(this.props.project).then((releaseList) => {
			this.setState({
				releaseList
			});
		}).catch((error) => {
			console.log('Error!', error);
		});
	}

	deploy(id, env) {
		releaseApi.pushReleaseToEnv(id, env).then((releaseObj) => {
			const idxRelease = this.state.releaseList.findIndex((obj) => {
				return obj._id === releaseObj._id
			});

			//replace release object with new release object
			this.setState({
				releaseList: [
					...this.state.releaseList.slice(0, idxRelease), 
					releaseObj,
					...this.state.releaseList.slice(idxRelease+1)
				]
			});
			console.log('successful', releaseObj);
		}).catch((error) => {
			console.log('Error!', error);
		});
	}

	createReleaseList() {
		const releaseList = [];
		this.state.releaseList.forEach((release) => {
			const releaseEnv = [];

			if(release.projectBuilt) {
				release.environmentOrder.forEach((env) => {
					const releaseStatus = release.releaseEnv[env.name];
					if(releaseStatus === 'failed') {
						return releaseEnv.push(
							<Step key={`${release._id}-${env.name}`}>
								<StepButton 
									onClick={(ev) => { this.deploy(release._id, env.name); }}
									icon={<WarningIcon color={red500} />} >{env.name}</StepButton>
							</Step>
						);
					}
					releaseEnv.push(
						<Step key={`${release._id}-${env.name}`}>
							<StepButton 
								onClick={(ev) => { this.deploy(release._id, env.name); }}
								active={(releaseStatus === 'inprogress')}
								disabled={env.name === 'prd' ? true : false}
								completed={(releaseStatus === 'completed')} >{env.name}</StepButton>
						</Step>
					);
				});
			}
			releaseList.push(
				<div key={release._id}>
					<span>Version: {release.version}</span>
					<span style={{paddingLeft: '10px'}}>Built: {`${release.projectBuilt}`} </span>
					<Stepper linear={false}>
						{releaseEnv}
					</Stepper>
				</div>
			);
		});

		return releaseList;
	}

	render() {
		const releaseList = this.createReleaseList();
		return (
			<div>
				{releaseList}
			</div>
		);
	}
}

export default ReleaseList;