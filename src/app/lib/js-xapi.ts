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

export interface Account {
  host: string;
  username: string;
  password: string;
  name: string;
  selected: boolean;
  room?: Object;
  metaData?: Object;
}

export class JsXAPI {
  public static xapi: any;
  public static event = new EventEmitter();
  public static account: Account;

  static connection(timeout, account?: Account) {
    if(!account) {
      account = {
        name: this.account.name,
        selected: false,
        host: this.account.host,
        username: this.account.username,
        password: this.account.password
      };
    }
    return new Promise((resolve, reject) => {
      let xapi = jsxapi.connect(`ssh://${account.host}`, {
        username: account.username,
        password: account.password,
        readyTimeout: timeout,
        keepaliveInterval: 6675
      });

      xapi.on('ready', () => {
        console.log('we are connected');
        resolve(xapi);
      });

      xapi.on('error', (err) => {
        console.log(err);
        return reject(err);
      });
    })
  }

  static specialconnect() {
    return this.connection(2500);
  }

  static connect() {
    return this.connection(9000).then((xapi) => {
      this.xapi = xapi;
      return 'success';
    }).catch(err => this.event.emit('connection-error'));
  };

  static commander({cmd, params}: any) {
    // cmd: string
    // params: Object
    return this.xapi.command(cmd, params)
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
      product: unit.ProductPlatform,
      softwareVersion: unit.Software.Version,
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
      Privacy: 'Public',
      Organizer: {
        FirstName: 'Samuel',
        LastName: 'Womack',
        Email: 'samuel.womack@wwt.com'
      },
      Time: {
        StartTime: Time.createIsoStr(start),
        StartTimeBuffer: '600',
        EndTime: Time.createIsoStr(end),
        EndTimeBuffer: '10'
      },
      MaximumMeetingExtension: '0',
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
            CallType: 'Video',
            id: '1'
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
      cmd: 'Bookings List',
      params: {}
    }).then((bookings:any) => {
      const { status, ResultInfo: { TotalRows } } = bookings;
      if(bookings && (parseInt(TotalRows, 10) >= 1)) {
        // console.log(bookings);
        return Promise.reduce(bookings.Booking, (a: any, meeting: Booking) => {
          if(!Time.isPast(meeting.Time.EndTime)) {
            const { DialInfo }: any = meeting;
            let number: string, type: string;
            if(DialInfo.ConnectMode === 'Manual') {
              number = '12345'
              type = 'manual';
            } else {
              number = DialInfo.Calls.Call[0].Number;
              type = DialInfo.Calls.Call[0].CallType;
            }
            a.push({
              id: meeting.Id,
              title: meeting.Title,
              startTime: meeting.Time.StartTime,
              endTime: meeting.Time.EndTime,
              endpoint: { number, type }
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
        cmd: 'Audio Volume Set',
        params: { Level: action }
      });
    } else {
      return this.commander({
        cmd: `Audio Volume ${action}`,
        params: { Steps: 1 }
      });
    }
  };

  // action: String; Mute | Unmute
  static setMic(action) {
    return this.commander({
      cmd: `Audio Microphones ${action}`,
      params: {}
    });
  }

  static closeConnection() {
    this.xapi.close();
    return Promise.resolve();
  };

  static dial(Number) {
    return this.commander({
      cmd: 'Dial',
      params: { Number }
    });
  };

  static hangUp(CallId) {
    return this.commander({
      cmd: 'Call Disconnect',
      params: { CallId }
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
      cmd: `Standby ${status}`,
      params: {}
    });
  };

  static getDirectory({query = ''}) {
    let contacts: any = [];

    const search = (start, end) => {
      return this.commander({
        cmd: 'Phonebook Search',
        params: {
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
      cmd: 'CallHistory Get',
      params: {
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