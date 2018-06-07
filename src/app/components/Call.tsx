import * as React from 'react';
import * as Promise from 'bluebird';
import {
  Subheader, FontIcon, IconButton, Drawer,
  TextField, Paper, AppBar, Table, TableHeader,
  TableHeaderColumn, TableBody, TableRow, TableRowColumn
} from 'material-ui';
import CloseIcon from 'material-ui/svg-icons/navigation/close';
const SparkIcon = require('../imgs/spark.svg');
const WebExIcon = require('../imgs/webex.svg');
import {JsXAPI, Time, MeetingHelper, SparkGuest, CallHandler} from '../lib';
import { Dialer, CallButton } from './index';
import { EventEmitter } from 'events';
import '../lib/emitter';
global.emitter = new EventEmitter();
import { remote } from 'electron';

export class Call extends React.Component<any, any> {
  public sparkGuest: SparkGuest;
  public callDurationCounter: any;
  public callMedia: any;
  public jsxapi = JsXAPI;
  constructor(props) {
    super(props);
    this.state = {
      showDialer: false,
      number: '',
      callback: null,
      callbackHint: '',
      callDuration: '0:00',
      callStats: null,
      scrollpos: 0
    };
  }

  componentWillUnmount() {
    clearInterval(this.callDurationCounter);
  }

  componentDidMount() {
    let nextMeeting = MeetingHelper.getNext();
    if(nextMeeting.hasOwnProperty('redirected') && !nextMeeting.redirected) {
      nextMeeting.redirected = true;
      MeetingHelper.setNext(nextMeeting);
    }
    let { callId } = this.props;
    this.callDurationCounter = setInterval(() => {
      Promise.all([
        this.jsxapi.getStatus(`Call ${callId} Duration`).then(dur => {
          this.setState({ callDuration: Time.callDuration(dur) });
        }),
        this.jsxapi.getStatus(`MediaChannels Call ${callId}`).then((media) =>
          CallHandler.stats(media)
        ).then(stats => this.setState({ callStats: stats }))
      ])
    },1000);
    global.emitter.on('clear-callduration', () => {
      clearInterval(this.callDurationCounter);
    });
    let state: any = {};
    let callback: string;

    JsXAPI.getStatus('Call').then(calls => {
      if(calls && calls.length > 0) {
        callback = calls.find(c => c.id == callId).CallbackNumber;
        state['callback'] = callback;
        if(callback.includes('webex.com')) {
          state['showDialer'] = true;
          state['callbackHint'] = 'Enter PIN + # if Host';
          JsXAPI.commander({
            cmd: 'UserInterface Message Prompt Display',
            params: {
              Duration: 45,
              Title: 'WebEx Pin',
              Text: '#'
            }
          });
        }
        this.setState(state);
      }
    });
  }

  deviceHangup = (callId) => {
    JsXAPI.hangUp(callId).then(() =>
      this.props.switch({
        callView: false,
        meetingView: false,
        mainView: true
      }))
  }

  hangup = () => {
    const { callId } = this.props;
    let { callback } = this.state;
    clearInterval(this.callDurationCounter);
    if(callback.includes('meet.ciscospark.com')) {
      this.sparkGuest = new SparkGuest({});
      callback = callback.replace('sip:', '');
      let thisMeeting: any = this.sparkGuest.getObtpMeeting(callback);
      if(!thisMeeting) return this.deviceHangup(callId);
      this.sparkGuest.getToken().then(token => {
        Promise.all([
          this.sparkGuest.deleteRoom({
            roomId: thisMeeting.id,
            token
          }),
          this.sparkGuest.deleteObtpMeeting(thisMeeting.id)
        ]).then(() => this.deviceHangup(callId))
      });
    } else {
      return this.deviceHangup(callId);
    }
  }

  passDigits = () => {
    let { number } = this.state;
    const { callId } = this.props;
    return JsXAPI.commander({
      cmd: `Call DTMFSend`,
      params: {
        CallId: callId,
        DTMFString: number
      }
    }).then((resp) => {
      JsXAPI.commander({
        cmd: 'UserInterface Message Prompt Clear',
        params: {}
      })
      this.setState({ number: '', showDialer: false, callbackHint: '' });
    })
  }

  updateNumber = (char) => {
    let { number, callback } = this.state;
    if(callback.includes('webex.com')) {
      JsXAPI.commander({
        cmd: 'UserInterface Message Prompt Display',
        params: {
          Duration: 45,
          Title: 'WebEx Pin Entry',
          Text: number + char
        }
      });
    }
    this.setState({ number: number + char });
  }

