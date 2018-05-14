import { Promise } from 'bluebird';
import { Time } from './index';

export const MeetingHelper = (() => {
  const helper: any = {};

  helper.meetingChanged = false;

  helper.dayCheck = (meetings) => Time.sameDay(meetings);

  helper.compareProps = (newTime, oldTime) => newTime != oldTime

  helper.compare = function(newmeetings, oldmeetings) {
    return newmeetings.reduce((b: boolean, meeting: any, index: any) => {
      // Is there an Old Meeting That needs to be Spliced Out
      if(b) return b;
      let oldIdx = oldmeetings.findIndex((m: any) => m.id === meeting.id);
      if(oldIdx === -1) {
        b = true;
        return b;
      } else {
        b = this.compareProps(meeting.startTime, oldmeetings[oldIdx].startTime);
        if(b) return b;
        b = this.compareProps(meeting.endTime, oldmeetings[oldIdx].endTime);
        return b;
      }
    }, false);
  };

  helper.setNext = (next) =>
    localStorage.setItem('nextMeeting', JSON.stringify(next));

  helper.getNext = function() {
    let nextMeeting = JSON.parse(localStorage.getItem('nextMeeting'));
    if(!nextMeeting) {
      this.setNext({});
      nextMeeting = {};
    }
    return nextMeeting;
  };

  helper.compareNextMeetings = function(meeting) {
    let nextMeeting = this.getNext();
    if(nextMeeting.hasOwnProperty('id')) {
      if(nextMeeting.id === meeting.id) {
        if(this.compareProps(meeting.startTime, nextMeeting.startTime)) {
          nextMeeting.startTime = meeting.startTime;
          nextMeeting.redirected = false;
        }
        if(this.compareProps(meeting.endTime, nextMeeting.endTime)) {
          nextMeeting.endTime = meeting.endTime;
        }
        this.setNext(nextMeeting);
        return Promise.resolve(nextMeeting);
      } else { // A New Next Meeting
        nextMeeting = meeting;
        nextMeeting.redirected = false;
        this.setNext(nextMeeting);
        return Promise.resolve(nextMeeting);
      }
    } else {
      nextMeeting = meeting;
      nextMeeting.redirected = false;
      this.setNext(nextMeeting);
      return Promise.resolve(nextMeeting);
    }
  };

  helper.parseForObtp = function(meetings) {
    if(meetings.Booking) {
      let bookings = meetings.Booking;
      return Promise.map(bookings, (book: any, i: number) => {
        let tmp = JSON.parse(JSON.stringify(book));
        delete tmp.DialInfo.Calls;
        let calls: any;
        if(book.DialInfo.ConnectMode === 'OBTP') {
          calls = book.DialInfo.Calls.Call[0];
          tmp.DialInfo['Calls'] = { Call: { _item: 1, ...calls }};
        }
        return Promise.each(Object.keys(tmp), key => {
          if(key === 'BookingStatusMessage') delete tmp[key];
          if(key === 'MeetingExtensionAvailability') delete tmp[key];
          if(key === 'Organizer') delete tmp[key].Id;
          if(key === 'Webex') {
            delete tmp[key].Url;
            delete tmp[key].MeetingNumber;
            delete tmp[key].Password;
            delete tmp[key].HostKey;
            delete tmp[key].DialInNumber;
          }
          return;
        }).then(() => ({ _item: i + 1, ...tmp }));
      });
    } else {
      return Promise.resolve([]);
    }
  };

  return helper;
})();