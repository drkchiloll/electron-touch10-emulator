// import { EventEmitter } from 'events';
declare module NodeJS {
  interface Global {
    emitter: any;
  }
}

global.emitter = null;