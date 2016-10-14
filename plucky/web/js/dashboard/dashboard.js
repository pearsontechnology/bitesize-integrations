import React from 'react';
import environmentApi from '../api/environmentApi';
import projectApi from '../api/projectApi';
import { Card, CardText, CardTitle, CardActions } from 'material-ui/Card';
import FlatButton from 'material-ui/FlatButton';
import Health from './health';
import Divider from 'material-ui/Divider';
import ReleaseList from './releaseList';

class Dashboard extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			projects: []
		};
	}

	componentWillMount() {
		environmentApi.getEnvironments().then((data) => {
			this.setState({
				projects: data
			});
		});
	}

	build(projectName, version) {
		projectApi.buildProject(projectName, version).then((release) => {
			console.log(release);
		}).catch((error) => {
			console.error('error', error);
		});
	}

	createProjectCards() {
		const projectList = [];
		this.state.projects.forEach((project) => {
			projectList.push(
				<div className="col-md-6" key={`${project.name}`}>
					<Card>
						<CardTitle title={project.name}/>
						<CardActions>
							<FlatButton 
								backgroundColor="green"
								style={{color: 'white'}}
								label="Build Patch"
								onClick={() => { this.build(project.name, 'p')}} />
							<FlatButton 
								backgroundColor="blue" 
								style={{color: 'white'}}
								label="Build Minor" 
								onClick={() => { this.build(project.name, 'm')}} />
							<FlatButton 
								backgroundColor="orange" 
								style={{color: 'white'}}
								label="Build Major" 
								onClick={() => { this.build(project.name, 'M')}} />
						</CardActions>
						<CardText>
							<Health project={project.name} />
						</CardText>
						<Divider />
						<CardText>
							<ReleaseList project={project.name} />
						</CardText>
					</Card>
				</div>
			);
		});

		return projectList;
	}

	render() {
		const projects = this.createProjectCards();
		return (
			<div className="row">
				{projects}
			</div>
		);
	}
}

export default Dashboard;