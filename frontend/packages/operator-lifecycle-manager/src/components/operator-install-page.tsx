import * as React from 'react';
import {
  ActionGroup,
  Alert,
  Bullseye,
  Button,
  Card,
  CardBody,
  Icon,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import { useParams, Link, LinkProps } from 'react-router-dom-v5-compat';
import { ResourceStatus, StatusIconAndText } from '@console/dynamic-plugin-sdk';
import { useK8sWatchResource } from '@console/dynamic-plugin-sdk/src/api/core-api';
import { SyncMarkdownView } from '@console/internal/components/markdown-view';
import { errorModal } from '@console/internal/components/modals';
import {
  Firehose,
  FirehoseResult,
  LoadingInline,
  ResourceLink,
  resourcePathFromModel,
  useAccessReview,
} from '@console/internal/components/utils';
import {
  k8sPatch,
  referenceForModel,
  referenceFor,
  K8sResourceKind,
} from '@console/internal/module/k8s';
import { DocumentTitle } from '@console/shared/src/components/document-title/DocumentTitle';
import {
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
} from '@console/shared/src/components/status/icons';
import { RouteParams } from '@console/shared/src/types';
import {
  ClusterServiceVersionModel,
  InstallPlanModel,
  PackageManifestModel,
  SubscriptionModel,
} from '../models';
import {
  ClusterServiceVersionKind,
  SubscriptionKind,
  InstallPlanKind,
  PackageManifestKind,
} from '../types';
import { ClusterServiceVersionLogo } from './cluster-service-version-logo';
import { InstallPlanPreview, NeedInstallPlanPermissions } from './install-plan';
import { OLMAnnotation } from './operator-hub';
import {
  getInitializationLink,
  getInitializationResource,
} from './operator-hub/operator-hub-utils';
import { iconFor, InstallPlanReview } from './index';

const ViewInstalledOperatorsButton: React.FC<ViewOperatorButtonProps> = ({ namespace }) => {
  const { t } = useTranslation();
  const singleNamespaceText = t('olm~View installed Operators in Namespace {{namespace}}', {
    namespace,
  });
  const allNamespacesText = t('olm~View installed Operators in all Namespaces');
  return (
    <div className="co-operator-install-page__link">
      <Link
        data-test="view-installed-operators-btn"
        to={resourcePathFromModel(ClusterServiceVersionModel, null, namespace)}
      >
        {namespace ? singleNamespaceText : allNamespacesText}
      </Link>
    </div>
  );
};

const InstallFailedMessage: React.FC<InstallFailedMessageProps> = ({ namespace, csvName, obj }) => {
  const { t } = useTranslation();
  const hasInitializationResource =
    obj?.metadata?.annotations?.[OLMAnnotation.InitializationResource];
  return (
    <>
      <Title headingLevel="h2" className="co-clusterserviceversion-install__heading">
        {t('olm~Operator installation failed')}
      </Title>
      <p>
        {t('olm~The operator did not install successfully.')}
        {hasInitializationResource && (
          <>
            &nbsp;
            {t("olm~The required custom resource can be created in the Operator's details view.")}
          </>
        )}
      </p>
      <ActionGroup className="pf-v6-c-form pf-v6-c-form__group--no-top-margin">
        <Link to={resourcePathFromModel(ClusterServiceVersionModel, csvName, namespace)}>
          <Button variant="primary">{t('olm~View error')}</Button>
        </Link>
        <ViewInstalledOperatorsButton namespace={namespace} />
      </ActionGroup>
    </>
  );
};

const InstallNeedsApprovalMessage: React.FC<InstallNeedsApprovalMessageProps> = ({
  namespace,
  subscriptionObj,
  installObj,
  approve,
}) => {
  const { t } = useTranslation();

  const canPatchInstallPlans = useAccessReview({
    group: InstallPlanModel.apiGroup,
    resource: InstallPlanModel.plural,
    namespace,
    verb: 'patch',
  });

  const installObjIsInstallPlan = installObj.kind === 'InstallPlan';

  return (
    <>
      <Title headingLevel="h2" className="co-clusterserviceversion-install__heading">
        {t('olm~Manual approval required')}
      </Title>
      <ActionGroup className="pf-v6-c-form pf-v6-c-form__group--no-top-margin">
        <InstallPlanReview installPlan={installObj} />
        {((installObjIsInstallPlan && canPatchInstallPlans) || !installObjIsInstallPlan) && (
          <>
            <Button variant="primary" onClick={approve}>
              {t('olm~Approve')}
            </Button>
            <Link
              to={`${resourcePathFromModel(
                SubscriptionModel,
                subscriptionObj?.metadata?.name,
                namespace,
              )}?showDelete=true`}
            >
              <Button className="co-clusterserviceversion__button" variant="secondary">
                {t('olm~Deny')}
              </Button>
            </Link>
          </>
        )}
        {!canPatchInstallPlans && installObjIsInstallPlan && (
          <NeedInstallPlanPermissions installPlan={installObj as InstallPlanKind} />
        )}
        <ViewInstalledOperatorsButton namespace={namespace} />
      </ActionGroup>
    </>
  );
};

export const CreateInitializationResourceButton: React.FC<InitializationResourceButtonProps> = ({
  disabled,
  initializationResource,
  obj,
}) => {
  const { t } = useTranslation();
  if (!initializationResource) {
    return null;
  }

  const reference = referenceFor(initializationResource);
  const kind = initializationResource?.kind;
  const button = (
    <Button aria-disabled={disabled} isDisabled={disabled} variant="primary">
      {t('olm~Create {{item}}', { item: kind })}
    </Button>
  );
  return disabled ? (
    button
  ) : (
    <Link
      to={`${resourcePathFromModel(
        ClusterServiceVersionModel,
        obj.metadata.name,
        obj.metadata.namespace,
      )}/${reference}/~new?useInitializationResource`}
    >
      {button}
    </Link>
  );
};

const InitializationResourceRequiredMessage: React.FC<InitializationResourceRequiredMessageProps> = ({
  initializationResource,
  obj,
}) => {
  const { t } = useTranslation();
  if (!initializationResource) {
    return null;
  }

  const initializationResourceKind = initializationResource?.kind;
  const initializationResourceNamespace = initializationResource?.metadata?.namespace;
  const description = obj?.metadata?.annotations?.description;
  return (
    <div className="co-clusterserviceversion__box">
      <span className="co-resource-item">
        <ResourceLink
          kind={initializationResourceKind}
          name={initializationResourceKind}
          namespace={initializationResourceNamespace}
        />
        <ResourceStatus badgeAlt>
          <StatusIconAndText icon={<RedExclamationCircleIcon />} title={t('olm~Required')} />
        </ResourceStatus>
      </span>
      <SyncMarkdownView content={description} />
    </div>
  );
};

const InitializationLinkButton: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
  const { t } = useTranslation();
  return (
    <Button aria-disabled={disabled} isDisabled={disabled} variant="primary">
      {t('olm~Configure Operator')}
    </Button>
  );
};
const InitializationLink: React.FC<InitializationLinkProps> = ({ to, disabled }) => {
  if (!to) {
    return null;
  }

  if (disabled) {
    return <InitializationLinkButton disabled />;
  }

  return (
    <Link to={to}>
      <InitializationLinkButton />
    </Link>
  );
};

