import * as React from 'react';
import { Timestamp } from '@console/internal/components/utils';
import { NodeKind } from '@console/internal/module/k8s';
import { getNodeUptime } from '@console/shared/src';

type NodeUptimeProps = {
  obj: NodeKind;
};

const NodeUptime: React.FC<React.PropsWithChildren<NodeUptimeProps>> = ({ obj }) => (
  <Timestamp timestamp={getNodeUptime(obj)} />
);

export default NodeUptime;
