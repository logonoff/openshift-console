export const operatorsPO = {
  search: '[data-test="search-operatorhub"] input[aria-label="Filter by keyword..."]',
  nav: {
    ecosystem: '[data-quickstart-id="qs-nav-ecosystem"]',
    operatorHub: 'a[data-test="nav"][href="/operatorhub"]',
    installedOperators:
      'a[data-test="nav"][href$="/operators.coreos.com~v1alpha1~ClusterServiceVersion"]',
    link: '[data-test="nav"]',
    menuItems: '#page-sidebar ul li',
    serverless: '[data-quickstart-id="qs-nav-serverless"]',
    eventing: `a[href^="/eventing/"]`,
    serving: `a[href^="/serving/"]`,
    administration: '[data-quickstart-id="qs-nav-administration"]',
    customResourceDefinitions:
      'a[data-test="nav"][href$="apiextensions.k8s.io~v1~CustomResourceDefinition"]',
  },
  operatorHub: {
    numOfItems: 'div.co-catalog-page__num-items',
    install: '[data-test="install-operator"]',
    pipelinesOperatorCard:
      '[data-test="openshift-pipelines-operator-rh-redhat-operators-openshift-marketplace"]',
    serverlessOperatorCard:
      '[data-test="serverless-operator-redhat-operators-openshift-marketplace"]',
    virtualizationOperatorCard:
      '[data-test="kubevirt-hyperconverged-redhat-operators-openshift-marketplace"]',
    redHatCamelKOperatorCard:
      '[data-test="red-hat-camel-k-redhat-operators-openshift-marketplace"]',
    installingOperatorModal: '#operator-install-page',
    gitOpsOperatorCard:
      '[data-test="openshift-gitops-operator-redhat-operators-openshift-marketplace"]',
    webTerminalOperatorCard: '[data-test="web-terminal-redhat-operators-openshift-marketplace"]',
    apacheCamelKOperatorCard: '[data-test="camel-k-community-operators-openshift-marketplace"]',
    knativeApacheCamelKOperatorCard:
      '[data-test="knative-camel-operator-community-operators-openshift-marketplace"]',
    apacheKafkaOperatorCard: '[data-test^="amq-streams-redhat-operators"]',
    redHatSourceType: '[data-test-group-name="source"] [title="Red Hat"]',
    redHatCodeReadyWorkspacesCard:
      '[data-test^="codeready-workspaces-redhat-operators-openshift-marketplace"]',
    gitopsPrimer: '[data-test="gitops-primer-community-operators-openshift-marketplace"]',
    CrunchyPostgresforKubernetes:
      '[data-test="crunchy-postgres-operator-certified-operators-openshift-marketplace"]',
    quayContainerSecurity:
      '[data-test="container-security-operator-redhat-operators-openshift-marketplace"]',
    shipwrightOperator:
      '[data-test="shipwright-operator-community-operators-openshift-marketplace"]',
    redisOperatorCard: '[data-test="redis-operator-community-operators-openshift-marketplace"]',
    amqStreams: '[data-test="amq-streams-redhat-operators-openshift-marketplace"]',
    rhoas: '[data-test="rhoas-operator-community-operators-openshift-marketplace"]',
    jaeger: '[data-test="jaeger-product-redhat-operators-openshift-marketplace"]',
  },
  subscription: {
    logo: 'h1.co-clusterserviceversion-logo__name__clusterserviceversion',
  },
  installOperators: {
    title: '[data-test="page-heading"] h1',
    operatorsNameRow: 'div[aria-label="Installed Operators"] td:nth-child(1) h1',
    noOperatorsFound: '[data-test="console-empty-state-title"]',
    noOperatorsDetails: '[data-test="console-empty-state-body"]',
    search: 'input[data-test-id="item-filter"]',
    noOperatorFoundMessage: 'div[data-test="console-empty-state-title"]',
    knativeServingLink: '[title="knativeservings.operator.knative.dev"]',
    knativeEventingLink: '[title="knativeeventings.operator.knative.dev"]',
    knativeKafkaLink: '[title="knativekafkas.operator.serverless.openshift.io"]',
    operatorStatus: '[data-test="status-text"]',
    checlusterCRLink: '[title="checlusters.org.eclipse.che"]',
    shipwrightBuildLink: '[title="shipwrightbuilds.operator.shipwright.io"]',
  },
  sidePane: {
    install: '[data-test-id="operator-install-btn"]',
    uninstall: '[data-test-id="operator-uninstall-btn"]',
  },
  alertDialog: '[role="dialog"]',
  warningAlert: '[aria-label="Warning Alert"]',
  uninstallPopup: {
    uninstall: '#confirm-action',
  },
};
