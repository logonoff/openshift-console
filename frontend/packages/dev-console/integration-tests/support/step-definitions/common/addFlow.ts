import { Given, When, Then, And } from 'cypress-cucumber-preprocessor/steps';
import { detailsPage } from '@console/cypress-integration-tests/views/details-page';
import {
  switchPerspective,
  devNavigationMenu,
  pageTitle,
  addOptions,
  resources,
} from '../../constants';
import { topologyPO } from '../../pageObjects';
import {
  gitPage,
  addPage,
  createGitWorkload,
  catalogPage,
  topologyPage,
  topologyHelper,
  perspective,
  navigateTo,
  topologySidePane,
  app,
  createGitWorkloadIfNotExistsOnTopologyPage,
  verifyAndInstallGitopsPrimerOperator,
} from '../../pages';
import { checkDeveloperPerspective } from '../../pages/functions/checkDeveloperPerspective';

Given('user is at Add page', () => {
  checkDeveloperPerspective();
  navigateTo(devNavigationMenu.Add);
});

Given('user is at Topology page', () => {
  navigateTo(devNavigationMenu.Topology);
});

Given(
  'user has created workload {string} with resource type {string}',
  (componentName: string, resourceType: string = 'Deployment') => {
    createGitWorkloadIfNotExistsOnTopologyPage(
      'https://github.com/sclorg/nodejs-ex.git',
      componentName,
      resourceType,
      'nodejs-ex-git-app',
    );
    topologyHelper.verifyWorkloadInTopologyPage(componentName);
  },
);

Given('user has opened application {string} in topology page', (componentName: string) => {
  cy.get('body').then(($body) => {
    if ($body.find(topologyPO.graph.workload).length > 0) {
      topologyPage.verifyWorkloadInTopologyPage(componentName);
      topologyPage.clickWorkloadUrl(componentName);
    } else {
      createGitWorkload(
        'https://github.com/sclorg/nodejs-ex.git',
        componentName,
        'Deployment',
        'dancer-ex-git-app',
      );
    }
  });
  topologyPage.verifyWorkloadInTopologyPage(componentName);
});

Given('user is at Software Catalog page', () => {
  perspective.switchTo(switchPerspective.Developer);
  navigateTo(devNavigationMenu.Add);
  addPage.selectCardFromOptions(addOptions.SoftwareCatalog);
});

Given('user is at Software Catalog page in admin page', () => {
  perspective.switchTo(switchPerspective.Administrator);
  cy.get('[data-quickstart-id="qs-nav-home"]').should('be.visible').click();
  cy.byLegacyTestID('developer-catalog-header').should('exist').click({ force: true });
});

When('user clicks Instantiate Template button on side bar', () => {
  catalogPage.clickButtonOnCatalogPageSidePane();
});

When('user navigates to Add page', () => {
  navigateTo(devNavigationMenu.Add);
});

When('user clicks Create button on Add page', () => {
  gitPage.clickCreate();
});

Then('user will be redirected to Add page', () => {
  // detailsPage.titleShouldContain(pageTitle.Add);
  cy.get('[data-test="page-heading"] h1').should('contain.text', pageTitle.Add);
});

When('user clicks Cancel button on Add page', () => {
  gitPage.clickCancel();
});

Then('user can see {string} card on the Add page', (cardName: string) => {
  addPage.verifyCard(cardName);
});

When('user selects {string} card from add page', (cardName: string) => {
  addPage.selectCardFromOptions(cardName);
});

When('user enters run command for {string} as {string}', (envKey: string, value: string) => {
  addPage.setBuildEnvField(envKey, value);
});

Then(
  'user is able to navigate to Build {string} for deployment {string}',
  (build: string, name: string) => {
    topologyPage.clickOnNode(name);
    topologySidePane.selectTab('Resources');
    topologySidePane.selectResource(resources.Builds, 'aut-addflow-git', build);
  },
);

And(
  'see environment variable {string} with value {string} in Environment tab of details page',
  (envKey: string, envVal: string) => {
    app.waitForLoad();
    detailsPage.selectTab('Environment');
    app.waitForLoad();
    cy.get(`input[data-test="pairs-list-name"][value="${envKey}"]`).should('have.length', 1);
    cy.get(`input[data-test="pairs-list-value"][value="${envVal}"]`).should('have.length', 1);
  },
);

Then(
  'the environment variable {string} has value {string} in the advanced options of the Build section in the Import from Git page',
  (envKey: string, envVal: string) => {
    gitPage.verifyBuildConfigEnv(envKey, envVal);
  },
);

Then(
  'the environment variable {string} has value {string} in the advanced options of the Deployment section in the Import from Git page',
  (envKey: string, envVal: string) => {
    gitPage.verifyDeploymentEnv(envKey, envVal);
  },
);

Given('user has installed Gitops primer Operator', () => {
  verifyAndInstallGitopsPrimerOperator();
});
