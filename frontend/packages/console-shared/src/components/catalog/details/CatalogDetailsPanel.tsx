import * as React from 'react';
import { PropertiesSidePanel, PropertyItem } from '@patternfly/react-catalog-view-extension';
import { Stack, StackItem } from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import { CatalogItem } from '@console/dynamic-plugin-sdk/src/extensions';
import { SectionHeading } from '@console/internal/components/utils';
import { Timestamp } from '@console/shared/src/components/datetime/Timestamp';
import { ExternalLink } from '@console/shared/src/components/links/ExternalLink';
import CatalogPageOverlay from '../catalog-view/CatalogPageOverlay';
import CatalogPageOverlayDescription from '../catalog-view/CatalogPageOverlayDescription';
import { customPropertyPresent } from '../utils';

type CatalogDetailsPanelProps = {
  item: CatalogItem;
};

const CatalogDetailsPanel: React.FC<CatalogDetailsPanelProps> = ({ item }) => {
  const { t } = useTranslation();
  const { description, provider, creationTimestamp, supportUrl, documentationUrl, details } = item;
  const created = Date.parse(creationTimestamp) ? (
    <Timestamp timestamp={creationTimestamp} />
  ) : (
    creationTimestamp
  );
  const notAvailable = t('console-shared~N/A');
  const providerLabel = t('console-shared~Provider');
  const createdAtLabel = t('console-shared~Created at');
  const supportLabel = t('console-shared~Support');
  const documentationLabel = t('console-shared~Documentation');

  return (
    <div className="modal-body modal-body-border">
      <CatalogPageOverlay>
        <PropertiesSidePanel>
          {details?.properties
            ?.filter((property) => !property?.isHidden)
            ?.map((property) => (
              <PropertyItem
                key={property.label}
                label={property.label}
                value={property.value || notAvailable}
              />
            ))}
          {!customPropertyPresent(details, providerLabel) && (
            <PropertyItem label={providerLabel} value={provider || notAvailable} />
          )}
          {!customPropertyPresent(details, createdAtLabel) && (
            <PropertyItem label={createdAtLabel} value={created || notAvailable} />
          )}
          {!customPropertyPresent(details, supportLabel) && (
            <PropertyItem
              label={supportLabel}
              value={
                supportUrl ? (
                  <ExternalLink href={supportUrl} text={t('console-shared~Get support')} />
                ) : (
                  notAvailable
                )
              }
            />
          )}
          {!customPropertyPresent(details, documentationLabel) && (
            <PropertyItem
              label={documentationLabel}
              value={
                documentationUrl ? (
                  <ExternalLink
                    href={documentationUrl}
                    text={t('console-shared~Refer documentation')}
                  />
                ) : (
                  notAvailable
                )
              }
            />
          )}
        </PropertiesSidePanel>
        {(details?.descriptions?.length || description) && (
          <CatalogPageOverlayDescription>
            <Stack hasGutter>
              {!details?.descriptions?.[0]?.label && (
                <SectionHeading text={t('console-shared~Description')} />
              )}
              {!details?.descriptions?.length && description && <p>{description}</p>}
              {details?.descriptions?.map((desc, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <StackItem key={index}>
                  {desc.label && <SectionHeading text={desc.label} />}
                  {desc.value}
                </StackItem>
              ))}
            </Stack>
          </CatalogPageOverlayDescription>
        )}
      </CatalogPageOverlay>
    </div>
  );
};

export default CatalogDetailsPanel;