const InstallSucceededMessage: React.FC<InstallSuccededMessageProps> = ({
  namespace,
  csvName,
  obj,
}) => {
  const { t } = useTranslation();
  const annotationParserOptions = {
    onError: (error) => errorModal({ error }),
  };
  const initializationLink = getInitializationLink(obj?.metadata?.annotations);
  const initializationResource =
    !initializationLink &&
    getInitializationResource(obj?.metadata?.annotations, annotationParserOptions);

  return (
    <>
      <Title headingLevel="h2" className="co-clusterserviceversion-install__heading">
        {!initializationLink && !initializationResource && t('olm~Operator installed successfully')}
        {initializationLink && t('olm~Configure Operator')}
        {initializationResource && t('olm~ Create initialization resource')}
      </Title>
      <span>
        {t('olm~The Operator has installed successfully.')}
        {!initializationLink && !initializationResource && t('olm~ Ready for use.')}
        {initializationLink &&
          t('olm~ Complete the next configuration steps to prepare it for use.')}
        {initializationResource &&
          t('olm~ Create the required custom resource to prepare it for use.')}
        <InitializationResourceRequiredMessage
          initializationResource={initializationResource}
          obj={obj}
        />
      </span>
      <ActionGroup className="pf-v6-c-form pf-v6-c-form__group--no-top-margin">
        <InitializationLink to={initializationLink} />
        <CreateInitializationResourceButton
          initializationResource={initializationResource}
          obj={obj}
        />
        {!initializationLink && !initializationResource && (
          <Link to={resourcePathFromModel(ClusterServiceVersionModel, csvName, namespace)}>
            <Button variant="primary">{t('olm~View Operator')}</Button>
          </Link>
        )}
        <ViewInstalledOperatorsButton namespace={namespace} />
      </ActionGroup>
    </>
  );
};

