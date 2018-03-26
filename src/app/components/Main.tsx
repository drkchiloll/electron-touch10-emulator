import * as React from 'react';
import * as Promise from 'bluebird';
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
import CallIcon from 'material-ui/svg-icons/communication/call';
import CallEndIcon from 'material-ui/svg-icons/communication/call-end';
import DnDIcon from 'material-ui/svg-icons/notification/do-not-disturb';
import IsConnectedIcon from 'material-ui/svg-icons/av/fiber-manual-record';
import {
  FloatingActionButton, Badge, FontIcon,
  Subheader, IconButton, Paper, Divider,
  Drawer
} from 'material-ui';
import {
  deepOrange400, lightBlueA200, green500, grey50
} from 'material-ui/styles/colors';
import { JsXAPI, Time, MeetingHelper } from '../lib';
import { remote } from 'electron';


export class Main extends React.Component<any,any> {
  constructor(props) {
    super(props);
    this.state = {
      left: window.innerWidth / 3.5,
      top: window.innerHeight / 3,
      meetInTen: false,
      nextMeeting: null,
      meetingBadge: null,
      durationInMs: null
    };
  }

  timeout: any = null;

  componentDidMount() {
    window.addEventListener('resize', () => {
      let { left, top } = this.state;
      left = window.innerWidth / 3.5;
      top = window.innerHeight / 3;
      this.setState({ left, top });
    });
    this.meetingSetup(this.props.meetings)
  }

  componentWillReceiveProps(props) {
    this.meetingSetup(props.meetings);
  }

  meetingSetup = (meetings) => {
    if(meetings && meetings instanceof Array && meetings.length > 0) {
      if(!Time.meetingEnded(meetings[0])) {
        MeetingHelper.compareNextMeetings(meetings[0])
          .then((nextMeeting) => {
            if(nextMeeting.hasOwnProperty('id')) {
              this.meetingHandler(nextMeeting);
            }
          });
      } else if(meetings.length > 1) {
        MeetingHelper.compareNextMeeting(meetings[1])
          .then(this.meetingHandler);
      }
    } else {
      MeetingHelper.setNext({});
      clearTimeout(this.timeout);
      this.setState({ durationInMs: 0, meetInTen: false });
    }
  }

  storeMeeting(meeting) {
    localStorage.setItem('nextMeeting', JSON.stringify(meeting));
  }

  compareMeetings = (nextMeeting, meetings) => {
    let meeting: any;
    if(nextMeeting.hasOwnProperty('id')) {
      if(meetings && meetings instanceof Array && meetings.length > 0) {
        meeting = meetings[0];
        if(meeting.id === nextMeeting.id) {
          if((meeting.startTime != nextMeeting.startTime) ||
             (meeting.endTime != nextMeeting.endTime)) {
            nextMeeting.startTime = meeting.startTime;
            nextMeeting.endTime = meeting.endTime;
            this.storeMeeting(nextMeeting);
            if(nextMeeting.redirected) nextMeeting.redirected = false;
            this.meetingHandler(nextMeeting);
          } else if(!this.state.durationInMs && !this.state.meetInTen) {
            this.meetingHandler(nextMeeting);
          }
        } else {
          if(meetings.length > 1) {
            nextMeeting = meetings[1];
            nextMeeting.redirected = false;
            this.storeMeeting(nextMeeting);
            this.meetingHandler(nextMeeting);
          } else {
            nextMeeting = meeting;
            nextMeeting.redirected = false;
            this.storeMeeting(nextMeeting);
            this.meetingHandler(nextMeeting);
          }
        }
      } else {
        this.setState({ meetInTen: false});
        if(meetings instanceof Array) {
          this.storeMeeting({});
          clearTimeout(this.timeout);
        }
      }
    } else if(meetings && meetings.length > 0) {
      console.log(meetings);
      meeting = meetings[0];
      if(meeting && meeting.id && meeting.startTime && meeting.endTime) {
        meeting['redirected'] = false;
        this.storeMeeting(meeting);
        this.meetingHandler(meeting);
      }
    }
  }

