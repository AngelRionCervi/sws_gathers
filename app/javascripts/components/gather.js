import {AssumeUserIdButton} from "javascripts/components/user";

const React = require("react");
const helper = require("javascripts/helper");
const enslUrl = helper.enslUrl;
const rankVotes = helper.rankeVotes;
const hiveUrl = helper.hiveUrl;

const SelectPlayerButton = React.createClass({
	propTypes: {
		socket: React.PropTypes.object.isRequired,
		gatherer: React.PropTypes.object.isRequired
	},

	selectPlayer(e) {
		e.preventDefault();
		this.props.socket.emit("gather:select", {
			player: parseInt(e.target.value, 10)
		});
	},

	render() {
		let button;
		if (this.props.gatherer.leader) {
			button = <button 
				className="btn btn-xs btn-default team-label"
				data-disabled="true">Leader</button>;
		} else if (this.props.gatherer.team !== "lobby") {
			button = <button
				data-disabled="true"
				className="btn btn-xs btn-default team-label"> 
					{_.capitalize(this.props.gatherer.team)}
				</button>;
		} else {
			button = <button
				onClick={this.selectPlayer}
				value={this.props.gatherer.id}
				className="btn btn-xs btn-primary team-label"> Select
				</button>;
		}
		return button;
	}
});

const GathererList = React.createClass({
	memberList() {
		const self = this;
		return this.props.gather.gatherers
			.filter(gatherer => gatherer.team === self.props.team)
			.sort(gatherer => { return gatherer.leader ? 1 : -1 });
	},

	render() {
		const extractGatherer = gatherer => {
			let image;
			if (gatherer.leader) {
				image = <i className="fa fa-star add-right"></i>;
			}
			return (
				<tr key={gatherer.id}>
					<td className="col-md-12">
						{image}{gatherer.user.username}
						<span className="pull-right">
							<LifeformIcons gatherer={gatherer} />
						</span>
					</td>
				</tr>
			);
		};
		const members = this.memberList()
			.map(extractGatherer);
		return (
			<table className="table">
				<tbody>
					{members}
				</tbody>
			</table>
		);
	}
});

const GatherTeams = React.createClass({
	render() {
		return (
			<div className="row add-top">
				<div className="col-sm-6">
					<div className="panel panel-primary panel-light-background">
						<div className="panel-heading">
							Marines
						</div>
						<GathererList gather={this.props.gather} team="marine" />
					</div>
				</div>
				<div className="col-sm-6">
					<div className="panel panel-primary panel-light-background">
						<div className="panel-heading">
							Aliens
						</div>
						<GathererList gather={this.props.gather} team="alien" />
					</div>
				</div>
			</div>
		);
	}
});

const ElectionProgressBar = React.createClass({
	componentDidMount() {
		const self = this;
		this.timer = setInterval(() => {
			self.forceUpdate();
		}, 900);
	},

	progress() {
		const interval = this.props.gather.election.interval;
		const startTime = (new Date(this.props.gather.election.startTime)).getTime();
		const msTranspired = Math.floor((new Date()).getTime() - startTime);

		return {
			num: msTranspired,
			den: interval,
			barMessage: Math.floor((interval - msTranspired) / 1000) + "s remaining"
		}
	},

	componentWillUnmount() {
		clearInterval(this.timer);
	},

	render() {
		return (<ProgressBar progress={this.progress()} />);
	}
});

const ProgressBar = React.createClass({
	render() {
		const progress = this.props.progress;
		const style = {
			width: Math.round((progress.num / progress.den * 100)) + "%"
		};
		const barMessage = progress.barMessage || "";
		return (
			<div className="progress">
				<div className="progress-bar progress-bar-striped active" 
					data-role="progressbar" 
					data-aria-valuenow={progress.num} 
					data-aria-valuemin="0" 
					data-aria-valuemax={progress.den} 
					style={style}>{barMessage}
				</div>
			</div>
		);
	}
});

