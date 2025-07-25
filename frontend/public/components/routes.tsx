import * as _ from 'lodash-es';
import * as React from 'react';
import { css } from '@patternfly/react-styles';
import { Trans, useTranslation } from 'react-i18next';
import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Grid,
  GridItem,
  Popover,
} from '@patternfly/react-core';
import { sortable } from '@patternfly/react-table';
import { EyeIcon } from '@patternfly/react-icons/dist/esm/icons/eye-icon';
import { EyeSlashIcon } from '@patternfly/react-icons/dist/esm/icons/eye-slash-icon';
import { QuestionCircleIcon } from '@patternfly/react-icons/dist/esm/icons/question-circle-icon';
import i18next from 'i18next';

import { Status } from '@console/shared';
import { FLAGS } from '@console/shared/src/constants';
import TertiaryHeading from '@console/shared/src/components/heading/TertiaryHeading';
import PaneBody from '@console/shared/src/components/layout/PaneBody';
import { DetailsPage, ListPage, RowFunctionArgs, Table, TableData } from './factory';
import {
  CopyToClipboard,
  DetailsItem,
  Kebab,
  ResourceKebab,
  ResourceLink,
  ResourceSummary,
  SectionHeading,
  detailsPage,
  navFactory,
  ExternalLinkWithCopy,
  ConsoleEmptyState,
} from './utils';
import { MaskedData } from './configmap-and-secret-data';
import {
  K8sResourceKindReference,
  RouteKind,
  RouteIngress,
  RouteTarget,
  K8sResourceCondition,
} from '../module/k8s';
import { RouteModel } from '../models';
import { connectToFlags, WithFlagsProps } from '../reducers/connectToFlags';
import { Conditions } from './conditions';
import { RouteMetrics } from './routes/route-metrics';

const RoutesReference: K8sResourceKindReference = 'Route';
const menuActions = [...Kebab.getExtensionsActionsForKind(RouteModel), ...Kebab.factory.common];

export type IngressStatusProps = {
  host: string;
  routerName: string;
  conditions: K8sResourceCondition[];
  wildcardPolicy: string;
  routerCanonicalHostname: string;
};

const getRouteHost = (route: RouteKind, onlyAdmitted: boolean): string => {
  let oldestAdmittedIngress: RouteIngress;
  let oldestTransitionTime: string;
  _.each(route.status.ingress, (ingress) => {
    const admittedCondition = _.find(ingress.conditions, { type: 'Admitted', status: 'True' });
    if (
      admittedCondition &&
      (!oldestTransitionTime || oldestTransitionTime > admittedCondition.lastTransitionTime)
    ) {
      oldestAdmittedIngress = ingress;
      oldestTransitionTime = admittedCondition.lastTransitionTime;
    }
  });

  if (oldestAdmittedIngress) {
    return oldestAdmittedIngress.host;
  }

  return onlyAdmitted ? null : route.spec.host;
};

const isWebRoute = (route: RouteKind): boolean => {
  return !!getRouteHost(route, true) && _.get(route, 'spec.wildcardPolicy') !== 'Subdomain';
};

export const getRouteWebURL = (route: RouteKind): string => {
  const scheme = _.get(route, 'spec.tls.termination') ? 'https' : 'http';
  let url = `${scheme}://${getRouteHost(route, false)}`;
  if (route.spec.path) {
    url += route.spec.path;
  }
  return url;
};

const getSubdomain = (route: RouteKind): string => {
  const hostname = _.get(route, 'spec.host', '');
  return hostname.replace(/^[a-z0-9]([-a-z0-9]*[a-z0-9])\./, '');
};

export const getRouteLabel = (route: RouteKind): string => {
  if (isWebRoute(route)) {
    return getRouteWebURL(route);
  }

  let label = getRouteHost(route, false);
  if (!label) {
    return i18next.t('public~unknown host');
  }

  if (_.get(route, 'spec.wildcardPolicy') === 'Subdomain') {
    label = `*.${getSubdomain(route)}`;
  }

  if (route.spec.path) {
    label += route.spec.path;
  }
  return label;
};

