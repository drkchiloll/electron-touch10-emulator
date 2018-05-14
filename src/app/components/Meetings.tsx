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

  componentWillUnmount() {
    sessionStorage.setItem('redirectCounter', '2')
  }

  cancelMeeting = (meeting) => {
    JsXAPI.getMeetings().then(meetings => {
      console.log(meetings);
    });
  }

  styles: any = {
    closeIcon: { float: 'right' },
    header1: { marginLeft: 10 },
    paper: {
      borderRadius: '7px',
      marginLeft: '25px',
      width: 600,
      marginBottom: '10px',
      position: 'relative'
    },
    btn: {
      position: 'absolute',
      top: 40,
      right: 35,
      width: 130,
      height: 45,
      borderRadius: '9px',
      border: 'solid 2px black'
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
      left: 300,
      borderLeft: '5px solid black'
    },
    delMeeting: {
      position: 'absolute',
      top: -5,
      right: -5
    }
  }
  
  dial = number => {
    const { meetings }: any = this.state;
    JsXAPI.dial(number).then(result => {
      if(result && result.status === 'OK') {
        this.props.switch({
          callView: true,
          callId: result.CallId,
          meeting: meetings[0]
        });
      }
    })
  }

  _renderCardHeader = meeting => {
    const { title, startTime } = meeting;
    const subtitle = `You can join this meeting from ` +
      `${Time.timesubtract(startTime).format('h:mm a')}`;
    const Title = () =>
      <strong style={this.styles.meetingTitle}>
        {title}
      </strong>
    return (
      <CardHeader subtitle={subtitle}
        title={<Title/>}
        style={this.styles.card} />
    );
  }

  render() {
    const { meetings } = this.props;
    return (
      <div>
        <IconButton style={this.styles.closeIcon}
          onClick={() => {
            this.props.switch({ mainView: true });
          }}>
          <CloseIcon />
        </IconButton>
        {
          meetings && meetings.length > 0 ?
          <div>
            <Subheader style={this.styles.header1}>
              Upcomings Meetings
            </Subheader>
            {
              meetings.map((m:any, index: any) => {
                const {id, startTime, endTime, endpoint, title} = m;
                return (
                  <Paper key={id} style={this.styles.paper}>
                    <IconButton style={this.styles.delMeeting}
                      iconStyle={{ height: 15, width: 15 }}
                      onClick={() => this.cancelMeeting(m)}>
                      <CloseIcon />
                    </IconButton>
                    { Time.meetInTen(startTime, endTime) ? 
                      <RaisedButton label='Join' buttonStyle={this.styles.btn}
                        backgroundColor='green'
                        labelColor='#FFFFFF'
                        onClick={() => {
                          this.dial(endpoint.number)
                        }} /> :
                      null }
                    { index === 0 ?
                     this._renderCardHeader(m) :
                     <CardHeader title={title} />}
                    <CardText>
                      {Time.getTime(startTime) + ' - ' +
                       Time.getTime(endTime)}
                    </CardText>
                  </Paper>
                )
              })
            }
            <Subheader style={this.styles.header2}>
              No More Meetings Today
            </Subheader>
          </div> :
          <Subheader style={this.styles.header3}>
            ROOM AVAILABLE ALL DAY
          </Subheader>
        }
      </div>
    );
  }
}