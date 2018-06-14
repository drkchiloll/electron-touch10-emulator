import {Promise} from 'bluebird';
import {SparkGuest, Accounts, JsXAPI, MeetingHelper} from './index';

export const api = (() => {
  const service: any = {
    jsxapi: JsXAPI,
    teamsGuest: new SparkGuest({
      userid: '1vfjjgg4bph9',
      username: 'CE_Emulator'
    }),
    teamOps(account: any) {
      return this.teamsGuest.createTokens()
        .then(token => {
          if(account.room) return { token };
          else {
            return this.teamsGuest.setupRoom(account)
              .then(updatedAccount => Accounts.update(updatedAccount))
              .then(({ accounts, account }) => ({
                accounts, account, token
              }))
          }
        });
    },
    saveAccount(account: any, accounts) {
      return this.jsxapi.connection(5000, account).then(xapi => {
        this.jsxapi.xapi = xapi;
        return this.jsxapi.getUnit();
      }).then(metaData => {
        account['email'] = metaData.email;
        account['metaData'] = metaData;
        Accounts.save(accounts);
        return;
      })
    },
    removeCodec(accounts, selected) {
      let account = accounts[selected];
      return this.teamsGuest.createTokens()
        .then(token => {
          if(account.room) {
            return this.teamsGuest.deleteRoom({
              roomId: account.room.id,
              token
            })
          }
        })
        .then(() => {
          if(accounts.length === 1) {
            return {
              snack: true,
              message: `This is the only account setup..Please Edit this Account`
            };
          } else {
            accounts.splice(selected, 1);
          }
          let accountName: string;
          if(selected !== 0) {
            selected = --selected;
            accounts[selected].selected = true;
            accountName = accounts[selected].name;
          } else {
            selected = 0;
            accounts[selected].selected = true;
            accountName = accounts[selected].name;
          }
          Accounts.save(accounts);
          return {
            selected,
            account: accounts[selected],
            accounts,
            message: `${account.name} removed successfully`,
            snack: true
          };
        })
    },
    verifyMeetings(meetings, xapiData: any) {
      if(!xapiData) {
        xapiData = {
          meeting: null,
          meetings: [],
          volume: 0,
          mic: 'Off',
          status: 'Standby',
          incomingCall: { answered: false, disconnect: false },
          outgoingCall: { answered: false, disconnect: false },
          callError: false,
          directoryDialog: false
        }
      }
      const noMeetings = meetings => {
        if(meetings.length === 0) {
          if(!xapiData && xapiData.meetings.length != 0) {
            return [];
          }
        }
      };
      return MeetingHelper.dayCheck(meetings)
        .then(meetings => {
          if(meetings.length === 0) return noMeetings(meetings);
          if(meetings.length === xapiData.meetings.length) {
            let toUpdate = MeetingHelper.compare(
              meetings, xapiData.meetings
            );
            if(toUpdate) {
              return meetings;
            }
          } else {
            return meetings;
          }
        })
    },
    initCodec(account, xapiData: any) {
      let xapi: any;
      return this.jsxapi.connection(7500, account)
        .then(xapi => {
          this.jsxapi.xapi = xapi;
          xapi = xapi;
          return Promise.all([
            this.jsxapi.getMeetings(),
            this.jsxapi.getAudio(),
            this.jsxapi.getState(),
            this.jsxapi.getMicStatus()
          ])
        })
        .then(variables => {
          console.log(variables);
          xapiData['volume'] = variables[1];
          xapiData['status'] = variables[2] === 'Off' ? 'Awake' : 'Standby';
          xapiData['mic'] = variables[3];
          return this.verifyMeetings(variables[0], xapiData);
        })
        .then(meetings => {
          xapiData['meetings'] = meetings;
          return { jsxapi: this.jsxapi, xapiData };
        })
        .catch((e) => Promise.reject(this.jsxapi));
    },
    newAccount(accounts) {
      accounts = accounts.map(a => {
        if(a.selected) a.selected = false;
        return a;
      });
      const account = {
        name: '', host: '', username: '', password: '', selected: true
      };
      accounts.push(account);
      return {
        accounts,
        account,
        selected: accounts.length - 1
      };
    }
  };
  return service;
})();