const GatherProgress = React.createClass({
	stateDescription() {
		switch(this.props.gather.state) {
			case "gathering":
				return "Waiting for more gatherers.";
			case "election":
				return "Currently voting for team leaders.";
			case "selection":
				return "Waiting for leaders to pick teams.";
			case "done":
				return "Gather completed.";
			default:
				return "Initialising gather.";
		}
	},

	gatheringProgress() {
		const num = this.props.gather.gatherers.length;
		const den = 12;
		const remaining = den - num;
		const message = (remaining === 1) ? 
			"Waiting for last player" : `Waiting for ${remaining} more players`;
		return {
			num: num,
			den: den,
			message: message
		};
	},

	electionProgress() {
		const num = this.props.gather.gatherers.reduce((acc, gatherer) => {
			if (gatherer.leaderVote) acc++;
			return acc;
		}, 0);
		const den = 12;
		return {
			num: num,
			den: den,
			message: den - num + " more votes required"
		};
	},

	selectionProgress() {
		const num = this.props.gather.gatherers.reduce((acc, gatherer) => {
			if (gatherer.team !== "lobby") acc++;
			return acc;
		}, 0);
		const den = 12;

		return {
			num: num,
			den: den,
			message: `${num} out of ${den} players assigned. Waiting 
				on ${_.capitalize(this.props.gather.pickingTurn)}s to pick next...`
		};
	},

	render() {
		let progress, progressBar;
		const gatherState = this.props.gather.state;
		if (gatherState === 'gathering' && this.props.gather.gatherers.length) {
			progress = this.gatheringProgress();
			progressBar = (<ProgressBar progress={progress} />);
		} else if (gatherState === 'election') {
			progress = this.electionProgress();
			progressBar = (<ElectionProgressBar {...this.props} progress={progress} />);
		} else if (gatherState === 'selection') {
			progress = this.selectionProgress();
			progressBar = (<ProgressBar progress={progress} />);
		}

		if (!progress) return false;

		return (
			<div className="no-bottom">
				<p><strong>{this.stateDescription()}</strong> {progress.message}</p>
				{progressBar}
			</div>
		);
	}
});

const JoinGatherButton = React.createClass({
	propTypes: {
		thisGatherer: React.PropTypes.object,
		user: React.PropTypes.object.isRequired,
		socket: React.PropTypes.object.isRequired,
		gather: React.PropTypes.object.isRequired
	},

	componentDidMount() {
		const self = this;
		this.timer = setInterval(() => {
			self.forceUpdate();
		}, 30000);
	},

	componentWillUnmount() {
		clearInterval(this.timer);
	},

	joinGather(e) {
		e.preventDefault();
		this.props.socket.emit("gather:join");
	},

	leaveGather(e) {
		e.preventDefault();
		this.props.socket.emit("gather:leave");
	},

	cooldownTime() {
		let user = this.props.user;
		if (!user) return false;
		let cooloffTime = this.props.gather.cooldown[user.id];
		if (!cooloffTime) return false;
		let timeRemaining = new Date(cooloffTime) - new Date();
		return timeRemaining > 0 ? timeRemaining : false;
	},

	render() {
		let gather = this.props.gather;
		let thisGatherer = this.props.thisGatherer;
		if (thisGatherer) {
			return <button 
							onClick={this.leaveGather} 
							className="btn btn-danger">Leave Gather</button>;
		} 
		if (gather.state === 'gathering') {
			let cooldownTime = this.cooldownTime();
			if (cooldownTime) {
				return <CooloffButton timeRemaining={cooldownTime} />;
			} else {
				return <button 
						onClick={this.joinGather} 
						className="btn btn-success">Join Gather</button>;
			}
		}
		return false;
	}
});

const CooloffButton = React.createClass({
	propTypes: {
		timeRemaining: React.PropTypes.number.isRequired
	},

	timeRemaining() {
		return `${Math.floor(this.props.timeRemaining / 60000) + 1} minutes remaining`;
	},

	render() {
		return <button 
			disabled="true"
			className="btn btn-success">
				Leaver Cooloff ({this.timeRemaining()})
		</button>
	}
})

