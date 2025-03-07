import * as React from 'react';
import { AsyncComponent } from '../utils';

export const OverviewListPageLoader = () =>
  import('./OverviewListPage' /* webpackChunkName: "overview-list-page" */).then(
    (m) => m.OverviewListPage,
  );

export const OverviewListPage: React.FC<React.PropsWithChildren<unknown>> = (props) => {
  return <AsyncComponent loader={OverviewListPageLoader} {...props} />;
};
