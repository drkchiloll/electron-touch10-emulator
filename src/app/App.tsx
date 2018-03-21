import * as React from 'react';
import * as Promise from 'bluebird';
import { remote } from 'electron';
import { Dialog, IconButton, Drawer } from 'material-ui';
import SettingsIcon from 'material-ui/svg-icons/action/settings';
import IsConnectedIcon from 'material-ui/svg-icons/av/fiber-manual-record';
import CallIcon from 'material-ui/svg-icons/communication/call';
import CallEndIcon from 'material-ui/svg-icons/communication/call-end';
import DnDIcon from 'material-ui/svg-icons/notification/do-not-disturb';
// Import Components
import {
  Main, Meetings, Call, AccountDialog,
  CallDirectory, CallNotification
} from './components';
import { JsXAPI, Accounts } from './lib';
import { CallHandler } from './lib/callhandler';

export namespace App {
  export interface Props { }
  export interface State {
    account: any;
    mainView: boolean;
    meetingsView: boolean;
    callView: boolean;
    callId?: any;
    caller?: any;
    acctDialog: boolean;
    connected: boolean;
    xapiData: {
      meeting: any;
      meetings: any;
      volume: any;
      mic: string;
      status: string;
      incomingCall?: {
        id?: string;
        disconnect?: boolean;
        callback?: string;
        display?: string;
        status?: string;
        answered: boolean;
      },
      outgoingCall?: {
        id?: string;
        disconnect: boolean;
        callback?: string;
        display?: string;
        status?: string;
        answered: boolean;
      },
      callError: boolean;
      directoryDialog: boolean;
    }
  }
}

export class App extends React.Component<App.Props, App.State> {
  public calls:any;
  public microphone:any;
  public audio:any;
  public wakeStatus:any;
  constructor(props) {
    super(props);
    this.state = {
      account: null,
      mainView: false,
      meetingsView: false,
      callView: false,
      callId: null,
      caller: null,
      acctDialog: false,
      connected: true,
      xapiData: {
        meeting: null,
        meetings: null,
        volume: 0,
        mic: 'Off',
        status: 'Standby',
        incomingCall: { answered: false, disconnect: false },
        outgoingCall: { answered: false, disconnect: false },
        callError: false,
        directoryDialog: false
      }
    }
  }

  componentWillMount() {
    const accounts = Accounts.get();
    let account: any;
    if(accounts) {
      account = accounts.find(a => a.selected);
      if(account.name === 'New' && !account.host) {
        this.setState({ acctDialog: true });
      } else {
        this.setState({ account });
        return this.initHandler(account);
      }
    }
  }

  initHandler = (account) => {
    this.connect(account)
      .then(this.xapiDataTracking)
      .then(() => {
        this.setState({
          mainView: true,
          acctDialog: false,
          account,
          connected: true
        });
        this.registerEvents();
        JsXAPI.eventInterval = setInterval(JsXAPI.poller, 60000);
      }).then(this.callCheck);
  }

  connect = (account) => {
    JsXAPI.account = account;
    return JsXAPI.init().then(() => {
      this.connErrors();
      return;
    })
    .catch(e => {
      clearInterval(JsXAPI.eventInterval);
      this.setState({ connected: false });
    });
  }

  callCheck = () => {
    return JsXAPI.getStatus('Call')
      .then((call:any) => {
        console.log(call);
        if(!call) {
          return false;
        } else if(call.length === 1) {
          this.updateView({
            mainView: false, meetingsView: false,
            callView: true,
            caller: call[0].DisplayName,
            callId: call[0].id
          });
          return true;
        }
      })
  }

  callUpdate = (call) => ({
    mainView: false, meetingsView: false,
    callView: true,
    caller: call.display,
    callId: call.id
  });

  xapiDataTracking = () => {
    return Promise.all([
      JsXAPI.getMeetings(),
      JsXAPI.getAudio(),
      JsXAPI.getState(),
      JsXAPI.getMicStatus()
    ]).then(stuffs => {
      let {xapiData} = this.state;
      xapiData['meetings'] = stuffs[0];
      xapiData['volume'] = stuffs[1];
      xapiData['status'] = stuffs[2] === 'Off' ? 'Awake' : 'Standby';
      xapiData['mic'] = stuffs[3];
      this.setState({xapiData});
      return;
    });
  }

  registerEvents = () => {
    if(JsXAPI.xapi.eventNames().indexOf('update') === -1) {
      JsXAPI.xapi.addListener('update', this.eventhandler);
      this.calls = JsXAPI.xapi.feedback.on('/Status/Call', this.callhandler);
      this.wakeStatus = JsXAPI.xapi.feedback.on('/Status/Standby State', (state) => {
        console.log(state);
        let { xapiData } = this.state;
        xapiData['status'] = state === 'Off' ? 'Awake' : 'Standby';
        this.setState({ xapiData });
      })
      this.audio = JsXAPI.xapi.feedback.on('/Status/Audio Volume', (volume) => {
        let { xapiData } = this.state;
        xapiData['volume'] = volume;
        this.setState({ xapiData })
      })
      this.microphone = JsXAPI.xapi.feedback.on('/Status/Audio Microphones', (mic) => {
        console.log(mic);
        let { xapiData } = this.state;
        xapiData['mic'] = mic.Mute;
        this.setState({ xapiData });
      })
    }
    // console.log(JsXAPI.xapi.eventNames());
  }

