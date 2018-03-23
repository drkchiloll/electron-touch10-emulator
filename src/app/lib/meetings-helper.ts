import * as Promise from 'bluebird';
import { Time } from './index';

export const MeetingHelper = (() => {
  const helper: any = {};

  helper.meetingChanged = false;

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

  return helper;
})();