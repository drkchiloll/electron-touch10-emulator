import * as React from 'react';
import { TextField } from 'material-ui';
let changed = false;

export function AccountInput(props: any) {
  const { name, value, label, type } = props;
  return (
    <TextField
      ref={(input) => {
        if(name === 'name' && !value) {
          if(changed) changed = false;
          setTimeout(() => {
            if(input && !changed) {
              input.focus();
              changed = true;
            }
          }, 100);
        }
      }}
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