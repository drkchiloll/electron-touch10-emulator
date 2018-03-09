import * as React from 'react';
import { JsXAPI } from '../lib';
import { Dialog, TextField, List, ListItem, IconButton, Tab, Tabs, SvgIcon } from 'material-ui';
import CorpDirecotryIcon from 'material-ui/svg-icons/communication/contact-phone';
import CallHistoryIcon from 'material-ui/svg-icons/action/history';
import CallIcon from 'material-ui/svg-icons/communication/call';
import { indigo500 } from 'material-ui/styles/colors'

export class CallDirectory extends React.Component<any,any> {
  searchTimeout: any;

  state = {
    tabIdx: 1,
    tabValue: 'Corporate', // Recent
    search: '',
    users: null
  }

  componentDidMount() {
    JsXAPI.getDirectory({}).then(users => {
      this.setState({ users })
    });
  }

  search = () => {
    if(this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
    this.searchTimeout = setTimeout(() => {
      const { tabValue, search } = this.state;
      if(tabValue === 'Corporate') {
        JsXAPI.getDirectory({ query: search}).then(users => 
          this.setState({ users }));
      }
    }, 1550);
  }

  makeCall = () => {
    const { search } = this.state;
    JsXAPI.dial(search).then(result => {
      if(result && result.status === 'OK') {
        this.props.close();
        this.props.switch({
          callView: true,
          meetingsView: false,
          mainView: false,
          callId: result.CallId,
          caller: search
        });
      }
    });
  }

  render() {
    let { tabIdx, tabValue, search, users } = this.state;
    return (
      <Dialog open={true}
        autoScrollBodyContent={true}
        onRequestClose={() => {
          this.props.close();
        }} >
        <div style={{position: 'relative', width: 350}}>
          <TextField autoFocus
            style={{ width: 300, position: 'relative' }}
            id='search-field'
            hintText='Search Directory or Enter URI/Number'
            value={search}
            onChange={(e, search) => {
              this.setState({ search });
              this.search();
            }}/>
            {
              users && users.length === 0 ?
                <IconButton style={{ position: 'absolute', right: 20, top: 2 }}
                  onClick={this.makeCall} >
                  <CallIcon />
                </IconButton> :
                null
            }
        </div>
        <Tabs value={tabValue}
          tabItemContainerStyle={{width: 225, backgroundColor: 'white', height: 65}}
          initialSelectedIndex={this.state.tabIdx}
          inkBarStyle={{ background: indigo500 }}>
          <Tab style={{ color: 'black' }}
            icon={<CorpDirecotryIcon style={{ color: 'black' }} /> }
            label='Directory'
            value='Corporate'>
            <List style={{ width: 350, marginLeft: 40 }} >
              {
                !users ? null :
                  users.map((u:any) => {
                    return (
                      <ListItem key={u.id}
                        primaryText={u.name}
                        primaryTogglesNestedList={true}
                        nestedItems={
                          u.contacts.map((contact:any, index:any) => {
                            return (
                              <ListItem key={`${u.id}_${index}`}
                                primaryText={contact.number}
                                style={{ position: 'relative' }}>
                                <IconButton onClick={this.makeCall}
                                  style={{
                                    position: 'absolute', top: 0, right: 10
                                  }}>
                                  <CallIcon />
                                </IconButton>
                              </ListItem>
                            )
                          })
                        } />
                    )
                  })
              }
            </List>
          </Tab>
          <Tab value='History'
            icon={<CallHistoryIcon style={{ color: 'black' }} />}
            label='History'
            style={{ color: 'black' }} >
          
          </Tab>
        </Tabs>
      </Dialog>
    );
  }
}