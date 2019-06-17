import * as React from 'react';
import * as Promise from 'bluebird';
import { remote, ipcRenderer } from 'electron';
import { IconButton } from 'material-ui';
import SettingsIcon from 'material-ui/svg-icons/action/settings';

// Import Components
import {
  Main, Meetings, Call, AccountDialog,
  CallDirectory, CallNotification,
  Update, Controls, CodecHeaderToggle
} from './components';
import { SparkWidget } from './components/SparkWidget';
import { Accounts, api } from './lib';
import { SparkGuest } from './lib';
import { CallHandler } from './lib/callhandler';
export namespace App {
  export interface Props { }
  export interface State {
    token: any;
    openWidget: boolean;
    video: boolean;
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
  public teamsGuest: SparkGuest;
  public jsxapi: any;
  public xapi: any;
  constructor(props) {
    super(props);
    this.state = {
      token: null,
      openWidget: false,
      accounts: [],
      update: false,
      account: null,
      mainView: false,
      meetingsView: false,
      callView: false,
      callId: null,
      caller: null,
      acctDialog: false,
      connected: false,
      video: false,
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
    // Listen for Update Checks from the Menu
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
        this.setState({ account });
      }
      if(!account.host) {
        this.setState({ acctDialog: true });
      } else {
        this.setState({ account, accounts });
      }
    }
  }

  componentDidMount() {
    const { account } = this.state;
    return Promise.all([
      this.initHandler(account),
      this.teamsRoomCheck(account)
    ]);
  }

  teamsRoomCheck = account => api.teamOps(account)
    .then(result => this.setState(result));

  initHandler = account => {
    this.connect(account)
      .then(() => {
        this.setState({
          mainView: true,
          acctDialog: false,
          account,
          connected: true
        });
        this.registerEvents();
      }).then(this.callCheck)
      .catch((e) => {
        this.connErrors({ connected: false });
      });
  }

  connect = account => {
    let { xapiData } = this.state;
    return api.initCodec(account, xapiData)
      .then(({jsxapi, xapiData}) => {
        this.jsxapi = jsxapi;
        this.xapi = this.jsxapi.xapi;
        this.connErrors({ connected: true });
        this.xapi.on('error', err => {
          this.jsxapi.event.emit('connection-error');
        });
        this.setState({ xapiData });
        return;
      })
      .catch(jsxapi => {
        this.jsxapi = jsxapi;
        this.connErrors({ connected: false });
        this.jsxapi.event.emit('connection-error');
        return Promise.reject('error');
      });
  }

