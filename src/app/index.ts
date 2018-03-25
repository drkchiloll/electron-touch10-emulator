import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Promise from 'bluebird';
import {MuiThemeProvider, getMuiTheme, colors} from 'material-ui/styles';
const { 
  indigo500, indigo200, deepOrange400, lightBlueA200, green500, grey50
} = colors;
import {
  Badge, Dialog, Drawer, Divider, FloatingActionButton, FontIcon, IconButton,
  Subheader, Paper, Avatar, TextField, Chip, 
} from 'material-ui';

import CallIcon from 'material-ui/svg-icons/communication/call';
import BackspaceIcon from 'material-ui/svg-icons/content/backspace';
import AddIcon from 'material-ui/svg-icons/content/add';
import DecreaseIcon from 'material-ui/svg-icons/content/remove'
import VolumeUp from 'material-ui/svg-icons/av/volume-up';
import VolumeDown from 'material-ui/svg-icons/av/volume-down';
import ShareIcon from 'material-ui/svg-icons/content/content-copy';
import PauseIcon from 'material-ui/svg-icons/av/pause';
import TransferIcon from 'material-ui/svg-icons/navigation/arrow-forward';
import CallEndIcon from 'material-ui/svg-icons/communication/call-end';
import MicOnIcon from 'material-ui/svg-icons/av/mic';
import MicOffIcon from 'material-ui/svg-icons/av/mic-off';
import DialPadIcon from 'material-ui/svg-icons/communication/dialpad';
import CloseIcon from 'material-ui/svg-icons/navigation/close';
import SettingsIcon from 'material-ui/svg-icons/action/settings';
import IsConnectedIcon from 'material-ui/svg-icons/av/fiber-manual-record';
import DnDIcon from 'material-ui/svg-icons/notification/do-not-disturb';
import OutIcon from 'material-ui/svg-icons/communication/call-made';
import InIcon from 'material-ui/svg-icons/communication/call-received';
import VideoCall from 'material-ui/svg-icons/av/videocam';
import Share from 'material-ui/svg-icons/content/content-copy'
import Meeting from 'material-ui/svg-icons/action/event';
import AwakeIcon from 'material-ui/svg-icons/action/visibility';
import StandbyIcon from 'material-ui/svg-icons/action/visibility-off';