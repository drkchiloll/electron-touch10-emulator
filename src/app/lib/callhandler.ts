
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
}