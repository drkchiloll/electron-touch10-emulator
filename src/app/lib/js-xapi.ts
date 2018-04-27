process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import axios from 'axios';
import * as Promise from 'bluebird';
import * as jsxapi from 'jsxapi';
import { EventEmitter } from 'events';
import { Time } from './index';
import * as X2JS  from 'easyxml';
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
  public static account: {host, username, password, name, selected, room?};
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
        readyTimeout: 9000,
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
  };

  static parseNetwork(nets) {
    return Promise.map(nets, (net: any) => {
      console.log(net);
      let netprops = {
        network: {
          address: net.IPv4.Address,
          gateway: net.IPv4.Gateway,
          mask: net.IPv4.SubnetMask
        },
        vlan: {
          voice: net.VLAN.Voice.VlanId
        },
        macAddress: net.Ethernet.MacAddress,
        speed: net.Ethernet.Speed,
        connectedSwitch: (() => {
          return Object.keys(net.CDP).reduce((o: any, key: string) => {
            let prop = key.substring(0, 1).toLowerCase() + key.substring(1);
            o[prop] = net.CDP[key];
            return o;
          }, {})
        })(),
        dns: {
          domain: net.DNS.Domain,
          servers: (() => {
            return net.DNS.Server.reduce((a: any, server:any) => {
              if(server.Address) a.push({ address: server.Address });
              return a;
            }, []);
          })()
        }
      };
      return netprops;
    });
  };

  static parseUnit(unit) {
    return {
      sn: unit.Hardware.Module.SerialNumber,
      temp: unit.Hardware.Module.Temperature,
      product: unit.Hardware.ProductId,
      // softwareVersion: unit.Hardware.Software.Version,
      // We can get ActiveCalls, InProgress Calls, & Suspended Calls
    };
  };

  static parseSIP(sip) {
    let sipProps = {
      primary: {
        uri: sip.Registration[0].URI,
        registered: sip.Registration[0].Status === 'Registered' ? true : false
      }
    };
    if(sip.AlternateURI && sip.AlternateURI.Primary.URI) {
      sipProps['secondary'] = { uri: sip.AlternateURI.Primary.URI };
      sipProps['email'] = sip.AlternateURI.Primary.URI;
    } else {
      sipProps['email'] = sip.Registration[0].URI;
    }
    return sipProps;
  };

  static generateBooking({start,end,title,number,id,item}) {
    return {
      _item: item,
      Id: id,
      Title: title,
      Agenda: title,
      Privacy: 'Public',
      Organizer: {
        FirstName: 'Samuel',
        LastName: 'Womack',
        Email: 'samuel.womack@wwt.com'
      },
      Time: {
        StartTime: Time.createIsoStr(start),
        StartTimeBuffer: 300,
        EndTime: Time.createIsoStr(end),
        EndTimeBuffer: 0
      },
      MaximumMeetingExtension: 32,
      BookingStatus: 'OK',
      Webex: {
        Enabled: 'False',
      },
      Encryption: 'BestEffort',
      Role: 'Master',
      Recording: 'Disabled',
      DialInfo: {
        Calls: {
          Call: {
            _item: 1,
            Number: number,
            Protocol: 'SIP',
            CallRate: 6000,
            CallType: 'Video'
          }
        },
        ConnectMode: 'OBTP'
      }
    };
  };

  static js2xml(js) {
    let x = new X2JS({
      rootArray: 'Bookings',
      singularize: true,
      manifest: true,
    });
    return x.render(js);
  }

  static createBooking(booking) {
    const request = axios.create({
      baseURL: `https://${this.account.host}`,
      auth: { username: this.account.username, password: this.account.password },
      headers: { 'Content-Type': 'text/plain', 'Accept': 'text/plain' },
      adapter: require('axios/lib/adapters/http')
    });
    return request.post('/xmlapi/session/begin')
      .then(resp => {
        request.defaults.headers['Cookie'] = resp.headers['set-cookie'][0];
        return request.post(
          '/bookingsputxml',
          booking
        )})
      .then(resp => request.post('/xmlapi/session/end'));
  }

  static getUnit() {
    return Promise.all([
      this.getStatus('Network').then((nets) => this.parseNetwork(nets)),
      this.getStatus('SystemUnit').then((unit) => this.parseUnit(unit)),
      this.getStatus('UserInterface ContactInfo').then(({Name}) =>
        ({ name: Name || 'not defined' })),
      this.getStatus('SIP').then(sip => this.parseSIP(sip))
    ]).then(results => {
      console.log(results);
      let additionalProps: any = {
        networkConnections: results[0],
        hardware: results[1],
        name: results[2].name,
        email: results[3].email,
        sip: results[3]
      };
      return additionalProps;
    });
  };

  static getMeetings() {
    // console.log('getting meetings');
    return this.commander({
      string: 'Bookings List',
      param: {}
    }).then((bookings:any) => {
      const { status, ResultInfo: { TotalRows } } = bookings;
      // console.log(bookings);
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
    if(Number.isInteger(action)) {
      return this.commander({
        string: 'Audio Volume Set',
        param: { Level: action }
      });
    } else {
      return this.commander({
        string: `Audio Volume ${action}`,
        param: { Steps: 1 }
      });
    }
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