  closeDialer = () => this.setState({
    showDialer: false,
    number: '',
    callbackHint: ''
  });

  dialerAction = () => {
    const { showDialer } = this.state;
    this.setState({ showDialer: showDialer ? false : true });
  }

  _renderCallBtns = () => {
    let icons = [
      'AddCall', 'ShareInCall', 'HoldCall',
      'KeyPad', 'TransferCall', 'EndCall'
    ];
    return icons.map((icon, idx) => {
      return (
        <CallButton
          key={idx}
          style={idx===0 ? this.styles.mainicon : this.styles.icon}
          img={icon}
          click={idx===3 ? this.dialerAction : idx===5 ?
            this.hangup : () => {}}
          ripple={true} />
      );
    })
  }

  render() {
    let { number, showDialer, callback, callbackHint, callStats } = this.state;
    let { callId } = this.props;
    if(callback && callback.includes('sip:')) {
      callback = callback.replace('sip:', '');
    }
    return (
      <div>
        {
          callback && callback.includes('ciscospark') ?
            <img src={SparkIcon} height={18} width={18} style={this.styles.callicon} /> :
          callback && callback.includes('webex') ?
            <img src={WebExIcon} height={18} width={18} style={this.styles.callicon} /> :
            null
        }
        <Subheader style={this.styles.calldur}>
          {callback + ': ' + this.state.callDuration}
        </Subheader>
        <div style={this.styles.main}></div>
        <div style={{ marginTop: '25px' }}>
          { this._renderCallBtns() }
        </div>
        <Drawer open={showDialer}
          openSecondary={true}
          containerStyle={Object.assign(this.styles.dialer, {
            right: showDialer ? 100 : -1
          })}
          width={350} >
          <TextField type='text' id='dialer' fullWidth={true}
            disabled
            hintText={callbackHint}
            hintStyle={this.styles.txthint}
            inputStyle={this.styles.txtinput}
            style={this.styles.text}
            underlineShow={false}
            value={this.state.number} />
          <IconButton onClick={this.closeDialer} tooltip='close me'
            tooltipPosition='bottom-left'
            tooltipStyles={{top:10}}
            iconStyle={this.styles.closeIcon}
            style={this.styles.closebtn} >
            <CloseIcon color='white' />
          </IconButton>
          <Dialer showBackspace={number === '' ? false : true}
            passDigits={this.passDigits}
            update={this.updateNumber}
            delete={(v) => this.setState({
              number: number.substring(0, number.length - 1)
            })} />
        </Drawer>
        {
          callStats ?
            <div style={{position: 'absolute', bottom: -410, left:-2}}>
              <AppBar title='Call Stats' iconStyleLeft={{display:'none'}}
                style={{height:'45px'}}
                titleStyle={{fontSize: 16, textAlign: 'center', marginTop: '-10px'}}
                onTitleClick={() => {
                  let { scrollpos } = this.state;
                  if(scrollpos > 0) scrollpos = 0;
                  else scrollpos = window.innerHeight;
                  window.scrollTo(0, scrollpos);
                  this.setState({ scrollpos });
                }} />
              <AppBar style={{marginTop:'0px'}}
                iconStyleLeft={{display: 'none'}}>
                <Table
                  height={this.state.statHeight}
                  selectable={false}>
                  <TableHeader displaySelectAll={false} >
                    <TableRow>
                      <TableHeaderColumn colSpan={1} >
                        Outgoing Audio Stats
                      </TableHeaderColumn>
                    </TableRow>
                  </TableHeader>
                  <TableBody displayRowCheckbox={false} >
                    <TableRow>
                      <TableRowColumn>Codec</TableRowColumn>
                      <TableRowColumn>
                        {callStats.outAudio.codec.toUpperCase()}
                      </TableRowColumn>
                    </TableRow>
                    <TableRow>
                      <TableRowColumn> Encrypted </TableRowColumn>
                      <TableRowColumn>
                        {callStats.outAudio.encrypted ? 'true' : 'false'}
                      </TableRowColumn>
                    </TableRow>
                    <TableRow>
                      <TableRowColumn> Transferred Data </TableRowColumn>
                      <TableRowColumn>
                        {callStats.outAudio.stats.transferred}
                      </TableRowColumn>
                    </TableRow>
                    <TableRow>
                      <TableRowColumn> Packets Sent </TableRowColumn>
                      <TableRowColumn>
                        {callStats.outAudio.stats.packets}
                      </TableRowColumn>
                    </TableRow>
                    <TableRow>
                      <TableRowColumn> Packet Loss </TableRowColumn>
                      <TableRowColumn>
                        {callStats.outAudio.stats.loss}
                      </TableRowColumn>
                    </TableRow>
                    <TableRow>
                      <TableRowColumn> Current Jitter </TableRowColumn>
                      <TableRowColumn>
                        {callStats.outAudio.stats.jitter}
                      </TableRowColumn>
                    </TableRow>
                    <TableRow>
                      <TableRowColumn> Max Jitter </TableRowColumn>
                      <TableRowColumn>
                        {callStats.outAudio.stats.maxJitter}
                      </TableRowColumn>
                    </TableRow>
                  </TableBody>
                </Table>
                <Table
                  height={this.state.statHeight}
                  selectable={false}>
                  <TableHeader displaySelectAll={false} >
                    <TableRow>
                      <TableHeaderColumn colSpan={1} >
                        Outgoing Video Stats
                      </TableHeaderColumn>
                    </TableRow>
                  </TableHeader>
                  <TableBody displayRowCheckbox={false} >
                    <TableRow>
                      <TableRowColumn>Codec</TableRowColumn>
                      <TableRowColumn>
                        {callStats.outVideo.codec.toUpperCase()}
                      </TableRowColumn>
                    </TableRow>
                    <TableRow>
                      <TableRowColumn> Encrypted </TableRowColumn>
                      <TableRowColumn>
                        {callStats.outVideo.encrypted ? 'true' : 'false'}
                      </TableRowColumn>
                    </TableRow>
                    <TableRow>
                      <TableRowColumn> Transferred Data </TableRowColumn>
                      <TableRowColumn>
                        {callStats.outVideo.stats.transferred}
                      </TableRowColumn>
                    </TableRow>
                    <TableRow>
                      <TableRowColumn> Packets Sent </TableRowColumn>
                      <TableRowColumn>
                        {callStats.outVideo.stats.packets}
                      </TableRowColumn>
                    </TableRow>
                    <TableRow>
                      <TableRowColumn> Packet Loss </TableRowColumn>
                      <TableRowColumn>
                        {callStats.outVideo.stats.loss}
                      </TableRowColumn>
                    </TableRow>
                    <TableRow>
                      <TableRowColumn> Current Jitter </TableRowColumn>
                      <TableRowColumn>
                        {callStats.outVideo.stats.jitter}
                      </TableRowColumn>
                    </TableRow>
                    <TableRow>
                      <TableRowColumn> Max Jitter </TableRowColumn>
                      <TableRowColumn>
                        {callStats.outVideo.stats.maxJitter}
                      </TableRowColumn>
                    </TableRow>
                  </TableBody>
                </Table>
              </AppBar>
            </div> :
            null
        }
      </div>
    )
  }

