import * as React from 'react';
import * as Promise from 'bluebird';
import * as $ from 'jquery';
import { IconButton, FontIcon, Chip, MenuItem, IconMenu } from 'material-ui';
import { blueGrey100, blueGrey900 } from 'material-ui/styles/colors';
import ReactModal from 'react-modal-resizable-draggable';
import { SparkGuest, SparkGuestConstructor, JsXAPI } from '../lib';
import * as CiscoSpark from 'ciscospark';
import CallIcon from 'material-ui/svg-icons/communication/call';
import ZoomInIcon from 'material-ui/svg-icons/content/add';
import ZoomOutIcon from 'material-ui/svg-icons/content/remove';
import CamFilter from 'material-ui/svg-icons/content/filter-list';
import { Grid, Row, Col } from 'react-flexbox-grid';
import { JoyStick } from './CamControl';
const EndCall = require('../imgs/EndCall.svg');

export class SparkWidget extends React.Component<any, any> {
  state = {
    token: null,
    spark: null,
    showControls: false,
    cameraId: '1',
    splitScreen: false,
  };
  call: any;

  componentDidMount() {
    console.log('mounting widget');
    if(this.props.token) {
      this.sparks(this.props.token);
    } else {
      this.sparkStuffs();
    }
    const { account: { metaData: { hardware: { product } } } } = this.props;
    if(product.includes('SX') || product.includes('MX')) {
      JsXAPI.commander({
        cmd: 'Video Input SetMainVideoSource',
        params: {ConnectorId: [1,2]}
      }).then(() => {
        this.setState({ splitScreen: true });
      });
    }
  }

  sparks = (token) => {
    if(!this.call) {
      const { account: { metaData, room: { sipAddress }} } = this.props;
      // JsXAPI.dial(sipAddress);
      const spark = this.createTeamsInstance(this.props.token.token);
      return spark.phone.register().then(() => {
        return this.placeCall(sipAddress).then(() => {
          setTimeout(() => JsXAPI.dial(sipAddress), 2000);
        });
      });
    }
  }

  createTeamsInstance = (token) => {
    const spark: any = CiscoSpark.init({
      config: {
        phone: { enableExperimentalGroupCallingSupport: true },
      },
      credentials: { access_token: token }
    });
    this.setState({ spark });
    return spark;
  }

  handleMedia = mediaStream => {
    return Promise.each(mediaStream.getTracks(), track => {
      console.log(track);
      if(track.kind === 'audio' || track.kind === 'video') {
        if(!track.remote) track.stop();
      }
    });
  }

  handleRemoteVideoEvent = () => {
    const { account: { metaData: { hardware: {product}}}} = this.props;
    ['audio', 'video'].forEach(kind => {
      if(this.call.remoteMediaStream) {
        // console.log(this.call.remoteMediaStream);
        const track = this.call.remoteMediaStream.getTracks().find((t) => t.kind === kind);
        if(track) {
          // console.log(track.id);
          const farend: any = document.getElementById(`farend-main-${kind}`)
          farend.srcObject = new MediaStream([track]);
        }
      } else {
        this.call.localMediaStream = null;
      }
    });
    setTimeout(() => this.setState({
      showControls: product.includes('DX') ? false : true,
    }),1500);
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
        this.props.close();
      });
    }
  }

  placeCall = (numberToDial) => {
    return new Promise(resolve => {
      this.call = this.state.spark.phone.dial(numberToDial);
      this.call.on('membership:connected', () => this.handleRemoteVideoEvent());
      const { account: {metaData: {hardware: {product}}}} = this.props;
      if(product === 'SX80') {
        this.call.on('remoteMediaStream:change', () => this.handleRemoteVideoEvent());
      }
      this.call.on('active', () => {
        console.log('A Call Is Active');
        this.call.on('remoteMediaStream:change', () => this.handleRemoteVideoEvent());
        this.call.on('membership:disconnected', () => this.handleCleanup());
        this.call.on('inactive', () => this.handleCleanup());
        this.call.on('error', (err) => console.log(err));
      });
      resolve();
    });
  }
  
  sparkStuffs = () => {
    const sparkguest = new SparkGuest({
      userid: '987654321',
      username: 'myNewUser'
    });
    return sparkguest.createTokens()
      .then((token: any) => {
        this.setState({ token });
        return token.token;
      })
      .then((token) => this.createTeamsInstance(token));
  }

  zoom = (action) => {
    const { cameraId } = this.state;
    JsXAPI.commander({
      cmd: 'Camera Ramp',
      params: {
        CameraId: cameraId,
        Zoom: action,
        ZoomSpeed: 8
      }
    }).then(() => setTimeout(() => JsXAPI.commander({
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
      JsXAPI.commander({
        cmd: 'Video Input SetMainVideoSource',
        params: { ConnectorId: input }
      }).then(() => this.setState({ splitScreen: false, cameraId }));
    } else {
      JsXAPI.commander({
        cmd: 'Video Input SetMainVideoSource',
        params: { ConnectorId: [1,2] }
      }).then(() => this.setState({ splitScreen: true }));
    }
  }

  render() {
    const { caller } = this.props;
    const { cameraId } = this.state;
    const callId = caller.outgoingCall.id;
    return (
      <div id='spark-call'>
        <Grid fluid>
          <div style={{ position: 'absolute', top: -82, left: 162}}
            onDoubleClick={this.handleVideoDblClick} >
            <audio id='farend-main-audio' autoPlay></audio>
            <video id='farend-main-video' autoPlay height={780} width={600}></video>
            <video
              style={{position: 'absolute', top: 140, right: 150, zIndex: 1001}}
              id='farend-sec-video'
              autoPlay
              height={120}
              width={120}></video>
          </div>
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
                    <div style={{ marginTop: '-110px' }} >
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
                    <div style={{marginTop:'-125px', marginLeft: '-100px'}}>
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
