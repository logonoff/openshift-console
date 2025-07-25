import * as React from 'react';
import { sortable } from '@patternfly/react-table';
import { css } from '@patternfly/react-styles';
import { useTranslation } from 'react-i18next';
import {
  getMachineAddresses,
  getMachineInstanceType,
  getMachineNodeName,
  getMachineRegion,
  getMachineRole,
  getMachineZone,
  Status,
  getMachinePhase,
} from '@console/shared';
import { ListPageBody, RowProps, TableColumn } from '@console/dynamic-plugin-sdk';
import { MachineModel } from '../models';
import { MachineKind, referenceForModel, Selector } from '../module/k8s';
import { Conditions } from './conditions';
import NodeIPList from '@console/app/src/components/nodes/NodeIPList';
import { useExactSearch } from '@console/app/src/components/user-preferences/search/useExactSearch';
import PaneBody from '@console/shared/src/components/layout/PaneBody';
import { DetailsPage } from './factory';
import ListPageFilter from './factory/ListPage/ListPageFilter';
import ListPageHeader from './factory/ListPage/ListPageHeader';
import { useListPageFilter } from './factory/ListPage/filter-hook';
import ListPageCreate from './factory/ListPage/ListPageCreate';
import {
  DetailsItem,
  Kebab,
  NodeLink,
  ResourceKebab,
  ResourceLink,
  ResourceSummary,
  SectionHeading,
  navFactory,
} from './utils';
import { ResourceEventStream } from './events';
import { useK8sWatchResource } from './utils/k8s-watch-hook';
import VirtualizedTable, { TableData } from './factory/Table/VirtualizedTable';
import { sortResourceByValue } from './factory/Table/sort';
import { useActiveColumns } from './factory/Table/active-columns-hook';
import { tableFilters } from './factory/table-filters';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Grid,
  GridItem,
} from '@patternfly/react-core';

const { common } = Kebab.factory;
const menuActions = [...Kebab.getExtensionsActionsForKind(MachineModel), ...common];
export const machineReference = referenceForModel(MachineModel);

const tableColumnInfo = [
  { className: '', id: 'name' },
  { className: '', id: 'namespace' },
  { className: css('pf-m-hidden', 'pf-m-visible-on-sm'), id: 'nodeRef' },
  { className: css('pf-m-hidden', 'pf-m-visible-on-md'), id: 'phase' },
  { className: css('pf-m-hidden', 'pf-m-visible-on-lg'), id: 'provider' },
  { className: css('pf-m-hidden', 'pf-m-visible-on-xl'), id: 'region' },
  { className: css('pf-m-hidden', 'pf-m-visible-on-xl'), id: 'avail' },
  { className: Kebab.columnClass, id: '' },
];

const getMachineProviderState = (obj: MachineKind): string =>
  obj?.status?.providerStatus?.instanceState;

const MachineTableRow: React.FC<RowProps<MachineKind>> = ({ obj, activeColumnIDs }) => {
  const nodeName = getMachineNodeName(obj);
  const region = getMachineRegion(obj);
  const zone = getMachineZone(obj);
  const providerState = getMachineProviderState(obj);
  return (
    <>
      <TableData
        {...tableColumnInfo[0]}
        className={css(tableColumnInfo[0].className, 'co-break-word')}
        activeColumnIDs={activeColumnIDs}
      >
        <ResourceLink
          kind={machineReference}
          name={obj.metadata.name}
          namespace={obj.metadata.namespace}
        />
      </TableData>
      <TableData
        {...tableColumnInfo[1]}
        className={css(tableColumnInfo[1].className, 'co-break-word')}
        activeColumnIDs={activeColumnIDs}
      >
        <ResourceLink kind="Namespace" name={obj.metadata.namespace} />
      </TableData>
      <TableData {...tableColumnInfo[2]} activeColumnIDs={activeColumnIDs}>
        {nodeName ? <NodeLink name={nodeName} /> : '-'}
      </TableData>
      <TableData {...tableColumnInfo[3]} activeColumnIDs={activeColumnIDs}>
        <Status status={getMachinePhase(obj)} />
      </TableData>
      <TableData {...tableColumnInfo[4]} activeColumnIDs={activeColumnIDs}>
        {providerState ?? '-'}
      </TableData>
      <TableData {...tableColumnInfo[5]} activeColumnIDs={activeColumnIDs}>
        {region || '-'}
      </TableData>
      <TableData {...tableColumnInfo[6]} activeColumnIDs={activeColumnIDs}>
        {zone || '-'}
      </TableData>
      <TableData {...tableColumnInfo[7]} activeColumnIDs={activeColumnIDs}>
        <ResourceKebab actions={menuActions} kind={machineReference} resource={obj} />
      </TableData>
    </>
  );
};

