import * as React from 'react';
import * as Promise from 'bluebird';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker-cssmodules.css';
import * as moment from 'moment';
import {
  Dialog, TextField, FlatButton, CircularProgress, Subheader
} from 'material-ui';
import Chips from 'react-chips';
import { Row, Col } from 'react-flexbox-grid';
import { JsXAPI, SparkGuest, SparkGuestConstructor } from '../../lib';

export class OBTPMeeting extends React.Component<any, any> {
  state = {
    start: null,
    end: null,
    title: 'Demo OBTP Meeting',
    creating: false,
    participants: ['samuel.womack@wwt.com'],
    emailParticipants: ['samuel.womack@wwt.com']
  };

  handleTime() {
    let hr = moment().get('hour');
    let hourDiff = 24 - hr,
      minInts = [0, 15, 30, 45];
    let hrRange = [];
    for(hr; hr < 24; hr++) {
      hrRange.push(hr);
    }
    let includedHours = [];
    let myValue = hrRange.map((hr, i, a) => {
      return minInts.map(min => {
        includedHours.push(moment().hours(hr).minutes(min));
        return;
      })
    });
    return includedHours;
  }

  componentWillReceiveProps(props) {
    if(props.open) {
      this.setState({
        start: moment(),
        end: moment().add(15, 'minutes')
      })
    }
  }

  storelocal = meeting => {
    let meetdatastore = JSON.parse(localStorage.getItem('meetings'));
    if(meetdatastore) {
      meetdatastore.push(meeting);
    } else {
      meetdatastore = [meeting];
    }
    localStorage.setItem('meetings', JSON.stringify(meetdatastore));
  }

  createMeeting = () => {
    this.setState({ creating: true });
    const { token } = this.props;
    const { start, end, title, emailParticipants } = this.state;
    const { userid, username } = JSON.parse(localStorage.getItem('sparkguest'));
    const guest = new SparkGuest({
      userid, username
    });
    return guest.obtpSparkRoom(token.token, title, emailParticipants)
      .then((newMeeting) => {
        JsXAPI.commander({
          cmd: 'Bookings List',
          params: {}
        }).then(meetings => {
          let booking: any[], item: number;
          if(meetings.Booking) {
            item = meetings.Booking.length + 1;
            booking = meetings.Booking.map((book, i) => {
              let t = JSON.parse(JSON.stringify(book));
              delete t.DialInfo.Calls;
              let calls = book.DialInfo.Calls.Call[0];
              t.DialInfo['Calls'] = { Call: { _item: 1, ...calls } };
              Object.keys(t).forEach(key => {
                if(key === 'BookingStatusMessage') delete t[key];
                if(key === 'MeetingExtensionAvailability') delete t[key];
                if(key === 'Organizer') delete t[key].Id;
                if(key === 'Webex') {
                  delete t[key].Url;
                  delete t[key].MeetingNumber;
                  delete t[key].Password;
                  delete t[key].HostKey;
                  delete t[key].DialInNumber;
                }
              })
              let b = { _item: i+1, ...t };
              return b;
            });
          } else {
            booking = [];
            item = 1;
          }
          let manualMeeting: any = {
            id: newMeeting.roomId,
            start,
            end,
            title,
            number: newMeeting.sipAddress,
            item
          };
          let meet: any = JsXAPI.generateBooking(manualMeeting);
          booking.push(meet);
          let bookingsXML = JsXAPI.js2xml(booking);
          console.log(bookingsXML);
          JsXAPI.createBooking(bookingsXML).then(() => {
            manualMeeting['participants'] = emailParticipants;
            this.storelocal(manualMeeting);
            this.closeModal();
          });
        });
      });
  }

  closeModal = () => {
    this.setState({
      start: null,
      end: null,
      title: 'Demo OBTP Meeting',
      creating: false
    });
    this.props.close();
  }

  searchRooms = searchString => {
    const accounts = JSON.parse(localStorage.getItem('accounts'));
    return Promise
      .filter(accounts, (account:any) => account.name.toLowerCase().includes(searchString) ||
        account.name.includes(searchString))
      .map((matched:any) => matched.name + ' | ' + matched.email);
  }

  changeChips = participants => {
    const normalized = participants.map(part => {
      if(part.includes('|')) return part.split(' | ')[1];
      return part;
    })
    this.setState({
      participants,
      emailParticipants: normalized
    });
  }

  render() {
    const { creating, participants } = this.state;
    return (
      <Dialog open={this.props.open}
        autoScrollBodyContent={true}
        autoDetectWindowHeight={true}
        style={this.styles.dialog}
        bodyStyle={{maxHeight: '80vh', minHeight: '50vh', marginTop: '50px'}}
        onRequestClose={this.closeModal}
        actions={[
          creating ? <CircularProgress size={20} style={{marginRight: '20px'}}  /> :
            <FlatButton label='Create' onClick={this.createMeeting} />
        ]}
      >
        <TextField floatingLabelText='Meeting Title'
          value={this.state.title}
          floatingLabelFixed={true}
          floatingLabelShrinkStyle={this.styles.floatLabel}
          onChange={(e, title) => this.setState({ title })}
          inputStyle={this.styles.input} />
        <Row>
          <Col sm={5} >
            <DatePicker
              selected={this.state.start}
              onChange={(date) => this.setState({start: date})}
              showTimeSelect
              timeIntervals={15}
              includeTimes={this.handleTime()}
              timeFormat='hh:mma'
              dateFormat='LLL'
              customInput={
                <TextField floatingLabelText='Start'
                  style={{width: 135}}
                  floatingLabelFixed={true}
                  floatingLabelShrinkStyle={this.styles.floatLabel}
                  inputStyle={this.styles.input} />
              } />
          </Col>
          <Col sm={2} >
            <DatePicker
              selected={this.state.end}
              onChange={(date) => this.setState({end: date})}
              showTimeSelect={true}
              showTimeSelectOnly={true}
              includeTimes={this.handleTime()}
              timeIntervals={15}
              timeFormat='hh:mma'
              dateFormat='LT'
              customInput={
                <TextField floatingLabelText='End'
                  style={{width: 85}}
                  floatingLabelFixed={true}
                  floatingLabelShrinkStyle={this.styles.floatLabel}
                  inputStyle={this.styles.input} />
              } />
          </Col>
        </Row>
        <div style={{marginLeft: '-15px'}}>
          <Subheader> Optional Participants </Subheader>
        </div>
        <Row>
          <Col xs={12} >
            <Chips value={participants}
              placeholder='Email Address'
              onChange={this.changeChips}
              fetchSuggestions={this.searchRooms} />
          </Col>
        </Row>
      </Dialog>
    )
  }

  styles: any = {
    dialog: {
      marginTop: -195,
      marginLeft: 380,
      maxWidth: 'none',
      width: 585
    },
    floatLabel: { fontSize: 16, color: 'black' },
    input: { fontSize: 12 }
  }
}