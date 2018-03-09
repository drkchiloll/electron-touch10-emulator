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
    this.state = {
      callId: null,
      meeting: null,
      volume: 0,
      caller: null
    };
  }

  componentWillMount() {
    const { callId, meeting, caller } = this.props;
    JsXAPI.getAudio().then((volume) => {
      this.setState({ callId, meeting, volume, caller });
    });
  }

  hangup = callId => {
    return JsXAPI.hangUp(callId).then(() => {
      return JsXAPI.closeConnection();
    }).then(() => {
      this.props.switch({
        mainView: true
      });
    })
  }

  render() {
    let { meeting, volume, caller } = this.state;
    // console.log(meeting);
    let temp: any, avatar: any, title: string;
    if(meeting) {
      temp = meeting.Booking.Title.split(' ');
      if(temp.length === 2) {
        avatar = temp[0].substring(0, 1).toUpperCase() +
          temp[1].substring(0, 1).toUpperCase();
      } else {
        avatar = temp[0].substring(0, 2).toUpperCase();
      }
      title = meeting.Booking.Title;
    } else {
      avatar = <div style={{fontSize: '30%'}}>{ caller }</div>;
    }
    return (
      <div>
        <Paper style={styles.main}>
          <Avatar style={styles.inner} backgroundColor='grey' size={85}>
            { avatar }
          </Avatar>
          <Subheader style={{textAlign: 'center'}}>
            <div style={{fontSize: 18}}> { title } </div>
          </Subheader>
          <div style={styles.div2}>
            <Paper style={styles.paper} rounded={false} >
              <h5 style={styles.heading}> Controls </h5>
              <Divider style={{ border: '.7px solid black', backgroundColor: 'black' }} />
              <Badge badgeContent={<DecreaseIcon color='white' style={styles.plusminusIcon} />}
                primary={true}
                badgeStyle={styles.badge2}>
                <IconButton onClick={() =>
                  JsXAPI.setAudio('Decrease').then(() =>
                    this.setState({ volume: --volume }))
                }> <VolumeDown /> </IconButton>
              </Badge>
              Volume: {volume}
              <Badge badgeContent={<AddIcon color='white' style={styles.plusminusIcon} />}
                primary={true}
                badgeStyle={styles.badge2}>
                <IconButton onClick={() =>
                  JsXAPI.setAudio('Increase').then(() =>
                    this.setState({ volume: ++volume }))
                } > <VolumeUp /> </IconButton>
              </Badge>
              <Divider style={{ border: '.7px solid black', backgroundColor: 'black' }} />
              <div style={styles.divider}></div>
            </Paper>
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
              this.hangup(this.state.callId);
            }}
            backgroundColor='red' >
            <CallEndIcon />
          </FloatingActionButton>
        </div>
      </div>
    )
  }
}