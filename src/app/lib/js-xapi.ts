import axios from 'axios';
import * as Promise from 'bluebird';
import * as jsxapi from 'jsxapi';

export interface Booking {
  Id: string;
  Title: string;
  Time: { StartTime, EndTime },
  DialInfo: { Calls: { Call: [{ Number, CallType }] } }
}

export abstract class JsXAPI {
  public static xapi: any;

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
      }, 15000);
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
        console.log(bookings);
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
  }

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
}