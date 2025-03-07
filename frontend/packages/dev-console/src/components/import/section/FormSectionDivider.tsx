import * as React from 'react';

const FormSectionDivider: React.FC<React.PropsWithChildren<unknown>> = () => (
  <hr
    style={{
      margin: 0,
      borderBottom: 'var(--pf-t--global--border--color--default)',
      width: '100%',
    }}
  />
);

export default FormSectionDivider;
