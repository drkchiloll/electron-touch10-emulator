import * as React from 'react';
import { JsXAPI } from '../lib';
import { Drawer, IconButton, Avatar, Paper, RaisedButton } from 'material-ui';
import CallIcon from 'material-ui/svg-icons/communication/call';
import CallEndIcon from 'material-ui/svg-icons/communication/call-end';
import DnDIcon from 'material-ui/svg-icons/notification/do-not-disturb';
import OutIcon from 'material-ui/svg-icons/communication/call-made';
import InIcon from 'material-ui/svg-icons/communication/call-received';
import { IncomingCall } from './IncomingCall/index';

const styles: any = {
  drawer: {
    position: 'absolute',
    height: 115,
    top: 10,
    border: '1px solid red',
    borderRadius: '8px'
  },
  header: { width: 300, marginLeft: '15px' },
  para: {
    lineHeight: 1.1,
    marginLeft: '15px',
    marginBottom: '15px'
  },
  callIcon1: {
    position: 'absolute',
    right: 25,
    top: 55
  },
  callIcon2: {
    position: 'absolute',
    right: 65,
    top: 55
  },
  callIcon3: {
    position: 'absolute',
    right: 105,
    top: 55
  },
  makereceive: {
    position: 'absolute',
    right: 5,
    top: 5
  }
};
export const CallNotification = (props: any) => {
  const { call, dialedNumber } = props,
    color = 'black',
    callDirections = Object.keys(call);
  let direction: string, keyToUse: any, display: string, callback: string;
  if(callDirections.find(key => call[key].hasOwnProperty('id'))) {
    let indexToUse = callDirections.findIndex(key => call[key].hasOwnProperty('id'));
    keyToUse = callDirections[indexToUse];
    direction = callDirections[indexToUse] === 'incomingCall' ? 'in' : 'out';
    display = call[keyToUse].display;
    callback = call[keyToUse].callback;
  } else {
    keyToUse = false;
  }
  const callMessage = direction === 'in' ? 'Incoming Call From:' : 'Outgoing Call To:';
  const open = keyToUse && call[keyToUse].hasOwnProperty('id') &&
    !call[keyToUse].answered && !call[keyToUse].disconnect;
  return (
    ((dialedNumber && dialedNumber.room && dialedNumber.room.sipAddress) &&
      keyToUse && callback == 'sip:' + dialedNumber.room.sipAddress) ?
      null
      : direction === 'in' ?
        <div style={{ display: open ? 'flex' : 'none' }}>
          <IncomingCall display={display} callerId={call[keyToUse].id} />
        </div>
      :
        <Drawer
          open={open}
          openSecondary={true}
          containerStyle={styles.drawer}
          width={525} >
          <OutIcon style={styles.makereceive} color={color} />
          <h4 style={styles.header}> {callMessage} {display} </h4>
          <p style={styles.para}>
            <span> Callback Number </span>
            <br />
            <span> {callback} </span>
          </p>
          <IconButton style={styles.callIcon2}
            onClick={() =>
              JsXAPI.commander({
                cmd: 'Call Reject',
                params: { Callid: call[keyToUse].id }
              })
            } >
            <CallEndIcon color='red' />
          </IconButton>
          <IconButton style={styles.callIcon1}
            onClick={() =>
              JsXAPI.commander({
                cmd: 'Call Ignore',
                params: { Callid: call[keyToUse].id }
              })
            } >
            <DnDIcon />
          </IconButton>
        </Drawer>
  );
}