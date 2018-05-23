import * as React from 'react';
import * as Promise from 'bluebird';
import * as $ from 'jquery';
import { IconButton, FontIcon, Chip, MenuItem, IconMenu } from 'material-ui';
import { blueGrey100, blueGrey900, fullBlack, red900 } from 'material-ui/styles/colors';
import ReactModal from 'react-modal-resizable-draggable';
import { SparkGuest, SparkGuestConstructor, JsXAPI } from '../lib';
import * as CiscoSpark from 'ciscospark';
import CallIcon from 'material-ui/svg-icons/communication/call';
import ZoomInIcon from 'material-ui/svg-icons/content/add';
import ZoomOutIcon from 'material-ui/svg-icons/content/remove';
import CamFilter from 'material-ui/svg-icons/content/filter-list';
import VideoCamOn from 'material-ui/svg-icons/av/videocam';
import VideoCamOff from 'material-ui/svg-icons/av/videocam-off';
import { Grid, Row, Col } from 'react-flexbox-grid';
import { JoyStick } from './CamControl';
const EndCall = require('../imgs/EndCall.svg');

export class SparkWidget extends React.Component<any, any> {
  public jsxapi = JsXAPI;
  public call: any;
  public sparkJsSdk: any;
  constructor(props) {
    super(props);
    this.state = {
      token: null,
      spark: null,
      showControls: false,
      cameraId: '1',
      splitScreen: false,
      activeCall: false,
      sendVideo: false,
      endpointCallId: null,
      endpointConnected: null
    };
  }

  componentDidMount() {
    const { account: { metaData: { hardware: { product } } } } = this.props;
    const guest = new SparkGuest({});
    guest.createTokens().then(token => {
      this.sparks(token);
    });
  }

  sparks = token => {
    if(!this.call) {
      let timeout = 1500;
      let {
        account: {
          metaData: { hardware: { product }},
          room: { sipAddress }
        }
      } = this.props;
      let currentCall: any;
      this.sparkJsSdk = this.createTeamsInstance(token);
      return this.jsxapi.getStatus('Call').then((c:any) => {
        if(c && c.length > 0) {
          currentCall = c[0];
          if(currentCall.RemoteNumber.indexOf('webex') === -1 &&
             currentCall.RemoteNumber.indexOf('ciscospark') === -1) return;
          sipAddress = currentCall.RemoteNumber;
          this.setState({ endpointCallId: currentCall.id });
          this.jsxapi.xapi.feedback.on('/Event/CallDisconnect', (call: any) => {
            console.log(call);
            const { endpointCallId } = this.state;
            if(call.CallId === endpointCallId) {
              this.handleCleanup();
            }
          })
        }
        return this.sparkJsSdk.phone.register().then(() => {
          return this.placeCall(sipAddress).then(() => {
            if(!currentCall) {
              setTimeout(() =>
                this.jsxapi.dial(sipAddress).then(() => {
                  if(product.includes('SX80') || product.includes('MX')) {
                    this.jsxapi.commander({
                      cmd: 'Video Input SetMainVideoSource',
                      params: { ConnectorId: [1,2] }
                    }).then(() => this.setState({ splitScreen: true }));
                  }
                }),
                timeout
              );
            }
          });
        });
      });
    }
  }

  createTeamsInstance = token => {
    return CiscoSpark.init({
      config: {
        phone: { enableExperimentalGroupCallingSupport: true },
      },
      credentials: { access_token: token }
    });
  }

  handleRemoteVideoEvent = () => {
    const { account: { metaData: { hardware: {product}}}} = this.props;
    let timeout = 2500;
    ['audio', 'video'].forEach(kind => {
      let track: any;
      if(this.call.remoteMediaStream) {
        track = this.call.remoteMediaStream.getTracks().find((t) => t.kind === kind);
        if(track) {
          const farend: any = document.getElementById(`farend-main-${kind}`)
          farend.srcObject = new MediaStream([track]);
        }
      } else if(this.call.localMediaStream) {
        console.log('we are local');
        track = this.call.localMediaStream.getTracks().find((t:any) =>
          t.kind === kind);
        if(track) {
          const nearend: any = document.querySelector('#nearend-video');
          nearend.srcObject = new MediaStream([track]);
          nearend.muted = true;
          nearend.setAttribute('style', 'zIndex:1010;');
        }
      }
    });
    setTimeout(() => this.setState({
      showControls: product.includes('DX') ? false : true,
      activeCall: true
    }),timeout);
  };

  handleCleanup = () => {
    console.log('handleCleanup Called');
    if(this.call) {
      JsXAPI.commander({
        cmd: 'Video Input SetMainVideoSource',
        params: { ConnectorId: 1 }
      });
      this.call.cleanup().then(() => {
        this.call.hangup();
        const video: any = document.querySelector('#farend-video'),
          audio: any = document.querySelector('#farend-audio');
        if(video && audio) {
          video.srcObject = null;
          audio.srcObject = null;
        }
        this.call = null;
        this.sparkJsSdk = null;
        this.props.close();
      });
    }
  }