const GatherActions = React.createClass({
	propTypes: {
		socket: React.PropTypes.object.isRequired,
		gather: React.PropTypes.object.isRequired,
		thisGatherer: React.PropTypes.object
	},

	voteRegather(e) {
		e.preventDefault(e);
		this.props.socket.emit("gather:vote", {
			regather: (e.target.value === "true")
		});
	},

	regatherVotes() {
		let gather = this.props.gather;
		if (!gather) return 0;
		return gather.gatherers.reduce((acc, gatherer) => {
			if (gatherer.regatherVote) acc++;
			return acc;
		}, 0);
	},

	render() {
		let regatherButton;
		const user = this.props.user;
		const gather = this.props.gather;
		const socket = this.props.socket;
		const thisGatherer = this.props.thisGatherer;
		if (thisGatherer) {
			let regatherVotes = this.regatherVotes();
			if (thisGatherer.regatherVote) {
				regatherButton = <button value="false" onClick={this.voteRegather} 
						className="btn btn-danger">
							{`Voted Regather (${regatherVotes}/8)`}
					</button>;
			} else {
				regatherButton = <button value="true" onClick={this.voteRegather} 
						className="btn btn-danger">
							{`Vote Regather (${regatherVotes}/8)`}
					</button>;
			}
		}

		return (
			<div>
				<div className="text-right">
					<ul className="list-inline no-bottom">
						<li>
							{regatherButton}
						</li>
						<li>
							<JoinGatherButton gather={gather} thisGatherer={thisGatherer}
								user={user} socket={socket} />
						</li>
					</ul>
				</div>
			</div>
		);
	}
});

const VoteButton = React.createClass({
	propTypes: {
		socket: React.PropTypes.object.isRequired,
		candidate: React.PropTypes.object.isRequired,
		thisGatherer: React.PropTypes.object
	},

	cancelVote(e) {
		this.props.socket.emit("gather:vote", {
			leader: {
				candidate: null
			}
		});
	},

	vote(e) {
		e.preventDefault();
		this.props.socket.emit("gather:vote", {
			leader: {
				candidate: parseInt(e.target.value, 10)
			}
		});
	},

	stopGatherMusic() {
		soundController.stop();
	},

	render() {
		let candidate = this.props.candidate;
		let thisGatherer = this.props.thisGatherer;
		if (thisGatherer === null) {
			return false;
		}
		if (thisGatherer.leaderVote === candidate.id) {
			return (
				<button 
					onClick={this.cancelVote} 
					className="btn btn-xs btn-success vote-button">Voted
				</button>
			);
		} else {
			return (
				<button 
					onClick={this.vote} 
					className="btn btn-xs btn-primary vote-button"
					value={candidate.id}>Vote
				</button>
			);
		}
	}
});

const ServerVoting = React.createClass({
	propTypes: {
		socket: React.PropTypes.object.isRequired,
		gather: React.PropTypes.object.isRequired,
		thisGatherer: React.PropTypes.object,
		servers: React.PropTypes.array.isRequired,
	},

	voteHandler(serverId) {
		return e => {
			e.preventDefault();
			this.props.socket.emit("gather:vote", {
				server: {
					id: serverId
				}
			});
		}
	},

	votesForServer(server) {
		return this.props.gather.gatherers.reduce((acc, gatherer) => {
			if (gatherer.serverVote.some(voteId => voteId === server.id)) acc++;
			return acc;
		}, 0);
	},

	render() {
		let self = this;
		let thisGatherer = self.props.thisGatherer;
		let servers = self.props.servers.sort((a, b) => {
				const aVotes = self.votesForServer(a);
				const bVotes = self.votesForServer(b);
				return bVotes - aVotes;
			}).map(server => {
			let votes = self.votesForServer(server);
			let style = thisGatherer.serverVote.some(voteId => voteId === server.id) ? 
				"list-group-item list-group-item-success" : "list-group-item";
			return (
				<a href="#" 
					className={style} 
					onClick={self.voteHandler(server.id)} 
					key={server.id}>
					<span className="badge">{votes}</span>
					{server.name || server.description}
				</a>
			);
		});

		let votes = thisGatherer.serverVote.length;

		return (
			<div className="panel panel-primary">
				<div className="panel-heading">
					{votes === 2 ? "Server Votes" : 
					`Please Vote for a Server. ${2 - votes} votes remaining` }
				</div>
				<div className="list-group gather-voting">
					{servers}
				</div>
			</div>
		);
	}
})

