import * as React from 'react';
import {
  Drawer, Dialog, ListItem,
  FlatButton, Paper, List,
  BottomNavigation, BottomNavigationItem,
  Subheader, Snackbar, makeSelectable,
  FontIcon, Divider, CircularProgress
} from 'material-ui';
const SelectableList = makeSelectable(List);
 
import AccountAddIcon from 'material-ui/svg-icons/social/group-add';
import TrashIcon from 'material-ui/svg-icons/action/delete';
import { Accounts, JsXAPI, api, SysAccount, ISysAccount } from '../lib';

import { AccountInput } from './index';

export class AccountDialog extends React.Component<any,any> {
  public jsxapi = JsXAPI;
  public accounts = new SysAccount();
  constructor(props) {
    super(props);


    this.state = {
      snack: false,
      selected: 0,
      accounts: [],
      account: null,
      message: '',
      close: false
    };
  }

  componentWillMount() {
    this.accounts.init('accounts').then(() => {
      this.accounts.get().then((accounts: ISysAccount[]) => {
        console.log(accounts)
        if(accounts.length == 0 && this.state.accounts == 0) {
          let account = {
            name: 'New',
            host: '10.10.10.10',
            username: 'username',
            password: 'password',
            selected: true
          };
          this.setState({
            accounts: [account],
            selected: 0,
            account
          })
        } else {
          let selected = accounts.findIndex(a => a.selected);
          this.setState({
            accounts: accounts,
            selected,
            account: accounts[selected]
          })
        }
        console.log(this.state);
      })
    })
  }

  save = () => {
    let { account } = this.state;
    this.accounts.add(account).then(result => {
      this.accountSelect(account);
    }).then(() => {
      return api.connectDevice(account).then((updatedRecord) => {
        let message = `${account.name} added successfully`;
        this.setState({ message, snack: true });
        this.accounts.modify(updatedRecord);
      }).catch(() => {
        alert(
          'Connection to this device cannot be established at this time.'
        )
      })
    })
    // api.saveAccount(account, accounts)
    //   .then(() => {
    //     let message = `${account.name} modified successfully`;
    //     this.accountSelect(account);
    //     this.setState({ message, snack: true});
    //   })
    //   .catch((e) => {
    //     alert(
    //       'Connection to this device could not be established at this time.'
    //     );
    //     Accounts.save(accounts);
    //     this.accountSelect(account);
    //   });
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
    this.closeClick();
    this.jsxapi.connection(2500, account)
      .then((xapi: any) => {
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
    api.removeCodec(accounts, selected)
      .then(result => this.setState(result));
  }

  handleSelectAccount = (e: any) => {
    let { accounts, selected } = this.state;
    let accountName = e.target.innerHTML;
    let newSelection = accounts.findIndex(a => a.name === accountName);
    if(newSelection === -1) newSelection = 0;
    let account = accounts[newSelection],
      previousAccount = accounts[selected];
    account.selected = true;
    previousAccount.selected = false;
    this.accountSelect(account);
    Accounts.save(accounts);
    this.setState({
      selected: newSelection,
      account,
      accounts
    });
  }

  handleAddAccount = () => {
    const newAccountState = api.newAccount(this.state.accounts);
    this.setState(newAccountState);
  }

  render() {
    let { snack, accounts, selected, message } = this.state;
    return (
      <div>
        <Dialog open={true}
          actions={this.dialogActions()} >
          <div>
            <Drawer open={true} width={225}>
              <Paper style={this.styles.dpaper}
                zDepth={0} >
                <SelectableList value={selected}
                  onChange={this.handleSelectAccount}
                >
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
                      onClick={this.handleAddAccount}
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
                accounts.length >= 1 ?
                Accounts.generateInput(accounts[selected]).map(
                  (fields: any, i: number) => {
                    return (
                      <div key={i}>
                        <AccountInput {...fields} change={this.inputChange} />
                        {i === 1 ? <Divider /> : null}
                      </div>
                    )
                  }
                ): <></>
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