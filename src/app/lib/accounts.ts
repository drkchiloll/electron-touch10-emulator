import * as Promise from 'bluebird';
import * as lokistore from 'lokijs';
import { LokiFsAdapter, Collection } from 'lokijs'
import { join } from 'path';
import * as bcrypt from 'bcryptjs';

export interface ISysAccount {
  '$loki'?: number;
  name: string;
  host: string;
  description?: string;
  username: string;
  password: string;
  selected: boolean;
  email?: string;
  room?: {
    id: string;
    sipAddress: string;
  }
}

export class SysAccount {
  public db: lokistore;
  private collection: Collection;
  private accounts: ISysAccount;
  constructor() {}
  init(dbName): Promise<any> {
    return new Promise(resolve => {
      const adapter = new LokiFsAdapter();
      this.db = new lokistore(
        join(__dirname, `../${dbName}.db`), {
          adapter,
          autoload: true,
          autosave: true,
          autosaveInterval: 4000,
          autoloadCallback: () => {
            this.collection = this.db.getCollection(dbName);
            if(!this.collection) {
              this.collection = this.db.addCollection(dbName);
            }
            return resolve(this.collection);
          }
        }
      )
    })
  }
  private genSalt() {
    return bcrypt.genSalt(10);
  }
  private hashPassword(salt, pass) {
    return bcrypt.hash(pass, salt);
  }
  private saveLocal(accounts) {
    localStorage.setItem('accounts', JSON.stringify(accounts));
  }
  private storePass({ id, password }) {
    const accounts: any = JSON.parse(localStorage.getItem('accounts'));
    if(accounts.find(a => a.id === id)) return;
    else {
      accounts.push({ id, password });
      this.saveLocal(accounts);
    }
  }
  private getLocalAccounts(id?: string) {
    const accounts: any = JSON.parse(localStorage.getItem('accounts'));
    if(id) {
      return accounts.find(account => account.id === id);
    } else {
      this.accounts = accounts;
    }
  }
  add(data: ISysAccount): Promise<ISysAccount> {
    return new Promise(resolve => this.genSalt().then(salt => 
      this.hashPassword(salt, data.password).then(hash => {
        let document = this.collection.insert({
          name: data.name,
          host: data.host,
          description: data.description || '',
          username: data.username,
          selected: true,
          password: hash,
          email: data.email || '',
          room: data.room || {}
        });
        this.storePass({
          id: document['$loki'],
          password: data.password
        });
        return resolve(document);
      })
    ))
  }
  get(query?: any): Promise<ISysAccount|ISysAccount[]> {
    return new Promise(resolve => {
      if(!query) {
        let records: Collection = this.db.getCollection('accounts');
        // console.log(records)
        return Promise.map(records.data, (record: any) => {
          let password = this.getLocalAccounts(record['$loki']).password;
          record.password = password;
          return record;
        }).then(resolve);
      }
      let record = this.collection.get(query.id);
      let password = this.getLocalAccounts(query.id);
      record.password = password;
      return resolve(record);
    })
  }
  modify(record: ISysAccount) {
    return Promise.resolve(
      this.collection.update(record)
    )
  }
}

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