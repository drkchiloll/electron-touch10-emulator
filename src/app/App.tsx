import * as React from 'react'
// Import Components
import { Main, Meetings, Call } from './components';

import { JsXAPI } from './lib';

export class App extends React.Component<any, any> {
  state = {
    mainView: true,
    meetingsView: false,
    callView: false,
    meeting: null,
    callId: null,
    caller: null
  }

  componentWillMount() { this.getConnected() }

  getConnected = () => {
    JsXAPI.init()
      .then(() => {
        return JsXAPI.xapi.status
          .get('Call')
          .then(res => {
            if(res && res.length === 1) {
              this.updateView({
                mainView: false,
                meetingsView: false,
                callView: true,
                caller: res[0].DisplayName
              });
              return;
            }
          }).then(() => JsXAPI.callEvents('call'))
      })
      .catch(e => {
        setTimeout(this.getConnected, 10000);
      });
  }

  updateView = (args: any) => {
    // Main -> Meetings List
    // Meeting -> Call
    console.log(args);
    const {
      mainView, meetingsView, callView
    } = args;
    if(meetingsView) {
      this.setState({
        meetingsView,
        mainView: false,
        callView: false
      });
    } else if(mainView) {
      this.setState({
        mainView,
        meetingsView: false,
        callView: false
      });
    } else if(callView) {
      let update: any = {
        callView,
        mainView: false,
        meetingsView: false,
        callId: args.callId
      };
      if(args.meeting) update['meeting'] = args.meeting;
      if(args.caller) update['caller'] = args.caller;
      this.setState(update);
    }
  }

  render() {
    const { mainView, meetingsView, callView } = this.state;
    return <div>
      {
        mainView ?
          <Main switch={this.updateView} /> :
        meetingsView ?
          <Meetings switch={this.updateView} /> : 
        callView ?
          <Call switch={this.updateView} { ...this.state } /> :
          null
      }
    </div>
  }
}