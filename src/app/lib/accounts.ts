import * as Promise from 'bluebird';

export interface Account {
  host: string;
  username: string;
  password: string;
  selected: boolean;
  name: string;
  email?: string;
  room?: {
    id: string;
    sipAddress: string;
  }
}

export class Accounts {
  accounts: Account[];

  static get() {
    let accounts = JSON.parse(localStorage.getItem('accounts'));
    if(!accounts || accounts.length === 0) {
      accounts = [];
      accounts.push({
        name: 'New', host:'10.10.10.10',username:'admin',password:'adming',
        selected: true
      });
      localStorage.setItem('accounts', JSON.stringify(accounts));
      return JSON.parse(localStorage.getItem('accounts'));
    } else {
      return accounts;
    }
  };

  static update(account: Account) {
    let accounts: Account[] = this.get();
    let acctIdx = accounts.findIndex(a => a.name == account.name);
    accounts[acctIdx] = account;
    this.save(accounts);
    return { accounts, account };
  }

  static save(accounts: Account[]): void {
    localStorage.setItem('accounts', JSON.stringify(accounts));
  };

  static newaccount(): Account {
    return {
      name: '', host: '', username: '', password: '', selected: true
    };
  };

  static generateInput(account) {
    return [{
      name: 'name',
      value: account.name,
      label: 'Codec Name'
    }, {
      name: 'host',
      value: account.host,
      label: 'Codec or Touch10'
    }, {
      name: 'username',
      value: account.username,
      label: 'Hostname/IP Address'
    }, {
      name: 'password',
      value: account.password,
      label: 'Password',
      type: 'password'
    }];
  }
}