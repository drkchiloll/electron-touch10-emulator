import * as React from 'react';
import { IconButton, IconMenu, MenuItem } from 'material-ui';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
import IsConnectedIcon from 'material-ui/svg-icons/av/fiber-manual-record';
import { Accounts } from '../lib';

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

  changeAccount = (account) => {
    let { accounts } = this.state;
    accounts.forEach(a => {
      if(a.selected) a.selected = false;
    });
    accounts.find(a => a.name == account.name).selected = true;
    Accounts.save(accounts);
    this.props.change(account);
    this.setState({ accounts, account });
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
            this.changeAccount(value)}
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
        <p
          style={{
            font: '14px arial', color: 'grey', width: 600, marginLeft: '40px',
            marginTop: '16px'
          }}>
          {account.name}>
        <IsConnectedIcon style={{ position: 'absolute', top: 12, marginLeft: '2px' }}
            color={connected ? 'green' : 'red'} />
        </p>
      </div>
    );
  }
}