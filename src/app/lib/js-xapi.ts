import axios from 'axios';
import * as Promise from 'bluebird';
import * as jsxapi from 'jsxapi';
import { EventEmitter } from 'events';

export interface Booking {
  Id: string;
  Title: string;
  Time: { StartTime, EndTime },
  DialInfo: { Calls: { Call: [{ Number, CallType }] } }
}

export class JsXAPI {
  public static xapi: any;
  public static event = new EventEmitter();
  public static poller: any;
  public static eventInterval: any;

  static init() {
    this.connect().then(() => {
      // this.event.on('connection-closing', () => {
      //   if(!this.xapi) return this.connect();
      // });
      this.poller = () => Promise.all([
        this.getMeetings(),
        this.getAudio(),
        this.getState()
      ]).then(results => this.event.emit('updates', results));

      this.eventInterval = setInterval(this.poller, 5000);
    });
  };


  static connect() {
    return new Promise((resolve, reject) => {
      this.xapi = jsxapi.connect('ssh://10.253.3.160', {
        username: 'admin',
        password: 'WWTwwt1!'
      });

      this.xapi.on('ready', () => {
        console.log('we are connected');
        return resolve('success');
      });

      this.xapi.on('error', (err) => {
        console.log(err);
        return reject(err);
      });

      setTimeout(() => {
        console.log('session timeout');
        if(this.xapi) {
          this.xapi.close();
          this.xapi = null;
        }
      }, 600000);
    });
  };

  private static commander(cmd:any) {
    // cmd.string = 'the xCommand'
    // cmd.param = Parameters {} of the Command
    return this.xapi.command(cmd.string, cmd.param);
  };

  static getMeetings() {
    console.log('getting meetings');
    if(this.xapi) {
      return this.commander({
        string: 'Bookings List',
        param: {}
      }).then((bookings:any) => {
        // console.log(bookings);
        const { status, ResultInfo: { TotalRows } } = bookings;
        if(bookings && (parseInt(TotalRows, 10) >= 1)) {
          return Promise.map(bookings.Booking, (meeting: Booking) => {
            return {
              id: meeting.Id,
              title: meeting.Title,
              startTime: meeting.Time.StartTime,
              endTime: meeting.Time.EndTime,
              endpoint: {
                number: meeting.DialInfo.Calls.Call[0].Number,
                type: meeting.DialInfo.Calls.Call[0].CallType
              }
            };
          })
        } else {
          return [];
        }
      })
    } else {
      return this.connect().then(() => this.getMeetings());
    }
  };

  static getAudio() {
    console.log('retrieve audio volume');
    if(this.xapi) {
      return this.xapi.status.get('Audio Volume');
    } else {
      return this.connect().then(() => this.getAudio());
    }
  };

  static getState() {
    // Standby, EnteringStandby, Halfwake, Off(not in standby)
    if(this.xapi) {
      return this.xapi.status.get('Standby State');
    } else {
      return this.connect().then(() => this.getState());
    }
  };

  static setAudio(action) {
    if(this.xapi) {
      return this.commander({
        string: `Audio Volume ${action}`,
        param: { Steps: 1 }
      })
    } else {
      return this.connect().then(() => this.setAudio(action));
    }
  };

  static closeConnection() {
    if(this.xapi) {
      this.xapi.close();
      this.xapi = null;
    }
    return Promise.resolve();
  };

  static dial(number) {
    if(this.xapi) {
      return this.commander({
        string: 'Dial',
        param: { Number: number }
      });
    } else {
      return this.connect().then(() =>
        this.dial(number));
    }
  };

  static hangUp(CallId) {
    if(this.xapi) {
      return this.commander({
        string: 'Call Disconnect',
        param: { CallId }
      });
    } else {
      return this.connect().then(() => this.hangUp(CallId));
    }
  };

  static wakeStatus() {
    if(this.xapi) {
      return this.xapi.status
        .get('Standby State');
    } else {
      return this.connect().then(() => this.wakeStatus());
    }
  }

  static updateWakeStatus(status: string) {
    // Acceptable status':
    // Activate: (sets the display to Standby)
    // Deactivate: (turns the display on)
    // Halfwake: (Shows message on display to "Touch to Wake")
    // ResetTimer
    if(this.xapi) {
      return this.commander({
        string: `Standby ${status}`,
        param: {}
      });
    } else {
      return this.connect().then(() => this.updateWakeStatus(status));
    }
  }
}