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

const AddCall = require('../imgs/AddCall.svg');
const TransferCall = require('../imgs/TransferCall.svg');
const HoldCall = require('../imgs/HoldCall.svg');
const ShareInCall = require('../imgs/ShareInCall.svg');
const KeyPad = require('../imgs/KeyPad.svg');
const EndCall = require('../imgs/EndCall.svg');

import { JsXAPI, Time, MeetingHelper } from '../lib';

import { Dialer } from './index';

export class Call extends React.Component<any, any> {
  state = {
    showDialer: false,
    number: '',
    callback: null,
    callbackHint: ''
  }

  componentDidMount() {
    let nextMeeting = MeetingHelper.getNext();
    if(nextMeeting.hasOwnProperty('redirected') && !nextMeeting.redirected) {
      nextMeeting.redirected = true;
      MeetingHelper.setNext(nextMeeting);
    }
    let { callId } = this.props;
    let state: any = {};
    let callback: string;

    JsXAPI.getStatus('Call').then(calls => {
      if(calls && calls.length > 0) {
        callback = calls.find(c => c.id == callId).CallbackNumber;
        state['callback'] = callback;
        if(callback.includes('webex.com')) {
          state['showDialer'] = true;
          state['callbackHint'] = 'Enter PIN + # if Host';
          JsXAPI.commander({
            string: 'UserInterface Message Prompt Display',
            param: {
              Duration: 45,
              Title: 'WebEx Pin',
              Text: '#'
            }
          });
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
        DTMFString: number
      }
    }).then((resp) => {
      JsXAPI.commander({
        string: 'UserInterface Message Prompt Clear',
        param: {}
      })
      this.setState({ number: '', showDialer: false, callbackHint: '' });
    })
  }

  updateNumber = (char) => {
    let { number, callback } = this.state;
    if(callback.includes('webex.com')) {
      JsXAPI.commander({
        string: 'UserInterface Message Prompt Display',
        param: {
          Duration: 45,
          Title: 'WebEx Pin Entry',
          Text: number + char
        }
      });
    }
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
        <Paper style={this.styles.main}>
          <Avatar style={this.styles.inner} backgroundColor='grey' size={85}>
            { avatar }
          </Avatar>
          <Subheader style={{textAlign: 'center'}}>
            <div style={{fontSize: 18}}> { title } </div>
          </Subheader>
        </Paper>
        <div style={{ marginTop: '35px' }}>
          <IconButton style={{ marginLeft: '190px', marginRight: '15px' }}
            disableTouchRipple={true}>
            <FontIcon> <img src={AddCall} height={60} width={60} /> </FontIcon>
          </IconButton>
          <IconButton style={this.styles.icon} disableTouchRipple={true}>
            <FontIcon> <img src={ShareInCall} height={60} width={60} /> </FontIcon>
          </IconButton>
          <IconButton style={this.styles.icon} disableTouchRipple={true}>
            <FontIcon> <img src={HoldCall} height={60} width={60} /> </FontIcon>
          </IconButton>
          <IconButton style={this.styles.icon} tooltip='Keypad' tooltipPosition='bottom-center'
            disableTouchRipple={true}
            onClick={() => {
              const { showDialer } = this.state;
              this.setState({ showDialer: showDialer ? false: true })
            }} >
            <FontIcon> <img src={KeyPad} height={60} width={60} /> </FontIcon>
          </IconButton>
          <IconButton style={this.styles.icon}>
            <FontIcon> <img src={TransferCall} height={60} width={60} /> </FontIcon>
          </IconButton>
          <IconButton style={this.styles.icon}
            disableTouchRipple={true}
            onClick={() => this.hangup(callId) } >
            <FontIcon> <img src={EndCall} height={60} width={60} /> </FontIcon>
          </IconButton>
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
            disabled
            hintText={callbackHint}
            hintStyle={this.styles.txthint}
            inputStyle={this.styles.txtinput}
            style={this.styles.text}
            underlineShow={false}
            value={this.state.number} />
          <IconButton onClick={this.closeDialer} tooltip='close me'
            tooltipPosition='bottom-left'
            tooltipStyles={{top:10}}
            iconStyle={this.styles.closeIcon}
            style={this.styles.closebtn} >
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

  styles:any = {
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
      marginLeft: '25px',
      height: 65, width: 65
    },
    div: {
      position: 'absolute',
      bottom: 0
    },
    badge: { top: 30, right: 28, width: 15, height: 15 },
    plusminusIcon: { width: 10, height: 10 },
    closeIcon: { height: 15, width: 15 },
    closebtn: {
      position: 'absolute',
      right: 10,
      top: 0,
      height: 25,
      width: 25,
      padding: 0,
      margin: 0
    },
    text: { backgroundColor: 'black', height: 75 },
    txthint: { marginLeft: 35, fontSize: 20, color: 'grey', top: 25 },
    txtinput: { marginLeft: 35, fontSize: 28, color: 'white', cursor: 'none' }
  }
}