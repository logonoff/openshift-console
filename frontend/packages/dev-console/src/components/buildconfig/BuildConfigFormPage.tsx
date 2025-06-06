import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom-v5-compat';
import { StatusBox } from '@console/internal/components/utils';
import { useK8sWatchResource } from '@console/internal/components/utils/k8s-watch-hook';
import { DocumentTitle } from '@console/shared/src/components/document-title/DocumentTitle';
import EditBuildConfig from './EditBuildConfig';
import { BuildConfig, BuildConfigModel } from './types';

const BuildConfigFormPage: React.FC = () => {
  const { t } = useTranslation();
  const { ns: namespace, name } = useParams();

  const isNew = !name;
  const [watchedBuildConfig, loaded, loadError] = useK8sWatchResource<BuildConfig>(
    isNew
      ? null
      : {
          kind: BuildConfigModel.kind,
          name,
          namespace,
        },
  );
  const buildConfig: BuildConfig = isNew
    ? {
        apiVersion: 'build.openshift.io/v1',
        kind: 'BuildConfig',
        metadata: {
          namespace,
        },
        spec: {},
      }
    : watchedBuildConfig;

  const title = isNew ? t('devconsole~Create BuildConfig') : t('devconsole~Edit BuildConfig');
  return (
    <>
      <DocumentTitle>{title}</DocumentTitle>
      <StatusBox loaded={loaded} loadError={loadError} label={title} data={buildConfig}>
        <EditBuildConfig
          heading={title}
          namespace={namespace}
          name={name}
          buildConfig={buildConfig}
        />
      </StatusBox>
    </>
  );
};

export default BuildConfigFormPage;
