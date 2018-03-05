import './vendor';
import * as React from 'react'
import * as ReactDom from 'react-dom'
import { App } from './App';

import { MuiThemeProvider, getMuiTheme, colors } from 'material-ui/styles';
const { indigo500, indigo200 } = colors;
const muiTheme = getMuiTheme({
  palette: {
    textColor: indigo500,
    primary1Color: indigo500,
    primary2Color: indigo500,
    primary3Color: indigo500
  },
  datePicker: {
    selectColor: indigo500,
    headerColor: indigo500,
    calendarTextColor: indigo200
  },
  textField: {
    floatingLabelColor: indigo200,
    focusColor: indigo200,
    hintColor: indigo200,
    textColor: indigo200
  },
  fontFamily: `'Times New Roman'`
});

const Root = () => (
  <MuiThemeProvider muiTheme={muiTheme}>
    <App />
  </MuiThemeProvider>
);

ReactDom.render(<Root />, document.getElementById('app'));
