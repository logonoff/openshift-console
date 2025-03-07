import * as React from 'react';
import { observer, Node } from '@patternfly/react-topology';

const SpacerNode: React.FC<React.PropsWithChildren<{ element: Node }>> = () => {
  return <g />;
};

export default observer(SpacerNode);
