import * as React from 'react';
import { IconButton, IconMenu, MenuItem } from 'material-ui';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';

const styles: any = {
  menu: { position: 'absolute', top: 0, width: 35 },
  menuorigin: { horizontal: 'left', vertical: 'top' }
};

export function AccountToggle(props: any) {
  const { accounts } = props;
  return (
    <IconMenu
      anchorOrigin={styles.menuorigin}
      targetOrigin={styles.menuorigin}
      onItemClick={this.props.change}
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
  );
}