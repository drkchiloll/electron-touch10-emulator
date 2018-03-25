import axios from 'axios';
import { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as Promise from 'bluebird';
import * as moment from 'moment';
import { Moment } from 'moment';

const url = 'https://api.github.com/repos/drkchiloll/',
  repo = 'cisco-vidcodec-emulator-updates',
  token = '3d8bf3e0624d88088138c26cb5f9a7c0b90f6a6a';

export interface IUpdator {
  setENV(): void;
  init(): boolean;
  filterRepoContent(files: any): any[];
  processRepoFiles(files: any): any[];
  fileCompare(files: any): any[];
  refresh(files: any): boolean;
  start(): boolean;
}

export const Updates = (() => {
  const ROOT_DIR = path.resolve(__dirname),
    FILES = fs.readdirSync(ROOT_DIR),
    requestor = axios.create({
      baseURL: url + repo,
      headers: { Authorization: `Bearer ${token}` }
    });
  
  const update: any = {};
  update.ENVIRONMENT = null;

  update.setUpdateDate = () => {
    localStorage.setItem('lastUpdated', moment().format('MM/DD/YYYY h:mm a'));
    return Promise.resolve('/contents');
  };

  update.req = (uri) => requestor.get(uri).then(({ data }) => data);

  update.setENV = () => FILES.findIndex(f => f.includes('.js.map')) !== -1
    ? 'development' : 'production';

  update.init = function() {
    this.ENVIRONMENT = this.setENV();
    let storedUpdate = localStorage.getItem('lastUpdated');
    let lastUpdated = storedUpdate ? moment(new Date(storedUpdate)) : null;
    return this.ENVIRONMENT === 'developement' ? false :
      this.ENVIRONMENT === 'production' && !lastUpdated ? true :
      this.ENVIRONMENT === 'production' && moment().isSameOrAfter(
        lastUpdated.add(1, 'd')) ? true : false;
  };

  update.filterRepoContent = (files:any) =>
    Promise
      .filter(files, (f: any) =>
        f.name.includes('bundle.js') || f.name === 'index.html')
      .then(updates => Promise.map(updates, (update: any) =>
        ({ name: update.name, uri: update.git_url })));

  update.processRepoFiles = function(files: any) {
    return Promise.map(files, (file: any) =>
      requestor.get(file.uri).then(({ data }) =>
        Object.assign(file, {
          content: new Buffer(data.content, 'base64').toString('utf-8')
        })))
  };

  update.fileCompare = function(files: any) {
    console.log(files);
    return Promise.reduce(files, (a, { name, content }) => {
      const local = fs.readFileSync(`${ROOT_DIR}/${name}`, 'utf-8')
      if(local != content) a.push({ name, content });
      return a;
    }, []);
  };

  update.refresh = function(files: any) {
    if(files.length > 0) {
      return Promise.each(files, ({ name, content }) =>
        fs.writeFileSync(`${ROOT_DIR}/${name}`, content, 'utf-8')
      ).then(() => true);
    } else {
      return false;
    }
  };

  update.start = function() {
    return this.setUpdateDate()
      .then(this.req)
      .then(this.filterRepoContent)
      .then(this.processRepoFiles)
      .then(this.fileCompare)
      // .then(() => true)
      .then(this.refresh)
  }

  return update;
})();