import * as _ from 'lodash-es';
import { useTranslation } from 'react-i18next';
import { css } from '@patternfly/react-styles';
import { sortable } from '@patternfly/react-table';

import PaneBody from '@console/shared/src/components/layout/PaneBody';
import { DetailsPage, ListPage, Table, TableData } from './factory';
import {
  DetailsItem,
  Kebab,
  LabelList,
  ResourceIcon,
  ResourceKebab,
  ResourceLink,
  ResourceSummary,
  SectionHeading,
  Selector,
  navFactory,
} from './utils';
import { ServiceModel } from '../models';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';

const menuActions = [
  Kebab.factory.ModifyPodSelector,
  ...Kebab.getExtensionsActionsForKind(ServiceModel),
  ...Kebab.factory.common,
];

const ServiceLocation = ({ s }) => {
  const { t } = useTranslation();
  switch (s.spec.type) {
    case 'NodePort': {
      const clusterIP = s.spec.clusterIP ? `${s.spec.clusterIP}:` : '';
      return _.map(s.spec.ports, (portObj, i) => {
        return (
          <div key={i} className="co-truncate co-select-to-copy">
            {clusterIP}
            {portObj.nodePort}
          </div>
        );
      });
    }

    case 'LoadBalancer': {
      if (!s.status?.loadBalancer?.ingress?.length) {
        return <div className="co-truncate">{t('public~Pending')}</div>;
      }
      return _.map(s.status.loadBalancer.ingress, (ingress, i) => {
        return (
          <div key={i} className="co-truncate co-select-to-copy">
            {ingress.hostname || ingress.ip || '-'}
          </div>
        );
      });
    }

    case 'ExternalName': {
      return _.map(s.spec.ports, (portObj, i) => {
        const externalName = s.spec.externalName ? `${s.spec.externalName}:` : '';
        return (
          <div key={i} className="co-truncate co-select-to-copy">
            {externalName}
            {portObj.port}
          </div>
        );
      });
    }

    default: {
      if (s.spec.clusterIP === 'None') {
        return <div className="co-truncate">{t('public~None')}</div>;
      }
      return _.map(s.spec.ports, (portObj, i) => {
        const clusterIP = s.spec.clusterIP ? `${s.spec.clusterIP}:` : '';
        return (
          <div key={i} className="co-truncate co-select-to-copy">
            {clusterIP}
            {portObj.port}
          </div>
        );
      });
    }
  }
};

const kind = 'Service';

const tableColumnClasses = [
  'pf-v6-u-w-25-on-xl',
  'pf-m-hidden pf-m-visible-on-md',
  'pf-m-hidden pf-m-visible-on-lg',
  'pf-m-hidden pf-m-visible-on-xl',
  'pf-m-hidden pf-m-visible-on-xl',
  Kebab.columnClass,
];

const ServiceTableRow = ({ obj: s }) => {
  return (
    <>
      <TableData className={tableColumnClasses[0]}>
        <ResourceLink kind={kind} name={s.metadata.name} namespace={s.metadata.namespace} />
      </TableData>
      <TableData className={css(tableColumnClasses[1], 'co-break-word')} columnID="namespace">
        <ResourceLink kind="Namespace" name={s.metadata.namespace} />
      </TableData>
      <TableData className={tableColumnClasses[2]}>
        <LabelList kind={kind} labels={s.metadata.labels} />
      </TableData>
      <TableData className={tableColumnClasses[3]}>
        <Selector selector={s.spec.selector} namespace={s.metadata.namespace} />
      </TableData>
      <TableData className={tableColumnClasses[4]}>
        <ServiceLocation s={s} />
      </TableData>
      <TableData className={tableColumnClasses[5]}>
        <ResourceKebab actions={menuActions} kind={kind} resource={s} />
      </TableData>
    </>
  );
};