const InstallingMessage: React.FC<InstallingMessageProps> = ({ namespace, obj }) => {
  const { t } = useTranslation();
  const reason = (obj as ClusterServiceVersionKind)?.status?.reason || '';
  const message = (obj as ClusterServiceVersionKind)?.status?.message || '';
  const annotationParserOpts = {
    onError: (error) => errorModal({ error }),
  };
  const initializationLink = getInitializationLink(obj?.metadata?.annotations);
  const initializationResource =
    !initializationLink &&
    getInitializationResource(obj?.metadata?.annotations, annotationParserOpts);
  return (
    <>
      <Title headingLevel="h2" className="co-clusterserviceversion-install__heading">
        {t('olm~Installing Operator')}
      </Title>
      {reason && (
        <p className="pf-v6-u-text-color-subtle">
          {reason}: {message}
        </p>
      )}
      <p>
        {t('olm~The Operator is being installed. This may take a few minutes.')}
        {initializationLink &&
          t('olm~ Once the Operator is installed additional configuration will be required.')}
        {initializationResource &&
          t(
            'olm~ Once the Operator is installed the required custom resource will be available for creation.',
          )}
      </p>
      <ActionGroup className="pf-v6-c-form pf-v6-c-form__group--no-top-margin">
        <InitializationLink to={initializationLink} disabled />
        <CreateInitializationResourceButton
          initializationResource={initializationResource}
          obj={obj}
          disabled
        />
        <ViewInstalledOperatorsButton namespace={namespace} />
      </ActionGroup>
    </>
  );
};

type OperatorInstallStatusPageRouteParams = RouteParams<
  'pkg' | 'catalogNamespace' | 'currentCSV' | 'targetNamespace' | 'catalog'
>;

const OperatorInstallLogo = ({ subscription }) => {
  const { t } = useTranslation();
  const notFound = t('olm~Not found');
  const { currentCSV, catalogNamespace, catalog, pkg } = useParams<
    OperatorInstallStatusPageRouteParams
  >();
  const [packageManifests, loaded, loadError] = useK8sWatchResource<PackageManifestKind[]>({
    groupVersionKind: {
      group: PackageManifestModel.apiGroup,
      version: PackageManifestModel.apiVersion,
      kind: PackageManifestModel.kind,
    },
    selector: {
      matchLabels: {
        'catalog-namespace': catalogNamespace,
        catalog,
      },
    },
    fieldSelector: `metadata.name=${pkg}`,
    isList: true,
  });
  const pkgManifest = packageManifests?.[0];
  if (!loaded) {
    return <LoadingInline />;
  }

  if (loadError || !pkgManifest) {
    return (
      <ClusterServiceVersionLogo
        icon={null}
        displayName={loadError ? t('olm~Error: {{loadError}}', { loadError }) : notFound}
      />
    );
  }
  const channels = pkgManifest?.status?.channels || [];
  const channel = channels.find((ch) => ch.currentCSV === currentCSV) || channels[0];
  const displayName = channel?.currentCSVDesc?.displayName || notFound;
  const provider = pkgManifest?.status?.provider?.name || '';
  const startingCSV = subscription?.spec?.startingCSV;

  return (
    <ClusterServiceVersionLogo
      displayName={displayName}
      icon={iconFor(pkgManifest)}
      provider={provider}
      version={startingCSV}
    />
  );
};

