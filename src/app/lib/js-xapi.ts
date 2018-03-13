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
  public static account: {host, username, password, name, selected};

  static init() {
    return this.connect().then(() => {
      this.poller = () => Promise.all([
        this.getMeetings(),
        this.getAudio(),
        this.getState(),
        this.getMicStatus()
      ]).then(results => {
        this.xapi.emit('update', results);
      });
      return;
    });
  };

  static connect() {
    return new Promise((resolve, reject) => {
      this.xapi = jsxapi.connect(`ssh://${this.account.host}`, {
        username: this.account.username,
        password: this.account.password
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
          this.xapi.emit('update', 'closing');
          this.xapi.close();
          return this.connect();
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
    // console.log('getting meetings');
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
    // console.log('retrieve audio volume');
    if(this.xapi) {
      return this.xapi.status.get('Audio Volume');
    } else {
      return this.connect().then(() => this.getAudio());
    }
  };

  static getMicStatus() {
    if(this.xapi) {
      // Returns On/Off
      return this.xapi.status.get('Audio Microphones Mute');
    } else {
      return this.connect().then(() => this.getMicStatus());
    }
  }

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

  // action: String; Mute | Unmute
  static setMic(action) {
    if(this.xapi) {
      return this.commander({
        string: `Audio Microphones ${action}`,
        param: {}
      });
    } else {
      return this.connect().then(() => this.setMic(action));
    }
  }

  static closeConnection() {
    if(this.xapi) {
      this.xapi.close();
      this.xapi = null;
    }
    return Promise.resolve();
  };

  static dial(Number) {
    if(this.xapi) {
      return this.commander({
        string: 'Dial',
        param: { Number }
      });
    } else {
      return this.connect().then(() =>
        this.dial(Number));
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
  };

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
  };

  static getDirectory({query = ''}) {
    if(this.xapi) {
      return this.commander({
        string: 'Phonebook Search',
        param: {
          PhonebookId: 'default',
          PhonebookType: 'Corporate',
          SearchString: query,
          Limit: 65534
        }
      }).then(({ Contact }) => {
        if(!Contact) {
          return [];
        } else {
          return Promise.reduce(Contact, (a, u: any) => {
            if(u.Name === 'user') return a;
            let user: any = {
              id: u.id,
              name: u.Name
            };
            if(u.ContactMethod && u.ContactMethod.length > 0) {
              return Promise.map(u.ContactMethod, ({ Number }) => {
                return { number: Number };
              }).then(contacts => {
                user['contacts'] = contacts;
                a.push(user);
                return a;
              });
            } else {
              return a;
            }
          }, []);
        }
      });
    }
  };

  static getCallHistory({ query = '' }) {
    if(this.xapi) {
      return this.commander({
        string: 'CallHistory Get',
        param: {
          Filter: 'All',
          Limit: 65534,
          DetailLevel: 'Full',
          SearchString: query
        }
      }).then(({ Entry }) => {
        return Promise.map(Entry, (history: any) => {
          return {
            number: history.CallbackNumber,
            startTime: history.StartTime,
            duration: parseInt(history.Duration, 10) / 60,
            roomCount: history.RoomAnalytics.PeopleCount,
            callQuality: {
              audio: {
                incoming: {
                  maxJitter: history.Audio.Incoming.MaxJitter,
                  packetLoss: history.Audio.Incoming.PacketLoss,
                  packetLossPercent: history.Audio.Incoming.PacketLossPercentage
                },
                outgoing: {
                  maxJitter: history.Audio.Outgoing.MaxJitter,
                  packetLoss: history.Audio.Outgoing.PacketLoss,
                  packetLossPercent: history.Audio.Outgoing.PacketLossPercentage
                }
              },
              video: {
                incoming: {
                  maxJitter: history.Video.Incoming.MaxJitter,
                  packetLoss: history.Video.Incoming.PacketLoss,
                  packetLossPercent: history.Video.Incoming.PacketLossPercentage
                },
                outgoing: {
                  maxJitter: history.Video.Outgoing.MaxJitter,
                  packetLoss: history.Video.Outgoing.PacketLoss,
                  packetLossPercent: history.Video.Outgoing.PacketLossPercentage
                }
              }
            }
          };
        });
      });
    }
  };
}