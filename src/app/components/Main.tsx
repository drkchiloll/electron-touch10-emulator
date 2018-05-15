import * as React from 'react';
import { Badge, FontIcon } from 'material-ui';
import { Subheader, IconButton, Drawer } from 'material-ui';
import { colors } from 'material-ui/styles';
const { deepOrange400, lightBlueA200, green500, grey50 } = colors;
import { JsXAPI, Time, MeetingHelper } from '../lib';
const MeetingsSvg = require('../imgs/Meetings.svg');
const CallSvg = require('../imgs/Call.svg');
const ShareSvg = require('../imgs/Share.svg');
import { Grid, Row, Col } from 'react-flexbox-grid';

export class Main extends React.Component<any,any> {
  constructor(props) {
    super(props);
    this.state = {
      left: window.innerWidth / 3.5,
      top: window.innerHeight / 3,
      meetInTen: false,
      nextMeeting: null,
      meetingBadge: null,
      durationInMs: null,
      volumeDirection: 'up',
      showVolume: false
    };
  }

  timeout: any = null;

  componentWillUnmount() {
    clearTimeout(this.timeout);
  }

  componentDidMount() {
    window.addEventListener('resize', () => {
      let { left, top } = this.state;
      left = window.innerWidth / 3.5;
      top = window.innerHeight / 3;
      this.setState({ left, top });
    });
    this.meetingSetup(this.props.meetings)
  }

  componentWillReceiveProps(props) {
    this.meetingSetup(props.meetings);
    if(props.volume >= this.props.volume) {
      this.setState({ volumeDirection: 'up' })
    } else {
      this.setState({ volumeDirection: 'down' });
    }
  }

  meetingSetup = (meetings) => {
    if(meetings && meetings instanceof Array && meetings.length > 0) {
      if(!Time.isPast(meetings[0].endTime)) {
        MeetingHelper.compareNextMeetings(meetings[0])
          .then((nextMeeting) => {
            if(nextMeeting.hasOwnProperty('id')) {
              this.meetingHandler(nextMeeting);
            }
          });
      } else if(meetings.length > 1) {
        MeetingHelper.compareNextMeeting(meetings[1])
          .then(this.meetingHandler);
      }
    } else {
      MeetingHelper.setNext({});
      clearTimeout(this.timeout);
      this.setState({ durationInMs: 0, meetInTen: false });
    }
  }

  storeMeeting(meeting) {
    localStorage.setItem('nextMeeting', JSON.stringify(meeting));
  }

  compareMeetings = (nextMeeting, meetings) => {
    let meeting: any;
    if(nextMeeting.hasOwnProperty('id')) {
      if(meetings && meetings instanceof Array && meetings.length > 0) {
        meeting = meetings[0];
        if(meeting.id === nextMeeting.id) {
          if((meeting.startTime != nextMeeting.startTime) ||
             (meeting.endTime != nextMeeting.endTime)) {
            nextMeeting.startTime = meeting.startTime;
            nextMeeting.endTime = meeting.endTime;
            this.storeMeeting(nextMeeting);
            if(nextMeeting.redirected) nextMeeting.redirected = false;
            this.meetingHandler(nextMeeting);
          } else if(!this.state.durationInMs && !this.state.meetInTen) {
            this.meetingHandler(nextMeeting);
          }
        } else {
          if(meetings.length > 1) {
            nextMeeting = meetings[1];
            nextMeeting.redirected = false;
            this.storeMeeting(nextMeeting);
            this.meetingHandler(nextMeeting);
          } else {
            nextMeeting = meeting;
            nextMeeting.redirected = false;
            this.storeMeeting(nextMeeting);
            this.meetingHandler(nextMeeting);
          }
        }
      } else {
        this.setState({ meetInTen: false});
        if(meetings instanceof Array) {
          this.storeMeeting({});
          clearTimeout(this.timeout);
        }
      }
    } else if(meetings && meetings.length > 0) {
      console.log(meetings);
      meeting = meetings[0];
      if(meeting && meeting.id && meeting.startTime && meeting.endTime) {
        meeting['redirected'] = false;
        this.storeMeeting(meeting);
        this.meetingHandler(meeting);
      }
    }
  }

  meetingHandler = (nextMeeting) => {
    const { startTime, endTime } = nextMeeting;
    const meetInTen = Time.meetInTen(startTime, endTime);
    let durationInMs: any;
    if(!meetInTen && !Time.isPast(endTime)) {
      const x = Time.timesubtract(startTime).format();
      if(this.state.durationInMs > 0) clearTimeout(this.timeout);
      durationInMs = Time.durationUntilMeeting(x);
      // console.log(durationInMs);
      this.timeout = setTimeout(() => {
        this.setState({ meetInTen: true });
        const theMeeting = MeetingHelper.getNext();
        if(!theMeeting.redirected) this.redirect(theMeeting);
      }, durationInMs);
    } else if(meetInTen && !Time.isPast(endTime) && !nextMeeting.redirected) {
      setTimeout(() => this.redirect(nextMeeting), 500);
    }
    this.setState({ meetInTen, durationInMs });
  }

  _floatAction = () => {
    const { meetInTen } = this.state;
    return (
      <div>
        <IconButton style={{position: 'absolute', top: 0}}
          onClick={() => {
            this.redirect(JSON.parse(localStorage.getItem('nextMeeting')))
          }}>
          <FontIcon><img src={MeetingsSvg} height={85} width={85} /></FontIcon>
        </IconButton>
        <strong style={{
            position: 'absolute',
            bottom: meetInTen ? -95: 0,
            marginLeft: 26,
            marginTop: meetInTen ? 10 : 12
          }}> Meetings </strong>
      </div>
    )
  }

  redirect = (nextMeeting) => {
    nextMeeting.redirected = true;
    localStorage.setItem('nextMeeting', JSON.stringify(nextMeeting));
    this.props.switch({ meetingsView: true });
  }

  render() {
    let MeetBadge: any;
    let { meetInTen, left, top, volumeDirection, showVolume } = this.state;
    let { volume, meetings, status, mic, directoryDialog, callError } = this.props;
    return (
        <div style={{ left: 155, top, position: 'absolute', right: 125 }}>
          <Grid fluid>
            <Row>
              <Col xs={4}>
                <IconButton style={{ height: 80, width: 80 }}
                  onClick={() => this.props.switch({ directory: true })} >
                  <FontIcon><img src={CallSvg} height={85} width={85} /></FontIcon>
                </IconButton>
                <div style={{ marginTop: 10}}>
                  <Col><strong style={{marginLeft: 37}}> Call </strong></Col>
                </div>
              </Col>
              <Col xs={4}>
                <IconButton style={{ height: 80, width: 80 }}>
                  <FontIcon >
                    <img src={ShareSvg} height={85} width={85} />
                  </FontIcon>
                </IconButton>
                <div style={{ marginTop: 10}}>
                  <Col><strong style={{ marginLeft: 34 }}> Share </strong></Col>
                </div>
              </Col>
              <Col xs={4}>
                {
                  meetInTen ?
                    <Badge
                      badgeContent={1}
                      primary={true}
                      badgeStyle={this.styles.badge1}>
                      {this._floatAction()}
                    </Badge> :
                    this._floatAction()
                }
              </Col>
            </Row>
          </Grid>
        </div>
    );
  }

  styles: any = {
    badge1: { top: 10, left: 84 },
    div1: { marginLeft: 40 },
    span1: { marginLeft: 90 },
    heading: { textAlign: 'center', padding: 0, margin: 0 },
  }
}