const ServiceAddress = ({ s }) => {
  const { t } = useTranslation();
  const ServiceIPsRow = (name, desc, ips, note = null) => (
    <div className="co-ip-row">
      <div className="row">
        <div className="col-xs-6">
          <p className="ip-name">{name}</p>
          <p className="ip-desc">{desc}</p>
        </div>
        <div className="col-xs-6">
          {note && <span className="pf-v6-u-text-color-subtle">{note}</span>}
          {ips.join(', ')}
        </div>
      </div>
    </div>
  );

  const ServiceType = (type) => {
    switch (type) {
      case 'NodePort':
        return ServiceIPsRow(
          t('public~Node port'),
          t('public~Accessible outside the cluster'),
          _.map(s.spec.ports, 'nodePort'),
          t('public~(all nodes): '),
        );
      case 'LoadBalancer':
        return ServiceIPsRow(
          t('public~External load balancer'),
          t('public~Ingress points of load balancer'),
          _.map(s.status.loadBalancer.ingress, (i) => i.hostname || i.ip || '-'),
        );
      case 'ExternalName':
        return ServiceIPsRow(
          t('public~External service name'),
          t('public~Location of the resource that backs the service'),
          [s.spec.externalName],
        );
      default:
        return ServiceIPsRow(
          t('public~Cluster IP'),
          t('public~Accessible within the cluster only'),
          [s.spec.clusterIP],
        );
    }
  };

  return (
    <div>
      <div className="row co-ip-header">
        <div className="col-xs-6">{t('public~Type')}</div>
        <div className="col-xs-6">{t('public~Location')}</div>
      </div>
      <div className="rows">
        {ServiceType(s.spec.type)}
        {s.spec.externalIPs &&
          ServiceIPsRow(
            t('public~External IP'),
            t('public~IP Addresses accepting traffic for service'),
            s.spec.externalIPs,
          )}
      </div>
    </div>
  );
};

const ServicePortMapping = ({ ports }) => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="row co-ip-header">
        <div className="col-xs-3">{t('public~Name')}</div>
        <div className="col-xs-3">{t('public~Port')}</div>
        <div className="col-xs-3">{t('public~Protocol')}</div>
        <div className="col-xs-3">{t('public~Pod port or name')}</div>
      </div>
      <div className="rows">
        {ports.map((portObj, i) => {
          return (
            <div className="co-ip-row" key={i}>
              <div className="row">
                <div className="col-xs-3 co-text-service">
                  <p>{portObj.name || '-'}</p>
                  {portObj.nodePort && <p className="co-text-node">{t('public~Node port')}</p>}
                </div>
                <div className="col-xs-3 co-text-service">
                  <p>
                    <ResourceIcon kind="Service" />
                    <span>{portObj.port}</span>
                  </p>
                  {portObj.nodePort && (
                    <p className="co-text-node">
                      <ResourceIcon kind="Node" />
                      <span>{portObj.nodePort}</span>
                    </p>
                  )}
                </div>
                <div className="col-xs-3">
                  <p>{portObj.protocol}</p>
                </div>
                <div className="col-xs-3 co-text-pod">
                  <p>
                    <ResourceIcon kind="Pod" />
                    <span>{portObj.targetPort}</span>
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Details = ({ obj: s }) => {
  const { t } = useTranslation();
  return (
    <PaneBody>
      <div className="row">
        <div className="col-md-6">
          <SectionHeading text={t('public~Service details')} />
          <ResourceSummary resource={s} showPodSelector>
            <DetailsItem label={t('public~Session affinity')} obj={s} path="spec.sessionAffinity" />
          </ResourceSummary>
        </div>
        <div className="col-md-6">
          <SectionHeading text={t('public~Service routing')} />
          <DescriptionList>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('public~Hostname')}</DescriptionListTerm>
              <DescriptionListDescription>
                <div className="co-select-to-copy">
                  {s.metadata.name}.{s.metadata.namespace}.svc.cluster.local
                </div>
                <div>{t('public~Accessible within the cluster only')}</div>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('public~Service address')}</DescriptionListTerm>
              <DescriptionListDescription className="service-ips">
                <ServiceAddress s={s} />
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DetailsItem label={t('public~Service port mapping')} obj={s} path="spec.ports">
              <div className="service-ips">
                {s.spec.ports ? <ServicePortMapping ports={s.spec.ports} /> : '-'}
              </div>
            </DetailsItem>
          </DescriptionList>
        </div>
      </div>
    </PaneBody>
  );
};

const ServicesDetailsPage = (props) => (
  <DetailsPage
    {...props}
    menuActions={menuActions}
    pages={[navFactory.details(Details), navFactory.editYaml(), navFactory.pods()]}
  />
);

const ServicesList = (props) => {
  const { t } = useTranslation();
  const ServiceTableHeader = () => {
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
        title: t('public~Labels'),
        sortField: 'metadata.labels',
        transforms: [sortable],
        props: { className: tableColumnClasses[2] },
      },
      {
        title: t('public~Pod selector'),
        sortField: 'spec.selector',
        transforms: [sortable],
        props: { className: tableColumnClasses[3] },
      },
      {
        title: t('public~Location'),
        sortField: 'spec.clusterIP',
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
      aria-label={t('public~Services')}
      Header={ServiceTableHeader}
      Row={ServiceTableRow}
      virtualize
    />
  );
};

const ServicesPage = (props) => (
  <ListPage canCreate={true} ListComponent={ServicesList} {...props} />
);

export { ServicesList, ServicesPage, ServicesDetailsPage };
