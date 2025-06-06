import * as fuzzy from 'fuzzysearch';
import { TFunction } from 'i18next';
import { loadAll, safeDump, DEFAULT_SAFE_SCHEMA } from 'js-yaml';
import * as _ from 'lodash';
import { coFetchJSON } from '@console/internal/co-fetch';
import { Flatten } from '@console/internal/components/factory/list-page';
import { RowFilter } from '@console/internal/components/filter-toolbar';
import { K8sResourceKind, modelFor, referenceFor } from '@console/internal/module/k8s';
import { toTitleCase, WORKLOAD_TYPES } from '@console/shared';
import { CHART_NAME_ANNOTATION, PROVIDER_NAME_ANNOTATION } from '../catalog/utils/const';
import {
  HelmRelease,
  HelmChart,
  HelmReleaseStatus,
  HelmChartMetaData,
  HelmActionType,
  HelmActionConfigType,
  HelmActionOrigins,
  HelmChartEntries,
} from '../types/helm-types';

export const HelmReleaseStatusLabels = {
  [HelmReleaseStatus.Deployed]: 'Deployed',
  [HelmReleaseStatus.Failed]: 'Failed',
  [HelmReleaseStatus.PendingInstall]: 'PendingInstall',
  [HelmReleaseStatus.PendingUpgrade]: 'PendingUpgrade',
  [HelmReleaseStatus.PendingRollback]: 'PendingRollback',
  [HelmReleaseStatus.Other]: 'Other',
};

export const SelectedReleaseStatuses = [
  HelmReleaseStatus.Deployed,
  HelmReleaseStatus.Failed,
  HelmReleaseStatus.PendingInstall,
  HelmReleaseStatus.PendingUpgrade,
  HelmReleaseStatus.PendingRollback,
  HelmReleaseStatus.Other,
];

export const OtherReleaseStatuses = ['unknown', 'uninstalled', 'superseded', 'uninstalling'];

export const releaseStatus = (status: string) => {
  if (!status) {
    return 'Unknown';
  }
  return status
    .split('-')
    .map((s) => toTitleCase(s))
    .join('');
};

export const releaseStatusReducer = (release: HelmRelease) => {
  if (OtherReleaseStatuses.includes(release.info.status)) {
    return HelmReleaseStatus.Other;
  }
  return release.info.status;
};

export const helmReleasesRowFilters = (t: TFunction): RowFilter[] => {
  return [
    {
      filterGroupName: t('helm-plugin~Status'),
      type: 'helm-release-status',
      reducer: releaseStatusReducer,
      items: SelectedReleaseStatuses.map((status) => ({
        id: status,
        title: HelmReleaseStatusLabels[status],
      })),
    },
  ];
};

export const filterHelmReleasesByStatus = (releases: HelmRelease[], filter: string | string[]) => {
  return releases.filter((release: HelmRelease) => {
    return OtherReleaseStatuses.includes(release.info.status)
      ? filter.includes(HelmReleaseStatus.Other)
      : filter.includes(release.info.status);
  });
};

export const filterHelmReleasesByName = (releases: HelmRelease[], filter: string) => {
  return releases.filter((release: HelmRelease) => fuzzy(filter, release.name));
};

export const fetchHelmReleases = (
  namespace: string,
  limitInfo?: boolean,
): Promise<HelmRelease[]> => {
  const fetchString = namespace
    ? `/api/helm/releases?ns=${namespace}&limitInfo=${limitInfo || false}`
    : `/api/helm/releases?limitInfo=${limitInfo || false}`;
  return coFetchJSON(fetchString);
};

export const fetchHelmRelease = (
  namespace: string,
  helmReleaseName: string,
): Promise<HelmRelease> => {
  const fetchString = `/api/helm/release?ns=${namespace}&name=${helmReleaseName}`;
  return coFetchJSON(fetchString);
};

export const getChartURL = (
  helmChartData: HelmChartMetaData[],
  chartVersion: string,
  chartRepoName: string,
): string => {
  const chartData: HelmChartMetaData = helmChartData.find(
    (obj) => obj.version === chartVersion && obj.repoName === chartRepoName,
  );
  return chartData?.urls[0];
};