  callCheck = () => {
    return this.jsxapi.getStatus('Call')
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

  bookings = ({xapiData, feed}:any) => {
    return this.jsxapi.getMeetings().then(meetings => {
      console.log(meetings);
      return api.verifyMeetings(meetings, xapiData)
    })
    .then(meetings => {
      xapiData.meetings = meetings;
      this.setState({ xapiData });
    })
  }

  calls = ({xapiData, feed}:any) => this.callhandler(feed);

  wakeStatus = ({xapiData, feed}:any) => {
    xapiData['status'] = feed === 'Off' ? 'Awake': 'Standby';
    this.setState({ xapiData });
  }

  audio = ({xapiData, feed}:any) => {
    xapiData['volume'] = feed;
    this.setState({ xapiData });
  }

  microphone = ({xapiData, feed}:any) => {
    xapiData['mic'] = feed.Mute;
    this.setState({ xapiData });
  }

  registerEvents = () => {
    const feedbacks = [
      {id: 'bookings', path: '/Event/Bookings'},
      {id: 'calls', path: '/Status/Call'}, 
      {id: 'wakeStatus', path: '/Status/Standby State'},
      {id: 'audio', path: '/Status/Audio Volume'},
      {id: 'microphone', path: '/Status/Audio Microphones'}
    ];
    let {xapiData} = this.state;
    Promise.each(feedbacks, ({id, path}:any) => {
      this.xapi.feedback.on(path, feed => this[id]({xapiData, feed}));
    });
  }

  eventhandler = stuffs => {
    let { xapiData } = this.state;
    if(stuffs && stuffs === 'closing') {
      setTimeout(this.registerEvents, 1000);
    }
    if(stuffs && stuffs instanceof Array) {
      return api.verifyMeetings(stuffs, xapiData)
        .then(meetings => {
          xapiData.meetings = meetings;
          this.setState({ xapiData });
        })
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
        if(call.id !== this.state.callId) return;
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
    if(this.jsxapi.event.eventNames().indexOf('connection-error') === -1) {
      this.jsxapi.event.addListener('connection-error', () => {
        const { account } = this.state;
        console.log('error event called');
        this.setState({
          connected: false,
          mainView: false,
          meetingsView: false,
          callView: false
        });
        setTimeout(() => this.initHandler(account), 15000);
      });
      const { account } = this.state;
      if(!connected) setTimeout(() => this.initHandler(account), 15000);
    }
  }

  updateView = (args: any) => {
    // Main -> Meetings List
    // Meeting -> Call
    const {
      mainView, meetingsView, callView
    } = args;
    const { callId, caller } = this.state;
    if(args.directory) {
      let {xapiData} = this.state;
      xapiData['directoryDialog'] = true;
      this.setState({ xapiData });
    } else if(meetingsView) {
      if(callId || caller) return;
      this.setState({
        meetingsView,
        mainView: false,
        callView: false,
        acctDialog: false
      });
    } else if(mainView) {
      console.log('hangup');
      let update: any = {
        mainView,
        meetingsView: false,
        callView: false,
        acctDialog: false,
        callId: null,
        caller: null
      };
      this.setState(update);
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
    if(this.xapi) {
      this.xapi.close();
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
    this.setState({ accounts, account });
    return Promise.all([
      this.initHandler(account),
      this.teamsRoomCheck(account)
    ]);
  }

  changeAccount = (account) => {
    console.log(account);
    global.emitter.emit('clear-callduration');
    global.emitter.removeAllListeners();
    this.xapi.close();
    setTimeout(() => {
      this.xapi = null;
      this.jsxapi = null;
      this.setState({
        account,
        caller: null,
        callId: null
      });
      Promise.all([
        this.initHandler(account),
        this.teamsRoomCheck(account)
      ])
    }, 100)
  }

  render() {
    let {
      mainView, meetingsView, connected, accounts,
      callView, acctDialog, account, update, video,
      xapiData: { incomingCall, outgoingCall, directoryDialog },
      token, openWidget
    } = this.state;
    const call = { incomingCall, outgoingCall };
    if(!account) account = { name: 'New' }
    return <div>
      <CodecHeaderToggle
        connected={connected}
        account={account}
        accounts={accounts || [{name: 'New'}]}
        change={this.changeAccount}
      />
      <Controls {...this.state.xapiData }
        token={token}
        spark={() => this.setState({ openWidget: true })} />
      {
        mainView ?
          <Main switch={this.updateView} {...this.state.xapiData } /> :
        meetingsView ?
          <Meetings switch={this.updateView} meetings={this.state.xapiData.meetings} /> :
        callView ?
          <Call switch={this.updateView} { ...this.state } /> :
        acctDialog ?
          <AccountDialog account={(account) => this.setState({ account })}
            token={token}
            close={this.closeAccountManagement} /> :
          null
      }
      <IconButton tooltip='Codec Management'
        tooltipPosition='top-left'
        style={{position: 'absolute', bottom: 0, right: 10}}
        onClick={this.modifyAccount} >
        <SettingsIcon />
      </IconButton>
      <CallNotification dialedNumber={account} call={call} />
      <Update update={update} close={this.closeUpdator} />
      {
        directoryDialog ?
          <CallDirectory switch={this.updateView} error={this.state.xapiData.callError}
            close={() => {
              let {xapiData} = this.state;
              xapiData['directoryDialog'] = false;
              this.setState({ xapiData });
            }} /> :
        openWidget ?
          <SparkWidget
            caller={call}
            open={openWidget}
            close={() => {
              this.setState({ openWidget: false })
            }}
            token={token}
            account={account} />
          : null
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