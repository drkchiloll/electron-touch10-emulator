import * as React from 'react';

import { FloatingActionButton, IconButton, FontIcon } from 'material-ui';
import CallIcon from 'material-ui/svg-icons/communication/call';
import BackspaceIcon from 'material-ui/svg-icons/content/backspace';

export class Dialer extends React.Component<any, any> {
  click = (num) => {
    if(num === 'Call') {
      this.props.passDigits();
    } else {
      this.props.update(num)
    }
  }

  render() {
    const { showBackspace } = this.props;
    return (
      <div style={{ width: 275, marginTop: 30, marginLeft: 75 }} >
        {
          [1, 2, 3, 4, 5, 6, 7, 8, 9, '*', '0', '#', ' ', 'Call'].map(v => {
            let bgColor: string = 'black', display: string = 'inline';
            if(v === 'Call') {
              bgColor = 'green';
              display = 'icon'
            }
            if(v === ' ') {
              display = 'none';
            }
            return (
              <FloatingActionButton key={v}
                backgroundColor={bgColor}
                onClick={() => this.click(v)}
                style={{
                  marginRight: 15, marginBottom: 15,
                  display: display === 'inline' || display === 'icon' ? 'inline-block' :
                    'none',
                  marginLeft: display === 'icon' ? 70 : 0
                }} >
                <div style={{
                  height: 'auto', display: display === 'inline' ? 'inline-block' :
                    'none'
                }}>{v}</div>
                <FontIcon
                  style={{
                    display: display === 'icon' ? 'inline-block' : 'none',
                    width: 55, height: 55
                  }}>
                  <CallIcon color='white' style={{marginTop: 15}} />
                </FontIcon>
              </FloatingActionButton>
            )
          })
        }
        <IconButton
          style={{ display: showBackspace ? 'inline-block' : 'none' }}
          iconStyle={{ marginBottom: 10 }}
          onClick={() => this.props.delete()} >
          <BackspaceIcon color='black' style={{ width: 30, height: 30 }} />
        </IconButton>
      </div>
    );
  }
}