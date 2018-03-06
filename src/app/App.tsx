import * as React from 'react'
// Import Components
import { Main } from './components';

export class App extends React.Component<any, any> {
  state = {
    mainView: true,
    meetingsView: false,
    callView: false
  }

  updateView = (args: any) => {
    // Main -> Meetings List
    // Meeting -> Call
  }

  render() {
    const { mainView, meetingsView, callView } = this.state;
    return <div>
      {
        mainView ?
          <Main switch={this.updateView} /> :
          null
      }
    </div>
  }
}