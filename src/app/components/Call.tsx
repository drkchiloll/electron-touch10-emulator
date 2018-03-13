import * as React from 'react';
import * as Promise from 'bluebird';
import {
  Paper, FloatingActionButton, Subheader, Avatar,
  Chip, SvgIcon, Badge, Divider, FontIcon, IconButton
} from 'material-ui';
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
import { JsXAPI, Time } from '../lib';

const styles: any = {
  main: {
    borderRadius: '7px',
    position: 'relative',
    marginLeft: '150px',
    marginTop: '150px',
    width: '600px',
    height: '350px'
  },
  inner: {
    marginTop: '85px',
    marginLeft: '230px',
    width: 140,
    height: 140
  },
  icon: {
    marginLeft: '32px'
  },
  divider: { height: 10 },
  div2: {
    position: 'absolute',
    bottom: 0
  },
  paper: { borderRadius: '7px', border: '1px solid black' },
  heading: { textAlign: 'center', padding: 0, margin: 0 },
  badge2: { top: 30, right: 28, width: 15, height: 15 },
  plusminusIcon: { width: 10, height: 10 },
};

export class Call extends React.Component<any, any> {
  constructor(props) {
    super(props);
    this.state = { volume: 0, mic: 'Off' };
  }

  audio: any;

  microphone: any;

  callDisconnects: any;

  componentWillUnmount() {
    clearInterval(JsXAPI.eventInterval);
    this.audio();
    this.microphone();
    JsXAPI.xapi.removeAllListeners();
  }

  componentDidMount() {
    if(JsXAPI.xapi.eventNames().indexOf('updates') === -1) {
      JsXAPI.xapi.on('update', this.eventHandler);
    }
    JsXAPI.eventInterval = setInterval(JsXAPI.poller, 1000);
  }

  componentWillMount() {
    const { callId, meeting, caller } = this.props;
    Promise.all([
      JsXAPI.getAudio(),
      JsXAPI.getMicStatus()
    ]).then((results) => {
      this.setState({
        volume: results[0], mic: results[1]
      });
      this.registerEvents();
    });
  }

  registerEvents = () => {
    const { callId } = this.props;
    this.callDisconnects = JsXAPI.xapi.feedback.on('/Status/Call', (data: any) => {
      if(data.id && data.ghost === 'True') {
        if(data.id === callId) {
          this.props.switch({ mainView: true });
          this.callDisconnects();
        }
      }
    });
    this.audio = JsXAPI.xapi.feedback.on('/Status/Audio Volume', volume =>
      this.setState({ volume }));
    this.microphone = JsXAPI.xapi.feedback.on(
      '/Status/Audio Microphones Mute', mic => this.setState({ mic })
    ); 
  }

  registerCall = () => {
    const { callId } = this.props;
    this.callDisconnects = JsXAPI.xapi.feedback.on('/Status/Call', (data: any) => {
      if(data.id && data.ghost === 'True') {
        if(data.id === callId) {
          this.props.switch({ mainView: true });
          this.callDisconnects();
        }
      }
    });
  }

  registerAudio = () => {
    this.audio = JsXAPI.xapi.feedback.on('/Status/Audio Volume', volume =>
      this.setState({ volume }))
  };

  registerMic = () => {
    this.microphone = JsXAPI.xapi.feedback.on(
      '/Status/Audio Microphones Mute', mic => this.setState({ mic })
    );
  };

  initEvents = () => {
    JsXAPI.xapi.on('update', this.eventHandler);
    this.registerEvents();
  }

  eventHandler = (updates) => {
    if(updates === 'closing') return setTimeout(this.initEvents, 250);
    let { volume, mic } = this.state;
    let update:any = {};
    if(volume !== updates[1]) update['volume'] = updates[1];
    if(mic !== updates[3]) update['mic'] = updates[3];
    if(update.volume || update.mic) {
      this.setState(update);
    }
  }

  hangup = callId => {
    return JsXAPI.hangUp(callId).then(() => {
      return JsXAPI.closeConnection();
    }).then(() => {
      this.props.switch({
        mainView: true
      });
    });
  }

  render() {
    let { meeting, caller, callId } = this.props;
    let { volume, mic } = this.state;
    let avatar: any, title: string;
    if(meeting) {
      let temp = meeting.endpoint.number;
      temp = temp.replace(/@.*/, '');
      avatar = <div style={{ fontSize: '40%' }}>{ temp }</div>;
    } else {
      avatar = <div style={{ fontSize: '40%' }}>{ caller }</div>;
    }
    return (
      <div>
        <p style={{ font: '14px arial', color: 'grey' }}>{this.props.account.name}></p>
        <Paper style={styles.main}>
          <Avatar style={styles.inner} backgroundColor='grey' size={85}>
            { avatar }
          </Avatar>
          <Subheader style={{textAlign: 'center'}}>
            <div style={{fontSize: 18}}> { title } </div>
          </Subheader>
          <div style={styles.div2}>
            <Badge badgeContent={<DecreaseIcon color='white' style={styles.plusminusIcon} />}
              primary={true}
              badgeStyle={styles.badge2}>
              <IconButton onClick={() =>
                JsXAPI.setAudio('Decrease')
              }> <VolumeDown /> </IconButton>
            </Badge>
            <strong>Volume: {volume}</strong>
            <Badge badgeContent={<AddIcon color='white' style={styles.plusminusIcon} />}
              primary={true}
              badgeStyle={styles.badge2}>
              <IconButton onClick={() =>
                JsXAPI.setAudio('Increase')
              } > <VolumeUp /> </IconButton>
            </Badge>
            <IconButton style={{ marginLeft: 10, marginBottom: 10 }}
              onClick={() => {
                let action = mic === 'On' ? 'Unmute' : 'Mute';
                JsXAPI.setMic(action);
              }} >
              {
                mic === 'Off' ?
                  <MicOnIcon /> :
                  <MicOffIcon />
              }
            </IconButton>
            <strong>Microphones</strong>
          </div>
        </Paper>
        <div style={{ marginTop: '35px' }}>
          <FloatingActionButton style={{ marginLeft: '250px' }} backgroundColor='black' >
            <AddIcon />
          </FloatingActionButton>
          <FloatingActionButton style={styles.icon} backgroundColor='black' >
            <ShareIcon className='share' />
          </FloatingActionButton>
          <FloatingActionButton style={styles.icon} backgroundColor='black' >
            <PauseIcon />
          </FloatingActionButton>
          <FloatingActionButton style={styles.icon} backgroundColor='black' >
            <TransferIcon />
          </FloatingActionButton>
          <FloatingActionButton style={styles.icon}
            onClick={() => {
              this.hangup(callId);
            }}
            backgroundColor='red' >
            <CallEndIcon />
          </FloatingActionButton>
        </div>
      </div>
    )
  }
}