import {
  CardTitle,
  CardBody,
  CardFooter,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';
import { shallow, ShallowWrapper, mount, ReactWrapper } from 'enzyme';
import * as _ from 'lodash';
import { Provider } from 'react-redux';
import * as ReactRouter from 'react-router-dom-v5-compat';
import * as rbacModule from '@console/dynamic-plugin-sdk/src/app/components/utils/rbac';
import {
  DetailsPage,
  Table,
  TableProps,
  ComponentProps,
} from '@console/internal/components/factory';
import {
  ResourceKebab,
  ScrollToTopOnMount,
  SectionHeading,
  resourceObjPath,
  StatusBox,
} from '@console/internal/components/utils';
import operatorLogo from '@console/internal/imgs/operator.svg';
import { referenceForModel } from '@console/internal/module/k8s';
import store from '@console/internal/redux';
import { Timestamp } from '@console/shared/src/components/datetime/Timestamp';
import { ErrorBoundary } from '@console/shared/src/components/error';
import PaneBody from '@console/shared/src/components/layout/PaneBody';
import { useActiveNamespace } from '@console/shared/src/hooks/redux-selectors';
import {
  testClusterServiceVersion,
  testSubscription,
  testPackageManifest,
  testCatalogSource,
  testInstallPlan,
  testModel,
  testSubscriptions,
} from '../../mocks';
import { ClusterServiceVersionModel } from '../models';
import { ClusterServiceVersionKind, ClusterServiceVersionPhase } from '../types';
import { ClusterServiceVersionLogo } from './cluster-service-version-logo';
import {
  ClusterServiceVersionDetailsPage,
  ClusterServiceVersionDetails,
  ClusterServiceVersionDetailsProps,
  ClusterServiceVersionTableRow,
  ClusterServiceVersionTableRowProps,
  CRDCard,
  CRDCardRow,
  CSVSubscription,
  CSVSubscriptionProps,
  ClusterServiceVersionList,
} from './clusterserviceversion';
import { SubscriptionUpdates, SubscriptionDetails } from './subscription';
import { ClusterServiceVersionLogoProps, referenceForProvidedAPI } from '.';

jest.mock('@console/shared/src/hooks/useK8sModel', () => ({
  useK8sModel: () => [testModel],
}));

jest.mock('@console/internal/components/utils/rbac', () => ({
  useAccessReview: () => true,
}));

jest.mock('@console/shared/src/hooks/redux-selectors', () => {
  return {
    useActiveNamespace: jest.fn(),
  };
});

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useParams: jest.fn(),
  useLocation: jest.fn(),
}));