  placeCall = numberToDial => {
    return new Promise(resolve => {
      this.call = this.sparkJsSdk.phone.dial(numberToDial);
      const { account: {metaData: {hardware: {product}}}} = this.props;
      this.call.on('remoteMediaStream:change', () => {
        if(this.call.remoteMediaStream) this.handleRemoteVideoEvent();
      });
      this.call.on('active', () => {
        this.call.changeSendingMedia('video', false);
        console.log('A Call Is Active');
        this.call.on('remoteMediaStream:change', () => {
          if(this.call.remoteMediaStream) this.handleRemoteVideoEvent();
        });
        this.call.on('localMediaStream:change', () => {
          if(this.call.localMediaStream) this.handleRemoteVideoEvent();
        });
        this.call.on('membership:connected', () => this.handleRemoteVideoEvent());
        this.call.on('membership:disconnected membership:terminating', () => {
          console.log('handle this');
          if(!this.state.endpointCallId) this.handleCleanup();
        });
        this.call.on('error', (err) => console.log(err));
      });
      resolve();
    });
  }

  zoom = action => {
    const { cameraId } = this.state;
    this.jsxapi.commander({
      cmd: 'Camera Ramp',
      params: {
        CameraId: cameraId,
        Zoom: action,
        ZoomSpeed: 8
      }
    }).then(() => setTimeout(() => this.jsxapi.commander({
      cmd: 'Camera Ramp', params: { CameraId: cameraId, Zoom: 'Stop' }
    })),100);
  }

  camSelect = (e, cameraId) => {
    this.setState({ cameraId });
  }

  handleVideoDblClick = (e: any) => {
    let { splitScreen, cameraId } = this.state;
    if(splitScreen) {
      console.log('Remove Split Screen');
      const el = $(e.target);
      const xpos = e.pageX - el.offset().left;
      let input: string, cameraId: string;
      if(xpos <= 299.99) {
        input = '1';
        cameraId = '1';
      } else {
        input = '2';
        cameraId = '2';
      }
      this.jsxapi.commander({
        cmd: 'Video Input SetMainVideoSource',
        params: { ConnectorId: input }
      }).then(() => this.setState({ splitScreen: false, cameraId }));
    } else {
      this.jsxapi.commander({
        cmd: 'Video Input SetMainVideoSource',
        params: { ConnectorId: [1,2] }
      }).then(() => this.setState({ splitScreen: true }));
    }
  }

  render() {
    const { caller } = this.props;
    const { cameraId, activeCall, sendVideo } = this.state;
    const callId = caller.outgoingCall.id;
    return (
      <div id='spark-call'>
        <Grid fluid>
          <div style={{ position: 'absolute', top: 148, left: 158 }}
            onDoubleClick={this.handleVideoDblClick} >
            <audio id='farend-main-audio' autoPlay></audio>
            <video id='farend-main-video' autoPlay width={605}></video>
            <video id='nearend-video' autoPlay height={100} width={100}></video>
          </div>
          {
            activeCall ?
              <IconButton style={{position: 'absolute', left: 150, top: 117 }}
                onClick={() => {
                  this.setState({ sendVideo: !sendVideo });
                  this.call.changeSendingMedia('video', !sendVideo);
                }}>
                <FontIcon>
                  {
                    sendVideo ?
                      <VideoCamOn color={fullBlack} /> :
                      <VideoCamOff color={red900} />
                  }
                </FontIcon>
              </IconButton> :
              null
          }
          {
            this.state.showControls ?
              <div>
                <Row>
                  <Col xsOffset={6}>
                    <div className='joystick' style={{ position: 'absolute', top: 412 }}>
                      <JoyStick cameraId={cameraId} />
                    </div>
                  </Col>
                </Row>
                <Row>
                  <Col xsOffset={5} xs={3}>
                    <div style={{ position: 'absolute', top: 485 }} >
                      <Chip style={{ width: 80, height: 26, marginLeft: '35px' }}
                          backgroundColor={blueGrey100} >
                        <IconButton style={{ position: 'absolute', left: -3, top: -10 }}
                          iconStyle={{ height: '14px', width: '14px' }}
                          onClick={() => this.zoom('In')} >
                          <ZoomInIcon color='black' />
                        </IconButton>
                        <IconButton style={{ position: 'absolute', right: -3, top: -10 }}
                          iconStyle={{ height: '14px', width: '14px' }}
                          onClick={() => this.zoom('Out')} >
                          <ZoomOutIcon color='black' />
                        </IconButton>
                      </Chip>
                    </div>
                  </Col>
                  <Col>
                    <div style={{position: 'absolute', top: 473, right: 375}}>
                      <IconMenu
                        menuStyle={{margin:0,padding:0,width:75}}
                        iconButtonElement={<IconButton><CamFilter color={blueGrey900} /></IconButton>}
                        value={cameraId}
                        onChange={this.camSelect} >
                        <MenuItem
                          innerDivStyle={{fontSize:12}}
                          value='1'
                          primaryText='Camera 1' />
                        <MenuItem
                          innerDivStyle={{fontSize:12}}
                          value='2'
                          primaryText='Camera 2' />
                        {/* <MenuItem
                          innerDivStyle={{ fontSize: 12 }}
                          value='3'
                          primaryText='Camera 3' /> */}
                      </IconMenu>
                    </div>
                  </Col>
                </Row>
              </div> :
              null
          }
        </Grid>
      </div>
    )
  }
}
