import * as React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker-cssmodules.css';
import * as moment from 'moment';
import { Dialog, TextField, FlatButton, CircularProgress } from 'material-ui';
import { Row, Col } from 'react-flexbox-grid';
import { JsXAPI } from '../../lib';

export class OBTPMeeting extends React.Component<any, any> {
  state = {
    start: null,
    end: null,
    title: 'Demo OBTP Meeting',
    creating: false
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

  createMeeting = () => {
    this.setState({ creating: true });
    const { start, end, title } = this.state;
    JsXAPI.createBooking(this.state).then(() => {
      this.closeModal();
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

  render() {
    const { creating } = this.state;
    return (
      <Dialog open={this.props.open}
        style={this.styles.dialog}
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
              onChange={(date) => {
                this.setState({ start: date })
              }}
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
              onChange={(date) => {
                this.setState({ end: date })
              }}
              onBlur={() => { console.log('I was blurred') }}
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
      </Dialog>
    )
  }

  styles: any = {
    dialog: {
      marginTop: -195, marginLeft: 380, maxWidth: 'none', width: 585
    },
    floatLabel: { fontSize: 16, color: 'black' },
    input: { fontSize: 12 }
  }
}