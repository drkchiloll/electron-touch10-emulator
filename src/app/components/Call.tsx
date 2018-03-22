import * as React from 'react';
import * as Promise from 'bluebird';
import {
  Paper, FloatingActionButton, Subheader, Avatar,
  Chip, SvgIcon, Badge, Divider, FontIcon, IconButton,
  Drawer, TextField
} from 'material-ui';
import AddIcon from 'material-ui/svg-icons/content/add';
import DecreaseIcon from 'material-ui/svg-icons/content/remove'
import VolumeUp from 'material-ui/svg-icons/av/volume-up';
import VolumeDown from 'material-ui/svg-icons/av/volume-down';
import ShareIcon from 'material-ui/svg-icons/content/content-copy';
import PauseIcon from 'material-ui/svg-icons/av/pause';
import TransferIcon from 'material-ui/svg-icons/navigation/arrow-forward';
import CallEndIcon from 'material-ui/svg-icons/communication/call-end';
import MicOnIcon from 'material-ui/svg-icons/av/mic';
import MicOffIcon from 'material-ui/svg-icons/av/mic-off';
import DialPadIcon from 'material-ui/svg-icons/communication/dialpad';
import CloseIcon from 'material-ui/svg-icons/navigation/close';

import { JsXAPI, Time } from '../lib';

import { Dialer } from './index';

const styles: any = {
  main: {
    borderRadius: '7px',
    position: 'relative',
    marginLeft: '150px',
    marginTop: '150px',
    width: '600px',
    height: '350px'
  },
  inner: {
    marginTop: '85px',
    marginLeft: '230px',
    width: 140,
    height: 140
  },
  icon: {
    marginLeft: '32px'
  },
  divider: { height: 10 },
  div2: {
    position: 'absolute',
    bottom: 0
  },
  paper: { borderRadius: '7px', border: '1px solid black' },
  heading: { textAlign: 'center', padding: 0, margin: 0 },
  badge2: { top: 30, right: 28, width: 15, height: 15 },
  plusminusIcon: { width: 10, height: 10 },
  drawer: {
    position: 'absolute',
    height: 450,
    top: 200,
    right: 100
  },
};

export class Call extends React.Component<any, any> {
  state = {
    showDialer: false,
    number: '',
    callback: null,
    callbackHint: ''
  }

  componentDidMount() {
    let { callId } = this.props;
    let state: any = {};
    let callback: string;
    JsXAPI.getStatus('Call').then(calls => {
      if(calls && calls.length > 0) {
        callback = calls.find(c => c.id == callId).CallbackNumber;
        state['callback'] = callback;
        if(callback.includes('webex.com')) {
          state['showDialer'] = true;
          state['callbackHint'] = 'Enter PIN if Host';
        }
        this.setState(state);
      }
    });
  }

  hangup = callId => {
    return JsXAPI.hangUp(callId).then(() => {
      setTimeout(() =>
        this.props.switch({
          callView: false,
          meetingsView: false,
          mainView: true
        }), 100
      )
    })
  }

  passDigits = () => {
    let { number } = this.state;
    const { callId } = this.props;
    return JsXAPI.commander({
      string: `Call DTMFSend`,
      param: {
        CallId: callId,
        DTMFString: number + '#'
      }
    }).then((resp) => {
      this.setState({ number: '', showDialer: false, callbackHint: '' });
    })
  }

  updateNumber = (char) => {
    let { number } = this.state;
    this.setState({ number: number + char });
  }

  closeDialer = () => this.setState({ showDialer: false, number: '', callbackHint: '' });

