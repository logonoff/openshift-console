/* eslint-disable */
import * as React from 'react';
import {
  ActivityItemProps,
  ActivityBodyProps,
  RecentEventsBodyProps,
  OngoingActivityBodyProps,
  AlertsBodyProps,
  AlertItemProps,
  HealthItemProps,
  ResourceInventoryItemProps,
  DetailsBodyProps,
  UtilizationItemProps,
  UtilizationBodyProps,
  UtilizationDurationDropdownProps,
  UseUtilizationDuration,
  VirtualizedGridProps,
  LazyActionMenuProps,
  UseDashboardResources,
  QuickStartsLoaderProps,
  UseURLPoll,
  UseLastNamespace,
} from './internal-types';
import { UseUserSettings } from '../extensions/console-types';

export * from './internal-topology-api';

export const ActivityItem: React.FC<React.PropsWithChildren<ActivityItemProps>> = require('@console/shared/src/components/dashboard/activity-card/ActivityItem')
  .default;
export const ActivityBody: React.FC<React.PropsWithChildren<ActivityBodyProps>> = require('@console/shared/src/components/dashboard/activity-card/ActivityBody')
  .default;
export const RecentEventsBody: React.FC<React.PropsWithChildren<RecentEventsBodyProps>> = require('@console/shared/src/components/dashboard/activity-card/ActivityBody')
  .RecentEventsBody;
export const OngoingActivityBody: React.FC<React.PropsWithChildren<OngoingActivityBodyProps>> = require('@console/shared/src/components/dashboard/activity-card/ActivityBody')
  .OngoingActivityBody;
export const AlertsBody: React.FC<React.PropsWithChildren<AlertsBodyProps>> = require('@console/shared/src/components/dashboard/status-card/AlertsBody')
  .default;
export const AlertItem: React.FC<React.PropsWithChildren<AlertItemProps>> = require('@console/shared/src/components/dashboard/status-card/AlertItem')
  .default;
export const HealthItem: React.FC<React.PropsWithChildren<HealthItemProps>> = require('@console/shared/src/components/dashboard/status-card/HealthItem')
  .default;
export const HealthBody: React.FC<React.PropsWithChildren<unknown>> = require('@console/shared/src/components/dashboard/status-card/HealthBody')
  .default;
export const ResourceInventoryItem: React.FC<React.PropsWithChildren<ResourceInventoryItemProps>> = require('@console/shared/src/components/dashboard/inventory-card/InventoryItem')
  .ResourceInventoryItem;
export const DetailsBody: React.FC<React.PropsWithChildren<DetailsBodyProps>> = require('@console/shared/src/components/dashboard/details-card/DetailsBody')
  .default;
export const UtilizationItem: React.FC<React.PropsWithChildren<UtilizationItemProps>> = require('@console/shared/src/components/dashboard/utilization-card/UtilizationItem')
  .default;
export const UtilizationBody: React.FC<React.PropsWithChildren<UtilizationBodyProps>> = require('@console/shared/src/components/dashboard/utilization-card/UtilizationBody')
  .default;
export const UtilizationDurationDropdown: React.FC<React.PropsWithChildren<UtilizationDurationDropdownProps>> = require('@console/shared/src/components/dashboard/utilization-card/UtilizationDurationDropdown')
  .UtilizationDurationDropdown;
export const VirtualizedGrid: React.FC<React.PropsWithChildren<VirtualizedGridProps>> = require('@console/shared/src/components/virtualized-grid/VirtualizedGrid')
  .default;
export const LazyActionMenu: React.FC<React.PropsWithChildren<LazyActionMenuProps>> = require('@console/shared/src/components/actions/LazyActionMenu')
  .default;
export const QuickStartsLoader: React.FC<React.PropsWithChildren<QuickStartsLoaderProps>> = require('@console/app/src/components/quick-starts/loader/QuickStartsLoader')
  .default;

export const useUtilizationDuration: UseUtilizationDuration = require('@console/shared/src/hooks/useUtilizationDuration')
  .useUtilizationDuration;
export const ServicesList = require('@console/internal/components/service').ServicesList;
export const useDashboardResources: UseDashboardResources = require('@console/shared/src/hooks/useDashboardResources')
  .useDashboardResources;
// useUserSettings is deprecated and is now exposed in dynamic plugin SDK.
export const useUserSettings: UseUserSettings = require('@console/shared/src/hooks/useUserSettings')
  .useUserSettings;
export const useURLPoll: UseURLPoll = require('@console/internal/components/utils/url-poll-hook')
  .useURLPoll;
export const useLastNamespace: UseLastNamespace = require('@console/app/src/components/detect-namespace/useLastNamespace')
  .useLastNamespace;