export const getChartRepositoryTitle = (
  chartRepositories: K8sResourceKind[],
  chartRepoName: string,
) => {
  const chartRepository = chartRepositories?.find((repo) => repo.metadata.name === chartRepoName);
  if (chartRepository?.spec?.name) {
    return chartRepository.spec.name;
  }
  if (chartRepoName) {
    return toTitleCase(chartRepoName);
  }
  return null;
};

export const getChartIndexEntry = (
  chartEntries: HelmChartEntries,
  chartName: string,
  chartRepoName: string,
) => {
  const repoName = chartRepoName?.toLowerCase().split(' ').join('-');
  const indexEntry = Object.keys(chartEntries).find((val) =>
    val.includes(`${chartName}--${repoName}`),
  );
  return indexEntry;
};

export const getChartEntriesByName = (
  chartEntries: HelmChartEntries,
  chartName: string,
  chartRepoName?: string,
  chartRepositories?: K8sResourceKind[],
  annotatedName?: string,
  providerName?: string,
): HelmChartMetaData[] => {
  if (chartName && chartRepoName) {
    const chartRepositoryTitle = getChartRepositoryTitle(chartRepositories, chartRepoName);
    const indexEntry = getChartIndexEntry(chartEntries, chartName, chartRepoName);
    return (
      chartEntries?.[indexEntry]?.map((e) => ({
        ...e,
        repoName: chartRepositoryTitle,
      })) ?? []
    );
  }
  const entries = _.reduce(
    chartEntries,
    (acc, charts, key) => {
      const repoName = key.split('--').pop();
      const chartRepositoryTitle = getChartRepositoryTitle(chartRepositories, repoName);
      charts.forEach((chart: HelmChartMetaData) => {
        if (
          chart.name === chartName ||
          (annotatedName &&
            providerName &&
            chart?.annotations?.[CHART_NAME_ANNOTATION] === annotatedName &&
            chart?.annotations?.[PROVIDER_NAME_ANNOTATION] === providerName)
        ) {
          acc.push({ ...chart, repoName: chartRepositoryTitle });
        }
      });
      return acc;
    },
    [],
  );
  return entries;
};

export const concatVersions = (
  chartVersion: string,
  appVersion: string,
  t: TFunction,
  chartRepoName?: string,
): string => {
  let title = chartVersion.split('--')[0];
  if (appVersion) {
    title += t('helm-plugin~ / App Version {{appVersion}}', { appVersion });
  }
  if (chartRepoName) {
    title += t('helm-plugin~ (Provided by {{chartRepoName}})', {
      chartRepoName: toTitleCase(chartRepoName),
    });
  }
  return title;
};

export const getChartVersions = (chartEntries: HelmChartMetaData[], t: TFunction) => {
  const chartVersions = _.reduce(
    chartEntries,
    (obj, chart) => {
      obj[`${chart.version}--${chart.repoName}`] = concatVersions(
        chart.version,
        chart.appVersion,
        t,
        chart.repoName,
      );
      return obj;
    },
    {},
  );
  return chartVersions;
};

export const getOriginRedirectURL = (
  actionOrigin: string,
  namespace: string,
  releaseName?: string,
) => {
  switch (actionOrigin) {
    case HelmActionOrigins.topology:
      return `/topology/ns/${namespace}`;
    case HelmActionOrigins.list:
      return `/helm-releases/ns/${namespace}`;
    case HelmActionOrigins.details:
      return `/helm-releases/ns/${namespace}/release/${releaseName}`;
    default:
      return `/helm-releases/ns/${namespace}`;
  }
};

