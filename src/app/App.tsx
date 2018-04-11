import * as React from 'react';
import * as Promise from 'bluebird';
import { remote, ipcRenderer } from 'electron';
import { Dialog, IconButton, Drawer } from 'material-ui';
import { IconMenu, MenuItem } from 'material-ui';
import SettingsIcon from 'material-ui/svg-icons/action/settings';
import IsConnectedIcon from 'material-ui/svg-icons/av/fiber-manual-record';
import CallIcon from 'material-ui/svg-icons/communication/call';
import CallEndIcon from 'material-ui/svg-icons/communication/call-end';
import DnDIcon from 'material-ui/svg-icons/notification/do-not-disturb';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
// Import Components
import {
  Main, Meetings, Call, AccountDialog,
  CallDirectory, CallNotification, Update
} from './components';
import { JsXAPI, Accounts, MeetingHelper } from './lib';
import { CallHandler } from './lib/callhandler';

export namespace App {
  export interface Props { }
  export interface State {
    update: boolean;
    account: any;
    accounts: any[];
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
      accounts: [],
      update: false,
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
        meetings: [],
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
    ipcRenderer.on('update', (e) => {
      this.setState({ update: true });
    });
    const accounts = Accounts.get();
    let account: any;
    if(accounts) {
      account = accounts.find(a => a.selected);
      if(!account) {
        accounts[0].selected = true;
        account = accounts[0];
      }
      if(account.name === 'New' && !account.host) {
        this.setState({ acctDialog: true });
      } else {
        this.setState({ account, accounts });
      }
    }
  }

  componentDidMount() {
    const { account } = this.state;
    return this.initHandler(account);
  }

  initHandler = (account) => {
    this.connect(account)
      .then(this.xapiDataTracking)
      .then(() => {
        JsXAPI.eventInterval = setInterval(JsXAPI.poller, 7500);
        this.setState({
          mainView: true,
          acctDialog: false,
          account,
          connected: true
        });
        this.registerEvents();
      }).then(this.callCheck);
  }

  connect = (account) => {
    JsXAPI.account = account;
    return JsXAPI.init().then(() => {
      this.connErrors({connected: true});
      return;
    })
    .catch(e => {
      if(JsXAPI.event.eventNames().indexOf('connection-error') === -1) {
        this.setState({ connected: false });
        this.connErrors({ connected: false });
      }
    });
  }

  callCheck = () => {
    return JsXAPI.getStatus('Call')
      .then((call:any) => {
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
    
    let meetings: any;
    if(stuffs && stuffs[0] instanceof Array) {
      meetings = stuffs[0];
      if(meetings.length > 0) {
        if(meetings.length === xapiData.meetings.length) {
          let toUpdate = MeetingHelper.compare(meetings, xapiData.meetings);
          if(toUpdate) {
            xapiData.meetings = meetings;
            this.setState({ xapiData });
          }
        } else {
          xapiData.meetings = meetings;
          this.setState({ xapiData });
        }
      } else if(meetings.length === 0) {
        if(xapiData.meetings.length != 0) {
          xapiData.meetings = [];
          this.setState({ xapiData });
        }
      }
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
        this.updateView({
          mainView: true, meetingsView: false
        });
        CallHandler.outgoingCall = {disconnect: false, answered: false };
        xapiData['outgoingCall'] = CallHandler.outgoingCall;

      }
    } else if(incomingCall && incomingCall.id) {
      xapiData['incomingCall'] = incomingCall;
      if(incomingCall.answered && !incomingCall.disconnect) {
        update = this.callUpdate(incomingCall);
      }
      if(call.ghost == 'True') {
        this.updateView({
          mainView: true,
          meetingsView: false
        });
        CallHandler.incomingCall = {disconnect: false, answered: false};
        xapiData['incomingCall'] = CallHandler.incomingCall;
      }
    }
    this.setState({ xapiData });
    if(update && update.callId) {
      this.updateView(update);
    }
  }

  connErrors = ({ connected }) => {
    const { account } = this.state;
    if(JsXAPI.event.eventNames().indexOf('connection-error') === -1) {
      JsXAPI.event.addListener('connection-error', () => {
        console.log('error event called');
        this.setState({
          connected: false,
          mainView: false,
          meetingsView: false,
          callView: false
        });
        this.initHandler(account);
      });
      if(!connected) this.initHandler(account);
    }
  }

  updateView = (args: any) => {
    // Main -> Meetings List
    // Meeting -> Call
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
      console.log('hangup');
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

  changeAccount = (e: any, {props: { value }}: any) => {
    let { account, accounts } = this.state;
    if(account != value) {
      if(JsXAPI.xapi) JsXAPI.xapi.close();
      account.selected = false;
      value.selected = true;
      let updatedAccounts = accounts.map((acct: any) => {
        if(acct.host == account) acct.selected = false;
        if(acct.host == value.host) acct.selected = true;
        return acct;
      });
      Accounts.save(updatedAccounts);
      this.setState({
        accounts: updatedAccounts,
        account: value
      });
      this.initHandler(value);
    }
  }

  render() {
    const {
      mainView, meetingsView, connected, accounts,
      callView, acctDialog, account, update,
      xapiData: { incomingCall, outgoingCall }
    } = this.state;
    const call = { incomingCall, outgoingCall };
    return <div>
      <IconMenu style={{position: 'absolute', top: 0, width: 35}}
        iconButtonElement={
          <IconButton disabled={accounts && accounts.length < 1 ? true : false}
            tooltip='Toggle Codec'
            tooltipPosition='bottom-right' >
              <MoreVertIcon />
          </IconButton>
        }
        anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
        targetOrigin={{ horizontal: 'left', vertical: 'top' }}
        onItemClick={this.changeAccount}
      >
        {
          accounts && accounts.length > 0 ?
            accounts.map((acct: any, indx: number) => 
              <MenuItem
                value={acct}
                primaryText={acct.name} key={`account_${indx}`} />
            )
          : null
        }
      </IconMenu>
      <p style={{
        font: '14px arial', color: 'grey', width: 600, marginLeft: '40px',
        marginTop: '16px'
      }}>{account.name}>
        <IsConnectedIcon style={{ position: 'absolute', top: 12, marginLeft: '2px' }}
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
      <IconButton tooltip='Codec Management'
        tooltipPosition='top-left'
        style={{position: 'absolute', bottom: 0, right: 10}}
        onClick={this.modifyAccount} >
        <SettingsIcon />
      </IconButton>
      <CallNotification call={call} />
      { update ? <Update update={update} close={this.closeUpdator} /> : null }
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

  closeUpdator = () => this.setState({ update: false });

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