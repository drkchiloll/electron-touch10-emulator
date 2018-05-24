import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { IconButton, IconMenu, MenuItem, CircularProgress } from 'material-ui';
import { MuiThemeProvider, getMuiTheme } from 'material-ui/styles';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
import IsConnectedIcon from 'material-ui/svg-icons/av/fiber-manual-record';
import { JsXAPI, Accounts } from '../lib';

const styles: any = {
  menu: { position: 'absolute', top: 0, width: 30 },
  menuorigin: { horizontal: 'left', vertical: 'top' },
  accounttile: {
    font: '14px arial',
    color: 'black',
    width: 600,
    marginLeft: '40px',
    marginTop: '16px'
  },
  connecticon: {
    position: 'absolute',
    top: 12,
    marginLeft: '2px'
  }
};

export class CodecHeaderToggle extends React.Component<any,any> {
  public jsxapi = JsXAPI;
  constructor(props) {
    super(props);
    this.state = {
      accounts: null,
      account: null
    };
  }

  componentWillMount() {
    let accts = Accounts.get();
    let selacct = accts.find(a => a.selected);
    this.setState({
      accounts: accts,
      account: selacct
    });
  }

  componentWillReceiveProps(props) {
    const { account } = this.state;
    if(props.account.name !== account.name) {
      this.setState({ account: props.account });
    }
  }

  changeAccount = (e: any, account) => {
    const currentAccount = this.state.account;
    const {connected} = this.state;
    ReactDOM.render(
      <MuiThemeProvider muiTheme={getMuiTheme({})}>
        <CircularProgress size={15} color='black' />
      </MuiThemeProvider>,
      document.querySelector('#account-name'));
    this.jsxapi.connection(2500, {
      name: account.name,
      selected: false,
      host: account.host,
      username: account.username,
      password: account.password
    }).then((xapi: any) => {
      xapi.close();
      let { accounts } = this.state;
      accounts.forEach(a => {
        if(a.selected) a.selected = false;
      });
      accounts.find(a => a.name == account.name).selected = true;
      Accounts.save(accounts);
      this.props.change(account);
      this.setState({ accounts, account });
      ReactDOM.render(
        <MuiThemeProvider muiTheme={getMuiTheme({})}>
          <div>{ account.name } >
          <IsConnectedIcon style={{
            position: 'absolute', top: 12, marginLeft: '2px'
          }}
            color={true ? 'green' : 'red'} /></div>
        </MuiThemeProvider>,
        document.querySelector('#account-name')
      )
    }).catch(() => {
      ReactDOM.render(
        <MuiThemeProvider muiTheme={getMuiTheme({})}>
          <div>{currentAccount.name} >
          <IsConnectedIcon style={{
              position: 'absolute', top: 12, marginLeft: '2px'
            }}
              color={true ? 'green' : 'red'} /></div>
        </MuiThemeProvider>,
        document.querySelector('#account-name')
      )
      alert('Connection Error/Timeout');
    })
  };

  render() {
    let { connected } = this.props;
    let { accounts, account } = this.state;
    return (
      <div>
        <IconMenu
          style={styles.menu}
          anchorOrigin={styles.menuorigin}
          targetOrigin={styles.menuorigin}
          onItemClick={(e: any, {props: {value}}) =>
            this.changeAccount(e, value)}
          menuStyle={{ maxHeight: 600, overflow: 'auto' }}
          iconButtonElement={
            <IconButton tooltip='Toggle Codecs'
              tooltipPosition='bottom-right'
            > <MoreVertIcon /> </IconButton>
          } >
          {accounts.sort((a: any, b: any) => {
            if(a.name > b.name) return -1;
            if(a.name < b.name) return 1;
            return 0
          })
            .map((a: any, i: number) =>
              <MenuItem value={a}
                key={`account_${i}`}
                primaryText={a.name} />)}
        </IconMenu>
        <div id='account-name'
          style={{
            font: '14px arial', color: 'grey', width: 600, marginLeft: '40px',
            marginTop: '16px'
          }}>
          {account.name}>
          <IsConnectedIcon style={{ position: 'absolute', top: 12, marginLeft: '2px' }}
            color={connected ? 'green' : 'red'} />
        </div>
      </div>
    );
  }
}