export const RouteLinkAndCopy: React.FC<RouteLinkAndCopyProps> = ({ route, className }) => {
  const link = getRouteWebURL(route);
  return (
    <ExternalLinkWithCopy className={className} href={link} text={link} dataTestID="route-link" />
  );
};

// Renders LinkAndCopy for non subdomains
export const RouteLocation: React.FC<RouteHostnameProps> = ({ obj }) => (
  <div className="co-break-word">
    {isWebRoute(obj) ? <RouteLinkAndCopy route={obj} /> : getRouteLabel(obj)}
  </div>
);
RouteLocation.displayName = 'RouteLocation';

export const routeStatus = (route: RouteKind): string => {
  let atLeastOneAdmitted: boolean = false;

  if (!route.status || !route.status.ingress) {
    return 'Pending';
  }

  _.each(route.status.ingress, (ingress) => {
    const isAdmitted = _.some(ingress.conditions, { type: 'Admitted', status: 'True' });
    if (isAdmitted) {
      atLeastOneAdmitted = true;
    }
  });

  return atLeastOneAdmitted ? 'Accepted' : 'Rejected';
};

export const RouteStatus: React.FC<RouteStatusProps> = ({ obj: route }) => {
  const status: string = routeStatus(route);
  return <Status status={status} />;
};
RouteStatus.displayName = 'RouteStatus';

const tableColumnClasses = [
  '',
  '',
  // Status is less important than Location, so hide it earlier, but maintain its position for consistency with other tables
  css('pf-m-hidden', 'pf-m-visible-on-lg', 'pf-v6-u-w-16-on-lg'),
  css('pf-m-hidden', 'pf-m-visible-on-sm'),
  css('pf-m-hidden', 'pf-m-visible-on-lg'),
  Kebab.columnClass,
];

const kind = 'Route';

const RouteTableRow: React.FC<RowFunctionArgs<RouteKind>> = ({ obj: route }) => {
  return (
    <>
      <TableData className={tableColumnClasses[0]}>
        <ResourceLink kind={kind} name={route.metadata.name} namespace={route.metadata.namespace} />
      </TableData>
      <TableData className={css(tableColumnClasses[1], 'co-break-word')} columnID="namespace">
        <ResourceLink kind="Namespace" name={route.metadata.namespace} />
      </TableData>
      <TableData className={tableColumnClasses[2]}>
        <RouteStatus obj={route} />
      </TableData>
      <TableData className={css(tableColumnClasses[3], 'co-break-word')}>
        <RouteLocation obj={route} />
      </TableData>
      <TableData className={tableColumnClasses[4]}>
        <ResourceLink
          kind="Service"
          name={route.spec.to.name}
          namespace={route.metadata.namespace}
          title={route.spec.to.name}
        />
      </TableData>
      <TableData className={tableColumnClasses[5]}>
        <ResourceKebab actions={menuActions} kind={kind} resource={route} />
      </TableData>
    </>
  );
};

