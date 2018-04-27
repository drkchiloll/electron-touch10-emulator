import * as React from 'react';
import * as Promise from 'bluebird';
import { IconButton, FontIcon, Chip } from 'material-ui';
import { blueGrey100 } from 'material-ui/styles/colors';
import ReactModal from 'react-modal-resizable-draggable';
import { SparkGuest, SparkGuestConstructor, JsXAPI } from '../lib';
import * as CiscoSpark from 'ciscospark';
import CallIcon from 'material-ui/svg-icons/communication/call';
import ZoomInIcon from 'material-ui/svg-icons/content/add';
import ZoomOutIcon from 'material-ui/svg-icons/content/remove';
import { Grid, Row, Col } from 'react-flexbox-grid';
import { JoyStick } from './CamControl';
const EndCall = require('../imgs/EndCall.svg');

export class SparkWidget extends React.Component<any, any> {
  state = { token: null, spark: null, showControls: false };
  call: any;

  componentDidMount() {
    console.log('mounting widget');
    if(this.props.token) {
      this.sparks(this.props.token);
    } else {
      this.sparkStuffs();
    }
  }

  sparks = (token) => {
    if(!this.call) {
      const { account: { metaData, room: { sipAddress }} } = this.props;
      // JsXAPI.dial(sipAddress);
      const spark = this.createTeamsInstance(this.props.token.token);
      return spark.phone.register().then(() => {
        return this.placeCall(sipAddress).then(() => {
          setTimeout(() => JsXAPI.dial(sipAddress), 1500);
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
    ['audio', 'video'].forEach((kind) => {
      if(this.call.remoteMediaStream) {
        const track = this.call.remoteMediaStream.getTracks().find((t) => t.kind === kind);
        if(track) {
          const farend: any = document.getElementById(`farend-${kind}`)
          farend.srcObject = new MediaStream([track]);
        }
      } else {
        this.call.localMediaStream = null;
      }
    });
    setTimeout(() => this.setState({ showControls: true }),1500);
  };

  handleCleanup = () => {
    console.log('handleCleanup Called');
    if(this.call) {
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
      this.call.on('remoteMediaStream:change', () => this.handleRemoteVideoEvent());

      this.call.on('active', () => {
        console.log('A Call Is Active');
        // this.call.on('remoteMediaStream:change', () => this.handleRemoteVideoEvent());
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
    JsXAPI.commander({
      string: 'Camera Ramp',
      param: {
        CameraId: 1,
        Zoom: action,
        ZoomSpeed: 5
      }
    }).then(() => setTimeout(() => JsXAPI.commander({
      string: 'Camera Ramp', param: { CameraId: 1, Zoom: 'Stop' }
    })),100);
  }

  render() {
    const { caller } = this.props;
    const callId = caller.outgoingCall.id;
    return (
      <div id='spark-call'>
        <Grid fluid>
          <div style={{ position: 'absolute', top: -42, left: 157}}>
            <audio id='farend-audio' autoPlay ></audio>
            <video id='farend-video' height={700} width={600} autoPlay ></video>
          </div>
          {
            this.state.showControls ?
              <div>
                <Row>
                  <Col xsOffset={6}>
                    <div className='joystick' style={{ position: 'absolute', top: 412 }}>
                      <JoyStick />
                    </div>
                  </Col>
                </Row>
                <Row>
                  <Col xsOffset={5} xs={3}>
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
