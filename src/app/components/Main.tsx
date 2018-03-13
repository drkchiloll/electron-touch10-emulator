import * as React from 'react';
import * as Promise from 'bluebird';
import {
  FloatingActionButton, Badge, FontIcon,
  Subheader, IconButton, Paper, Divider
} from 'material-ui';
import VideoCall from 'material-ui/svg-icons/av/videocam';
import Share from 'material-ui/svg-icons/content/content-copy'
import Meeting from 'material-ui/svg-icons/action/event';
import AddIcon from 'material-ui/svg-icons/content/add';
import VolumeUp from 'material-ui/svg-icons/av/volume-up';
import VolumeDown from 'material-ui/svg-icons/av/volume-down';
import DecreaseIcon from 'material-ui/svg-icons/content/remove'
import AwakeIcon from 'material-ui/svg-icons/action/visibility';
import StandbyIcon from 'material-ui/svg-icons/action/visibility-off';
import MicOnIcon from 'material-ui/svg-icons/av/mic';
import MicOffIcon from 'material-ui/svg-icons/av/mic-off';
import {
  deepOrange400, lightBlueA200, green500, grey50
} from 'material-ui/styles/colors';

import { CallDirectory } from './index';

import { JsXAPI, Time } from '../lib';

export class Main extends React.Component<any,any> {
  constructor(props) {
    super(props);
    this.state = {
      left: window.innerWidth / 3.5,
      top: window.innerHeight / 3,
      meetInTen: false,
      nextMeeting: null,
      volume: 0,
      mic: 'Off',
      status: 'Standby',
      directoryDialog: false
    };
  }

  timeout: any;

  call: any;

  componentDidMount() {
    if(JsXAPI.xapi.eventNames().indexOf('updates') === -1) {
      JsXAPI.xapi.on('update', this.eventHandler);
    }
    JsXAPI.eventInterval = setInterval(JsXAPI.poller, 2500);
  }

  componentWillUnmount() {
    clearTimeout(this.timeout);
    clearInterval(JsXAPI.eventInterval);
    JsXAPI.xapi.removeAllListeners();
  }

  componentWillMount() {
    window.addEventListener('resize', () => {
      let { left, top } = this.state;
      left = window.innerWidth / 3.5;
      top = window.innerHeight / 3;
      this.setState({ left, top });
    });

    JsXAPI.getMeetings().then((meetings) => {
      if(meetings.length !== 0) {
        this.meetingHander(meetings[0]);
      }
      this.call = JsXAPI.xapi.feedback.on('/Status/Call', this.callHandler);
      return;
    }).then(() => {
      return Promise.all([
        JsXAPI.getAudio(),
        JsXAPI.wakeStatus(),
        JsXAPI.getMicStatus()
      ]);
    }).then((results) => {
      this.setState({
        volume: results[0],
        status: results[1] === 'Off' ? 'Awake': 'Standby',
        mic: results[2]
      });
    });
  }

  initEvents = () => {
    JsXAPI.xapi.on('update', this.eventHandler);
    this.call = JsXAPI.xapi.feedback.on('/Status/Call', this.callHandler);
  }

  eventHandler = (updates) => {
    if(updates === 'closing') return setTimeout(this.initEvents, 1000);
    if(updates[0].length > 0) {
      this.meetingHander(updates[0][0]);
    }
    this.setState({
      meetings: updates[0],
      volume: updates[1],
      status: updates[2] === 'Off' ? 'Awake' : 'Standby',
      mic: updates[3]
    });
  }

  callHandler = call => {
    // console.log('call handler');
    let { directoryDialog } = this.state;
    if(call && call.id && call.AnswerState === 'Answered') {
      if(directoryDialog) this.setState({ directoryDialog: false });
      JsXAPI.xapi.status
        .get(`Call ${call.id} DisplayName`)
        .then(caller => {
          this.props.switch({
            callView: true,
            mainView: false,
            meetingsView: false,
            caller,
            callId: call.id
          });
          this.call();
        });
    }
  }

  meetingHander = (nextMeeting) => {
    const { startTime, endTime } = nextMeeting;
    const meetInTen = Time.meetInTen(startTime, endTime);
    this.setState({ meetInTen, nextMeeting });
    if(!meetInTen && !Time.meetingEnded(endTime)) {
      const x = Time.timesubtract(startTime).format();
      const durationInMs = Time.durationUntilMeeting(x);
      // console.log(durationInMs);
      this.timeout = setTimeout(() => {
        this.redirect();
      }, durationInMs);
    }
  }

  _closeConnection = () => JsXAPI.closeConnection();

  _floatAction = () =>
    <FloatingActionButton
      onClick={this.redirect}
      backgroundColor={deepOrange400}
      style={{ marginLeft: 45 }}
      iconStyle={{ height: 85, width: 85 }} >
      <FontIcon>
        <Meeting style={{
          width: 55, height: 45, color: '#CFD8DC', marginTop: '20px'
        }} />
      </FontIcon>
    </FloatingActionButton>

  redirectTimer = () => {
    this.timeout = setTimeout(() => {
      let redirectCounter = sessionStorage.getItem('redirectCounter');
      if(!redirectCounter) {
        sessionStorage.setItem('redirectCounter', '1');
        this.redirect();
      } else if(parseInt(redirectCounter, 10) === 1) {
        sessionStorage.setItem('redirectCounter', '2');
        this.redirect();
      }
    }, 2000);
  }

  redirect = () => this.props.switch({ meetingsView: true });

  callRedirect = (update) => this.props.switch(update);

