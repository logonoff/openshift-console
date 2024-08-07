import * as React from 'react';
import { shallow } from 'enzyme';
import { useFormikContext } from 'formik';
import { CheckboxField } from '@console/shared';
import BuildConfigSection from '../BuildConfigSection';

let BuildConfigSectionProps: React.ComponentProps<typeof BuildConfigSection>;
const useFormikContextMock = useFormikContext as jest.Mock;

jest.mock('formik', () => ({
  useFormikContext: jest.fn(() => ({
    values: {
      project: {
        name: 'my-app',
      },
      resources: 'kubernetes',
      build: {
        env: [],
        triggers: {
          webhook: true,
          config: true,
          image: true,
        },
        strategy: 'Source',
      },
      image: { selected: 'nodejs-ex', tag: 'latest' },
      import: {
        selectedStrategy: '',
      },
    },
  })),
}));

jest.mock('../../builder/builderImageHooks', () => ({
  useBuilderImageEnvironments: () => [[], true],
}));

describe('BuildConfigSection', () => {
  it('should render CheckboxField if triggers are there', () => {
    const wrapper = shallow(<BuildConfigSection {...BuildConfigSectionProps} />);
    expect(wrapper.find(CheckboxField).exists()).toBe(true);
    expect(wrapper.find(CheckboxField)).toHaveLength(3);
  });

  it('should not render CheckboxField if triggers not there', () => {
    useFormikContextMock.mockReturnValue({
      values: {
        build: {
          env: [],
          triggers: {},
          strategy: 'Source',
        },
        image: { selected: 'nodejs-ex', tag: 'latest' },
        import: {
          selectedStrategy: '',
        },
      },
    });
    const wrapper = shallow(<BuildConfigSection {...BuildConfigSectionProps} />);
    expect(wrapper.find(CheckboxField).exists()).toBe(false);
  });
});
