import * as React from 'react';
import { StepContentType } from '../type';
import './StepContent.scss';

type StepContentProps = {
  children: StepContentType;
};

const StepContent: React.FC<React.PropsWithChildren<StepContentProps>> = ({ children }) => (
  <div className="co-step-content">{children}</div>
);

export default StepContent;
