import * as React from 'react';
import './TopologySideBarTabSection.scss';

const TopologySideBarTabSection: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
  return <div className="ocs-sidebar-tabsection">{children}</div>;
};

export default TopologySideBarTabSection;