const MachineDetails: React.SFC<MachineDetailsProps> = ({ obj }: { obj: MachineKind }) => {
  const nodeName = getMachineNodeName(obj);
  const machineRole = getMachineRole(obj);
  const instanceType = getMachineInstanceType(obj);
  const region = getMachineRegion(obj);
  const zone = getMachineZone(obj);
  const providerState = getMachineProviderState(obj);
  const { t } = useTranslation();
  return (
    <>
      <PaneBody>
        <SectionHeading text={t('public~Machine details')} />
        <Grid hasGutter>
          <GridItem sm={6}>
            <ResourceSummary resource={obj} />
          </GridItem>
          <GridItem sm={6}>
            <DescriptionList>
              <DetailsItem label={t('public~Phase')} obj={obj} path="status.phase">
                <Status status={getMachinePhase(obj)} />
              </DetailsItem>
              <DetailsItem
                label={t('public~Provider state')}
                obj={obj}
                path="status.providerStatus.instanceState"
              >
                {providerState}
              </DetailsItem>
              {nodeName && (
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('public~Node')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    <NodeLink name={nodeName} />
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}
              {machineRole && (
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('public~Machine role')}</DescriptionListTerm>
                  <DescriptionListDescription>{machineRole}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
              {instanceType && (
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('public~Instance type')}</DescriptionListTerm>
                  <DescriptionListDescription>{instanceType}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
              {region && (
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('public~Region')}</DescriptionListTerm>
                  <DescriptionListDescription>{region}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
              {zone && (
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('public~Availability zone')}</DescriptionListTerm>
                  <DescriptionListDescription>{zone}</DescriptionListDescription>
                </DescriptionListGroup>
              )}
              <DescriptionListGroup>
                <DescriptionListTerm>{t('public~Machine addresses')}</DescriptionListTerm>
                <DescriptionListDescription>
                  <NodeIPList ips={getMachineAddresses(obj)} expand />
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </GridItem>
        </Grid>
      </PaneBody>
      <PaneBody>
        <SectionHeading text={t('public~Conditions')} />
        <Conditions conditions={obj.status?.providerStatus?.conditions} />
      </PaneBody>
    </>
  );
};

type MachineListProps = {
  data: MachineKind[];
  unfilteredData: MachineKind[];
  loaded: boolean;
  loadError: any;
};

export const MachineList: React.FC<MachineListProps> = (props) => {
  const { t } = useTranslation();

  const machineTableColumns = React.useMemo<TableColumn<MachineKind>[]>(
    () => [
      {
        title: t('public~Name'),
        sort: 'metadata.name',
        transforms: [sortable],
        props: { className: tableColumnInfo[0].className },
        id: tableColumnInfo[0].id,
      },
      {
        title: t('public~Namespace'),
        sort: 'metadata.namespace',
        transforms: [sortable],
        props: { className: tableColumnInfo[1].className },
        id: tableColumnInfo[1].id,
      },
      {
        title: t('public~Node'),
        sort: 'status.nodeRef.name',
        transforms: [sortable],
        props: { className: tableColumnInfo[2].className },
        id: tableColumnInfo[2].id,
      },
      {
        title: t('public~Phase'),
        sort: (data, direction) => data.sort(sortResourceByValue(direction, getMachinePhase)),
        transforms: [sortable],
        props: { className: tableColumnInfo[3].className },
        id: tableColumnInfo[3].id,
      },
      {
        title: t('public~Provider state'),
        sort: 'status.providerStatus.instanceState',
        transforms: [sortable],
        props: { className: tableColumnInfo[4].className },
        id: tableColumnInfo[4].id,
      },
      {
        title: t('public~Region'),
        sort: "metadata.labels['machine.openshift.io/region']",
        transforms: [sortable],
        props: { className: tableColumnInfo[5].className },
        id: tableColumnInfo[5].id,
      },
      {
        title: t('public~Availability zone'),
        sort: "metadata.labels['machine.openshift.io/zone']",
        transforms: [sortable],
        props: { className: tableColumnInfo[6].className },
        id: tableColumnInfo[6].id,
      },
      {
        title: '',
        props: { className: tableColumnInfo[7].className },
        id: tableColumnInfo[7].id,
      },
    ],
    [t],
  );

  const [columns] = useActiveColumns({ columns: machineTableColumns });

  return (
    <VirtualizedTable<MachineKind>
      {...props}
      aria-label={t('public~Machines')}
      label={t('public~Machines')}
      columns={columns}
      Row={MachineTableRow}
    />
  );
};

export const MachinePage: React.FC<MachinePageProps> = ({
  selector,
  namespace,
  showTitle = true,
  hideLabelFilter,
  hideNameLabelFilters,
  hideColumnManagement,
}) => {
  const { t } = useTranslation();
  const [isExactSearch] = useExactSearch();

  const [machines, loaded, loadError] = useK8sWatchResource<MachineKind[]>({
    kind: referenceForModel(MachineModel),
    isList: true,
    selector,
    namespace,
  });
  const createAccessReview = {
    groupVersionKind: referenceForModel(MachineModel),
    namespace: namespace || 'default',
  };
  const machineFilter = [
    { type: 'name', filterGroupName: 'Machine', filter: tableFilters(isExactSearch).machine },
  ];
  const [data, filteredData, onFilterChange] = useListPageFilter(machines, machineFilter);

  return (
    <>
      <ListPageHeader title={showTitle ? t(MachineModel.labelPluralKey) : undefined}>
        <ListPageCreate
          createAccessReview={createAccessReview}
          groupVersionKind={referenceForModel(MachineModel)}
        >
          {t('public~Create Machine')}
        </ListPageCreate>
      </ListPageHeader>
      <ListPageBody>
        <ListPageFilter
          data={data}
          loaded={loaded}
          onFilterChange={onFilterChange}
          hideNameLabelFilters={hideNameLabelFilters}
          hideLabelFilter={hideLabelFilter}
          hideColumnManagement={hideColumnManagement}
        />
        <MachineList
          data={filteredData}
          unfilteredData={machines}
          loaded={loaded}
          loadError={loadError}
        />
      </ListPageBody>
    </>
  );
};

export const MachineDetailsPage: React.SFC = (props) => (
  <DetailsPage
    {...props}
    kind={machineReference}
    menuActions={menuActions}
    pages={[
      navFactory.details(MachineDetails),
      navFactory.editYaml(),
      navFactory.events(ResourceEventStream),
    ]}
    getResourceStatus={getMachinePhase}
  />
);

export type MachineDetailsProps = {
  obj: MachineKind;
};

export type MachinePageProps = {
  showTitle?: boolean;
  namespace?: string;
  selector?: Selector;
  hideLabelFilter?: boolean;
  hideNameLabelFilters?: boolean;
  hideColumnManagement?: boolean;
};