describe(ClusterServiceVersionTableRow.displayName, () => {
  let wrapper: ShallowWrapper<ClusterServiceVersionTableRowProps>;
  beforeEach(() => {
    window.SERVER_FLAGS.copiedCSVsDisabled = false;
    wrapper = shallow(
      <ClusterServiceVersionTableRow
        catalogSourceMissing={false}
        obj={testClusterServiceVersion}
        subscription={testSubscription}
      />,
    )
      .childAt(0)
      .shallow();
  });

  it('renders a component wrapped in an `ErrorBoundary', () => {
    wrapper = shallow(
      <ClusterServiceVersionTableRow
        catalogSourceMissing={false}
        obj={testClusterServiceVersion}
        subscription={testSubscription}
      />,
    );

    expect(wrapper.find(ErrorBoundary).exists()).toBe(true);
  });

  it('renders `ResourceKebab` with actions', () => {
    const col = wrapper;

    expect(col.find(ResourceKebab).props().resource).toEqual(testClusterServiceVersion);
    expect(col.find(ResourceKebab).props().kind).toEqual(
      referenceForModel(ClusterServiceVersionModel),
    );
    expect(col.find(ResourceKebab).props().actions.length).toEqual(2);
  });

  it('renders clickable column for app logo and name', () => {
    const col = wrapper.childAt(0);

    expect(col.find<any>(ReactRouter.Link).props().to).toEqual(
      resourceObjPath(testClusterServiceVersion, referenceForModel(ClusterServiceVersionModel)),
    );
    expect(col.find(ReactRouter.Link).find(ClusterServiceVersionLogo).exists()).toBe(true);
  });

  it('renders column for managedNamespace', () => {
    const col = wrapper.childAt(1);
    const managedNamespace = col.childAt(0);
    expect(managedNamespace.exists()).toBeTruthy();
  });

  it('renders column for last updated', () => {
    const col = wrapper.childAt(3);
    expect(col.find(Timestamp).props().timestamp).toEqual('2020-04-21T18:19:49Z');
  });

  it('renders column for app status', () => {
    const col = wrapper.childAt(2);
    const statusComponent = col.childAt(0).find('ClusterServiceVersionStatus');
    expect(statusComponent.exists()).toBeTruthy();
    expect(statusComponent.render().text()).toContain(ClusterServiceVersionPhase.CSVPhaseSucceeded);
  });

  it('renders "disabling" status if CSV has `deletionTimestamp`', () => {
    wrapper = wrapper.setProps({
      obj: _.cloneDeepWith(testClusterServiceVersion, (v, k) =>
        k === 'metadata' ? { ...v, deletionTimestamp: Date.now() } : undefined,
      ),
    });
    const col = wrapper.childAt(2);

    expect(col.childAt(0).find('ClusterServiceVersionStatus').render().text()).toEqual('Deleting');
  });

  it('renders column with each CRD provided by the Operator', () => {
    const col = wrapper.childAt(4);
    testClusterServiceVersion.spec.customresourcedefinitions.owned.forEach((desc, i) => {
      expect(col.find<any>(ReactRouter.Link).at(i).props().title).toEqual(desc.name);
      expect(col.find<any>(ReactRouter.Link).at(i).props().to).toEqual(
        `${resourceObjPath(
          testClusterServiceVersion,
          referenceForModel(ClusterServiceVersionModel),
        )}/${referenceForProvidedAPI(desc)}`,
      );
    });
  });
});

describe(ClusterServiceVersionLogo.displayName, () => {
  let wrapper: ReactWrapper<ClusterServiceVersionLogoProps>;

  beforeEach(() => {
    const { provider, icon, displayName } = testClusterServiceVersion.spec;
    wrapper = mount(
      <ClusterServiceVersionLogo icon={icon[0]} displayName={displayName} provider={provider} />,
    );
  });

  it('renders logo image from given base64 encoded image string', () => {
    const image = wrapper.find('img');

    expect(image.props().src).toEqual(
      `data:${testClusterServiceVersion.spec.icon[0].mediatype};base64,${testClusterServiceVersion.spec.icon[0].base64data}`,
    );
  });

  it('renders fallback image if given icon is invalid', () => {
    wrapper.setProps({ icon: null });
    const fallbackImg = wrapper.find('img');

    expect(fallbackImg.props().src).toEqual(operatorLogo);
  });

  it('renders ClusterServiceVersion name and provider from given spec', () => {
    expect(wrapper.text()).toContain(testClusterServiceVersion.spec.displayName);
    expect(wrapper.text()).toContain(`by ${testClusterServiceVersion.spec.provider.name}`);
  });
});