export const getHelmActionConfig = (
  helmAction: HelmActionType,
  releaseName: string,
  namespace: string,
  t: TFunction,
  actionOrigin?: HelmActionOrigins,
  chartURL?: string,
  chartIndexEntry?: string,
): HelmActionConfigType | undefined => {
  switch (helmAction) {
    case HelmActionType.Create:
      return {
        type: HelmActionType.Create,
        title: t('helm-plugin~Create Helm Release'),
        subTitle: {
          form: t(
            'helm-plugin~The Helm Release can be created by completing the form. Default values may be provided by the Helm chart authors.',
          ),
          yaml: t(
            'helm-plugin~The Helm Release can be created by manually entering YAML or JSON definitions.',
          ),
        },
        helmReleaseApi: `/api/helm/chart?url=${encodeURIComponent(
          chartURL,
        )}&namespace=${namespace}&indexEntry=${encodeURIComponent(chartIndexEntry)}`,
        fetch: coFetchJSON.post,
        redirectURL: getOriginRedirectURL(HelmActionOrigins.topology, namespace, releaseName),
      };
    case HelmActionType.Upgrade:
      return {
        type: HelmActionType.Upgrade,
        title: t('helm-plugin~Upgrade Helm Release'),
        subTitle: {
          form: t(
            'helm-plugin~Upgrade by selecting a new chart version or manually changing the form values.',
          ),
          yaml: t(
            'helm-plugin~Upgrade by selecting a new chart version or manually changing YAML.',
          ),
        },
        helmReleaseApi: `/api/helm/release?ns=${namespace}&name=${releaseName}`,
        fetch: coFetchJSON.put,
        redirectURL: getOriginRedirectURL(actionOrigin, namespace, releaseName),
      };

    case HelmActionType.Rollback:
      return {
        type: HelmActionType.Rollback,
        title: t('helm-plugin~Rollback Helm Release'),
        subTitle: ``,
        helmReleaseApi: `/api/helm/release/history?ns=${namespace}&name=${releaseName}`,
        fetch: coFetchJSON.patch,
        redirectURL: getOriginRedirectURL(actionOrigin, namespace, releaseName),
      };
    default:
      return undefined;
  }
};

export const flattenReleaseResources: Flatten = (resources) =>
  Object.keys(resources).reduce((acc, kind) => {
    if (!_.isEmpty(resources[kind].data)) {
      acc.push(resources[kind].data);
    }
    return acc;
  }, []);

export const getChartValuesYAML = (chart: HelmChart): string => {
  const orderedValuesFile = chart?.files?.find((file) => file.name === 'ordered-values.yaml');
  const orderedValues = orderedValuesFile ? atob(orderedValuesFile.data) : '';

  if (orderedValues) return orderedValues;

  return !_.isEmpty(chart?.values) ? safeDump(chart?.values) : '';
};

export const loadHelmManifestResources = (release: HelmRelease): K8sResourceKind[] => {
  if (!release || !release.manifest) {
    return [];
  }
  const manifests = loadAll(release.manifest, null, { schema: DEFAULT_SAFE_SCHEMA, json: true });

  // Flatten out any "kind: List" items into top-level objects
  const flattened = manifests.flatMap((resource) => {
    if (resource?.kind === 'List' && Array.isArray(resource.items)) {
      return resource.items;
    }
    return [resource];
  });

  return flattened.filter(Boolean);
};

export const getChartReadme = (chart: HelmChart): string => {
  const readmeFile = chart?.files?.find((file) => file.name === 'README.md');
  return (readmeFile?.data && atob(readmeFile?.data)) ?? '';
};

export const helmActionString = (t: TFunction) => ({
  Create: t('helm-plugin~Create'),
  Upgrade: t('helm-plugin~Upgrade'),
  Rollback: t('helm-plugin~Rollback'),
});

export const fetchHelmReleaseHistory = (
  releaseName: string,
  namespace: string,
): Promise<HelmRelease[]> => {
  const helmReleaseApi: string = `/api/helm/release/history?ns=${namespace}&name=${releaseName}`;
  return coFetchJSON(helmReleaseApi);
};

export const isGoingToTopology = (resources: K8sResourceKind[]) =>
  !!resources.find((resource) =>
    WORKLOAD_TYPES.includes(_.lowerFirst(_.get(modelFor(referenceFor(resource)), 'labelPlural'))),
  );