  styles:any = {
    calldur: {
      position: 'absolute',
      top: 0,
      fontSize: 13,
      left: '50%',
      color: 'black',
      width: 250,
      marginLeft: '-125px'
    },
    callicon: {
      position: 'absolute',
      top: 15,
      left: '50%',
      color: 'black',
      marginLeft: '-138px'
    },
    main: {
      borderRadius: '7px',
      border: 'solid 3px rgb(219,219,219)',
      position: 'relative',
      marginLeft: '150px',
      marginTop: '100px',
      width: '600px',
      height: '350px',
    },
    mainicon: {
      marginLeft: '190px',
      marginRight: '15px'
    },
    icon: {
      marginLeft: '25px',
      height: 65, width: 65,
      zIndex: 1001
    },
    div: {
      position: 'absolute',
      bottom: 0
    },
    badge: {
      top: 30,
      right: 28,
      width: 15,
      height: 15
    },
    closeIcon: {
      height: 15,
      width: 15
    },
    closebtn: {
      position: 'absolute',
      right: 10,
      top: 0,
      height: 25,
      width: 25,
      padding: 0,
      margin: 0
    },
    text: {
      backgroundColor: 'black',
      height: 75
    },
    txthint: {
      marginLeft: 35,
      fontSize: 20,
      color: 'grey',
      top: 25
    },
    txtinput: {
      marginLeft: 35,
      fontSize: 28,
      color: 'white',
      cursor: 'none'
    },
    dialer: {
      position: 'absolute',
      height: 450,
      top: 200
    }
  }
}