import * as React from 'react';
import { TextField } from 'material-ui';

export function AccountInput(props: any) {
  const { name, value, label, type } = props;
  return (
    <TextField
      style={{ marginLeft: 20 }}
      type={type==='password' ? 'password': 'text'}
      name={name}
      value={value}
      underlineShow={true}
      floatingLabelFixed={true}
      floatingLabelText={label}
      onChange={props.change} />
  );
}