import * as moment from 'moment';
import * as momenttz from 'moment-timezone';
import * as Promise from 'bluebird';
import { isDuration, Moment } from 'moment';

export abstract class Time {
  static timezone = momenttz.tz.guess();

  static timesubtract(date): Moment {
    return this.tzUtcDate(date, this.timezone)
      .subtract(10, 'minutes')
  }

  static meetInTen(startTime, endTime) {
    const now = momenttz.utc().tz(this.timezone)
    return now.isAfter(this.tzUtcDate(endTime, this.timezone)) ?
      false : this.timesubtract(startTime).isSameOrAfter(now) ?
        false : true
  }

  static tzUtcDate(dt, tz) {
    return momenttz.utc(dt ? new Date(dt) : new Date()).tz(tz);
  }

  static isPast(endTime) {
    return this.tzUtcDate(null, this.timezone).isAfter(
      this.tzUtcDate(endTime, this.timezone)
    )
  }

  static getTime(date) {
    return this.tzUtcDate(date, this.timezone).format('h:mm a');
  }

  static sameDay(meetings) {
    return Promise.filter(meetings, ({startTime}) =>
      moment().isSame(startTime, 'day'));
  }

  static durationUntilMeeting(date) {
    const now = moment(),
      later = moment(new Date(date));
    return moment.duration(later.diff(now)).asMilliseconds();
  }

  static callDuration(dur) {
    let callDuration = moment()
      .hour(0)
      .minute(0)
      .second(dur)
      .format('HH : mm : ss');
    if(callDuration.startsWith('00 :')) {
      callDuration = callDuration.substring(5);
    }
    callDuration = callDuration.replace(/\s/gi, '');
    return callDuration;
  }

  static createIsoStr(date) {
    return date.seconds(0).milliseconds(0).toISOString();
  }

  static tokenExpiration(seconds) {
    return moment().add(seconds, 'seconds').format();
  }
}