  meetingHandler = (nextMeeting) => {
    const { startTime, endTime } = nextMeeting;
    const meetInTen = Time.meetInTen(startTime, endTime);
    let durationInMs: any;
    if(!meetInTen && !Time.meetingEnded(endTime)) {
      const x = Time.timesubtract(startTime).format();
      if(this.state.durationInMs > 0) clearTimeout(this.timeout);
      durationInMs = Time.durationUntilMeeting(x);
      // console.log(durationInMs);
      this.timeout = setTimeout(() => {
        this.setState({ meetInTen: true });
        const theMeeting = MeetingHelper.getNext();
        if(!theMeeting.redirected) this.redirect(theMeeting);
      }, durationInMs);
    } else if(meetInTen && !Time.meetingEnded(endTime) && !nextMeeting.redirected) {
      setTimeout(() => this.redirect(nextMeeting), 500);
    }
    this.setState({ meetInTen, durationInMs });
  }

  _floatAction = () => {
    return <FloatingActionButton
      onClick={() => {
        this.redirect(JSON.parse(localStorage.getItem('nextMeeting')))
      }}
      backgroundColor={deepOrange400}
      style={{ marginLeft: 45 }}
      iconStyle={{ height: 85, width: 85 }} >
      <FontIcon>
        <Meeting style={{
          width: 55, height: 45, color: 'white', marginTop: '20px'
        }} />
      </FontIcon>
    </FloatingActionButton>
  }

  redirect = (nextMeeting) => {
    nextMeeting.redirected = true;
    localStorage.setItem('nextMeeting', JSON.stringify(nextMeeting));
    this.props.switch({ meetingsView: true });
  }

  render() {
    let MeetBadge: any;
    let { meetInTen, left, top } = this.state;
    let { volume, meetings, status, mic, directoryDialog, callError } = this.props;

    return (
      <div>
        <div style={{ left, top, position: 'absolute' }}>
          <FloatingActionButton backgroundColor={green500} iconStyle={{ height: 85, width: 85 }}
            onClick={() => this.props.switch({ directory: true })} >
            <FontIcon>
              <VideoCall style={{ height: 60, width: 60, marginTop: '10px', color: 'white' }} />
            </FontIcon>
          </FloatingActionButton>
          <FloatingActionButton backgroundColor={lightBlueA200} style={{ marginLeft: 45 }}
            iconStyle={{ height: 85, width: 85 }}>
            <FontIcon>
              <Share className='share' style={{
                width: 30, height: 40, marginTop: '20px', color: 'white'
              }} />
            </FontIcon>
          </FloatingActionButton>
          {
            meetInTen ?
              <Badge badgeContent={1} primary={true} badgeStyle={this.styles.badge1}>
                { this._floatAction() }
              </Badge> :
              this._floatAction()
          }
          <FloatingActionButton
            style={{marginLeft: '45px'}}
            backgroundColor={'grey'}
            iconStyle={{ height: 85, width: 85 }}
            onClick={() => {
              let action: string;
              if(status === 'Standby') {
                action = 'Deactivate';
              } else {
                action = 'Activate';
              }
              JsXAPI.updateWakeStatus(action);
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
                JsXAPI.setAudio('Decrease')
              }> <VolumeDown /> </IconButton>
            </Badge>
            <strong> Volume: {volume}</strong>
            <Badge badgeContent={<AddIcon color='white' style={this.styles.plusminusIcon} />}
              primary={true}
              badgeStyle={this.styles.badge2}>
              <IconButton style={{margin:0, padding:0}} onClick={() =>
                JsXAPI.setAudio('Increase')
              } > <VolumeUp /> </IconButton>
            </Badge>
            <br/>
            <IconButton style={{ marginLeft: 10, marginBottom: 10 }}
              onClick={() => {
                let action = mic === 'On' ? 'Unmute' : 'Mute';
                JsXAPI.setMic(action);
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
    callIcon1: {
      position: 'absolute',
      right: 25,
      top: 55
    },
    callIcon2: {
      position: 'absolute',
      right: 65,
      top: 55
    },
    callIcon3: {
      position: 'absolute',
      right: 105,
      top: 55
    },
    para: {
      lineHeight: 1.1,
      marginLeft: '15px',
      marginBottom: '15px',
    },
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