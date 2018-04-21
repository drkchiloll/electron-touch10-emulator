import * as React from 'react';
import { IconButton, IconMenu, MenuItem } from 'material-ui';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
import IsConnectedIcon from 'material-ui/svg-icons/av/fiber-manual-record';

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

export function CodecHeaderToggle(props: any) {
  const { accounts, account, connected } = props;
  return (
    <div>
      <IconMenu
        style={styles.menu}
        anchorOrigin={styles.menuorigin}
        targetOrigin={styles.menuorigin}
        onItemClick={props.change}
        iconButtonElement={
          <IconButton tooltip='Toggle Codecs'
            tooltipPosition='bottom-right'
          > <MoreVertIcon /> </IconButton>
        } >
        { accounts.map((a: any, i: number) =>
            <MenuItem value={a}
              key={`account_${i}`}
              primaryText={a.name} />) }
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