  eventhandler = (stuffs) => {
    let { xapiData } = this.state;
    if(stuffs && stuffs === 'closing') {
      setTimeout(this.registerEvents, 1000);
    }
    if(xapiData.meetings && xapiData.meetings.length === stuffs[0].length) {
      return;
    } else {
      xapiData['meetings'] = stuffs[0];
      this.setState({ xapiData });
    }
  }

  callhandler = call => {
    let update: any = {};
    let { xapiData } = this.state;
    let { directoryDialog, callError } = xapiData;
    const { incomingCall, outgoingCall } = CallHandler.read(call);
    const win = remote.getCurrentWindow();
    win.focus();
    if(outgoingCall && outgoingCall.id) {
      xapiData['outgoingCall'] = outgoingCall;
      if(outgoingCall.display && !outgoingCall.disconnect) {
        xapiData['outgoingCall'] = outgoingCall;
        update = this.callUpdate(outgoingCall);
      }
      if(outgoingCall.disconnect && !outgoingCall.answered) {
        callError = true;
        xapiData['outgoingCall'] = { answered: false, disconnect: false };
      }
      if(outgoingCall.disconnect) {
        // xapiData['outgoingCall'] = { answered: false, disconnect: false };
        this.updateView({
          mainView: true, meetingsView: false
        });
      }
    } else if(incomingCall && incomingCall.id) {
      xapiData['incomingCall'] = incomingCall;
      if(incomingCall.answered && !incomingCall.disconnect) {
        update = this.callUpdate(incomingCall);
      }
      if(incomingCall.disconnect) {
        this.updateView({
          mainView: true,
          meetingsView: false,
          callView: false
        })
      }
    }
    this.setState({ xapiData });
    if(update && update.callId) {
      this.updateView(update);
    }
  }

  connErrors = () => {
    const { account } = this.state;
    if(JsXAPI.event.eventNames().indexOf('connection-error') === -1) {
      JsXAPI.event.addListener('connection-error', () => {
        console.log('error event called');
        clearInterval(JsXAPI.eventInterval);
        this.setState({
          connected: false,
          mainView: false,
          meetingsView: false,
          callView: false
        });
        this.initHandler(account);
      });
    }
  }

  updateView = (args: any) => {
    // Main -> Meetings List
    // Meeting -> Call
    // console.log(args);
    const {
      mainView, meetingsView, callView
    } = args;
    if(args.directory) {
      let {xapiData} = this.state;
      xapiData['directoryDialog'] = true;
      this.setState({ xapiData });
    } else if(meetingsView) {
      this.setState({
        meetingsView,
        mainView: false,
        callView: false,
        acctDialog: false
      });
    } else if(mainView) {
      this.setState({
        mainView,
        meetingsView: false,
        callView: false,
        acctDialog: false
      });
    } else if(callView) {
      let update: any = {
        callView,
        mainView: false,
        meetingsView: false,
        acctDialog: false,
        callId: args.callId,
        meeting: args.meeting,
        caller: args.caller
      };
      this.setState(update);
    }
  }

  modifyAccount = () => {
    if(JsXAPI.xapi) {
      JsXAPI.xapi.close();
    }
    this.setState({
      mainView: false,
      meetingsView: false,
      callView: false,
      acctDialog: true
    });
  }

  closeAccountManagement = () => {
    const accounts = Accounts.get();
    let account = accounts.find(a => a.selected);
    this.initHandler(account);
  }

  render() {
    const {
      mainView, meetingsView, connected,
      callView, acctDialog, account,
      xapiData: { incomingCall, outgoingCall }
    } = this.state;
    const call = { incomingCall, outgoingCall };
    return <div>
      <p style={{ font: '14px arial', color: 'grey', width: 200 }}>{account.name}>
        <IsConnectedIcon style={{ position: 'absolute', top: 10 }}
          color={connected ? 'green' : 'red'} />
      </p>
      {
        mainView ?
          <Main switch={this.updateView} {...this.state.xapiData } /> :
        meetingsView ?
          <Meetings switch={this.updateView} meetings={this.state.xapiData.meetings} /> :
        callView ?
          <Call switch={this.updateView} { ...this.state } /> :
        acctDialog ?
          <AccountDialog accountName={(name) => {}}
            close={this.closeAccountManagement} /> :
          null
      }
      <IconButton tooltip='Account Management'
        tooltipPosition='top-left'
        style={{position: 'absolute', bottom: 0, right: 10}}
        onClick={this.modifyAccount} >
        <SettingsIcon />
      </IconButton>
      <CallNotification call={call} />
      {
        this.state.xapiData.directoryDialog ?
          <CallDirectory switch={this.updateView} error={this.state.xapiData.callError}
            close={() => {
              let {xapiData} = this.state;
              xapiData['directoryDialog'] = false;
              this.setState({ xapiData });
            }} /> :
          null
      }
    </div>
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