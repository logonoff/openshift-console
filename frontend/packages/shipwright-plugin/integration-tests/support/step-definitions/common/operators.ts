import { Given } from 'cypress-cucumber-preprocessor/steps';
import { operators } from '@console/dev-console/integration-tests/support/constants/global';
import {
  installPipelinesOperatorUsingCLI,
  verifyAndInstallKnativeOperator,
  verifyAndInstallOperator,
} from '@console/dev-console/integration-tests/support/pages';

Given('user has installed OpenShift Pipelines Operator', () => {
  installPipelinesOperatorUsingCLI();
});

Given('user has installed OpenShift Serverless Operator', () => {
  verifyAndInstallKnativeOperator();
});

Given('user has installed Shipwright Operator', () => {
  verifyAndInstallOperator(operators.ShipwrightOperator);
});
