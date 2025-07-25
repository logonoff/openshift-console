import * as _ from 'lodash-es';
import * as React from 'react';
import { DocumentTitle } from '@console/shared/src/components/document-title/DocumentTitle';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom-v5-compat';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  Button,
  ButtonVariant,
  PageSection,
  Toolbar,
  ToolbarLabel,
  ToolbarContent,
  ToolbarFilter,
  ToolbarItem,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon';
import { MinusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/minus-circle-icon';
import { getBadgeFromType, usePinnedResources } from '@console/shared';
import { DefaultPage } from './default-resource';
import { requirementFromString } from '../module/k8s/selector-requirement';
import { ResourceListDropdown } from './resource-dropdown';
import { getResourceListPages } from './resource-pages';
import { withStartGuide } from './start-guide';
import { split, selectorFromString } from '../module/k8s/selector';
import {
  kindForReference,
  modelFor,
  referenceForModel,
  K8sResourceKindReference,
} from '../module/k8s';
import {
  LoadingBox,
  ConsoleEmptyState,
  ResourceIcon,
  setQueryArgument,
  AsyncComponent,
} from './utils';
import { PageHeading } from '@console/shared/src/components/heading/PageHeading';
import confirmNavUnpinModal from '@console/app/src/components/nav/confirmNavUnpinModal';
import { SearchFilterDropdown, searchFilterValues } from './search-filter-dropdown';
import { useExtensions, isResourceListPage, ResourceListPage } from '@console/plugin-sdk';
import {
  ResourceListPage as DynamicResourceListPage,
  isResourceListPage as isDynamicResourceListPage,
  useActivePerspective,
} from '@console/dynamic-plugin-sdk';
import { useK8sModel } from '@console/dynamic-plugin-sdk/src/lib-core';

const ResourceList = ({ kind, mock, namespace, selector, nameFilter }) => {
  const { plural } = useParams();
  const [kindObj] = useK8sModel(kind || plural);
  const resourceListPageExtensions = useExtensions<ResourceListPage>(isResourceListPage);
  const dynamicResourceListPageExtensions = useExtensions<DynamicResourceListPage>(
    isDynamicResourceListPage,
  );
  if (!kindObj) {
    return <LoadingBox />;
  }

  const componentLoader = getResourceListPages(
    resourceListPageExtensions,
    dynamicResourceListPageExtensions,
  ).get(referenceForModel(kindObj), () => Promise.resolve(DefaultPage));
  const ns = kindObj.namespaced ? namespace : undefined;

  return (
    <AsyncComponent
      loader={componentLoader}
      namespace={ns}
      selector={selector}
      nameFilter={nameFilter}
      kind={kindObj.crd ? referenceForModel(kindObj) : kindObj.kind}
      showTitle={false}
      hideTextFilter
      autoFocus={false}
      mock={mock}
      badge={getBadgeFromType(kindObj.badge)}
      hideNameLabelFilters
      hideColumnManagement
    />
  );
};

const SearchPage_: React.FC<SearchProps> = (props) => {
  const [perspective] = useActivePerspective();
  const [selectedItems, setSelectedItems] = React.useState(new Set<string>([]));
  const [collapsedKinds, setCollapsedKinds] = React.useState(new Set<string>([]));
  const [labelFilter, setLabelFilter] = React.useState([]);
  const [labelFilterInput, setLabelFilterInput] = React.useState('');
  const [typeaheadNameFilter, setTypeaheadNameFilter] = React.useState('');
  const [pinnedResources, setPinnedResources, pinnedResourcesLoaded] = usePinnedResources();
  const { noProjectsAvailable } = props;
  const { t } = useTranslation();
  const { ns: namespace } = useParams();
  // Set state variables from the URL
  React.useEffect(() => {
    let kind: string, q: string, name: string;

    if (window.location.search) {
      const sp = new URLSearchParams(window.location.search);
      kind = sp.get('kind');
      q = sp.get('q');
      name = sp.get('name');
    }
    // Ensure that the "kind" route parameter is a valid resource kind ID
    kind = kind || '';
    if (kind !== '') {
      setSelectedItems(new Set(kind.split(',')));
    }
    const tags = split(q || '');
    const validTags = _.reject(tags, (tag) => requirementFromString(tag) === undefined);
    setLabelFilter(validTags);
    setTypeaheadNameFilter(name || '');
  }, []);

  const updateSelectedItems = (selection: string) => {
    const updateItems = selectedItems;
    updateItems.has(selection) ? updateItems.delete(selection) : updateItems.add(selection);
    setSelectedItems(updateItems);
    setQueryArgument('kind', [...updateItems].join(','));
  };

  const updateNewItems = (_filter: string, { key }: ToolbarLabel) => {
    const updateItems = selectedItems;
    updateItems.has(key) ? updateItems.delete(key) : updateItems.add(key);
    setSelectedItems(updateItems);
    setQueryArgument('kind', [...updateItems].join(','));
  };

  const clearSelectedItems = () => {
    setSelectedItems(new Set([]));
    setQueryArgument('kind', '');
  };

  const clearNameFilter = () => {
    setTypeaheadNameFilter('');
    setQueryArgument('name', '');
  };

  const clearLabelFilter = () => {
    setLabelFilter([]);
    setQueryArgument('q', '');
  };

  const clearAll = () => {
    clearSelectedItems();
    clearNameFilter();
    clearLabelFilter();
  };

  const pinToggle = (e: React.MouseEvent<HTMLElement>, resource: string) => {
    e.preventDefault();
    e.stopPropagation();
    const index = pinnedResources.indexOf(resource);
    if (index >= 0) {
      confirmNavUnpinModal(resource, pinnedResources, setPinnedResources);
      return;
    }
    setPinnedResources([resource, ...pinnedResources]);
  };

  const toggleKindExpanded = (kindView: string) => {
    const newCollasped = new Set(collapsedKinds);
    newCollasped.has(kindView) ? newCollasped.delete(kindView) : newCollasped.add(kindView);
    setCollapsedKinds(newCollasped);
  };

  const updateNameFilter = (value: string) => {
    setTypeaheadNameFilter(value);
    setQueryArgument('name', value);
  };

  const updateLabelFilter = (value: string, endOfString: boolean) => {
    setLabelFilterInput(value);
    if (requirementFromString(value) !== undefined && endOfString) {
      const updatedLabels = _.uniq([...labelFilter, value]);
      setLabelFilter(updatedLabels);
      setQueryArgument('q', updatedLabels.join(','));
      setLabelFilterInput('');
    }
  };

  const updateSearchFilter = (type: string, value: string, endOfString: boolean) => {
    type === searchFilterValues.Label
      ? updateLabelFilter(value, endOfString)
      : updateNameFilter(value);
  };

  const removeLabelFilter = (_filter: string, value: string) => {
    const newLabels = labelFilter.filter((keepItem: string) => keepItem !== value);
    setLabelFilter(newLabels);
    setQueryArgument('q', newLabels.join(','));
  };

  const getToggleText = (item: string) => {
    const model = modelFor(item);
    // API discovery happens asynchronously. Avoid runtime errors if the model hasn't loaded.
    if (!model) {
      return '';
    }
    const { labelPlural, labelPluralKey, apiVersion, apiGroup } = model;
    return (
      <span className="co-search-group__accordion-label">
        {labelPluralKey ? t(labelPluralKey) : labelPlural}{' '}
        <div className="pf-v6-u-font-size-xs pf-v6-u-text-color-subtle pf-v6-u-font-weight-normal pf-v6-u-ml-sm">
          {apiGroup || 'core'}/{apiVersion}
        </div>
      </span>
    );
  };

  const getChipText = (reference: K8sResourceKindReference) => {
    const model = modelFor(reference);
    // API discovery happens asynchronously. Avoid runtime errors if the model hasn't loaded.
    if (!model) {
      return kindForReference(reference);
    }
    return model.labelKey ? t(model.labelKey) : model.label;
  };

  return (
    <>
      <DocumentTitle>{t('public~Search')}</DocumentTitle>
      <PageHeading title={t('public~Search')} />
      <PageSection hasBodyWrapper={false}>
        <Toolbar
          id="search-toolbar"
          clearAllFilters={clearAll}
          collapseListedFiltersBreakpoint="xl"
          clearFiltersButtonText={t('public~Clear all filters')}
        >
          <ToolbarContent>
            <ToolbarItem>
              <ToolbarFilter
                deleteLabelGroup={clearSelectedItems}
                labels={[...selectedItems].map((resourceKind) => ({
                  key: resourceKind,
                  node: (
                    <>
                      <ResourceIcon kind={resourceKind} />
                      {getChipText(resourceKind)}
                    </>
                  ),
                }))}
                deleteLabel={updateNewItems}
                categoryName={t('public~Resource')}
                labelGroupCollapsedText={t('public~{{numRemaining}} more', {
                  numRemaining: '${remaining}',
                })}
                labelGroupExpandedText={t('public~Show less')}
              >
                <ResourceListDropdown
                  selected={[...selectedItems]}
                  onChange={updateSelectedItems}
                  recentList={true}
                />
              </ToolbarFilter>
            </ToolbarItem>
            <ToolbarItem className="co-search-group__filter">
              <ToolbarFilter
                deleteLabelGroup={clearLabelFilter}
                labels={[...labelFilter]}
                deleteLabel={removeLabelFilter}
                categoryName={t('public~Label')}
              >
                <ToolbarFilter
                  labels={typeaheadNameFilter.length > 0 ? [typeaheadNameFilter] : []}
                  deleteLabel={clearNameFilter}
                  categoryName={t('public~Name')}
                >
                  <SearchFilterDropdown
                    onChange={updateSearchFilter}
                    nameFilterInput={typeaheadNameFilter}
                    labelFilterInput={labelFilterInput}
                  />
                </ToolbarFilter>
              </ToolbarFilter>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
        <Accordion asDefinitionList={false}>
          {[...selectedItems].map((resource) => {
            const isCollapsed = collapsedKinds.has(resource);
            return (
              <AccordionItem
                isExpanded={!isCollapsed}
                key={resource}
                className="co-search__accordion"
              >
                <AccordionToggle
                  className="co-search__accordion-toggle"
                  onClick={() => toggleKindExpanded(resource)}
                  id={`${resource}-toggle`}
                >
                  {getToggleText(resource)}
                  {perspective !== 'admin' && pinnedResourcesLoaded && (
                    <Button
                      className="co-search-group__pin-toggle"
                      variant={ButtonVariant.link}
                      onClick={(e) => pinToggle(e, resource)}
                    >
                      {pinnedResources.includes(resource) ? (
                        <>
                          <MinusCircleIcon className="co-search-group__pin-toggle__icon" />
                          {t('public~Remove from navigation')}
                        </>
                      ) : (
                        <>
                          <PlusCircleIcon className="co-search-group__pin-toggle__icon" />
                          {t('public~Add to navigation')}
                        </>
                      )}
                    </Button>
                  )}
                </AccordionToggle>
                <AccordionContent>
                  {!isCollapsed && (
                    <ResourceList
                      kind={resource}
                      selector={selectorFromString(labelFilter.join(','))}
                      nameFilter={typeaheadNameFilter}
                      namespace={namespace}
                      mock={noProjectsAvailable}
                      key={resource}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
        {selectedItems.size === 0 && (
          <ConsoleEmptyState title={t('public~No resources selected')}>
            {<p>{t('public~Select one or more resources from the dropdown.')}</p>}
          </ConsoleEmptyState>
        )}
      </PageSection>
    </>
  );
};

export const SearchPage = withStartGuide(SearchPage_);

export type SearchProps = {
  namespace?: string;
  noProjectsAvailable?: boolean;
};
