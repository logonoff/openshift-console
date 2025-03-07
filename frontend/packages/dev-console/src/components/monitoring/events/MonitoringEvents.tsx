import * as React from 'react';
import { EventsList } from '@console/internal/components/events';

const MonitoringEvents: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  return <EventsList {...props} />;
};

export default MonitoringEvents;