const MapVoting = React.createClass({
	propTypes: {
		socket: React.PropTypes.object.isRequired,
		gather: React.PropTypes.object.isRequired,
		thisGatherer: React.PropTypes.object,
		maps: React.PropTypes.array.isRequired,
	},

	voteHandler(mapId) {
		return e => {
			e.preventDefault();
			this.props.socket.emit("gather:vote", {
				map: {
					id: mapId
				}
			});
		}
	},

	votesForMap(map) {
		return this.props.gather.gatherers.reduce((acc, gatherer) => {
			if (gatherer.mapVote.some(voteId => voteId === map.id)) acc++;
			return acc;
		}, 0);
	},

	render() {
		const self = this;
		let thisGatherer = self.props.thisGatherer
		let maps = self.props.maps.sort((a, b) => {
					const aVotes = self.votesForMap(a);
					const bVotes = self.votesForMap(b);
					return bVotes - aVotes;
				}).map(map => {
				let votes = self.votesForMap(map);
				let style = thisGatherer.mapVote.some(voteId => voteId === map.id) ? 
					"list-group-item list-group-item-success" : "list-group-item";
				return (
					<a href="#" 
						key={map.id} 
						onClick={self.voteHandler(map.id)}
						className={style}>
							<span className="badge">{votes}</span>
							{map.name}
					</a>
				);
			});

		let votes = thisGatherer.mapVote.length;

		return (
			<div className="panel panel-primary">
				<div className="panel-heading">
					{votes === 2 ? "Map Votes" : 
						`Please Vote for a Map. ${2 - votes} votes remaining` }
				</div>
				<div className="list-group gather-voting">
					{maps}
				</div>
			</div>
		);
	}
})

const Gather = exports.Gather = React.createClass({
	propTypes: {
		thisGatherer: React.PropTypes.object,
		maps: React.PropTypes.array.isRequired,
		servers: React.PropTypes.array.isRequired,
		socket: React.PropTypes.object.isRequired,
		gather: React.PropTypes.object.isRequired
	},

	render() {
		const socket = this.props.socket;
		const gather = this.props.gather;
		const thisGatherer = this.props.thisGatherer;
		const servers = this.props.servers;
		const maps = this.props.maps;
		const user = this.props.user;
		if (gather === null) return <div></div>;

		let voting;
		if (thisGatherer) {
			let state = gather.state;
			if (state === 'gathering' || state === 'election') {
				voting = (
					<div className="row add-top">
						<div className="col-sm-6">
							<MapVoting gather={gather} maps={maps} 
								socket={socket} thisGatherer={thisGatherer} />
						</div>
						<div className="col-sm-6">
							<ServerVoting gather={gather} servers={servers}
								socket={socket} thisGatherer={thisGatherer} />
						</div>
					</div>
				);
			} else {
				voting = <GatherVotingResults gather={gather} 
					servers={servers} 
					maps={maps} />;
			}
		}

		let gatherTeams;
		if (gather.state === 'selection') {
			gatherTeams = <GatherTeams gather={gather} />;
		}

		if (gather.gatherers.length > 0) {
			return (
				<div>
					<div className="panel panel-primary add-bottom">
						<div className="panel-heading">Current Gather</div>
						<div className="panel-body">
							<GatherProgress gather={gather} />
							<GatherActions gather={gather} user={user} thisGatherer={thisGatherer} 
								socket={socket} />
						</div>
					</div>
					<Gatherers gather={gather} user={user} 
						soundController={this.props.soundController}
						thisGatherer={thisGatherer} socket={socket} />
					{gatherTeams}
					{voting}
				</div>
			);
		} else {
			return (
				<div>
					<div className="panel panel-primary add-bottom">
						<div className="panel-heading">Current Gather</div>
					</div>
					<Gatherers gather={gather} user={user} thisGatherer={thisGatherer} 
						socket={socket} />
				</div>
			);
		}

	}
});

const LifeformIcons = exports.LifeformIcons = React.createClass({
	availableLifeforms() {
		return ["skulk", "gorge", "lerk", "fade", "onos", "commander"];
	},

	gathererLifeforms() {
		let lifeforms = [];
		let gatherer = this.props.gatherer;
		let abilities = gatherer.user.profile.abilities;
		for (let attr in abilities) {
			if (abilities[attr]) lifeforms.push(_.capitalize(attr));
		}
		return lifeforms;
	},

	render() {
		let lifeforms = this.gathererLifeforms();	
		let availableLifeforms = this.availableLifeforms();
		let icons = availableLifeforms.map(lifeform => {
			let containsAbility = lifeforms.some(gathererLifeform => {
				return gathererLifeform.toLowerCase() === lifeform.toLowerCase()
			});
			if (containsAbility) {
				return <img 
					className="lifeform-icon"
					key={lifeform}
					src={`/${lifeform.toLowerCase()}.png`} />
			} else {
				return <img 
					className="lifeform-icon"
					key={lifeform}
					src={`/blank.gif`} />
			}
		});
		return <span className="add-right hidden-xs">{icons}</span>
	}
});

