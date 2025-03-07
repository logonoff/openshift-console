import * as React from 'react';
import { TextColumnItemProps } from './text-column-types';
import TextColumnItemContent from './TextColumnItemContent';

const TextColumnItem: React.FC<React.PropsWithChildren<TextColumnItemProps>> = (props) => {
  return <TextColumnItemContent {...props} previewDropRef={null} dragRef={null} opacity={1} />;
};
export default TextColumnItem;
