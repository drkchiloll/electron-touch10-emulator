import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as jwt from 'jsonwebtoken';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import * as Promise from 'bluebird';

const sparkGuestId = 'Y2lzY29zcGFyazovL3VzL09SR0FOSVpBVElPTi9mYTM5NDJjYy1mY2FmLTQwMjktYmRjMy02NmFkY2EwNDU4NGI',
  sparkGuestSecret = 'Wg6OF8NJTYQfxb5zUReJ0mGJe4+iuNMBMPAArXRJo5Y=';

export type SparkGuestConstructor = {
  userid: string;
  username: string;
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
    this.uId = userid;
    this.uName = username;
    this.expires = Math.round(Date.now() / 1000) + expires;
    this.request = axios.create({
      baseURL: 'https://api.ciscospark.com/v1',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
    if(!localStorage.getItem('sparkguest')) {
      const sparkguest = { user: username, id: userid };
      localStorage.setItem('sparkguest', JSON.stringify(sparkguest));
    }
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

  retreiveAccessToken() {
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

  createTokens() {
    return this.generateGuestToken()
      .then(() => this.retreiveAccessToken());
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

  deleteRoom({roomId, token}) {
    this.request.defaults.headers['Authorization'] =
      `Bearer ${token}`;
    return this.request.delete(`/rooms/${roomId}`);
  }

  setupRoom(codec: any) {
    let emulatorDetails: any = JSON.parse(JSON.stringify(codec));
    let roomId: string;
    return this.request.post('/rooms', {
      title: codec.name.toUpperCase()
    })
    .then((resp) => ({ id: resp.data.id }))
    .then(({id}) => {
      roomId = id;
      let members = [codec.email, 'samuel.womack@wwt.com'];
      return Promise.all([
        this.request.get(`/rooms/${roomId}`)
          .then(({data: {sipAddress}}) => Object.assign(
            emulatorDetails, { room: { id: roomId, sipAddress }})),
        Promise.each(members, (member) => {
          return this.request.post('/memberships', {
            roomId, personEmail: member
          })
        })
      ])
    }).then(() => emulatorDetails);
  }

  obtpSparkRoom(token, title, emailList) {
    this.request.defaults.headers = {
      Authorization: `Bearer ${token}`
    };
    let roomId: string, sipAddress: string;
    return this.request.post('/rooms', {title})
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
/**
 * roomId: Y2lzY29zcGFyazovL3VzL1JPT00vZDdkMWVkNTAtNDQwMy0xMWU4LWIxNTAtZGRhM2U4ODA3OGQw
 * title: ROOMKIT
eyJhbGciOiJSUzI1NiJ9.eyJtYWNoaW5lX3R5cGUiOiJhcHB1c2VyIiwicHJpdmF0ZSI6ImV5SmpkSGtpT2lKS1YxUWlMQ0psYm1NaU9pSkJNVEk0UTBKRExVaFRNalUySWl3aVlXeG5Jam9pWkdseUluMC4uZ2o4RkZ6a1JfbldNeG9jdTV1NUhhQS5rYXJueWJBNEl1NTdXUUxWZXZZV0JZdE1WbGR4VmxCTk5TczdWdWhoSG1FQ1FURW0yLXhsN3NRUDNPRUZ5RDluSjNteVpZZk1YWlR5ZUdxSFhfM3RqckxtN3FTT1RNWndDZ05lN0t6UGFOQjJYN05vNzhUYnpKSTFYM25fRVJpWF92R2poenJtRnZPMTBLcENVSmN1QkdySXI3M0xUT3lmWFprWkZOOWloYTRPQ2hXOUJMaG5nTVF6RVp0Vmx2UnVhWTdkekc4Q0hpWEN3ZnRNVno0VldpWU15dnphM2hXWmxvcnZEbzF5Z21ZSTlNMFhJTF9GU3dyOW5BemhHcjJ0M1RRWk15WDd5S0xFeHptLVdwSXJGaWdTV2JDRzF5eXFQWG5LTGtCdTh0ZXN0ZDJwMFlRUGZQWjdockU3dGdlSTBna0xrMWFMQ1V2UUlqT0o4dzhBTlZIdFFOZklHRjJMRFBrSUduQ1E4Ynl5WTdPc0FiNlNzY3U1a09FOTYzeUxsZW1GSjRMM3owMG9CUXJlUTJPODk2d0lLMDFCYXFfcE9vVGVTeWw1UHVteHZ3d0xnU1V1eDFhT3R3SGgwb01MRTVoX0p0ODNmei1md2FLNnFXaHZOMWREcm5kYjRlVDV2QnJEZTB2QkNRZmJaRThqeHBYQVE2d3Utd2JRcHI2N0dSd3RUUk5GWlc4VjJfNWtkdEx0WUk3VnFGaTlIRTNFNzhkdV9ULW9XaUxXS2JuV1luSnBLN2xidEJDU2xLZVdYQUtSb1RScVliN3llYUtnWjY5RXVkN0RLenhtRXBnQzRHcHhPSnRXY2J3LkZlODR5bmFOWmw3bGtPUUJNOGRlS2ciLCJ1c2VyX3R5cGUiOiJtYWNoaW5lIiwidG9rZW5faWQiOiJBYVozcjBPRGhqWXpKak1EQXROMkl4TXkwME9ERmxMV0UzTmprdFlqUXdPV1l4WkdGaFlUQTBPREUyWWpRek1EWXROMll3IiwicmVmZXJlbmNlX2lkIjoiYWY3MWJjOGItY2RmNS00NDE4LWE3ZDAtNWQ2MWFkNWZhOTA1IiwiaXNzIjoiaHR0cHM6XC9cL2lkYnJva2VyLndlYmV4LmNvbVwvaWRiIiwidXNlcl9tb2RpZnlfdGltZXN0YW1wIjoiMjAxODA0MTkxODU5NDkuMzY0WiIsInJlYWxtIjoiZmEzOTQyY2MtZmNhZi00MDI5LWJkYzMtNjZhZGNhMDQ1ODRiIiwiY2lzX3V1aWQiOiIzY2UxZDEzMy00ZmMzLTQyODctOTk3Zi05OWVmYWY5ZmQxNTciLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiZXhwaXJ5X3RpbWUiOjE1MjQxODU5OTE5NzIsImNsaWVudF9pZCI6IkMzMTE3NzIzYTBhNGM5ODVhOGJkNmRkYTc2Zjc3NjZjNTEzMjRiNmY0MWJmNGZlZjFjMmM4Mjc4NGExZjI5NzVjIn0.U3nZ7MrdJByM-BaJTbwnC0uIufUQf-6uewvnHpyoVAfrLvKSzn9wKKz9Wx2avadyID3_EcVkKYACgqcQR705TGQrT0GjaB1JNcAp9pIlUckRn2jsmgj_trrHQo8xqkAY2XTyK9V_-DSiMrodQe2xaEXCD1GH9gGNOJTt-FzmsuylF183MtGRftLBnzsZ2XRc4Z_uFaH1QpplGKY9p_HObkpwjynz0Fh-vyZ6Z3vxq5S9vgfMv5CXH8i-hWnK8JqOYlRC98bkBN4ZtMJTsOa6RV5OlWzJjS29j3nwA2TOjgogNBo75u-mWHXtDYRIy6p9cb8q-kIgJZgdNiFlGtVP0A
 * Y2lzY29zcGFyazovL3VzL1JPT00vMDkwYTg2MTAtNDQwNS0xMWU4LThiNjQtZTcwMTlkYmZkMjgw
 */