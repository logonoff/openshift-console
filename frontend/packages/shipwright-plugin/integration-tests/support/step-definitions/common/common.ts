import { Given, When, Then } from 'cypress-cucumber-preprocessor/steps';
import { detailsPage } from '@console/cypress-integration-tests/views/details-page';
import { guidedTour } from '@console/cypress-integration-tests/views/guided-tour';
import { modal } from '@console/cypress-integration-tests/views/modal';
import { nav } from '@console/cypress-integration-tests/views/nav';
import {
  devNavigationMenu,
  switchPerspective,
  adminNavigationMenu,
  pageTitle,
} from '@console/dev-console/integration-tests/support/constants';
import {
  perspective,
  projectNameSpace,
  navigateTo,
  app,
} from '@console/dev-console/integration-tests/support/pages';
import { checkDeveloperPerspective } from '@console/dev-console/integration-tests/support/pages/functions/checkDeveloperPerspective';
import { devNavigationMenuPO } from '../../pageObjects';

Given('user has logged in as a basic user', () => {
  Cypress.session.clearAllSavedSessions();
  const idp = Cypress.env('BRIDGE_HTPASSWD_IDP') || 'test';
  const username = Cypress.env('BRIDGE_HTPASSWD_USERNAME') || 'test';
  const password = Cypress.env('BRIDGE_HTPASSWD_PASSWORD') || 'test';
  cy.login(idp, username, password);
  app.waitForLoad();
  guidedTour.close();
});

Given('user is at developer perspective', () => {
  checkDeveloperPerspective();
  perspective.switchTo(switchPerspective.Developer);
  // Due to bug ODC-6231
  // cy.testA11y('Developer perspective with guide tour modal');
  guidedTour.close();
  nav.sidenav.switcher.shouldHaveText(switchPerspective.Developer);
  // Commenting below line, because it is executing on every test scenario - we will remove this in future releases
  // cy.testA11y('Developer perspective');
});

Given('user is at Add page', () => {
  checkDeveloperPerspective();
  navigateTo(devNavigationMenu.Add);
});

Given('user is at Builds page', () => {
  cy.get(devNavigationMenuPO.builds).click();
  detailsPage.titleShouldContain(pageTitle.Builds);
  cy.testA11y('Builds Page in dev perspective');
});

When('user navigates to Topology in Developer perspective', () => {
  navigateTo(devNavigationMenu.Add);
  cy.get('[data-test-id="topology-header"]', { timeout: 10000 }).click({ force: true });
});

Given('user has created namespace starts with {string}', (projectName: string) => {
  const d = new Date();
  const timestamp = d.getTime();
  projectNameSpace.selectOrCreateProject(`${projectName}-${timestamp}-ns`);
  cy.testA11y('Developer perspective display after creating or selecting project');
});

Given('user has created or selected namespace {string}', (projectName: string) => {
  Cypress.env('NAMESPACE', projectName);
  projectNameSpace.selectOrCreateProject(`${projectName}`);
});

Given('user is at Monitoring page', () => {
  navigateTo(devNavigationMenu.Observe);
});

Given('user is at namespace {string}', (projectName: string) => {
  Cypress.env('NAMESPACE', projectName);
  projectNameSpace.selectOrCreateProject(projectName);
});

When('user switches to developer perspective', () => {
  perspective.switchTo(switchPerspective.Developer);
  guidedTour.close();
});

When('user selects {string} option from Actions menu', (option: string) => {
  cy.byLegacyTestID('actions-menu-button').click();
  cy.byTestActionID(option).click();
  cy.get('[aria-label="Breadcrumb"]', { timeout: 5000 }).should('contain', 'Build details');
});

Then('modal with {string} appears', (header: string) => {
  modal.modalTitleShouldContain(header);
});

Then('user will be redirected to Pipelines page', () => {
  detailsPage.titleShouldContain(adminNavigationMenu.pipelines);
});

When('user clicks create button', () => {
  cy.get('button[type="submit"]').click();
});

Given('user has selected namespace {string}', (projectName: string) => {
  projectNameSpace.selectProject(projectName);
});

When('user clicks on {string} link', (buttonName: string) => {
  cy.byButtonText(buttonName).click();
});

When('user is at namespace {string}', (projectName: string) => {
  perspective.switchTo(switchPerspective.Developer);
  projectNameSpace.selectOrCreateProject(projectName);
});

When('user refreshes the page', () => {
  cy.reload();
});
