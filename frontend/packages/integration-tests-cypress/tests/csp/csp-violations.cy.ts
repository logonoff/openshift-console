import { checkErrors } from '../../support';

interface CSPViolation {
  violatedDirective: string;
  effectiveDirective: string;
  blockedURI: string;
  sourceFile: string;
  lineNumber: number;
  columnNumber: number;
  originalPolicy: string;
}

describe('Content Security Policy', () => {
  /** CSP reporting endpoint to be used for testing Console pages. */
  const cspReportURL = Cypress.env('CSP_REPORT_URL') || 'http://localhost:7777';

  before(() => {
    cy.login();
  });

  afterEach(() => {
    checkErrors();
  });

  it('should load /dashboards without CSP violations', () => {
    const violations: CSPViolation[] = [];

    // When requesting the web page, add custom 'Test-CSP-Reporting-Endpoint' HTTP header
    // in order to instruct Console Bridge server to use the given CSP reporting endpoint.
    //
    // Note: the experimentalCspAllowList Cypress config option preserves non-dangerous
    // CSP directives like connect-src and report-uri (Cypress strips all CSP directives
    // by default to allow its own scripts to run in the application iframe).
    cy.intercept('GET', '/dashboards*', (req) => {
      req.headers['Test-CSP-Reporting-Endpoint'] = cspReportURL;
    });

    // The browser will attempt to send any CSP violations to the CSP reporting endpoint.
    // Intercept such requests and fulfill them before they are sent over the network,
    // therefore avoiding the need to implement that reporting endpoint.
    cy.intercept('POST', `${cspReportURL}**`, { statusCode: 200 }).as('cspReport');

    cy.visit('/dashboards', {
      onBeforeLoad(win) {
        // Listen for CSP violations fired as DOM events on the window.
        win.addEventListener('securitypolicyviolation', (e: SecurityPolicyViolationEvent) => {
          violations.push({
            violatedDirective: e.violatedDirective,
            effectiveDirective: e.effectiveDirective,
            blockedURI: e.blockedURI,
            sourceFile: e.sourceFile,
            lineNumber: e.lineNumber,
            columnNumber: e.columnNumber,
            originalPolicy: e.originalPolicy,
          });
        });
      },
    });

    // Timeout [ms] when loading Console pages. 60s should give the browser enough
    // time to load all Console resources over the network.
    cy.get('#content', { timeout: 60000 }).should('exist');

    // Allow time for async resources to load and any deferred violations to fire.
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(5000).then(() => {
      violations.forEach((v) => {
        cy.task(
          'logError',
          `CSP violation detected: ${JSON.stringify(
            {
              'document-uri': `${Cypress.config('baseUrl')}/dashboards`,
              'violated-directive': v.violatedDirective,
              'effective-directive': v.effectiveDirective,
              'blocked-uri': v.blockedURI,
              'source-file': v.sourceFile,
              'line-number': v.lineNumber,
              'column-number': v.columnNumber,
              'original-policy': v.originalPolicy,
            },
            null,
            2,
          )}`,
        );
      });
      expect(violations, 'No CSP violations should be detected').to.have.length(0);
    });
  });
});
