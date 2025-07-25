import * as React from 'react';
import { Helmet } from 'react-helmet-async';
import * as _ from 'lodash-es';
/* eslint-disable import/named */
import { useTranslation, withTranslation, WithTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import {
  Routes,
  Route,
  useParams,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom-v5-compat';
import {
  HorizontalNavTab as DynamicResourceNavTab,
  isHorizontalNavTab as DynamicIsResourceNavTab,
  NavTab as DynamicNavTab,
  isTab as DynamicIsNavTab,
} from '@console/dynamic-plugin-sdk/src/extensions/horizontal-nav-tabs';
import { ExtensionK8sGroupModel } from '@console/dynamic-plugin-sdk/src/api/common-types';
import { PageTitleContext } from '@console/shared/src/components/pagetitle/PageTitleContext';
import { Tabs, Tab, TabTitleText } from '@patternfly/react-core';
import { ErrorBoundaryPage } from '@console/shared/src/components/error';
import PageBody from '@console/shared/src/components/layout/PageBody';
import { K8sResourceKind, K8sResourceCommon } from '../../module/k8s';
import { referenceForModel, referenceFor, referenceForExtensionModel } from '../../module/k8s/k8s';
import { PodsPage } from '../pod';
import { AsyncComponent } from './async';
import { ResourceMetricsDashboard } from './resource-metrics';
import { EmptyBox, LoadingBox, StatusBox } from './status-box';
import {
  HorizontalNavProps as HorizontalNavFacadeProps,
  NavPage,
} from '@console/dynamic-plugin-sdk/src/extensions/console-types';
import { useExtensions, HorizontalNavTab, isHorizontalNavTab } from '@console/plugin-sdk/src';

export const editYamlComponent = (props) => (
  <AsyncComponent loader={() => import('../edit-yaml').then((c) => c.EditYAML)} obj={props.obj} />
);
export const viewYamlComponent = (props) => (
  <AsyncComponent
    loader={() => import('../edit-yaml').then((c) => c.EditYAML)}
    obj={props.obj}
    readOnly={true}
  />
);

class PodsComponentWithTranslation extends React.PureComponent<
  PodsComponentProps & WithTranslation
> {
  render() {
    const {
      metadata: { namespace },
      spec: { selector },
    } = this.props.obj;
    const { showNodes, t } = this.props;
    if (_.isEmpty(selector)) {
      return <EmptyBox label={t('public~Pods')} />;
    }

    // Hide the create button to avoid confusion when showing pods for an object.
    // Otherwise it might seem like you click "Create Pod" to add replicas instead
    // of scaling the owner.
    return (
      <PodsPage
        showTitle={false}
        namespace={namespace}
        selector={selector}
        canCreate={false}
        showNodes={showNodes}
      />
    );
  }
}

export const PodsComponent = withTranslation()(PodsComponentWithTranslation);

type NavFactory = { [name: string]: (c?: React.ComponentType<any>) => Page };
export const navFactory: NavFactory = {
  details: (component) => ({
    href: '',
    // t('public~Details')
    nameKey: 'public~Details',
    component,
  }),
  events: (component) => ({
    href: 'events',
    // t('public~Events')
    nameKey: 'public~Events',
    component,
  }),
  logs: (component) => ({
    href: 'logs',
    // t('public~Logs')
    nameKey: 'public~Logs',
    component,
  }),
  editYaml: (component) => ({
    href: 'yaml',
    // t('public~YAML')
    nameKey: 'public~YAML',
    component: component || editYamlComponent,
  }),
  pods: (component) => ({
    href: 'pods',
    // t('public~Pods')
    nameKey: 'public~Pods',
    component: component || PodsComponent,
  }),
  jobs: (component) => ({
    href: 'jobs',
    // t('public~Jobs')
    nameKey: 'public~Jobs',
    component,
  }),
  roles: (component) => ({
    href: 'roles',
    // t('public~RoleBindings')
    nameKey: 'public~RoleBindings',
    component,
  }),
  builds: (component) => ({
    href: 'builds',
    // t('public~Builds')
    nameKey: 'public~Builds',
    component,
  }),
  envEditor: (component) => ({
    href: 'environment',
    // t('public~Environment')
    nameKey: 'public~Environment',
    component,
  }),
  clusterOperators: (component) => ({
    href: 'clusteroperators',
    // t('public~Cluster Operators')
    nameKey: 'public~Cluster Operators',
    component,
  }),
  machineConfigs: (component) => ({
    href: 'machineconfigs',
    // t('public~MachineConfigs')
    nameKey: 'public~MachineConfigs',
    component,
  }),
  machines: (component) => ({
    href: 'machines',
    // t('public~Machines')
    nameKey: 'public~Machines',
    component,
  }),
  workloads: (component) => ({
    href: 'workloads',
    // t('public~Workloads')
    nameKey: 'public~Workloads',
    component,
  }),
  history: (component) => ({
    href: 'history',
    // t('public~History')
    nameKey: 'public~History',
    component,
  }),
  metrics: (component) => ({
    href: 'metrics',
    // t('public~Metrics')
    nameKey: 'public~Metrics',
    component: component ?? ResourceMetricsDashboard,
  }),
  terminal: (component) => ({
    href: 'terminal',
    // t('public~Terminal')
    nameKey: 'public~Terminal',
    component,
  }),
};

export const NavBar: React.FC<NavBarProps> = ({ pages }) => {
  const { t } = useTranslation();
  const { telemetryPrefix, titlePrefix } = React.useContext(PageTitleContext);
  const location = useLocation();
  const navigate = useNavigate();

  const sliced = location.pathname.split('/');
  const lastElement = decodeURIComponent(sliced.pop());
  const defaultPage =
    pages.filter((p) => {
      return p.href === lastElement;
    }).length === 0;
  const baseURL = defaultPage ? location.pathname : sliced.join('/');

  // the div wrapper prevents the tabs from collapsing in a flexbox
  const tabs = (
    <div>
      <Tabs
        activeKey={defaultPage ? '' : lastElement}
        component="nav"
        className="co-horizontal-nav"
      >
        {pages.map(({ name, nameKey, href }) => {
          const to = `${baseURL.replace(/\/$/, '')}/${encodeURIComponent(href)}`;

          return (
            <Tab
              key={href}
              eventKey={href}
              href={to}
              onClick={(e) => {
                e.preventDefault();
                navigate(to);
              }}
              data-test-id={`horizontal-link-${nameKey ? nameKey.split('~')[1] : name}`}
              title={<TabTitleText>{nameKey ? t(nameKey) : name}</TabTitleText>}
              aria-controls={undefined} // there is no corresponding tab content to control, so this ID is invalid
            />
          );
        })}
      </Tabs>
    </div>
  );

  const activePage = pages.find(({ href }) => {
    return defaultPage ? href === '' : lastElement === href;
  });

  const labelId = activePage?.nameKey?.split('~')[1] || activePage?.name || 'Details';
  return (
    <>
      <Helmet>
        <title data-telemetry={telemetryPrefix ? `${telemetryPrefix} · ${labelId}` : labelId}>
          {titlePrefix
            ? `${titlePrefix} · ${activePage?.nameKey ? t(activePage.nameKey) : activePage?.name}`
            : `${activePage?.nameKey ? t(activePage.nameKey) : activePage?.name}`}
        </title>
      </Helmet>
      {tabs}
    </>
  );
};
NavBar.displayName = 'NavBar';

export const HorizontalNav = React.memo((props: HorizontalNavProps) => {
  const params = useParams();

  const renderContent = (routes: JSX.Element[]) => {
    const { noStatusBox, obj, EmptyMsg, label } = props;
    const content = (
      <React.Suspense fallback={<LoadingBox />}>
        <Routes>{routes}</Routes>
      </React.Suspense>
    );

    const skeletonDetails = (
      <div data-test="skeleton-detail-view" className="skeleton-detail-view">
        <div className="skeleton-detail-view--head" />
        <div className="skeleton-detail-view--grid">
          <div className="skeleton-detail-view--column">
            <div className="skeleton-detail-view--tile skeleton-detail-view--tile-plain" />
            <div className="skeleton-detail-view--tile skeleton-detail-view--tile-resource" />
            <div className="skeleton-detail-view--tile skeleton-detail-view--tile-labels" />
            <div className="skeleton-detail-view--tile skeleton-detail-view--tile-resource" />
          </div>
          <div className="skeleton-detail-view--column">
            <div className="skeleton-detail-view--tile skeleton-detail-view--tile-plain" />
            <div className="skeleton-detail-view--tile skeleton-detail-view--tile-plain" />
            <div className="skeleton-detail-view--tile skeleton-detail-view--tile-resource" />
            <div className="skeleton-detail-view--tile skeleton-detail-view--tile-plain" />
          </div>
        </div>
      </div>
    );

    if (noStatusBox) {
      return content;
    }

    return (
      <StatusBox skeleton={skeletonDetails} {...obj} EmptyMsg={EmptyMsg} label={label}>
        {content}
      </StatusBox>
    );
  };

  const componentProps = {
    ..._.pick(props, ['filters', 'selected', 'loaded']),
    obj: _.get(props.obj, 'data'),
  };
  const extraResources = _.reduce(
    props.resourceKeys,
    (extraObjs, key) => ({ ...extraObjs, [key]: _.get(props[key], 'data') }),
    {},
  );

  const objReference = props.obj?.data ? referenceFor(props.obj.data) : '';
  const contextId = props.contextId;
  const dynamicResourceNavTabExtensions = useExtensions<DynamicResourceNavTab>(
    DynamicIsResourceNavTab,
  );
  const dynamicTabExtensions = useExtensions<DynamicNavTab>(DynamicIsNavTab);
  const navTabExtensions = useExtensions<HorizontalNavTab>(isHorizontalNavTab);

  const pluginPages = React.useMemo(
    () =>
      navTabExtensions
        .filter((tab) => referenceForModel(tab.properties.model) === objReference)
        .map((tab) => ({
          ...tab.properties.page,
          component: (pageProps: PageComponentProps) => (
            <AsyncComponent {...pageProps} loader={tab.properties.loader} />
          ),
        })),
    [navTabExtensions, objReference],
  );

  const dynamicPluginPages = React.useMemo(() => {
    const resolvedResourceNavTab = dynamicResourceNavTabExtensions
      .filter(
        (tab) =>
          referenceForExtensionModel(tab.properties.model as ExtensionK8sGroupModel) ===
          objReference,
      )
      .map((tab) => ({
        ...tab.properties.page,
        component: (pageProps: PageComponentProps) => (
          <AsyncComponent {...pageProps} loader={tab.properties.component} />
        ),
      }));

    const resolvedNavTab = dynamicTabExtensions
      .filter((tab) => tab.properties.contextId === contextId)
      .map((tab) => ({
        name: tab.properties.name,
        href: tab.properties.href,
        component: (pageProps: PageComponentProps) => (
          <AsyncComponent {...pageProps} loader={tab.properties.component} />
        ),
      }));

    return [...resolvedResourceNavTab, ...resolvedNavTab].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [dynamicResourceNavTabExtensions, dynamicTabExtensions, objReference, contextId]);

  const pages: Page[] = [
    ...(props.pages || props.pagesFor(props.obj?.data)),
    ...pluginPages,
    ...dynamicPluginPages,
  ];

  const routes = pages.map((p) => {
    return (
      <Route
        path={p.path || encodeURIComponent(p.href)}
        key={p.nameKey || p.name}
        element={
          <ErrorBoundaryPage>
            <p.component
              {...params}
              {...componentProps}
              {...extraResources}
              {...p.pageData}
              customData={props.customData}
              params={params}
            />
          </ErrorBoundaryPage>
        }
      />
    );
  });

  // Handle cases where matching Routes do not exist and show the details page instead of a blank page
  if (props.createRedirect && routes.length >= 1) {
    routes.push(
      <Route key="fallback_redirect" element={<Navigate to={routes[0].props.path} replace />} />,
    );
  }

  return (
    <PageBody className={props.className}>
      {!props.hideNav && <NavBar pages={pages} />}
      {renderContent(routes)}
    </PageBody>
  );
}, _.isEqual);

/*
 * Component consumed by the dynamic plugin SDK
 * Changes to the underlying component has to support props used in this facade
 */
export const HorizontalNavFacade: React.FC<HorizontalNavFacadeProps> = ({
  resource,
  pages,
  customData,
  contextId,
}) => {
  const obj = { data: resource, loaded: true };

  return (
    <HorizontalNav
      obj={obj}
      pages={pages}
      customData={customData}
      contextId={contextId}
      noStatusBox
    />
  );
};

export type PodsComponentProps = {
  obj: K8sResourceKind;
  showNodes?: boolean;
  t: TFunction;
};

export type PageComponentProps<R extends K8sResourceCommon = K8sResourceKind> = {
  filters?: any;
  selected?: any;
  match?: any;
  obj?: R;
  params?: any;
  customData?: any;
  showTitle?: boolean;
  fieldSelector?: string;
};

export type Page<D = any> = Partial<Omit<NavPage, 'component'>> & {
  component?: React.ComponentType<PageComponentProps & D>;
  badge?: React.ReactNode;
  pageData?: D;
  nameKey?: string;
};

export type NavBarProps = {
  pages: Page[];
};

export type HorizontalNavProps = Omit<HorizontalNavFacadeProps, 'pages' | 'resource'> & {
  /* The facade support a limited set of properties for pages */
  className?: string;
  createRedirect?: boolean;
  contextId?: string;
  pages: Page[];
  label?: string;
  obj?: { data: K8sResourceCommon; loaded: boolean };
  pagesFor?: (obj: K8sResourceKind) => Page[];
  resourceKeys?: string[];
  hideNav?: boolean;
  EmptyMsg?: React.ComponentType<any>;
  customData?: any;
  noStatusBox?: boolean;
};

HorizontalNav.displayName = 'HorizontalNav';
HorizontalNavFacade.displayName = 'HorizontalNavFacade';
