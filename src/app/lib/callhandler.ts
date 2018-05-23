import { Promise } from 'bluebird';

export interface Call {
  id?: string;
  callback?: string;
  display?: string;
  status?: string;
  disconnect: boolean;
  callError?: boolean;
  answered: boolean;
}

export class CallHandler {
  public static incomingCall: Call;
  public static outgoingCall: Call;

  static setCallValues(call) {
    return {
      id: call.id,
      callback: call.CallbackNumber,
      display: call.DisplayName,
      status: call.Status,
      disconnect: false,
      callError: false,
      answered: false
    }
  };

  static outgoing(call) {
    let values: any = {};
    if(call.DisplayName) values['display'] = call.DisplayName;
    if(call.CallbackNumber) values['callback'] = call.CallbackNumber;
    if(call.AnswerState === 'Answered')
      values['answered'] = true;
    if(call.ghost === 'True') values['disconnect'] = true;
    return values;
  }

  static incoming(call) {
    let values: any = {};
    if(call.AnswerState === 'Answered') values['answered'] = true;
    if(call.ghost === 'True') values['disconnect'] = true;
    return values;
  }
  
  static read(call) {
    if(call && call.id) {
      if(call.Direction === 'Incoming') {
        this.incomingCall = this.setCallValues(call);
      } else if(call.Direction === 'Outgoing') {
        this.outgoingCall = this.setCallValues(call);
      } else if(this.outgoingCall && this.outgoingCall.id === call.id) {
        this.outgoingCall = Object.assign(this.outgoingCall, this.outgoing(call));
      } else if(this.incomingCall && this.incomingCall.id === call.id) {
        this.incomingCall = Object.assign(this.incomingCall, this.incoming(call));
      }
    }
    return {incomingCall: this.incomingCall, outgoingCall: this.outgoingCall};
  }

  static parsestats(stat, source): any {
    const bytesToSize = bytes => {
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      if(bytes === 0) return '0';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      if(i === 0) return `${bytes} ${sizes[i]}`;
      return `${(bytes / (1024 ** i)).toFixed(1)} ${sizes[i]}`;
    };
    return {
      encrypted: stat.encryption === 'off' ? false : true,
      codec: stat[source].protocol,
      stats: stat.netstat ? {
        transferred: stat.netstat.bytes === '0' ? bytesToSize(0) :
          bytesToSize(parseInt(stat.netstat.bytes, 10)),
        loss: stat.netstat.loss,
        jitter: parseInt(stat.netstat.jitter, 10),
        maxJitter: parseInt(stat.netstat.maxjitter, 10),
        packets: stat.netstat.packets
      } : {
        transferred: 0,
        loss: 0,
        jitter: 0,
        maxJitter: 0,
        packets: 0
      }
    };
  };

  static stats(m) {
    if(!m) return null;
    let m1 = JSON.stringify(m).toLowerCase(),
      media = JSON.parse(m1);
    const channels = media.channel;
    if(!channels) return null;
    let outAudio = channels.find(({type,direction}) =>
        type==='audio' && direction==='outgoing'),
      outVideo = channels.find(({type,direction, video}) =>
        type==='video' && direction==='outgoing' && video.channelrole === 'main');
    let outa = this.parsestats(outAudio, 'audio'),
      outv = this.parsestats(outVideo, 'video');
    return Promise.resolve({outAudio: outa, outVideo: outv});
  };
}