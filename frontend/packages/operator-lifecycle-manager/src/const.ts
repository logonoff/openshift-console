import { ALL_NAMESPACES_KEY } from '@console/shared/src';

export enum Flags {
  OPERATOR_LIFECYCLE_MANAGER = 'OPERATOR_LIFECYCLE_MANAGER',
}

export enum DefaultCatalogSource {
  RedHatOperators = 'redhat-operators',
  RedHatMarketPlace = 'redhat-marketplace',
  CertifiedOperators = 'certified-operators',
  CommunityOperators = 'community-operators',
}

export enum PackageSource {
  RedHatOperators = 'Red Hat',
  RedHatMarketplace = 'Marketplace',
  CertifiedOperators = 'Certified',
  CommunityOperators = 'Community',
  Custom = 'Custom',
}

export const DEFAULT_GLOBAL_OPERATOR_INSTALLATION_NAMESPACE = 'openshift-operators';
export const DEFAULT_SOURCE_NAMESPACE = 'openshift-marketplace';
export const GLOBAL_COPIED_CSV_NAMESPACE = 'openshift';
export const INTERNAL_OBJECTS_ANNOTATION = 'operators.operatorframework.io/internal-objects';
export const NON_STANDALONE_ANNOTATION_VALUE = 'non-standalone';
export const OPERATOR_NAMESPACE_ANNOTATION = 'olm.operatorNamespace';
export const OPERATOR_PLUGINS_ANNOTATION = 'console.openshift.io/plugins';
export const OPERATOR_TYPE_ANNOTATION = 'operators.operatorframework.io/operator-type';
export const OPERATOR_UNINSTALL_MESSAGE_ANNOTATION = 'operator.openshift.io/uninstall-message';

export const GLOBAL_OPERATOR_NAMESPACES = [
  DEFAULT_GLOBAL_OPERATOR_INSTALLATION_NAMESPACE,
  GLOBAL_COPIED_CSV_NAMESPACE,
  ALL_NAMESPACES_KEY,
];
