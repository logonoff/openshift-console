import { shallow } from 'enzyme';
import { Formik } from 'formik';
import * as Router from 'react-router-dom-v5-compat';
import { LoadingBox } from '@console/internal/components/utils';
import { useK8sWatchResources } from '@console/internal/components/utils/k8s-watch-hook';
import { PageHeading } from '@console/shared/src/components/heading/PageHeading';
import { useRelatedHPA } from '@console/shared/src/hooks/hpa-hooks';
import { deploymentData } from '../../../utils/__tests__/knative-serving-data';
import CreateKnatifyPage from '../CreateKnatifyPage';

const useK8sWatchResourcesMock = useK8sWatchResources as jest.Mock;
const useRelatedHPAMock = useRelatedHPA as jest.Mock;

jest.mock('@console/internal/components/utils/k8s-watch-hook', () => ({
  useK8sWatchResources: jest.fn(),
}));

jest.mock('@console/shared/src/hooks/hpa-hooks', () => ({
  useRelatedHPA: jest.fn(),
}));

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useParams: jest.fn(),
  useLocation: jest.fn(),
}));

describe('CreateKnatifyPage', () => {
  beforeEach(() => {
    useK8sWatchResourcesMock.mockClear();
    jest.spyOn(Router, 'useParams').mockReturnValue({
      pathname: 'knatify/ns/jai-test-1?name=ruby-ex-git-dc&kind=Deployment',
      search: 'knatify/ns/jai-test-1?name=ruby-ex-git-dc&kind=Deployment',
      state: null,
      hash: null,
    });
    jest.spyOn(Router, 'useLocation').mockReturnValue({ pathname: '' });
  });

  it('CreateKnatifyPage should render PageHeading and Loading if resources is not loaded yet', () => {
    useK8sWatchResourcesMock.mockReturnValue({
      imageStream: { data: [], loaded: false },
      projects: { data: [], loaded: false },
      workloadResource: { data: deploymentData, loaded: true },
    });
    useRelatedHPAMock.mockReturnValue([{}, true, null]);
    const wrapper = shallow(<CreateKnatifyPage />);
    expect(wrapper.find(PageHeading).exists()).toBe(true);
    expect(wrapper.find(LoadingBox).exists()).toBe(true);
    expect(wrapper.find(Formik).exists()).toBe(false);
  });

  it('CreateKnatifyPage should render PageHeading and Loading if Hpa is not loaded', () => {
    useK8sWatchResourcesMock.mockReturnValue({
      imageStream: { data: [], loaded: true },
      projects: { data: [], loaded: true },
      workloadResource: { data: deploymentData, loaded: true },
    });
    useRelatedHPAMock.mockReturnValue([null, false, null]);
    const wrapper = shallow(<CreateKnatifyPage />);
    expect(wrapper.find(PageHeading).exists()).toBe(true);
    expect(wrapper.find(LoadingBox).exists()).toBe(true);
    expect(wrapper.find(Formik).exists()).toBe(false);
  });

  it('CreateKnatifyPage should render PageHeading and Formik if resources are loaded', () => {
    useK8sWatchResourcesMock.mockReturnValue({
      imageStream: { data: [], loaded: true },
      projects: { data: [], loaded: true },
      workloadResource: { data: deploymentData, loaded: true },
    });
    useRelatedHPAMock.mockReturnValue([{}, true, null]);
    const wrapper = shallow(<CreateKnatifyPage />);
    expect(wrapper.find(PageHeading).exists()).toBe(true);
    expect(wrapper.find(Formik).exists()).toBe(true);
    expect(wrapper.find(LoadingBox).exists()).toBe(false);
  });
});