describe(ClusterServiceVersionList.displayName, () => {
  it('renders `List` with SingleProjectTableHeader for namespace scoped CSV', () => {
    (useActiveNamespace as jest.Mock).mockImplementation(() => 'test');
    const wrapper = shallow(
      <ClusterServiceVersionList
        data={[]}
        subscriptions={{ loaded: true, data: [testSubscription], loadError: null }}
        catalogSources={{ loaded: true, data: [testCatalogSource], loadError: null }}
        loaded
      />,
    );
    const header = wrapper.find<TableProps>(Table).props().Header;
    expect(header.name).toEqual('SingleProjectTableHeader');
    const headerColumns = header({} as ComponentProps);
    expect(headerColumns[0].title).toEqual('Name');
    expect(headerColumns[1].title).toEqual('Managed Namespaces');
    expect(headerColumns[2].title).toEqual('Status');
    expect(headerColumns[3].title).toEqual('Last updated');
    expect(headerColumns[4].title).toEqual('Provided APIs');
    expect(headerColumns[5].title).toEqual('');
  });
  it('renders `List` with AllProjectTableHeader for all-namespaces scoped CSV', () => {
    (useActiveNamespace as jest.Mock).mockImplementation(() => '#ALL_NS#');
    const wrapper = shallow(
      <ClusterServiceVersionList
        data={[]}
        subscriptions={{ loaded: true, data: [testSubscription], loadError: null }}
        catalogSources={{ loaded: true, data: [testCatalogSource], loadError: null }}
        loaded
      />,
    );
    const header = wrapper.find<TableProps>(Table).props().Header;
    expect(header.name).toEqual('AllProjectsTableHeader');
    const headerColumns = header({} as ComponentProps);
    expect(headerColumns[0].title).toEqual('Name');
    expect(headerColumns[1].title).toEqual('Namespace');
    expect(headerColumns[2].title).toEqual('Managed Namespaces');
    expect(headerColumns[3].title).toEqual('Status');
    expect(headerColumns[4].title).toEqual('Last updated');
    expect(headerColumns[5].title).toEqual('Provided APIs');
    expect(headerColumns[6].title).toEqual('');
  });
});

describe(CRDCard.displayName, () => {
  const crd = testClusterServiceVersion.spec.customresourcedefinitions.owned[0];

  it('renders a card with title, body, and footer', () => {
    const wrapper = shallow(<CRDCard canCreate crd={crd} csv={testClusterServiceVersion} />);

    expect(wrapper.find(CardTitle).exists()).toBe(true);
    expect(wrapper.find(CardBody).exists()).toBe(true);
    expect(wrapper.find(CardFooter).exists()).toBe(true);
  });

  it('renders a link to create a new instance', () => {
    const wrapper = shallow(<CRDCard canCreate crd={crd} csv={testClusterServiceVersion} />);

    expect(wrapper.find(CardFooter).find<any>(ReactRouter.Link).props().to).toEqual(
      `/k8s/ns/${testClusterServiceVersion.metadata.namespace}/${
        ClusterServiceVersionModel.plural
      }/${testClusterServiceVersion.metadata.name}/${referenceForProvidedAPI(crd)}/~new`,
    );
  });

  it('does not render link to create new instance if `props.canCreate` is false', () => {
    const wrapper = shallow(
      <CRDCard canCreate={false} crd={crd} csv={testClusterServiceVersion} />,
    );

    expect(wrapper.find(CardFooter).find(ReactRouter.Link).exists()).toBe(false);
  });
});

