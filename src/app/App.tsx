import * as React from 'react'
// Import Components
import { Main, Meetings } from './components';

export class App extends React.Component<any, any> {
  state = {
    mainView: true,
    meetingsView: false,
    callView: false
  }

  updateView = (args: any) => {
    // Main -> Meetings List
    // Meeting -> Call
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
          null
      }
    </div>
  }
}