const Gatherers = React.createClass({
	propTypes: {
		user: React.PropTypes.object,
		thisGatherer: React.PropTypes.object,
		socket: React.PropTypes.object.isRequired,
		gather: React.PropTypes.object.isRequired
	},

	joinGather(e) {
		e.preventDefault();
		this.props.socket.emit("gather:join");
	},

	bootGatherer(e) {
		e.preventDefault();
		this.props.socket.emit("gather:leave", {
			gatherer: parseInt(e.target.value, 10) || null
		});
	},

	render() {
		const self = this;
		const user = this.props.user;
		const socket = this.props.socket;
		const gather = this.props.gather;
		const thisGatherer = this.props.thisGatherer;
		const admin = (user && user.admin) || (user && user.moderator);
		const gatherers = gather.gatherers
		.sort((a, b) => {
				return (b.user.hive.skill || 1000) - (a.user.hive.skill || 1000);
			})
		.map(gatherer => {
			let country;
			if (gatherer.user.country) {
				country = (
					<img src="/blank.gif" 
						className={"flag flag-" + gatherer.user.country.toLowerCase()} 
						alt={gatherer.user.country} />
				);
			};

			let skill = gatherer.user.profile.skill || "Not Available";

			let hiveStats = [];
			if (gatherer.user.hive.skill) hiveStats.push(`${gatherer.user.hive.skill} ELO`);

			if (gatherer.user.hive.playTime) {
				hiveStats.push(`${Math.floor(gatherer.user.hive.playTime / 3600)} Hours`);
			}

			let hive = (hiveStats.length) ? hiveStats.join(", ") : "Not Available";
			
			let team = (gatherer.user.team) ? gatherer.user.team.name : "None";

			let action;
			if (gather.state === "election") {
				let votes = gather.gatherers.reduce((acc, voter) => {
					if (voter.leaderVote === gatherer.id) acc++;
					return acc;
				}, 0)
				action = (
					<span>
						<span className="badge add-right">{votes + " votes"}</span>
						<VoteButton 
							thisGatherer={thisGatherer} 
							soundController={this.props.soundController}
							candidate={gatherer} />
					</span>
				);
			}

			if (gather.state === 'selection') {
				if (thisGatherer && 
						thisGatherer.leader &&
						thisGatherer.team === gather.pickingTurn) {
					action = (
						<span>
							<SelectPlayerButton gatherer={gatherer} />
						</span>
					);
				} else {
					if (gatherer.leader) {
						action = (<span className={`label label-padding 
							label-${gatherer.team} 
							team-label`}>Leader</span>);
					} else if (gatherer.team !== "lobby") {
						action = (<span className={`label label-padding 
							label-${gatherer.team} 
							team-label`}>{_.capitalize(gatherer.team)}</span>);
					} else {
						action = (<span className="label label-padding label-default team-label">
							Lobby</span>);
					}
				}
			}

			let adminOptions;
			if (admin) {
				adminOptions = [
					<hr />,
					<dt>Admin</dt>,
					<dd>
						<button
							className="btn btn-xs btn-danger"
							value={gatherer.user.id}
							onClick={this.bootGatherer}>
							Boot from Gather
						</button>&nbsp;
						<AssumeUserIdButton socket={socket}
							gatherer={gatherer} currentUser={user} />
					</dd>
				]
			}

			let tabColor = gatherer.team !== "lobby" ? `panel-${gatherer.team}` : "panel-info";
			return (
				<div className={`panel ${tabColor} gatherer-panel`} 
					key={gatherer.user.id} data-userid={gatherer.user.id}>
					<div className="panel-heading">
						<h4 className="panel-title">
							{country} {gatherer.user.username}
							<span className="pull-right">
								<a data-toggle="collapse"
									href={"#"+gatherer.user.id.toString() + "-collapse"} 
									aria-expanded="false" 
									className="btn btn-xs btn-primary add-right"
									aria-controls={gatherer.user.id.toString() + "-collapse"}>
									Info <span className="caret"></span></a>
								<LifeformIcons gatherer={gatherer} />
								{action}
							</span>
						</h4>
					</div>
					<div id={gatherer.user.id.toString() + "-collapse"} 
						className="panel-collapse collapse out" >
						<div className="panel-body">
							<dl className="dl-horizontal">
								<dt>Skill Level</dt>
								<dd>{skill}</dd>
								<dt>Team</dt>
								<dd>{team}</dd>
								<dt>Hive Stats</dt>
								<dd>{hive}</dd>
								<dt>Links</dt>
								<dd>
									<a href={enslUrl(gatherer)} 
										className="btn btn-xs btn-primary"
										target="_blank">ENSL Profile</a>&nbsp;
									<a href={hiveUrl(gatherer)} 
										className="btn btn-xs btn-primary"
										target="_blank">Hive Profile</a>
								</dd>
								{adminOptions}
							</dl>
						</div>
					</div>
				</div>
			);
		})
		if (gather.gatherers.length) {
			return (
				<div class="panel-group" 
					role="tablist" 
					aria-multiselectable="true" 
					id="gatherers-panel">
					{gatherers}
				</div>
			);
		} else {
			return (
				<div className="panel panel-primary add-bottom">
					<div className="panel-body text-center join-hero">
						<button 
							onClick={this.joinGather} 
							className="btn btn-success btn-lg">Start a Gather</button>
					</div>
				</div>
			);
		}
	}
});

