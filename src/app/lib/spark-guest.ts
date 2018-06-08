import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as jwt from 'jsonwebtoken';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { Promise } from 'bluebird';
import { Time } from './index';
import * as CiscoSpark from 'ciscospark';

const sparkGuestId =
  'Y2lzY29zcGFyazovL3VzL09SR0FOSVpBVElPTi9mYTM5NDJjYy1mY2FmLTQwMjktYmRjMy02NmFkY2EwNDU4NGI',
  sparkGuestSecret = 'Wg6OF8NJTYQfxb5zUReJ0mGJe4+iuNMBMPAArXRJo5Y=';

const webexTeam: any = {
  'id': 'Y2lzY29zcGFyazovL3VzL1RFQU0vYjk1N2I4ODAtNmE0ZC0xMWU4LTk4N2QtYjdhOGI0NjEzNmIx',
  'name': 'CE Emulator',
  'creatorId': 'Y2lzY29zcGFyazovL3VzL1BFT1BMRS8wNjYyMGQwZC02NTg1LTQ5ZTAtOTJlZC00MDMxZDI2ODNhMzI',
  'created': '2018-06-07T12:24:28.936Z'
}

export type SparkGuestConstructor = {
  userid?: string;
  username?: string;
  expires?: number;
};

export class SparkGuest {
  private issuer: string = sparkGuestId;
  private secret: string = sparkGuestSecret;
  private uId: string;
  private uName: string;
  private expires: number; // Miliseconds
  public request: AxiosInstance;
  public token: string;

  constructor({userid, username, expires = 90*60}: SparkGuestConstructor) {
    if(userid && username) {
      this.uId = userid;
      this.uName = username;
      this.expires = Math.round(Date.now() / 1000) + expires;
      if(!localStorage.getItem('sparkguest')) {
        const sparkguest = { user: username, id: userid };
        localStorage.setItem('sparkguest', JSON.stringify(sparkguest));
      }
    }
    this.request = axios.create({
      baseURL: 'https://api.ciscospark.com/v1',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  generateGuestToken() {
    return new Promise((resolve, reject) => {
      const payload = {
        sub: this.uId,
        name: this.uName,
        iss: this.issuer,
        exp: this.expires
      };
      const decoded = Buffer.from(this.secret, 'base64');
      jwt.sign(payload, decoded, {
        algorithm: 'HS256',
        noTimestamp: true
      }, (e: JsonWebTokenError, token) => {
        if(e) return reject(e);
        else {
          this.token = token;
          this.request.defaults.headers = {
            Authorization: `Bearer ${token}`
          };
          return resolve({ result: 'SUCCESS' });
        }
      });
    });
  }

  retreiveAccessToken(tokenReady?) {
    return this.request.post('/jwt/login')
      .then((resp: AxiosResponse) => {
        if(!resp.data || !resp.data.token) {
          return Promise.reject('failed to generate an access token: bad response');
        } else {
          this.request.defaults.headers = {
            Authorization: `Bearer ${resp.data.token}`
          };
          return resp.data;
        }
      });
  }

  getToken() {
    return new Promise(resolve => {
      if(!JSON.parse(localStorage.getItem('token'))) return resolve(false);
      const { token, expiration } = JSON.parse(localStorage.getItem('token'));
      if(!Time.isPast(new Date(expiration))) {
        return resolve(token);
      } else {
        return resolve(false);
      }
    });
  }

  getAuthUser() {
    const { user, id } = JSON.parse(localStorage.getItem('sparkguest'));
    if(!this.uName && !this.uId) {
      this.uName = user;
      this.uId = id;
    }
  }

  storeToken(token: any) {
    token['expiration'] = Time.tokenExpiration(token.expiresIn);
    localStorage.setItem('token', JSON.stringify(token));
  }

  createTokens() {
    return this.getToken().then((token) => {
      // console.log(token);
      if(token) return token;
      this.getAuthUser();
      return this.generateGuestToken()
        .then(() => this.retreiveAccessToken())
        .then(token => this.storeToken(token))
        .then(this.getToken);
    });
  }

  verifyToken() {
    return new Promise((resolve, reject) => {
      const decoded = jwt.decode(this.token, { complete: true });
      if(!decoded) {
        return reject({ result: 'the specified token does not comply with JWT format' });
      } else {
        return resolve({ result: 'SUCCESS' });
      }
    }).catch((e: jwt.JsonWebTokenError) => {
      return { result: 'failed to decode JWT token..' };
    })
  }

  getObtpMeeting(meetingNumber) {
    let obtpMeetings = JSON.parse(localStorage.getItem('meetings'));
    if(!obtpMeetings) return null;
    return obtpMeetings.find((m:any) => m.number == meetingNumber);
  }

  deleteObtpMeeting(id) {
    let obtpMeetings = JSON.parse(localStorage.getItem('meetings'));
    let meetingIdx = obtpMeetings.findIndex((m:any) => m.id === id);
    obtpMeetings.splice(meetingIdx, 1);
    localStorage.setItem('meetings', JSON.stringify(obtpMeetings));
    return Promise.resolve('done');
  }

  deleteRoom({roomId, token}) {
    this.request.defaults.headers['Authorization'] =
      `Bearer ${token}`;
    return this.request.delete(`/rooms/${roomId}`);
  }

  setupRoom(codec: any) {
    let emulatorDetails: any = JSON.parse(JSON.stringify(codec));
    let roomId: string;
    return this.getToken().then(token => {
      this.request.defaults.headers = {
        Authorization: `Bearer ${token}`
      };
      return this.request.post('/rooms', {
        title: codec.name.toUpperCase(),
        teamId: webexTeam.id
      })
        .then((resp) => ({ id: resp.data.id }))
        .then(({ id }) => {
          roomId = id;
          let members = [codec.email, 'samuel.womack@wwt.com'];
          return Promise.all([
            this.request.get(`/rooms/${roomId}`)
              .then(({ data: { sipAddress } }) => Object.assign(
                emulatorDetails, { room: { id: roomId, sipAddress } })),
            Promise.each(members, (member) => {
              return this.request.post('/memberships', {
                roomId, personEmail: member
              })
            })
          ])
        }).then(() => emulatorDetails);
    })
  }

  obtpSparkRoom(token, title, emailList) {
    this.request.defaults.headers = {
      Authorization: `Bearer ${token}`
    };
    let roomId: string, sipAddress: string;
    return this.request.post('/rooms', {
      title, teamId: webexTeam.id
    })
      .then(({ data: {id} }) => {
        roomId = id;
        return this.request.get(`/rooms/${roomId}`)})
      .then(({ data: {sipAddress}}) => {
        sipAddress = sipAddress;
        return Promise.each(emailList, personEmail => {
          return this.request.post('/memberships', {
            roomId, personEmail
          });
        }).then(() => ({sipAddress, roomId}));
      }).then((meetingDetails) => meetingDetails);
  }
}