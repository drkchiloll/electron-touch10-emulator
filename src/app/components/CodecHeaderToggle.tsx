import * as React from 'react';
import { IconButton, IconMenu, MenuItem, CircularProgress } from 'material-ui';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
import IsConnectedIcon from 'material-ui/svg-icons/av/fiber-manual-record';
import { JsXAPI, SysAccount, ISysAccount } from '../lib';
import * as Promise from 'bluebird';

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
  public accounts = new SysAccount();
  constructor(props) {
    super(props);
    this.state = {
      accounts: [],
      account: null,
      changing: false
    };
  }

  componentWillMount() {
    this.accounts.init('accounts').then(() => {
      this.accounts.get().then((accounts: ISysAccount[]) => {
        const account = accounts.find(a => a.selected);
        this.setState({ accounts, account });
      })
    })
  }

  componentWillReceiveProps(props) {
    const { account } = this.state;
    if(!props.account) return;
    if(!account || props.account.name !== account.name) {
      this.setState({
        account: props.account
      });
    }
  }

  changeAccount = (e: any, account) => {
    this.setState({ changing: true });
    const currentAccount = this.state.account;
    const {connected} = this.state;
    if(!account) return;
    this.jsxapi.connection(2500, {
      name: account.name,
      selected: false,
      host: account.host,
      username: account.username,
      password: account.password
    }).then((xapi: any) => {
      let { accounts } = this.state;
      return Promise.each(accounts, (a: any) => {
        if(a.name === account.name) a.selected = true;
        else if(a.selected) a.selected = false;
        this.props.change(account);
        return this.accounts.modify(a);
      }).then(() => {
        this.setState({ accounts, account, changing: false });
      })
    }).catch(() => {
      this.setState({
        account: currentAccount, changing: false
      });
      alert('Connection Error/Timeout');
    })
  };

  render() {
    let { connected } = this.props;
    let { accounts, account, changing } = this.state;
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
          {accounts.length >= 0 ? accounts.sort((a: any, b: any) => {
            if(a.name > b.name) return -1;
            if(a.name < b.name) return 1;
            return 0
          })
            .map((a: any, i: number) =>
              <MenuItem value={a}
                key={`account_${i}`}
                primaryText={a.name} />): <></>}
        </IconMenu>
          <div id='account-name'
            style={{
              font: '14px arial', color: 'grey', width: 600, marginLeft: '40px',
              marginTop: '16px'
            }}>
            {
              changing ? <CircularProgress size={15} color='black' /> :
              <div>
                {account ? account.name : 'loading...'}>
                <IsConnectedIcon color={connected ? 'green' : 'red'}
                  style={{ position: 'absolute', top: 12, marginLeft: '2px' }} />
              </div>
            }
        </div>

      </div>
    );
  }
}