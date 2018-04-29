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
    moving: false,
    position: null
  };

  componentDidMount() {
    const manager = nipplejs.create({
      ...joyOptions,
      zone: document.querySelector('.joystick')
    });
    this.managerListener(manager);
  }

  managerListener = (manager) => {
    manager.on('move', (e, stick) => {
      const { moving, position } = this.state;
      let { direction } = stick;
      let pos: string;
      if(direction) {
        // let pan = direction.x === 'left' ? 'Left' : 'Right';
        // let tilt = direction.y === 'up' ? 'Up' : 'Down';
        pos = direction.angle;
        let params: any = {
          CameraId: 1,
          PanSpeed: 8,
          TiltSpeed: 8
        };
        if(moving) {
          if(position !== pos) {
            JsXAPI.commander({
              cmd: 'Camera Ramp',
              params: {
                CameraId: 1,
                Pan: 'Stop',
                Tilt: 'Stop'
              }
            })
          } else {
            return;
          }
        }
        switch(pos) {
          case 'up':
            params['Tilt'] = 'Up';
            break;
          case 'down':
            params['Tilt'] = 'Down';
            break;
          case 'left':
            params['Pan'] = 'Left';
            break;
          case 'right':
            params['Pan'] = 'Right';
        }
        JsXAPI.commander({
          cmd: 'Camera Ramp',
          params
        });
      }
      this.setState({ moving: true, position: pos });
    });

    manager.on('end', () => {
      console.log('end');
      JsXAPI.commander({
        cmd: 'Camera Ramp',
        params: {
          CameraId: 1,
          Pan: 'Stop',
          Tilt: 'Stop'
        }
      }).then(() => this.setState({ moving: false, position: null }));
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