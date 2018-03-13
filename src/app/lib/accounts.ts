import * as Promise from 'bluebird';

export interface Account {
  host: string;
  username: string;
  password: string;
  selected: boolean;
  name: string;
}

export class Accounts {
  accounts: Account[];

  static get() {
    let accounts = JSON.parse(localStorage.getItem('accounts'));
    if(!accounts) {
      this.save([this.newaccount()]);
      return JSON.parse(localStorage.getItem('accounts'));
    } else {
      return accounts;
    }
  };

  static save(accounts: Account[]): void {
    localStorage.setItem('accounts', JSON.stringify(accounts));
  };

  static newaccount(): Account {
    return {
      name: 'New', host: '', username: '', password: '', selected: true
    };
  };
}