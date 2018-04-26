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

import { Accounts, JsXAPI } from '../lib';

export class AccountDialog extends React.Component<any,any> {
  state = {
    snack: false,
    selected: 0,
    accounts: null,
    account: null,
    message: '',
    close: false
  }

  styles: any = {
    textField : { marginLeft: 20 }
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
    JsXAPI.account = account;
    return JsXAPI.connect().then(() => {
      return JsXAPI.getUnit();
    }).then((metaData) => {
      account['email'] = JSON.parse(JSON.stringify(metaData)).email;
      delete metaData.email;
      account['metaData'] = metaData;
      Accounts.save(accounts);
      let message = `${account.name} updated successfully`;
      this.shareAccountName(account.name);
      this.setState({
        accounts,
        message,
        snack: true
      });
    });
  }

  inputChange = (e, value) => {
    let { accounts, selected } = this.state;
    const { name } = e.target;
    accounts[selected][name] = value;
    this.setState({ accounts });
  }

  shareAccountName = name => this.props.accountName(name);

  closeClick = () => this.setState({ close: true });

  dialogActions = () => {
    const { accounts, close } = this.state;
    return [
      <FlatButton
        label='Save'
        primary={true}
        keyboardFocused={true}
        onClick={this.save}
      />,
        close ? <CircularProgress size={20}
          style={{marginRight: '20px', marginTop: '10px'}} /> :
        <FlatButton
          label='Close'
          primary={true}
          onClick={() => {
            this.closeClick();
            setTimeout(() => {
              let selected = accounts.findIndex(a => a.selected);
              let account = accounts[selected];
              this.setState({ account, selected, accounts });
              this.props.close();
            }, 250);
          }}
        />
    ];
  }

  render() {
    let { snack, accounts, selected, message } = this.state;
    console.log(selected);
    return (
      <div>
        <Dialog open={true}
          actions={this.dialogActions()} >
          <div>
            <Drawer open={true} width={225}>
              <Paper style={{ maxHeight: '89%', overflow: 'auto' }}
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
                    this.shareAccountName(account.name);
                    Accounts.save(accounts);
                    this.setState({ selected: newSelected });
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
                    style={{ position: 'fixed', bottom: 0 }}>
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
                      onClick={() => {
                        console.log('remove touched');
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
                          accounts[acctIdx - 1].selected = true;
                          accountName = accounts[acctIdx - 1].name;
                        } else {
                          accounts[0].selected = true;
                          accountName = accounts[0].name;
                        }
                        this.shareAccountName(accountName);
                        Accounts.save(accounts);
                        this.setState({
                          selected: 0,
                          accounts,
                          message: `${accountName} removed successfully`,
                          snack: true
                        });
                      }}
                    />
                  </BottomNavigation>
                </Paper>
              </div>
            </Drawer>
          </div>
          <div style={{ marginLeft: '235px' }}>
            <Paper zDepth={2}>
              <TextField hintText="Connection Name"
                style={this.styles.textField}
                name='name'
                underlineShow={true}
                floatingLabelFixed={true}
                floatingLabelText='Account Name'
                value={accounts[selected].name}
                onChange={this.inputChange}
                errorText='' />
              <TextField
                hintText="Hostname/IP Address"
                style={this.styles.textField}
                name='host'
                underlineShow={true}
                floatingLabelFixed={true}
                floatingLabelText='Codec or Touch10'
                value={accounts[selected].host}
                onChange={this.inputChange} />
              <Divider />
              <TextField
                hintText="user_name"
                style={this.styles.textField}
                name='username'
                underlineShow={true}
                floatingLabelFixed={true}
                floatingLabelText='UserName'
                value={accounts[selected].username}
                onChange={this.inputChange} />
              <TextField
                type='password'
                hintText="password"
                name='password'
                style={this.styles.textField}
                underlineShow={true}
                floatingLabelFixed={true}
                floatingLabelText='Password'
                value={accounts[selected].password}
                onChange={this.inputChange} />
              <Divider />
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
}