const TLSSettings: React.FC<TLSSettingsProps> = ({ route }) => {
  const [showKey, setShowKey] = React.useState(false);
  const { t } = useTranslation();
  const { tls } = route.spec;
  if (!tls) {
    return <>{t('public~TLS is not enabled')}.</>;
  }

  const visibleKeyValue = showKey ? tls.key : <MaskedData />;
  return (
    <DescriptionList>
      <DetailsItem label={t('public~Termination type')} obj={route} path="spec.tls.termination" />
      <DetailsItem
        label={t('public~Insecure traffic')}
        obj={route}
        path="spec.tls.insecureEdgeTerminationPolicy"
      />
      <DetailsItem label={t('public~Certificate')} obj={route} path="spec.tls.certificate">
        {tls.certificate ? <CopyToClipboard value={tls.certificate} /> : '-'}
      </DetailsItem>
      <DescriptionListGroup>
        <DescriptionListTerm className="co-m-route-tls-reveal__title">
          {t('public~Key')}{' '}
          {tls.key && (
            <Button
              className="pf-m-link--align-left"
              type="button"
              onClick={() => setShowKey(!showKey)}
              variant="link"
            >
              {showKey ? (
                <>
                  <EyeSlashIcon className="co-icon-space-r" />
                  {t('public~Hide')}
                </>
              ) : (
                <>
                  <EyeIcon className="co-icon-space-r" />
                  {t('public~Reveal')}
                </>
              )}
            </Button>
          )}
        </DescriptionListTerm>
        <DescriptionListDescription>
          {tls.key ? <CopyToClipboard value={tls.key} visibleValue={visibleKeyValue} /> : '-'}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DetailsItem label={t('public~CA certificate')} obj={route} path="spec.tls.caCertificate">
        {tls.certificate ? <CopyToClipboard value={tls.caCertificate} /> : '-'}
      </DetailsItem>
      {tls.termination === 'reencrypt' && (
        <DetailsItem
          label={t('public~Destination CA certificate')}
          obj={route}
          path="spec.tls.destinationCACertificate"
        >
          {tls.destinationCACertificate ? (
            <CopyToClipboard value={tls.destinationCACertificate} />
          ) : (
            '-'
          )}
        </DetailsItem>
      )}
    </DescriptionList>
  );
};

const calcTrafficPercentage = (weight: number, route: any) => {
  if (!weight) {
    return '-';
  }

  const totalWeight = _.reduce(
    route.spec.alternateBackends,
    (result, alternate) => {
      return (result += alternate.weight);
    },
    route.spec.to.weight,
  );

  const percentage = (weight / totalWeight) * 100;

  return `${percentage.toFixed(1)}%`;
};

const getIngressStatusForHost = (
  hostname: string,
  ingresses: RouteIngress[],
): IngressStatusProps => {
  return _.find(ingresses, { host: hostname }) as IngressStatusProps;
};

const showCustomRouteHelp = (
  ingress: RouteIngress,
  annotations: RouteKind['metadata']['annotations'],
) => {
  if (!ingress || !_.some(ingress.conditions, { type: 'Admitted', status: 'True' })) {
    return false;
  }

  if (_.get(annotations, 'openshift.io/host.generated') === 'true') {
    return false;
  }

  if (!ingress.host || !ingress.routerCanonicalHostname) {
    return false;
  }

  return true;
};

const RouteTargetRow: React.FC<RouteTargetRowProps> = ({ route, target }) => (
  <tr className="pf-v6-c-table__tr">
    <td className="pf-v6-c-table__td">
      <ResourceLink
        kind={target.kind}
        name={target.name}
        namespace={route.metadata.namespace}
        title={target.name}
      />
    </td>
    <td className="pf-v6-c-table__td">{target.weight}</td>
    <td className="pf-v6-c-table__td">{calcTrafficPercentage(target.weight, route)}</td>
  </tr>
);

const CustomRouteHelp: React.FC<CustomRouteHelpProps> = ({ host, routerCanonicalHostname }) => {
  const { t } = useTranslation();
  return (
    <Popover
      headerContent={<>{t('public~Custom route')}</>}
      bodyContent={
        <div>
          <p>
            <Trans t={t} ns="public">
              To use a custom route, you must update your DNS provider by creating a canonical name
              (CNAME) record. Your CNAME record should point to your custom domain{' '}
              <strong>{{ host }}</strong>, to the OpenShift canonical router hostname,{' '}
              <strong>{{ routerCanonicalHostname }}</strong>, as the alias.
            </Trans>
          </p>
        </div>
      }
    >
      <Button
        icon={<QuestionCircleIcon />}
        className="pf-m-link--align-left"
        type="button"
        variant="link"
      >
        {t('public~Do you need to set up custom DNS?')}
      </Button>
    </Popover>
  );
};

