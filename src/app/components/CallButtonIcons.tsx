import * as React from 'react';
import { IconButton, FontIcon } from 'material-ui';
const AddCall = require('../imgs/AddCall.svg');
const TransferCall = require('../imgs/TransferCall.svg');
const HoldCall = require('../imgs/HoldCall.svg');
const ShareInCall = require('../imgs/ShareInCall.svg');
const KeyPad = require('../imgs/KeyPad.svg');
const EndCall = require('../imgs/EndCall.svg');

export function CallButton(props) {
  const {
    style, img, click, ripple
  } = props;
  const getImg = (img) => {
    switch(img) {
      case 'AddCall': return AddCall;
      case 'TransferCall': return TransferCall;
      case 'HoldCall': return HoldCall;
      case 'ShareInCall': return ShareInCall;
      case 'KeyPad': return KeyPad;
      case 'EndCall': return EndCall;
    }
  }
  return (
    <IconButton style={style}
      disableTouchRipple={ripple}
      onClick={click} >
      <FontIcon>
        <img src={getImg(img)} height={60} width={60} />
      </FontIcon>
    </IconButton>
  );
}