  render() {
    let { number, showDialer, callback, callbackHint } = this.state;
    let { meeting, caller, callId, xapiData } = this.props;
    let avatar: any, title: string;
    if(meeting) {
      let temp = meeting.endpoint.number;
      temp = temp.replace(/@.*/, '');
      avatar = <div style={{ fontSize: '40%' }}>{ temp }</div>;
    } else {
      avatar = <div style={{ fontSize: '40%' }}>{ caller }</div>;
    }
    return (
      <div>
        <Paper style={styles.main}>
          <Avatar style={styles.inner} backgroundColor='grey' size={85}>
            { avatar }
          </Avatar>
          <Subheader style={{textAlign: 'center'}}>
            <div style={{fontSize: 18}}> { title } </div>
          </Subheader>
          <div style={styles.div2}>
            <Badge badgeContent={<DecreaseIcon color='white' style={styles.plusminusIcon} />}
              primary={true}
              badgeStyle={styles.badge2}>
              <IconButton onClick={() =>
                JsXAPI.setAudio('Decrease')
              }> <VolumeDown /> </IconButton>
            </Badge>
            <strong>Volume: {xapiData.volume}</strong>
            <Badge badgeContent={<AddIcon color='white' style={styles.plusminusIcon} />}
              primary={true}
              badgeStyle={styles.badge2}>
              <IconButton onClick={() =>
                JsXAPI.setAudio('Increase')
              } > <VolumeUp /> </IconButton>
            </Badge>
            <IconButton style={{ marginLeft: 10, marginBottom: 10 }}
              onClick={() => {
                let action = xapiData.mic === 'On' ? 'Unmute' : 'Mute';
                JsXAPI.setMic(action);
              }} >
              {
                xapiData.mic === 'Off' ?
                  <MicOnIcon /> :
                  <MicOffIcon />
              }
            </IconButton>
            <strong>Microphones</strong>
          </div>
        </Paper>
        <div style={{ marginTop: '35px' }}>
          <Avatar size={60} style={{ marginLeft: '195px' }} backgroundColor='black' >
            <AddIcon color='white' />
          </Avatar>
          <Avatar size={60} style={styles.icon} backgroundColor='black' >
            <ShareIcon className='share' color='white' />
          </Avatar>
          <Avatar size={60} style={styles.icon} backgroundColor='black' >
            <PauseIcon color='white' />
          </Avatar>
          <Avatar size={60} style={styles.icon} backgroundColor='black' >
            <IconButton tooltip='Keypad' tooltipPosition='bottom-center'
              onClick={() => {
                let { showDialer } = this.state;
                this.setState({ showDialer: showDialer ? false : true });
              }} >
              <DialPadIcon color='white' />
            </IconButton>
          </Avatar>
          <Avatar size={60} style={styles.icon} backgroundColor='black' >
            <TransferIcon color='white' />
          </Avatar>
          <Avatar size={60} style={styles.icon} backgroundColor='red'>
            <IconButton
              onClick={() => this.hangup(callId)} >
              <CallEndIcon color='white' />
            </IconButton>
          </Avatar>
        </div>
        <Drawer open={showDialer}
          openSecondary={true}
          containerStyle={{
            position: 'absolute',
            height: 450,
            top: 200,
            right: showDialer ? 100 : -1 /* Doesn't Show when it should be close */
          }}
          width={350} >
          <TextField type='text' id='dialer' fullWidth={true}
            hintText={callbackHint}
            hintStyle={{marginLeft: 35, fontSize: 20, color: 'grey'}}
            inputStyle={{ marginLeft: 35, fontSize: 28, color: 'white' }}
            style={{ backgroundColor: 'black', height: 75 }}
            underlineShow={false}
            value={this.state.number} />
          <IconButton onClick={this.closeDialer} tooltip='close me'
            tooltipPosition='bottom-left'
            tooltipStyles={{top:10}}
            iconStyle={{ height: 15, width: 15 }}
            style={{ position: 'absolute', right: 10, top: 0, height:25, width:25, padding: 0, margin: 0 }} >
            <CloseIcon color='white' />
          </IconButton>
          <Dialer showBackspace={number === '' ? false : true}
            passDigits={this.passDigits}
            update={this.updateNumber}
            delete={(v) => this.setState({ number: number.substring(0, number.length - 1) })} />
        </Drawer>
      </div>
    )
  }
}