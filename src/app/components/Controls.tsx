import * as React from 'react';
import VolumeUp from 'material-ui/svg-icons/av/volume-up';
import VolumeDown from 'material-ui/svg-icons/av/volume-down';
import VolumeOff from 'material-ui/svg-icons/av/volume-off';
import DecreaseIcon from 'material-ui/svg-icons/content/remove'
import AwakeIcon from 'material-ui/svg-icons/action/visibility';
import StandbyIcon from 'material-ui/svg-icons/action/visibility-off';
import MicOnIcon from 'material-ui/svg-icons/av/mic';
import MicOffIcon from 'material-ui/svg-icons/av/mic-off';
import VidCam from 'material-ui/svg-icons/image/switch-video';
import Slider from 'material-ui-slider-label/Slider';
import MeetingIcon from 'material-ui/svg-icons/action/event';
import { IconButton, FontIcon, Paper } from 'material-ui';
import { JsXAPI, Time, MeetingHelper } from '../lib';
import { OBTPMeeting } from './OBTPMeeting/index'

export class Controls extends React.Component<any, any> {
  constructor(props) {
    super(props);
    this.state = {
      volumeDirection: 'up',
      showVolume: false,
      openMeeting: false,
      popEl: null
    };
  }
  render() {
    let {
      volume, meetings, status,
      mic, directoryDialog, token
    } = this.props;
    let { volumeDirection, showVolume } = this.state;
    return (
      <div>
        <IconButton
          onClick={(e) => {
            e.preventDefault();
            this.setState({
              popEl: e.currentTarget,
              openMeeting: true
            })
          }}
          style={Object.assign(
            JSON.parse(JSON.stringify(this.styles.icnbtn)), { right: 160 }
          )}>
          <FontIcon><MeetingIcon style={this.styles.icons} /></FontIcon>
        </IconButton>
        <IconButton
          onClick={() => this.props.spark()}
          disabled={!token}
          style={Object.assign(
            JSON.parse(JSON.stringify(this.styles.icnbtn)), { right: 120 }
          )}>
          <FontIcon><VidCam style={this.styles.icons} /></FontIcon>
        </IconButton>
        <IconButton style={Object.assign(
            JSON.parse(JSON.stringify(this.styles.icnbtn)), {right: 80}
          )} >
          <FontIcon style={{padding: 0, margin: 0}}
            onMouseEnter={() => this.setState({ showVolume: true })}>
            {volume == '0' ? <VolumeOff style={this.styles.icons} /> :
              volumeDirection === 'up' ?
                <VolumeUp style={this.styles.icons} /> :
                <VolumeDown style={this.styles.icons} />}
          </FontIcon>
        </IconButton>
        <IconButton style={Object.assign(
            JSON.parse(JSON.stringify(this.styles.icnbtn)), { right: 45 }
          )}
          onClick={() => {
            let action = mic === 'On' ? 'Unmute' : 'Mute';
            JsXAPI.setMic(action);
          }} >
          <FontIcon>
            {mic === 'Off' ? <MicOnIcon style={this.styles.icons} /> :
              <MicOffIcon style={this.styles.icons} />}
          </FontIcon>
        </IconButton>
        <IconButton style={Object.assign(
            JSON.parse(JSON.stringify(this.styles.icnbtn)), { right: 5 }
          )}
          tooltip={status}
          tooltipPosition='bottom-center'
          tooltipStyles={{ top: 15 }}
          onClick={() => {
            let action: string;
            if(status === 'Standby') {
              action = 'Deactivate';
            } else {
              action = 'Activate';
            }
            JsXAPI.updateWakeStatus(action);
          }}>
          <FontIcon>
            {status === 'Standby' ?
              <StandbyIcon style={this.styles.icons} /> :
              <AwakeIcon style={this.styles.icons} />}
          </FontIcon>
        </IconButton>
        <OBTPMeeting
          open={this.state.openMeeting}
          close={() => this.setState({ openMeeting: false })}
          token={token} />
        <Paper zDepth={0}
          onMouseLeave={() => this.setState({ showVolume: false })}
          width={260}
          style={{
            position: 'absolute',
            zIndex: 1,
            top: 45,
            height: 110,
            right: showVolume ? 0 : -1000
          }} >
          <Slider min={0} max={100} step={1}
            style={{ position: 'absolute', width: 150, top: -12, right: 18, height: 40 }}
            value={parseInt(volume, 10)}
            onChange={(e, vol) => JsXAPI.setAudio(vol)}
            label={(() => {
              const Volume = () =>
                <div
                  style={{
                    marginTop: 5,
                    marginLeft: 5,
                    fontSize: 11,
                    color: 'white'
                  }} >{volume}</div>
              return <Volume />;
            })()} />
        </Paper>
      </div>
    );
  }
  styles: any = {
    icnbtn: {
      position: 'absolute', top: 2, margin: 0, padding: 0
    },
    icons: { color: 'black' },
  }
}