  render() {
    let MeetBadge: any;
    let { meetInTen, volume, status, directoryDialog, mic } = this.state;
    if(meetInTen) {
      MeetBadge =
        <Badge badgeContent={1} primary={true} badgeStyle={this.styles.badge1} >
          {this._floatAction()}
        </Badge>
      this.redirectTimer();
    } else {
      let redirectCounter = sessionStorage.getItem('redirectCounter');
      if(redirectCounter && parseInt(redirectCounter, 10) > 1) {
        sessionStorage.setItem('redirectCounter', '0');
      }
      MeetBadge = this._floatAction();
    }
    return (
      <div>
        <p style={{ font: '14px arial', color: 'grey'}}>{this.props.account.name}></p>
        {
          directoryDialog ?
            <CallDirectory close={() => this.setState({directoryDialog: false })}
              switch={this.callRedirect} /> :
            null
        }
        <div style={{ left: this.state.left, top: this.state.top, position: 'absolute' }}>
          <FloatingActionButton backgroundColor={green500} iconStyle={{ height: 85, width: 85 }}
            onClick={() => this.setState({ directoryDialog: true })} >
            <FontIcon>
              <VideoCall style={{ height: 60, width: 60, marginTop: '10px', color: '#CFD8DC' }} />
            </FontIcon>
          </FloatingActionButton>
          <FloatingActionButton backgroundColor={lightBlueA200} style={{ marginLeft: 45 }}
            iconStyle={{ height: 85, width: 85 }}>
            <FontIcon>
              <Share className='share' style={{
                width: 30, height: 40, marginTop: '20px', color: '#CFD8DC'
              }} />
            </FontIcon>
          </FloatingActionButton>
          {MeetBadge}
          <FloatingActionButton style={{marginLeft: '45px'}} backgroundColor={'grey'} iconStyle={{ height: 85, width: 85 }}
            onClick={() => {
              let action: string;
              if(status === 'Standby') {
                action = 'Deactivate';
              } else {
                action = 'Activate';
              }
              JsXAPI.updateWakeStatus(action).then((resp) => {
                this.setState({ status: status === 'Standby' ? 'Awake': 'Standby' });
              })
            }}>
            <FontIcon>
              { status === 'Standby' ?
                <StandbyIcon style={this.styles.wakeIcons} /> :
                <AwakeIcon style={this.styles.wakeIcons} />}
            </FontIcon>
          </FloatingActionButton>
        </div>
        <div style={{
          left: this.state.left,
          top: this.state.top + (meetInTen ? 125 : 100),
          position: 'absolute'
        }}>
          <div style={this.styles.div1}>
            Call
            <span style={this.styles.span1}> Share </span>
            <span style={{
              marginLeft: meetInTen ? 95 : 80
            }}> Meetings </span>
            <span style={{marginLeft: meetInTen ? 92 : 70}}> {status} </span>
          </div>
        </div>
        <div style={this.styles.div2}>
          <Paper style={this.styles.paper} rounded={false} >
            <h5 style={this.styles.heading}> Controls </h5>
            <Divider style={{ border: '.7px solid black', backgroundColor: 'black' }} />
            <Badge badgeContent={<DecreaseIcon color='white' style={this.styles.plusminusIcon} />}
              primary={true}
              badgeStyle={this.styles.badge2}>
              <IconButton style={{margin:0, padding:0}} onClick={() =>
                JsXAPI.setAudio('Decrease').then(() =>
                  this.setState({ volume: --volume }))
              }> <VolumeDown /> </IconButton>
            </Badge>
            <strong> Volume: {volume}</strong>
            <Badge badgeContent={<AddIcon color='white' style={this.styles.plusminusIcon} />}
              primary={true}
              badgeStyle={this.styles.badge2}>
              <IconButton style={{margin:0, padding:0}} onClick={() =>
                JsXAPI.setAudio('Increase').then(() =>
                  this.setState({ volume: ++volume }))
              } > <VolumeUp /> </IconButton>
            </Badge>
            <br/>
            <IconButton style={{ marginLeft: 10, marginBottom: 10 }}
              onClick={() => {
                let action = mic === 'On' ? 'Unmute' : 'Mute';
                JsXAPI.setMic(action).then(() => {
                  this.setState({ mic: action === 'Mute' ? 'On' : 'Off' });
                });
              }} >
              {
                mic === 'Off' ?
                  <MicOnIcon /> :
                  <MicOffIcon />
              }
            </IconButton>
            <strong>Microphones</strong>
            <Divider style={{ border: '.7px solid black', backgroundColor: 'black' }} />
            <div style={this.styles.divider}></div>
          </Paper>
        </div>
      </div>
    );
  }

  styles: any = {
    badge1: { top: 22, right: 23 },
    actionBtn: { marginLeft: 45 },
    btnIcon: { height: 85, width: 85 },
    meetingIcon: {
      width: 55,
      height: 55,
      color: '#CFD8DC',
      marginTop: '20px'
    },
    div1: { marginLeft: 30 },
    span1: { marginLeft: 95 },
    div2: {
      position: 'absolute',
      bottom: 20
    },
    paper: { borderRadius: '7px', border: '1px solid black' },
    heading: { textAlign: 'center', padding: 0, margin: 0 },
    plusminusIcon: { width: 10, height: 10, margin: 0, padding: 0 },
    badge2: { top: 30, right: 28, width: 15, height: 15 },
    divider: { height: 10 },
    wakeIcons: {
      width: 40,
      height: 50,
      marginTop: '15px',
      color: 'black'
    }
  }
}