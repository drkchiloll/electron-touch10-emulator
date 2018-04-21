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
    floatingLabelColor: indigo500,
    focusColor: indigo500,
    hintColor: indigo500,
    textColor: indigo500
  },
  tabs: {
    selectedTextColor: indigo500,
    textColor: indigo500,
    backgroundColor: '#d7dddd',
  },
  slider: {
    handleSize: 22,
    handleSizeActive: 25,
    trackColor: 'black'
  },
  fontFamily: `'Times New Roman'`
});
const BGImg = require('./imgs/t10.jpg');
document.body.style.backgroundImage = `url(${BGImg})`;
document.body.style.backgroundSize = '100%';
const Root = () => (
  <MuiThemeProvider muiTheme={muiTheme}>
    <App />
  </MuiThemeProvider>
);

ReactDom.render(<Root />, document.getElementById('app'));
