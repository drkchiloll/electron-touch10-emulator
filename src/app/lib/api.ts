import axios from 'axios';

export abstract class Api {

  private static _request(options: any) {
    return axios(options);
  }

  static getMeetings() {
    const options = {
      url: '/api/meetings',
      method: 'get'
    };
    return this._request(options);
  };

  static getAudio() {
    return this._request({
      url: '/api/volume',
      method: 'get'
    });
  };

  static setAudio(action) {
    const options = {
      url: '/api/volume',
      method: 'post',
      data: { action }
    };
    return this._request(options);
  };

  static closeConnection() {
    return this._request({
      url: '/api/close-connection',
      method: 'get'
    });
  };

  static dial(number) {
    return this._request({
      url: '/api/make-call',
      method: 'post',
      data: { number }
    });
  }
}