import * as React from 'react';
import { JsXAPI, Time } from '../lib';
import * as moment from 'moment';
import * as momenttz from 'moment-timezone';
import {
  Subheader, Card, CardHeader, CardText,
  CardTitle, IconButton, RaisedButton, Paper
} from 'material-ui';
import CloseIcon from 'material-ui/svg-icons/navigation/close';

export class Meetings extends React.Component<any, any> {
  constructor(props) {
    super(props);
    this.state = {
      meetings: []
    }
  }

  componentWillMount() {
    JsXAPI.getMeetings().then(meetings => {
      this.setState({ meetings })
    });
  }

  timeMath = date => {
    momenttz.utc(new Date(date))
      .tz(momenttz.tz.guess())
      .subtract(10, 'minutes')
      .format('h:mm a')
  }

  styles: any = {
    closeIcon: { float: 'right' },
    header1: { marginLeft: 10 },
    paper: {
      marginLeft: '25px',
      width: 600,
      marginBottom: '10px',
      position: 'relative'
    },
    btn: {
      position: 'absolute',
      top: 40,
      right: 35
    },
    meetingTitle: { fontSize: 18 },
    card: { width: 400 },
    header2: {
      marginLeft: 10,
      font: 'bold'
    },
    header3: {
      position: 'absolute',
      top: 250,
      left: 300
    }
  }

  getTime = date =>
    momenttz.utc(new Date(date)).tz(momenttz.tz.guess()).format('h:mm a');
  
  dial = number => {
    const { meetings }: any = this.state;
    JsXAPI.dial(number).then(result => {
      if(result && result.status === 'OK') {
        this.props.updateView({
          callView: true,
          callId: result.CallId,
          conferenceId: result.ConferenceId,
          bookingId: meetings[0].id
        });
      }
    })
  }

  render() {
    const { meetings }: any = this.state;
    return (
      <div>
        <IconButton style={this.styles.closeIcon}
          onClick={() => {
            JsXAPI.closeConnection().then(() =>
              this.props.switch({ mainView: true }));
          }}>
          <CloseIcon />
        </IconButton>
        {
          meetings && meetings.length > 0 ?
          <div>
            <Subheader style={this.styles.header}>
              Upcomings Meetings
            </Subheader>
            {
              meetings.map((meeting:any, index: any) => {
                return (
                  <Paper key={meeting.id} style={this.styles.paper}>
                    { Time.meetInTen(meeting.startTime, meeting.endTime) ? 
                      <RaisedButton label='Join' style={this.styles.btn}
                        onClick={() => {
                          this.dial(meeting.endpoint.number)
                        }} /> :
                      null }
                    { index === 0 ?
                      <CardHeader
                        subtitle={`You can join this meeting from `+ 
                          `${this.timeMath(meeting.startTime)}`}
                        title={
                          <strong style={this.styles.meetingTitle}>
                            {meeting.title}
                          </strong>
                        }
                        style={this.styles.card} /> :
                     <CardHeader title={meeting.title} />}
                    <CardText>
                      {this.getTime(meeting.startTime) + ' - ' +
                       this.getTime(meeting.endTime)}
                    </CardText>
                  </Paper>
                )
              })
            }
            <Subheader style={this.styles.header2}> No More Meetings Today</Subheader>
          </div> :
          <Subheader style={this.styles.header3}>
            ROOM AVAILABLE ALL DAY
          </Subheader>
        }
      </div>
    );
  }
}