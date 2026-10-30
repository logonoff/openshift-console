import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Action } from '@console/dynamic-plugin-sdk';
import { asAccessReview } from '@console/internal/components/utils/rbac';
import { ConsoleOperatorConfigModel } from '@console/internal/models';
import type { K8sResourceKind } from '@console/internal/module/k8s';

export const useConsoleOperatorConfigActionsProvider = (resource: K8sResourceKind) => {
  const { t } = useTranslation('console-app');

  const actions = useMemo<Action[]>(
    () => [
      {
        id: 'customize-console',
        label: t('Customize'),
        cta: { href: '/cluster-configuration' },
        accessReview: asAccessReview(ConsoleOperatorConfigModel, resource, 'patch'),
      },
    ],
    [resource, t],
  );

  return [actions, true, undefined];
};
