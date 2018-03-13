import * as React from 'react';
import { JsXAPI } from '../lib';
import {
  Dialog, TextField, List,
  ListItem, IconButton, Tab,
  Tabs, SvgIcon, CircularProgress,
  Snackbar
} from 'material-ui';
import CorpDirecotryIcon from 'material-ui/svg-icons/communication/contact-phone';
import CallHistoryIcon from 'material-ui/svg-icons/action/history';
import CallIcon from 'material-ui/svg-icons/communication/call';
import { indigo500, indigo200 } from 'material-ui/styles/colors'

export class CallDirectory extends React.Component<any,any> {
  searchTimeout: any;

  state = {
    tabIdx: 1,
    tabValue: 'Corporate', // Recent
    search: '',
    users: null,
    showProgress: false,
    inError: false,
    snack: false
  }

  call: any;

  componentDidMount() {
    JsXAPI.getDirectory({}).then(users => {
      this.setState({ users })
    });
  }

  componentDidUpdate() {
    let { inError } = this.state;
    if(this.props.error && !inError) {
      this.setState({
        showProgress: false,
        inError: true,
        snack: true
      });
    }
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
    JsXAPI.dial(search).then(() => this.setState({showProgress: true}));
  }

  styles = (): any => ({
    call: {
      position: 'absolute',
      right: 85,
      top: 2,
      display: this.state.showProgress ? 'none': 'inline'
    },
    progress: {
      position: 'absolute',
      right: 100,
      top: 15,
      display: this.state.showProgress ? 'inline' : 'none'
    }
  })

  render() {
    let { tabIdx, tabValue, search, users, snack } = this.state;
    const { error } = this.props;
    return (
      <Dialog open={true}
        contentStyle={{
          minHeight: '80vh',
          maxHeight: '80vh',
        }}
        autoScrollBodyContent={true}
        onRequestClose={() => {
          this.props.close();
        }} >
        <Snackbar open={snack}
          message='Check Your Number and Call Again'
          autoHideDuration={3500}
          onRequestClose={() => this.setState({ snack: false })} />
        <div style={{position: 'relative', width: 350}}>
          <TextField autoFocus
            style={{ width: 254, position: 'relative' }}
            id='search-field'
            hintText='Search Directory or Enter URI/Number'
            value={search}
            onChange={(e, search) => {
              this.setState({ search });
              this.search();
            }}/>
            {
              users && users.length === 0 ?
                <div>
                  <IconButton style={this.styles().call}
                    tooltip='Make Call'
                    tooltipPosition='top-center'
                    onClick={this.makeCall} >
                    <CallIcon color={error ? 'red' : indigo500} />
                  </IconButton>
                  <CircularProgress size={20}
                    color={indigo200}
                    style={this.styles().progress} />
                </div>:
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