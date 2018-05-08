import * as moment from 'moment';
import * as momenttz from 'moment-timezone';
import * as Promise from 'bluebird';
import { isDuration, Moment } from 'moment';

export abstract class Time {
  static timezone = momenttz.tz.guess();

  static timesubtract(date): Moment {
    return momenttz.utc(new Date(date))
      .tz(momenttz.tz.guess())
      .subtract(10, 'minutes')
  }

  static meetInTen(startTime, endTime) {
    const now = momenttz.utc().tz(this.timezone)
    return now.isAfter(momenttz.utc(new Date(endTime)).tz(this.timezone)) ?
      false : this.timesubtract(startTime).isSameOrAfter(now) ?
        false : true
  }

  static isPast(endTime) {
    return momenttz.utc().tz(this.timezone).isAfter(
      momenttz.utc(new Date(endTime)).tz(this.timezone)
    )
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

  static createIsoStr(date) {
    return date.seconds(0).milliseconds(0).toISOString();
  }

  static tokenExpiration(seconds) {
    return moment().add(seconds, 'seconds').format();
  }
}