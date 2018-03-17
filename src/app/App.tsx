import * as React from 'react'

import { Dialog, IconButton } from 'material-ui';
import SettingsIcon from 'material-ui/svg-icons/action/settings';
import IsConnectedIcon from 'material-ui/svg-icons/av/fiber-manual-record';

// Import Components
import { Main, Meetings, Call, AccountDialog } from './components';
import { JsXAPI, Accounts } from './lib';

export class App extends React.Component<any, any> {
  state = {
    account: null,
    mainView: false,
    meetingsView: false,
    callView: false,
    meeting: null,
    callId: null,
    caller: null,
    acctDialog: false,
    connected: true
  }

  componentWillMount() {
    const accounts = Accounts.get();
    let account: any;
    if(accounts) {
      account = accounts.find(a => a.selected);
      if(account.name === 'New' && !account.host) {
        this.setState({
          acctDialog: true
        });
      } else {
        this.setState({ account });
        this.getConnected(account);
      }
    }
  }

  getConnected = (account) => {
    JsXAPI.account = account;
    JsXAPI.init()
      .then(() => {
        JsXAPI.xapi.addListener('disconnect-error', () => {
          this.setState({ connected: false });
          this.getConnected(account);
        });
        return JsXAPI.xapi.status
          .get('Call')
          .then(res => {
            if(res && res.length === 1) {
              this.updateView({
                mainView: false,
                meetingsView: false,
                callView: true,
                caller: res[0].DisplayName,
                callId: res[0].id
              });
            } else {
              this.setState({
                mainView: true,
                acctDialog: false,
                account,
                connected: true
              });
            }
          })
      })
      .catch(e => {
        console.log(e);
        this.setState({ connected: false });
        setTimeout(this.getConnected(account), 5000);
      });
  }

  updateView = (args: any) => {
    // Main -> Meetings List
    // Meeting -> Call
    // console.log(args);
    const {
      mainView, meetingsView, callView
    } = args;
    if(meetingsView) {
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
    this.getConnected(account);
  }

  render() {
    const {
      mainView, meetingsView, connected,
      callView, acctDialog, account
    } = this.state;
    return <div>
      <p style={{ font: '14px arial', color: 'grey', width: 200 }}>{account.name}>
        <IsConnectedIcon style={{ position: 'absolute', top: 10 }}
          color={connected ? 'green' : 'red'} />
      </p>
      {
        mainView ?
          <Main switch={this.updateView} account={account} /> :
        meetingsView ?
          <Meetings switch={this.updateView} /> : 
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
    </div>
  }
}