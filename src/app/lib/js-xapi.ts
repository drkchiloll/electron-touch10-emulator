import axios from 'axios';
import * as Promise from 'bluebird';
import * as jsxapi from 'jsxapi';
import { EventEmitter } from 'events';
import { Time } from './index';

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
  private static reconnectTimeout: any;

  static init() {
    return this.connect().then(() => {
      this.poller = () => Promise.all([
        this.getMeetings()
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
        password: this.account.password,
        readyTimeout: 5000,
        keepaliveInterval: 6670
      });

      this.xapi.on('ready', () => {
        console.log('we are connected');
        resolve('success');
        this.reconnectTimeout = setTimeout(() => {
          console.log('session timeout');
          this.xapi.emit('update', 'closing');
          this.xapi.close();
          return this.connect();
        }, 600000);
      });

      this.xapi.on('error', (err) => {
        console.log(err);
        clearTimeout(this.reconnectTimeout);
        clearInterval(this.eventInterval);
        this.event.emit('connection-error');
        return reject(err);
      });
    });
  };

  static commander(cmd:any) {
    // cmd.string = 'the xCommand'
    // cmd.param = Parameters {} of the Command
    return this.xapi.command(cmd.string, cmd.param).catch((e) => {
      console.log(e);
      // this.event.emit('connection-error');
    });
  };

  static getStatus(status: string) {
    return this.xapi
      .status
      .get(status)
      .catch(() => this.event.emit('connection-error'));
  }

  static getMeetings() {
    // console.log('getting meetings');
    return this.commander({
      string: 'Bookings List',
      param: {}
    }).then((bookings:any) => {
      const { status, ResultInfo: { TotalRows } } = bookings;
      if(bookings && (parseInt(TotalRows, 10) >= 1)) {
        return Promise.reduce(bookings.Booking, (a: any, meeting: Booking) => {
          if(!Time.meetingEnded(meeting.Time.EndTime)) {
            a.push({
              id: meeting.Id,
              title: meeting.Title,
              startTime: meeting.Time.StartTime,
              endTime: meeting.Time.EndTime,
              endpoint: {
                number: meeting.DialInfo.Calls.Call[0].Number,
                type: meeting.DialInfo.Calls.Call[0].CallType
              }
            });
            return a;
          } else {
            return a;
          }
        }, []);
      } else {
        return [];
      }
    })
  };

  static getAudio() {
    return this.getStatus('Audio Volume');
  };

  static getMicStatus() {
    return this.getStatus('Audio Microphones Mute');
  }

  static getState() {
    return this.getStatus('Standby State');
  };

  static setAudio(action) {
    return this.commander({
      string: `Audio Volume ${action}`,
      param: { Steps: 1 }
    });
  };

  // action: String; Mute | Unmute
  static setMic(action) {
    return this.commander({
      string: `Audio Microphones ${action}`,
      param: {}
    });
  }

  static closeConnection() {
    this.xapi.close();
    return Promise.resolve();
  };

  static dial(Number) {
    return this.commander({
      string: 'Dial',
      param: { Number }
    });
  };

  static hangUp(CallId) {
    return this.commander({
      string: 'Call Disconnect',
      param: { CallId }
    });
  };

  static wakeStatus() {
    return this.getStatus('Standby State');
  };

  static updateWakeStatus(status: string) {
    // Acceptable status':
    // Activate: (sets the display to Standby)
    // Deactivate: (turns the display on)
    // Halfwake: (Shows message on display to "Touch to Wake")
    return this.commander({
      string: `Standby ${status}`,
      param: {}
    });
  };

  static getDirectory({query = ''}) {
    let contacts: any = [];

    const search = (start, end) => {
      return this.commander({
        string: 'Phonebook Search',
        param: {
          PhonebookId: 'default',
          PhonebookType: 'Corporate',
          SearchString: query,
          Offset: start,
          Limit: end
        }
      }).then(({ Contact }) => {
        if(!Contact) return contacts;
        else if(Contact.length === end) {
          contacts = contacts.concat(Contact);
          return search(start+63, end);
        } else {
          contacts = contacts.concat(Contact);
          return contacts;
        }
      })
    };
    return search(0,63).then((contacts) => {
      if(contacts.length === 0) {
        return [];
      } else {
        return Promise.reduce(contacts, (a, u: any) => {
          if(u.Name === 'user') return a;
          let user: any = {
            id: u.id,
            name: u.Name
          };
          if(u.ContactMethod && u.ContactMethod.length > 0) {
            return Promise.map(u.ContactMethod, ({ Number }) => {
              return { number: Number };
            }).then(listings => {
              user['contacts'] = listings;
              a.push(user);
              return a;
            });
          } else {
            return a;
          }
        }, []);
      }
    });
  };

  static getCallHistory({ query = '' }) {
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
  };
}