describe(ClusterServiceVersionDetails.displayName, () => {
  let wrapper: ShallowWrapper<ClusterServiceVersionDetailsProps>;

  beforeEach(() => {
    wrapper = shallow(
      <ClusterServiceVersionDetails
        obj={_.cloneDeep(testClusterServiceVersion)}
        customData={{
          subscriptions: testSubscriptions,
          subscription: testSubscription,
          subscriptionsLoaded: true,
        }}
      />,
    );
  });

  it('renders `ScrollToTopOnMount` component', () => {
    expect(wrapper.find(ScrollToTopOnMount).exists()).toBe(true);
  });

  it('renders row of cards for each "owned" CRD for the given `ClusterServiceVersion`', () => {
    expect(wrapper.find(CRDCardRow).props().csv).toEqual(testClusterServiceVersion);
    expect(wrapper.find(CRDCardRow).props().providedAPIs).toEqual(
      testClusterServiceVersion.spec.customresourcedefinitions.owned,
    );
  });

  it('renders description section for ClusterServiceVersion', () => {
    expect(wrapper.find(PaneBody).at(0).find(SectionHeading).at(1).props().text).toEqual(
      'Description',
    );
  });

  it('renders creation date from ClusterServiceVersion', () => {
    expect(wrapper.find(Timestamp).props().timestamp).toEqual(
      testClusterServiceVersion.metadata.creationTimestamp,
    );
  });

  it('renders list of maintainers from ClusterServiceVersion', () => {
    const maintainers = wrapper
      .findWhere((node) => node.equals(<DescriptionListTerm>Maintainers</DescriptionListTerm>))
      .parents()
      .at(0)
      .find(DescriptionListDescription)
      .shallow();

    expect(maintainers.length).toEqual(testClusterServiceVersion.spec.maintainers.length);

    testClusterServiceVersion.spec.maintainers.forEach((maintainer, i) => {
      expect(maintainers.at(i).text()).toContain(maintainer.name);
      expect(maintainers.at(i).find('.co-break-all').text()).toEqual(maintainer.email);
      expect(maintainers.at(i).find('.co-break-all').props().href).toEqual(
        `mailto:${maintainer.email}`,
      );
    });
  });

  it('renders important links from ClusterServiceVersion', () => {
    const links = wrapper
      .findWhere((node) => node.equals(<DescriptionListTerm>Links</DescriptionListTerm>))
      .parents()
      .at(0)
      .find(DescriptionListDescription);

    expect(links.length).toEqual(testClusterServiceVersion.spec.links.length);
  });

  it('renders empty state for unfulfilled outputs and metadata', () => {
    const emptyClusterServiceVersion: ClusterServiceVersionKind = _.cloneDeep(
      testClusterServiceVersion,
    );
    emptyClusterServiceVersion.spec.description = '';
    emptyClusterServiceVersion.spec.provider = undefined;
    emptyClusterServiceVersion.spec.links = [];
    emptyClusterServiceVersion.spec.maintainers = [];
    wrapper.setProps({ obj: emptyClusterServiceVersion });

    const provider = wrapper
      .findWhere((node) => node.equals(<DescriptionListTerm>Provider</DescriptionListTerm>))
      .parents()
      .at(0)
      .find(DescriptionListDescription)
      .shallow();
    const links = wrapper
      .findWhere((node) => node.equals(<DescriptionListTerm>Links</DescriptionListTerm>))
      .parents()
      .at(0)
      .find(DescriptionListDescription)
      .shallow();
    const maintainers = wrapper
      .findWhere((node) => node.equals(<DescriptionListTerm>Maintainers</DescriptionListTerm>))
      .parents()
      .at(0)
      .find(DescriptionListDescription)
      .shallow();

    expect(provider.text()).toEqual('Not available');
    expect(links.text()).toEqual('Not available');
    expect(maintainers.text()).toEqual('Not available');
  });

  it('renders info section for ClusterServiceVersion', () => {
    expect(wrapper.find(PaneBody).at(1).find(SectionHeading).props().text).toEqual(
      'ClusterServiceVersion details',
    );
  });

  it('renders conditions section for ClusterServiceVersion', () => {
    expect(wrapper.find(PaneBody).at(2).find(SectionHeading).props().text).toEqual('Conditions');
  });

  it('does not render service accounts section if empty', () => {
    const emptyTestClusterServiceVersion = _.cloneDeep(testClusterServiceVersion);
    emptyTestClusterServiceVersion.spec.install.spec.permissions = [];
    wrapper = shallow(
      <ClusterServiceVersionDetails
        obj={emptyTestClusterServiceVersion}
        customData={{
          subscriptions: testSubscriptions,
          subscription: testSubscription,
          subscriptionsLoaded: true,
        }}
      />,
    );
    expect(emptyTestClusterServiceVersion.spec.install.spec.permissions.length).toEqual(0);
    expect(wrapper.findWhere((node) => node.text() === 'Operator ServiceAccounts').length).toEqual(
      0,
    );
  });

  it('does not render duplicate service accounts', () => {
    const duplicateTestClusterServiceVersion = _.cloneDeep(testClusterServiceVersion);
    const permission = duplicateTestClusterServiceVersion.spec.install.spec.permissions[0];
    duplicateTestClusterServiceVersion.spec.install.spec.permissions.push(permission);
    wrapper = shallow(
      <ClusterServiceVersionDetails
        obj={duplicateTestClusterServiceVersion}
        customData={{
          subscriptions: testSubscriptions,
          subscription: testSubscription,
          subscriptionsLoaded: true,
        }}
      />,
    );
    expect(duplicateTestClusterServiceVersion.spec.install.spec.permissions.length).toEqual(2);
    expect(wrapper.findWhere((node) => node.text() === 'Operator ServiceAccounts').length).toEqual(
      1,
    );
    expect(
      wrapper.find(`[data-service-account-name="${permission.serviceAccountName}"]`).length,
    ).toEqual(1);
  });
});