const RouteIngressStatus: React.FC<RouteIngressStatusProps> = ({ route }) => {
  const { t } = useTranslation();
  return (
    <>
      {_.map(route.status.ingress, (ingress: RouteIngress) => (
        <div key={ingress.routerName} className="co-m-route-ingress-status">
          <SectionHeading
            text={`${t('public~Router: {{routerName}}', {
              routerName: ingress.routerName,
            })}`}
          />
          <DescriptionList>
            <DetailsItem label={t('public~Host')} obj={route} path="status.ingress.host">
              {ingress.host}
            </DetailsItem>
            <DetailsItem
              label={t('public~Wildcard policy')}
              obj={route}
              path="status.ingress.wildcardPolicy"
            >
              {ingress.wildcardPolicy}
            </DetailsItem>
            <DetailsItem
              label={t('public~Router canonical hostname')}
              obj={route}
              path="status.ingress.routerCanonicalHostname"
            >
              <div>{ingress.routerCanonicalHostname || '-'}</div>
              {showCustomRouteHelp(ingress, route.metadata.annotations) && (
                <CustomRouteHelp
                  host={ingress.host}
                  routerCanonicalHostname={ingress.routerCanonicalHostname}
                />
              )}
            </DetailsItem>
          </DescriptionList>
          <TertiaryHeading altSpacing="pf-v6-u-my-xl">{t('public~Conditions')}</TertiaryHeading>
          <Conditions conditions={ingress.conditions} />
        </div>
      ))}
    </>
  );
};

const RouteDetails: React.FC<RoutesDetailsProps> = ({ obj: route }) => {
  const { t } = useTranslation();
  const primaryIngressStatus: IngressStatusProps = getIngressStatusForHost(
    route.spec.host,
    route.status.ingress,
  );
  return (
    <>
      <PaneBody>
        <SectionHeading text={t('public~Route details')} />
        <Grid hasGutter>
          <GridItem sm={6}>
            <ResourceSummary resource={route}>
              <DetailsItem label={t('public~Service')} obj={route} path="spec.to.name">
                <ResourceLink
                  kind={route.spec.to.kind}
                  name={route.spec.to.name}
                  namespace={route.metadata.namespace}
                  title={route.spec.to.name}
                />
              </DetailsItem>
              <DetailsItem
                label={t('public~Target port')}
                obj={route}
                path="spec.port.targetPort"
              />
            </ResourceSummary>
          </GridItem>
          <GridItem sm={6}>
            <DescriptionList>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('public~Location')}</DescriptionListTerm>
                <DescriptionListDescription>
                  <RouteLocation obj={route} />
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('public~Status')}</DescriptionListTerm>
                <DescriptionListDescription>
                  <RouteStatus obj={route} />
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DetailsItem label={t('public~Host')} obj={route} path="spec.host" />
              <DetailsItem label={t('public~Path')} obj={route} path="spec.path" />
              {primaryIngressStatus && (
                <DetailsItem
                  label={t('public~Router canonical hostname')}
                  obj={route}
                  path="status.ingress.routerCanonicalHostname"
                >
                  <div>{primaryIngressStatus.routerCanonicalHostname || '-'}</div>
                  {showCustomRouteHelp(primaryIngressStatus, route.metadata.annotations) && (
                    <CustomRouteHelp
                      host={primaryIngressStatus.host}
                      routerCanonicalHostname={primaryIngressStatus.routerCanonicalHostname}
                    />
                  )}
                </DetailsItem>
              )}
            </DescriptionList>
          </GridItem>
        </Grid>
      </PaneBody>
      <PaneBody>
        <SectionHeading text={t('public~TLS settings')} />
        <TLSSettings route={route} />
      </PaneBody>
      {!_.isEmpty(route.spec.alternateBackends) && (
        <PaneBody>
          <SectionHeading text={t('public~Traffic')} />
          <p className="co-m-pane__explanation">
            {t('public~This route splits traffic across multiple services.')}
          </p>
          <div className="co-table-container">
            <table className="pf-v6-c-table pf-m-compact pf-m-border-rows">
              <thead className="pf-v6-c-table__thead">
                <tr className="pf-v6-c-table__tr">
                  <th className="pf-v6-c-table__th">{t('public~Service')}</th>
                  <th className="pf-v6-c-table__th">{t('public~Weight')}</th>
                  <th className="pf-v6-c-table__th">{t('public~Percent')}</th>
                </tr>
              </thead>
              <tbody className="pf-v6-c-table__tbody">
                <RouteTargetRow route={route} target={route.spec.to} />
                {_.map(route.spec.alternateBackends, (alternate, i) => (
                  <RouteTargetRow key={i} route={route} target={alternate} />
                ))}
              </tbody>
            </table>
          </div>
        </PaneBody>
      )}
      {_.isEmpty(route.status.ingress) ? (
        <ConsoleEmptyState>{t('public~No route status')}</ConsoleEmptyState>
      ) : (
        <PaneBody>
          <RouteIngressStatus route={route} />
        </PaneBody>
      )}
    </>
  );
};

