import * as React from 'react';
import * as Promise from 'bluebird';
import {
  Drawer, MenuItem, Dialog, ListItem,
  FlatButton, Paper, TextField, List,
  BottomNavigation, BottomNavigationItem,
  Subheader, Snackbar, SelectField, makeSelectable,
  FontIcon, Divider, CircularProgress
} from 'material-ui';
const SelectableList = makeSelectable(List);

import AccountAddIcon from 'material-ui/svg-icons/social/group-add';
import TrashIcon from 'material-ui/svg-icons/action/delete';
import SaveIcon from 'material-ui/svg-icons/content/save';
import CloseIcon from 'material-ui/svg-icons/navigation/close';
import { Accounts, JsXAPI, SparkGuest } from '../lib';

import { AccountInput } from './index';

export class AccountDialog extends React.Component<any,any> {
  public jsxapi = JsXAPI;
  constructor(props) {
    super(props);
    this.state = {
      snack: false,
      selected: 0,
      accounts: null,
      account: null,
      message: '',
      close: false
    };
  }

  componentWillMount() {
    let accounts = Accounts.get();
    let selected = accounts.findIndex(a => a.selected);
    this.setState({
      accounts,
      selected,
      account: accounts[selected]
    });
  }

  save = () => {
    const { accounts, selected } = this.state;
    let account = accounts[selected];
    this.jsxapi.account = account;
    return this.jsxapi.connect().then(() => {
      return this.jsxapi.getUnit();
    }).then((metaData) => {
      account['email'] = JSON.parse(JSON.stringify(metaData)).email;
      delete metaData.email;
      account['metaData'] = metaData;
      Accounts.save(accounts);
      let message = `${account.name} updated successfully`;
      this.accountSelect(account);
      this.setState({
        accounts,
        message,
        snack: true
      });
    }).catch(() => {
      alert('Connection to this device could not be established at this time.');
      Accounts.save(accounts);
      this.accountSelect(account);
    })
  }

  inputChange = (e, value) => {
    let { accounts, selected } = this.state;
    const { name } = e.target;
    accounts[selected][name] = value;
    this.setState({ accounts });
  }

  accountSelect = account => this.props.account(account);

  closeClick = () => this.setState({ close: true });

  close = () => {
    const { account } = this.state;
    console.log(account);
    this.closeClick();
    this.jsxapi.connection(2500, {
      name: account.name,
      host: account.host,
      username: account.username,
      password: account.password,
      selected: account.selected
    }).then((xapi: any) => {
      xapi.close();
      this.props.close();
    }).catch(() => {
      alert('Error Connecting to Codec..Check Connection..');
      this.setState({ close: false });
    });
  };

  dialogActions = () => {
    const { accounts, close } = this.state;
    return [
      <FlatButton
        label='Save'
        primary={true}
        keyboardFocused={true}
        onClick={this.save}
      />,
      close ?
        <CircularProgress size={15} style={this.styles.circprogress} />
        :
        <FlatButton
          label='Close'
          primary={true}
          onClick={this.close}
        />
    ];
  }

  removeCodec = () => {
    let { accounts, selected } = this.state;
    const { token } = this.props;
    let account = accounts[selected];
    console.log(account);
    if(account.room) {
      const spark = new SparkGuest({userid:'', username: ''});
      spark.deleteRoom({
        roomId: account.room.id,
        token
      })
    }
    let acctIdx = selected;
    if(accounts.length === 1) {
      return this.setState({
        openSnack: true,
        message: `This is the only account setup..Please Edit this Account`
      });
    }
    accounts.splice(acctIdx, 1);
    let accountName: string;
    if(acctIdx !== 0) {
      acctIdx = --acctIdx;
      accounts[acctIdx].selected = true;
      accountName = accounts[acctIdx].name;
    } else {
      acctIdx = 0;
      accounts[acctIdx].selected = true;
      accountName = accounts[0].name;
    }
    this.accountSelect(accounts[acctIdx]);
    Accounts.save(accounts);
    this.setState({
      selected: acctIdx,
      account: accounts[acctIdx],
      accounts,
      message: `${account.name} removed successfully`,
      snack: true
    });
  }

  render() {
    let { close, snack, accounts, selected, message } = this.state;
    return (
      <div>
        <Dialog open={true}
          actions={this.dialogActions()} >
          <div>
            <Drawer open={true} width={225}>
              <Paper style={this.styles.dpaper}
                zDepth={0} >
                <SelectableList value={selected}
                  onChange={(e: any) => {
                    let prevSelected = JSON.parse(JSON.stringify(selected)),
                      acctName = e.target.innerHTML;
                    let newSelected = accounts.findIndex(acct => acct.name === acctName);
                    if(newSelected === -1) newSelected = 0;
                    let account = accounts[newSelected],
                      prevAcct = accounts[prevSelected];
                    account.selected = true;
                    prevAcct.selected = false;
                    this.accountSelect(account);
                    Accounts.save(accounts);
                    this.setState({ selected: newSelected, account, accounts });
                  }} >
                    <Subheader>Account List</Subheader>
                  {
                    accounts ? accounts.map((acct, i) => {
                      return (
                        <ListItem
                          key={`acct_${i}`}
                          value={i}
                          primaryText={acct.name} />
                      );
                    }) : null
                  }
                </SelectableList>
              </Paper>
              <div>
                <Paper zDepth={1}>
                  <BottomNavigation
                    style={this.styles.bottomnav}>
                    <BottomNavigationItem
                      label="Account"
                      icon={<FontIcon><AccountAddIcon /></FontIcon>}
                      onClick={() => {
                        console.log('add account');
                        accounts = accounts.map(a => {
                          if(a.selected) a.selected = false;
                          return a;
                        });
                        const account: any = {
                          name: 'New Account',
                          host: '',
                          username: '',
                          password: '',
                          selected: true
                        };
                        accounts.push(account);
                        this.setState({
                          accounts,
                          selected: accounts.length - 1,
                          account
                        });
                      }}
                    />
                    <BottomNavigationItem
                      label="Remove"
                      icon={<FontIcon color='red'><TrashIcon /></FontIcon>}
                      onClick={this.removeCodec}
                    />
                  </BottomNavigation>
                </Paper>
              </div>
            </Drawer>
          </div>
          <div style={this.styles.inDiv}>
            <Paper zDepth={2}>
              {
                Accounts.generateInput(accounts[selected]).map(
                  (fields: any, i: number) => {
                    return (
                      <div key={i}>
                        <AccountInput {...fields} change={this.inputChange} />
                        {i === 1 ? <Divider /> : null}
                      </div>
                    )
                  }
                )
              }
            </Paper>
          </div>
        </Dialog>
        <Snackbar
          open={snack}
          message={message}
          autoHideDuration={2500}
          onRequestClose={() => {
            this.setState({ snack: false, message: '' });
          }} />
      </div>
    );
  }

  styles: any = {
    inDiv: { marginLeft: '235px' },
    dpaper: {
      maxHeight: '89%',
      overflow: 'auto'
    },
    bottomnav: {
      position: 'fixed',
      bottom: 0
    },
    circprogress: {
      marginRight: '20px',
      marginTop: '10px'
    }
  };
}