describe(CSVSubscription.displayName, () => {
  let wrapper: ShallowWrapper<CSVSubscriptionProps>;

  it('renders `StatusBox` with correct props when Operator subscription does not exist', () => {
    wrapper = shallow(
      <CSVSubscription
        obj={testClusterServiceVersion}
        customData={{
          subscriptions: [],
          subscription: undefined,
          subscriptionsLoaded: true,
        }}
        packageManifests={[]}
        installPlans={[]}
      />,
    );

    expect(wrapper.find(StatusBox).props().EmptyMsg).toBeDefined();
    expect(wrapper.find(StatusBox).props().loaded).toBe(true);
    expect(wrapper.find(StatusBox).props().data).toBeUndefined();
  });

  it('renders `SubscriptionDetails` with correct props when Operator subscription exists', () => {
    const obj = _.set(_.cloneDeep(testClusterServiceVersion), 'metadata.annotations', {
      'olm.operatorNamespace': 'default',
    });
    const subscription = _.set(_.cloneDeep(testSubscription), 'status', {
      installedCSV: obj.metadata.name,
    });

    wrapper = shallow(
      <CSVSubscription
        obj={obj}
        customData={{
          subscription,
          subscriptions: [testSubscription, subscription],
          subscriptionsLoaded: true,
        }}
        packageManifests={[testPackageManifest]}
        installPlans={[testInstallPlan]}
      />,
    );

    const subscriptionUpdates = wrapper
      .find(StatusBox)
      .find(SubscriptionDetails)
      .dive()
      .find(SubscriptionUpdates);
    expect(subscriptionUpdates.props().obj).toEqual(subscription);
    expect(subscriptionUpdates.props().installedCSV).toEqual(obj);
    expect(subscriptionUpdates.props().pkg).toEqual(testPackageManifest);
  });

  it('passes the matching `PackageManifest` if there are multiple with the same `metadata.name`', () => {
    const obj = _.set(_.cloneDeep(testClusterServiceVersion), 'metadata.annotations', {
      'olm.operatorNamespace': 'default',
    });
    const subscription = _.set(_.cloneDeep(testSubscription), 'status', {
      installedCSV: obj.metadata.name,
    });
    const otherPkg = _.set(
      _.cloneDeep(testPackageManifest),
      'status.catalogSource',
      'other-source',
    );

    wrapper = shallow(
      <CSVSubscription
        obj={obj}
        packageManifests={[testPackageManifest, otherPkg]}
        installPlans={[testInstallPlan]}
        customData={{
          subscription,
          subscriptionsLoaded: true,
          subscriptions: [testSubscription, subscription],
        }}
      />,
    );

    expect(
      wrapper.find(StatusBox).find(SubscriptionDetails).dive().find(SubscriptionUpdates).props()
        .pkg,
    ).toEqual(testPackageManifest);
  });
});

