import type { FC } from 'react';
import { useContext } from 'react';
import { Model } from '@patternfly/react-topology';
import { useDrop, DropTargetMonitor } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import {
  FileUploadContextType,
  FileUploadContext,
} from '@console/app/src/components/file-upload/file-upload-context';
import withDragDropContext from '@console/internal/components/utils/drag-drop-context';
import { TopologyViewType } from '../../topology-types';
import TopologyView from './TopologyView';

const DroppableTopologyComponentInner: FC<DroppableTopologyComponentProps> = (props) => {
  const { setFileUpload, extensions } = useContext<FileUploadContextType>(FileUploadContext);
  const canDropFile = extensions.length > 0;

  const handleFileDrop = (monitor: DropTargetMonitor) => {
    if (!monitor) {
      return;
    }
    const [file] = monitor.getItem<{ files: File[] }>().files;
    if (!file) {
      return;
    }
    setFileUpload(file);
  };

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: NativeTypes.FILE,
    collect: (monitor: DropTargetMonitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop() && canDropFile,
    }),
    drop: (_item, monitor: DropTargetMonitor) => {
      if (monitor.isOver()) {
        handleFileDrop(monitor);
      }
    },
  });

  return (
    <div ref={drop} style={{ height: '100%' }}>
      <TopologyView {...props} isOver={isOver} canDrop={canDrop} />
    </div>
  );
};

export const DroppableTopologyComponent = withDragDropContext<DroppableTopologyComponentProps>(
  DroppableTopologyComponentInner,
);

export type DroppableTopologyComponentProps = {
  model: Model;
  namespace: string;
  viewType: TopologyViewType;
};
