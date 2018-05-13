import * as React from 'react';
import * as nipplejs from 'nipplejs';
import createRef from 'createref';
import { JsXAPI } from '../lib'
const WebExTeams = require('../imgs/WebexTeams.jpg');

const joyOptions = {
  mode: 'static',
  position: { bottom: -20, left: 175 },
  size: 60
};

const containerStyle = {
  height: '35px',
  width: '55px',
  marginLeft: '20px'
};

export class JoyStick extends React.Component<any,any> {
  state = {
    position: null,
    cameraId: 1,
    moving: false
  };

  componentDidMount() {
    const manager = nipplejs.create({
      ...joyOptions,
      zone: document.querySelector('.joystick')
    });
    this.managerListener(manager);
  }

  componentWillReceiveProps(prop) {
    const { cameraId } = prop;
    const currentCam = this.state;
    if(cameraId && cameraId != currentCam) {
      this.setState({ cameraId: prop.cameraId })
    }
  }

  managerListener = (manager) => {
    manager.on('move', (e, stick) => {
      const angleChange = (angle) => {
        if(angle <= 20 && angle >= 0.001) return 0;
        if(angle <= 65 && angle >= 20.001) return 45;
        if(angle <= 110 && angle >= 65.001) return 90;
        if(angle <= 155 && angle >= 110.001) return 135;
        if(angle <= 200 && angle >= 155.001) return 180;
        if(angle <= 245 && angle >= 200.001) return 225;
        if(angle <= 290 && angle >= 245.001) return 270;
        if(angle <= 315 && angle >= 290.001) return 270; // 315
        if(angle <= 335 && angle >= 315.001) return 0; // 315
        if(angle <= 359.999 && angle >= 335.001) return 0;
      };
      const dir = (angle: number) => {
        const { cameraId } = this.state;
        let params: any = {
          CameraId: cameraId
        };
        if(angle === 0) {
          return Object.assign(params, { PanSpeed: 1, Pan: 'Right' });
        } else if(angle === 45) {
          return Object.assign(params, {
            PanSpeed: 1, TiltSpeed: 1, Pan: 'Right', Tilt: 'Up'
          });
        } else if(angle === 90) {
          return Object.assign(params, { TiltSpeed: 1, Tilt: 'Up' });
        } else if(angle === 135) {
          return Object.assign(params, {
            PanSpeed: 1, TiltSpeed: 1, Tilt: 'Up', Pan: 'Left'
          });
        } else if(angle === 180) {
          return Object.assign(params, { PanSpeed: 1, Pan: 'Left' });
        } else if(angle === 225) {
          return Object.assign(params, {
            PanSpeed: 1, TiltSpeed: 1, Tilt: 'Down', Pan: 'Left'
          });
        } else if(angle === 270) {
          return Object.assign(params, { TiltSpeed: 1, Tilt: 'Down' });
        }
      };
      let { position, moving } = this.state;
      let { angle } = stick;
      let deg = angle.degree,
        newpos = angleChange(deg),
        direction = dir(newpos);
      if(!position) position = newpos;
      if(position === newpos) {
        this.setState({ position: newpos });
        if(!moving) {
          JsXAPI.commander({ cmd: 'Camera Ramp', params: direction })
            .then(() => this.setState({ moving: true}));
        }
      } else {
        this.setState({ moving: false, position: newpos });
        JsXAPI.commander({
          cmd: 'Camera Ramp',
          params: {
            CameraId: this.state.cameraId,
            Pan: 'Stop',
            Tilt: 'Stop'
          }
        })
      }
    });

    manager.on('end', () => {
      JsXAPI.commander({
        cmd: 'Camera Ramp',
        params: {
          CameraId: this.state.cameraId,
          Pan: 'Stop',
          Tilt: 'Stop'
        }
      })
      this.setState({ moving: false });
    })
    const front: any = document.querySelector('.front');
    front.style.backgroundImage = `url(${WebExTeams})`;
    front.style.backgroundSize = '100%';
    front.style.opacity = 1;
    front.style.backgroundColor = null;
    front.style.width = '40px';
    front.style.height = '40px';
    front.style.marginLeft = '-20px';
  }

  render() {
    return (
      <div style={containerStyle} />
    )
  }
}