export const RoutesDetailsPage = connectToFlags<RoutesDetailsPageProps>(
  FLAGS.CAN_GET_NS,
)((props) => (
  <DetailsPage
    {..._.omit(props, 'flags')}
    getResourceStatus={routeStatus}
    kind={RoutesReference}
    menuActions={menuActions}
    pages={[
      navFactory.details(detailsPage(RouteDetails)),
      ...(props.flags[FLAGS.CAN_GET_NS] ? [navFactory.metrics(RouteMetrics)] : []),
      navFactory.editYaml(),
    ]}
  />
));

export const RoutesList: React.FC = (props) => {
  const { t } = useTranslation();
  const RouteTableHeader = () => {
    return [
      {
        title: t('public~Name'),
        sortField: 'metadata.name',
        transforms: [sortable],
        props: { className: tableColumnClasses[0] },
      },
      {
        title: t('public~Namespace'),
        sortField: 'metadata.namespace',
        transforms: [sortable],
        props: { className: tableColumnClasses[1] },
        id: 'namespace',
      },
      {
        title: t('public~Status'),
        props: { className: tableColumnClasses[2] },
      },
      {
        title: t('public~Location'),
        sortField: 'spec.host',
        transforms: [sortable],
        props: { className: tableColumnClasses[3] },
      },
      {
        title: t('public~Service'),
        sortField: 'spec.to.name',
        transforms: [sortable],
        props: { className: tableColumnClasses[4] },
      },
      {
        title: '',
        props: { className: tableColumnClasses[5] },
      },
    ];
  };
  return (
    <Table
      {...props}
      aria-label={t('public~Routes')}
      Header={RouteTableHeader}
      Row={RouteTableRow}
      virtualize
    />
  );
};

export const RoutesPage: React.FC<RoutesPageProps> = (props) => {
  const { t } = useTranslation();
  const createProps = {
    to: `/k8s/ns/${props.namespace || 'default'}/routes/~new/form`,
  };

  const filters = [
    {
      filterGroupName: t('public~Status'),
      type: 'route-status',
      reducer: routeStatus,
      items: [
        { id: 'Accepted', title: t('public~Accepted') },
        { id: 'Rejected', title: t('public~Rejected') },
        { id: 'Pending', title: t('public~Pending') },
      ],
    },
  ];

  return (
    <ListPage
      ListComponent={RoutesList}
      kind={RoutesReference}
      canCreate={true}
      createProps={createProps}
      rowFilters={filters}
      {...props}
    />
  );
};

export type RouteHostnameProps = {
  obj: RouteKind;
};

export type RouteStatusProps = {
  obj: RouteKind;
};

export type RouteTargetRowProps = {
  route: RouteKind;
  target: RouteTarget;
};

export type TLSSettingsProps = {
  route: RouteKind;
};

export type RouteHeaderProps = {
  obj: RouteKind;
};

export type RoutesPageProps = {
  obj: RouteKind;
  namespace: string;
};

export type RoutesDetailsProps = {
  obj: RouteKind;
};

export type RoutesDetailsPageProps = {
  match: any;
} & WithFlagsProps;

export type RouteIngressStatusProps = {
  route: RouteKind;
};

export type RouteLinkAndCopyProps = {
  route: RouteKind;
  className?: React.ComponentProps<typeof ExternalLinkWithCopy>['className'];
};

export type CustomRouteHelpProps = {
  host: string;
  routerCanonicalHostname: string;
};
