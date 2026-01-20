import type { ComponentClass, FC } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

type WithDragDropContext = <TProps>(Component: ComponentClass<TProps> | FC<TProps>) => FC<TProps>;

const withDragDropContext: WithDragDropContext = (Component) => (props) => {
  return (
    <DndProvider backend={HTML5Backend} context={window}>
      <Component {...props} />
    </DndProvider>
  );
};

export default withDragDropContext;
