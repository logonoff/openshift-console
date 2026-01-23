import type { FC, MouseEvent } from 'react';
import { Button } from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/minus-circle-icon';
import { useTranslation } from 'react-i18next';
import { K8sModel, modelFor } from '@console/internal/module/k8s';
import { useK8sModel } from '@console/shared/src/hooks/useK8sModel';
import './PinnedResource.scss';
import { NavItemResource } from './NavItemResource';
import useConfirmNavUnpinModal from './useConfirmNavUnpinModal';

type PinnedResourceProps = {
  resourceRef?: string;
  navResources?: string[];
  onChange?: (pinnedResources: string[]) => void;
  idx?: number;
};

type RemoveButtonProps = {
  resourceRef?: string;
  navResources?: string[];
  onChange?: (pinnedResources: string[]) => void;
};

export type DragItem = {
  idx: number;
  id: string;
};

const RemoveButton: FC<RemoveButtonProps> = ({ resourceRef, navResources, onChange }) => {
  const { t } = useTranslation();
  const confirmNavUnpinModal = useConfirmNavUnpinModal(navResources, onChange);
  const unPin = (e: MouseEvent<HTMLButtonElement>, navItem: string) => {
    e.preventDefault();
    e.stopPropagation();
    confirmNavUnpinModal(navItem);
  };
  return (
    <Button
      icon={<MinusCircleIcon className="oc-pinned-resource__delete-icon" />}
      className="oc-pinned-resource__unpin-button"
      variant="link"
      aria-label={t('console-app~Unpin')}
      onClick={(e) => unPin(e, resourceRef)}
    />
  );
};

const PinnedResource: FC<PinnedResourceProps> = ({ resourceRef, onChange, navResources }) => {
  const { t } = useTranslation();

  const [model] = useK8sModel(resourceRef);
  if (!model) {
    return null;
  }
  const { apiVersion, apiGroup, namespaced, kind } = model;

  const getLabelForResourceRef = (resourceName: string): string => {
    const resourceModel: K8sModel | undefined = modelFor(resourceName);
    if (resourceModel) {
      if (resourceModel.labelPluralKey) {
        return t(resourceModel.labelPluralKey);
      }
      return resourceModel.labelPlural || resourceModel.plural;
    }
    return '';
  };
  const label = getLabelForResourceRef(resourceRef);
  const duplicates = navResources.filter((res) => getLabelForResourceRef(res) === label).length > 1;
  return (
    <NavItemResource
      key={`pinned-${resourceRef}`}
      namespaced={namespaced}
      title={duplicates ? `${label}: ${apiGroup || 'core'}/${apiVersion}` : null}
      model={{ group: apiGroup, version: apiVersion, kind }}
      id={resourceRef}
      dataAttributes={{ 'data-test': 'draggable-pinned-resource-item' }}
    >
      {label}
      <RemoveButton onChange={onChange} navResources={navResources} resourceRef={resourceRef} />
    </NavItemResource>
  );
};

export default PinnedResource;