describe(ClusterServiceVersionDetailsPage.displayName, () => {
  let wrapper: ReactWrapper;
  let spyUseAccessReview;

  const name = 'example';
  const ns = 'default';

  beforeEach(() => {
    spyUseAccessReview = jest.spyOn(rbacModule, 'useAccessReview');
    spyUseAccessReview.mockReturnValue([true, false]);

    jest.spyOn(ReactRouter, 'useParams').mockReturnValue({ name: 'example', ns: 'default' });
    jest.spyOn(ReactRouter, 'useLocation').mockReturnValue({ pathname: '' });

    window.SERVER_FLAGS.copiedCSVsDisabled = false;
    wrapper = mount(
      <Provider store={store}>
        <ReactRouter.BrowserRouter>
          <ClusterServiceVersionDetailsPage />
        </ReactRouter.BrowserRouter>
      </Provider>,
    );
  });

  it('passes URL parameters to `DetailsPage`', () => {
    const detailsPage = wrapper.find(DetailsPage);

    expect(detailsPage.props().namespace).toEqual(ns);
    expect(detailsPage.props().name).toEqual(name);
    expect(detailsPage.props().kind).toEqual(referenceForModel(ClusterServiceVersionModel));
  });

  it('renders a `DetailsPage` with the correct subpages', () => {
    const detailsPage = wrapper.find(DetailsPage);
    expect(detailsPage.props().pagesFor(testClusterServiceVersion)[0].nameKey).toEqual(
      'public~Details',
    );
    expect(detailsPage.props().pagesFor(testClusterServiceVersion)[0].href).toEqual('');
    expect(detailsPage.props().pagesFor(testClusterServiceVersion)[0].component).toEqual(
      ClusterServiceVersionDetails,
    );
    expect(detailsPage.props().pagesFor(testClusterServiceVersion)[1].nameKey).toEqual(
      `public~YAML`,
    );
    expect(detailsPage.props().pagesFor(testClusterServiceVersion)[1].href).toEqual('yaml');
    expect(detailsPage.props().pagesFor(testClusterServiceVersion)[2].nameKey).toEqual(
      'olm~Subscription',
    );
    expect(detailsPage.props().pagesFor(testClusterServiceVersion)[2].href).toEqual('subscription');
    expect(detailsPage.props().pagesFor(testClusterServiceVersion)[3].nameKey).toEqual(
      `public~Events`,
    );
    expect(detailsPage.props().pagesFor(testClusterServiceVersion)[3].href).toEqual('events');
  });

  it('includes tab for each "owned" CRD', () => {
    const detailsPage = wrapper.find(DetailsPage);

    const csv = _.cloneDeep(testClusterServiceVersion);
    csv.spec.customresourcedefinitions.owned = csv.spec.customresourcedefinitions.owned.concat([
      { name: 'e.example.com', kind: 'E', version: 'v1alpha1', displayName: 'E' },
    ]);

    expect(detailsPage.props().pagesFor(csv)[4].nameKey).toEqual('olm~All instances');
    expect(detailsPage.props().pagesFor(csv)[4].href).toEqual('instances');
    csv.spec.customresourcedefinitions.owned.forEach((desc, i) => {
      expect(detailsPage.props().pagesFor(csv)[5 + i].name).toEqual(desc.displayName);
      expect(detailsPage.props().pagesFor(csv)[5 + i].href).toEqual(referenceForProvidedAPI(desc));
    });
  });

  it('does not include "All Instances" tab if only one "owned" CRD', () => {
    const detailsPage = wrapper.find(DetailsPage);

    expect(
      detailsPage
        .props()
        .pagesFor(testClusterServiceVersion)
        .some((p) => p.name === 'All Instances'),
    ).toBe(false);
  });
});
