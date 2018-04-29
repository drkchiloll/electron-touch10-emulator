import * as React from 'react';
import { Row, Col } from 'react-flexbox-grid';
import { Avatar, Paper, RaisedButton } from 'material-ui';
import { green600, red600, fullWhite } from 'material-ui/styles/colors';
import { JsXAPI } from '../../lib';
import { styles } from './styles';

export const IncomingCall = (props: any) => {
  return (
    <Row>
      <Col xsOffset={6}>
        <Paper style={styles.paper}>
          <Row><Col>
            <Avatar style={styles.avatar}
              size={90}
            > # </Avatar>
          </Col></Row>
          <div style={styles.d1}> Incoming call </div>
          <div style={styles.d2}>{props.display}</div>
          <Row>
            <Col xs={3}>
              <RaisedButton label='Answer' labelColor={fullWhite}
                style={styles.b1}
                backgroundColor={'rgb(45,209,68)'}
                onClick={() =>
                  JsXAPI.commander({
                    cmd: 'Call Accept',
                    params: { Callid: props.callerId }
                  })
                }
                 />
            </Col>
            <Col xsOffset={3} xs={3}>
              <RaisedButton labelColor={fullWhite} label='Decline'
                style={styles.b2}
                backgroundColor={red600}
                onClick={() =>
                  JsXAPI.commander({
                    cmd: 'Call Reject',
                    params: { Callid: props.callerId }
                  })
                } />
            </Col>
          </Row>
        </Paper>
      </Col>
    </Row>
  )
}