const CompletedGather = React.createClass({
	completionDate() {
		let d = new Date(this.props.gather.done.time);
		if (d) {
			return d.toLocaleTimeString();
		} else {
			return "Completed Gather"
		}
	},

	getInitialState() {
		return {
			show: !!this.props.show
		};
	},

	toggleGatherInfo() {
		let newState = !this.state.show;
		this.setState({
			show: newState
		});
	},

	render() {
		let gatherInfo = [];
		let gather = this.props.gather;
		let maps = this.props.maps;
		let servers = this.props.servers;
		if (this.state.show) {
			gatherInfo.push(<GatherTeams gather={gather} />);
			gatherInfo.push(<GatherVotingResults gather={gather} 
				maps={maps} 
				servers={servers}/>);
		}
		return (
			<div>
				<div className="panel panel-success add-bottom pointer"
					onClick={this.toggleGatherInfo}>
					<div className="panel-heading"><strong>{this.completionDate()}</strong></div>
				</div>
				{gatherInfo}
			</div>
		);
	}
});

const GatherVotingResults = React.createClass({
	// Returns an array of ids voted for e.g. [1,2,5,1,1,3,2]
	countVotes(voteType) {
		return this.props.gather.gatherers.reduce((acc, gatherer) => {
			let votes = gatherer[voteType];

			// Temporary fix because some mapvotes are ints and not arrays
			if (!Array.isArray(votes)) votes = [votes];

			if (votes.length > 0) votes.forEach(vote => acc.push(vote));
			return acc;
		}, []);
	},

	selectedMaps() {
		return rankVotes(this.countVotes('mapVote'), this.props.maps).slice(0, 2)
	},

	selectedServer() {
		return rankVotes(this.countVotes('serverVote'), this.props.servers).slice(0, 1);
	},

	render() {
		let maps = this.selectedMaps();
		let server = this.selectedServer().pop();
		let password;
		if (server.password) {
			password = [
				<dt>Password</dt>,
				<dd>{server.password}</dd>
			];
		}
		return (
			<div className="panel panel-primary">
				<div className="panel-heading">
					Server
				</div>
				<div className="panel-body">
					<dl className="dl-horizontal">
						<dt>Maps</dt>
						<dd>{maps.map(map => map.name).join(" & ")}</dd>
						<dt>Server</dt>
						<dd>{server.name}</dd>
						<dt>Address</dt>
						<dd>{server.ip}:{server.port}</dd>
						{password}
					</dl>
					<p>
						<a href={`steam://run/4920/connect+%20${server.ip}:${server.port}%20+password%20${server.password}`}
							className="btn btn-primary max-width">Join Server</a>
					</p>
				</div>
			</div>
		);
	}
});

const ArchivedGathers = exports.ArchivedGathers = React.createClass({
	propTypes: {
		archive: React.PropTypes.array.isRequired,
		servers: React.PropTypes.array.isRequired,
		maps: React.PropTypes.array.isRequired
	},

	render() {
		let archive = this.props.archive
			.sort((a, b) => {
				return new Date(b.createdAt) - new Date(a.createdAt);
			})
			.map((archivedGather, index) => {
				return <CompletedGather 
					id={archivedGather.gather.done.time}
					show={(index === 0) ? true : false}
					gather={archivedGather.gather} 
					maps={this.props.maps}
					servers={this.props.servers} />
			});

		return (
			<div className="panel panel-primary">
				<div className="panel-heading">Archived Gathers</div>
				<div className="panel-body">
					{archive}
				</div>
			</div>
		);
	}
});