const OperatorInstallStatus: React.FC<OperatorInstallPageProps> = ({ resources }) => {
  const { t } = useTranslation();
  const { currentCSV, targetNamespace } = useParams<OperatorInstallStatusPageRouteParams>();
  let loading = true;
  let status = '';
  let installObj: ClusterServiceVersionKind | InstallPlanKind =
    resources?.clusterServiceVersion?.data;
  const subscription = resources?.subscription?.data;
  status = installObj?.status?.phase;
  if (installObj && status) {
    loading = false;
  } else if (subscription) {
    // There is no ClusterServiceVersion for the package, so look at Subscriptions/InstallPlans
    loading = false;
    status = subscription?.status?.state || null;
    const installPlanName = subscription?.status?.installPlanRef?.name || '';
    const installPlan: InstallPlanKind = resources?.installPlans?.data?.find(
      (ip) => ip.metadata.name === installPlanName,
    );
    if (installPlan) {
      installObj = installPlan;
    }
  }

  const isStatusSucceeded = status === 'Succeeded';
  const isStatusFailed = status === 'Failed';
  const isApprovalNeeded =
    installObj?.spec?.approval === 'Manual' && installObj?.spec?.approved === false;

  const approve = () => {
    k8sPatch(InstallPlanModel, installObj, [
      { op: 'replace', path: '/spec/approved', value: true },
    ]).catch((error) => {
      errorModal({ error: error.toString() });
    });
  };

  let indicator = <Spinner size="lg" />;
  if (isStatusFailed) {
    indicator = (
      <Icon size="lg">
        <RedExclamationCircleIcon />
      </Icon>
    );
  }
  if (isApprovalNeeded) {
    indicator = (
      <Icon size="lg">
        <YellowExclamationTriangleIcon />
      </Icon>
    );
  }
  if (isStatusSucceeded) {
    indicator = (
      <Icon size="lg">
        <GreenCheckCircleIcon />
      </Icon>
    );
  }

  let installMessage = <InstallingMessage namespace={targetNamespace} obj={installObj} />;
  if (isStatusFailed) {
    installMessage = (
      <InstallFailedMessage namespace={targetNamespace} obj={installObj} csvName={currentCSV} />
    );
  } else if (isApprovalNeeded) {
    installMessage = (
      <InstallNeedsApprovalMessage
        namespace={targetNamespace}
        subscriptionObj={subscription}
        installObj={installObj}
        approve={approve}
      />
    );
  } else if (isStatusSucceeded) {
    installMessage = (
      <InstallSucceededMessage namespace={targetNamespace} csvName={currentCSV} obj={installObj} />
    );
  }

  return (
    <>
      <div className="co-operator-install-page__main">
        <DocumentTitle>{t('olm~Installing Operator')}</DocumentTitle>
        <Bullseye>
          <div id="operator-install-page">
            {loading && (
              <div className="co-operator-install-page__indicator">
                {t('olm~Installing...')} <Spinner size="lg" />
              </div>
            )}
            {!loading && isStatusFailed && (
              <Alert variant="danger" isInline title="Installation Failed">
                {status}: {(installObj as ClusterServiceVersionKind)?.status?.message || ''}
              </Alert>
            )}
            {!loading && (
              <>
                <Card>
                  <CardBody>
                    <div className="co-operator-install-page__pkg-indicator">
                      <div>
                        <OperatorInstallLogo subscription={resources.subscription.data} />
                      </div>
                      <div>{indicator}</div>
                    </div>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>{installMessage}</CardBody>
                </Card>
              </>
            )}
          </div>
        </Bullseye>
      </div>
      {!loading && isApprovalNeeded && (
        <InstallPlanPreview obj={installObj as InstallPlanKind} hideApprovalBlock />
      )}
    </>
  );
};

export const OperatorInstallStatusPage: React.FC<OperatorInstallPageProps> = () => {
  const { pkg, currentCSV, targetNamespace } = useParams<OperatorInstallStatusPageRouteParams>();

  const installPageResources = [
    {
      kind: referenceForModel(ClusterServiceVersionModel),
      namespaced: true,
      isList: false,
      name: currentCSV,
      namespace: targetNamespace,
      prop: 'clusterServiceVersion',
    },
    {
      kind: referenceForModel(SubscriptionModel),
      namespaced: true,
      isList: false,
      name: pkg,
      namespace: targetNamespace,
      optional: true,
      prop: 'subscription',
    },
    {
      kind: referenceForModel(InstallPlanModel),
      prop: 'installPlans',
      namespaced: true,
      namespace: targetNamespace,
      isList: true,
      optional: true,
    },
  ];

  return (
    <Firehose resources={installPageResources}>
      <OperatorInstallStatus />
    </Firehose>
  );
};

export type OperatorInstallPageProps = {
  resources?: {
    clusterServiceVersion: FirehoseResult<ClusterServiceVersionKind>;
    subscription: FirehoseResult<SubscriptionKind>;
    installPlans: FirehoseResult<InstallPlanKind[]>;
  };
};
type InstallSuccededMessageProps = {
  namespace: string;
  obj: ClusterServiceVersionKind | InstallPlanKind;
  csvName: string;
};
type InstallNeedsApprovalMessageProps = {
  namespace: string;
  subscriptionObj: SubscriptionKind;
  installObj: ClusterServiceVersionKind | InstallPlanKind;
  approve: () => void;
};
type InstallingMessageProps = {
  namespace: string;
  obj: ClusterServiceVersionKind | InstallPlanKind;
};
type InstallFailedMessageProps = {
  namespace: string;
  obj: ClusterServiceVersionKind | InstallPlanKind;
  csvName: string;
};
type InitializationResourceRequiredMessageProps = {
  initializationResource: K8sResourceKind;
  obj: ClusterServiceVersionKind | InstallPlanKind | SubscriptionKind;
};
type InitializationLinkProps = {
  to: LinkProps['to'];
  disabled?: boolean;
};
type InitializationResourceButtonProps = {
  disabled?: boolean;
  initializationResource: K8sResourceKind;
  obj: ClusterServiceVersionKind | InstallPlanKind | SubscriptionKind;
};
type ViewOperatorButtonProps = {
  namespace: string;
};
