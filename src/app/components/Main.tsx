import * as React from 'react';
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
import {
  deepOrange400, lightBlueA200, green500, grey50
} from 'material-ui/styles/colors';

import { Api } from '../lib/api';

export class Main extends React.Component<any,any> {
  state = {
    left: window.innerWidth / 3.5,
    top: window.innerHeight / 3,
    meetInTen: false,
    nextMeeting: null,
    volume: 0
  }

  componentDidMount() {
    window.addEventListener('resize', () => {
      let { left, top } = this.state;
      left = window.innerWidth / 3.5;
      top = window.innerHeight / 3;
      this.setState({ left, top });
    });
  }

  _closeConnection = () => {
    return Promise.resolve();
  }

  _floatAction = () =>
    <FloatingActionButton onClick={this._closeConnection} backgroundColor={deepOrange400} style={{ marginLeft: 45 }}
      iconStyle={{ height: 85, width: 85 }} >
      <FontIcon>
        <Meeting style={{
          width: 55, height: 45, color: '#CFD8DC', marginTop: '20px'
        }} />
      </FontIcon>
    </FloatingActionButton>

  redirectTimer = () => {
    setTimeout(() => {
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

  redirect = () => this._closeConnection()
    .then(() => this.props.history.push('/meetings'));

  render() {
    let MeetBadge: any;
    let { meetInTen, volume } = this.state;
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
        <div style={{ left: this.state.left, top: this.state.top, position: 'absolute' }}>
          <FloatingActionButton backgroundColor={green500} iconStyle={{ height: 85, width: 85 }}
            onClick={() => { }} >
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
          </div>
        </div>
        <div style={this.styles.div2}>
          <Paper style={this.styles.paper} rounded={false} >
            <h5 style={this.styles.heading}> Controls </h5>
            <Divider />
            <Badge badgeContent={<DecreaseIcon color='white' style={this.styles.plusminusIcon} />}
              primary={true}
              badgeStyle={this.styles.badge2}>
              <IconButton onClick={() =>
                Api.setAudio('Decrease').then(() =>
                  this.setState({ volume: --volume }))
              }> <VolumeDown /> </IconButton>
            </Badge>
            Volume: {volume}
            <Badge badgeContent={<AddIcon color='white' style={this.styles.plusminusIcon} />}
              primary={true}
              badgeStyle={this.styles.badge2}>
              <IconButton onClick={() =>
                Api.setAudio('Increase').then(() =>
                  this.setState({ volume: ++volume }))
              } > <VolumeUp /> </IconButton>
            </Badge>
            <Divider />
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
      height: 45,
      color: '#CFD8DC',
      marginTop: '20px'
    },
    div1: { marginLeft: 30 },
    span1: { marginLeft: 90 },
    div2: {
      position: 'absolute',
      bottom: 20
    },
    paper: { borderRadius: '10%' },
    heading: { textAlign: 'center', padding: 0, margin: 0 },
    plusminusIcon: { width: 10, height: 10 },
    badge2: { top: 30, right: 28, width: 15, height: 15 },
    divider: { height: 10 }
  }
}