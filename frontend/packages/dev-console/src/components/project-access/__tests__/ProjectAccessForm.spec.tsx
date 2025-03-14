import * as React from 'react';
import { shallow } from 'enzyme';
import { MultiColumnField, InputField, DropdownField, FormFooter } from '@console/shared';
import { defaultAccessRoles } from '../project-access-form-utils';
import ProjectAccessForm, { SubjectNamespaceDropdown } from '../ProjectAccessForm';

type ProjectAccessFormProps = React.ComponentProps<typeof ProjectAccessForm>;
let formProps: ProjectAccessFormProps;

describe('Project Access Form', () => {
  const projectAccessForm = shallow(
    <ProjectAccessForm {...formProps} roles={defaultAccessRoles} />,
  );
  beforeEach(() => {
    formProps = {
      values: {
        projectAccess: [
          {
            roleBindingName: 'abc-admin',
            user: 'abc',
            role: 'admin',
          },
          {
            roleBindingName: 'xyz-edit',
            user: 'xyz',
            role: 'edit',
          },
        ],
      },
      roleBindings: {
        projectAccess: [
          {
            roleBindingName: 'abc-admin',
            subject: {
              name: 'abc',
              kind: 'User',
              apiGroup: 'rbac.authorization.k8s.io',
            },
            subjects: [],
            role: 'admin',
          },
          {
            roleBindingName: 'xyz-edit',
            subject: {
              name: 'xyz',
              kind: 'User',
              apiGroup: 'rbac.authorization.k8s.io',
            },
            subjects: [],
            role: 'edit',
          },
        ],
      },
      errors: {},
      touched: {},
      isSubmitting: true,
      isValidating: true,
      status: {},
      submitCount: 0,
      dirty: false,
      getFieldHelpers: jest.fn(),
      getFieldProps: jest.fn(),
      handleBlur: jest.fn(),
      handleChange: jest.fn(),
      handleReset: jest.fn(),
      handleSubmit: jest.fn(),
      initialErrors: {},
      initialStatus: {},
      initialTouched: {},
      initialValues: {
        projectAccess: [
          {
            roleBindingName: 'abc-admin',
            user: 'abc',
            role: 'admin',
          },
          {
            roleBindingName: 'xyz-edit',
            user: 'xyz',
            role: 'edit',
          },
        ],
      },
      isValid: true,
      registerField: jest.fn(),
      resetForm: jest.fn(),
      setErrors: jest.fn(),
      setFieldError: jest.fn(),
      setFieldTouched: jest.fn(),
      setFieldValue: jest.fn(),
      setFormikState: jest.fn(),
      setStatus: jest.fn(),
      setSubmitting: jest.fn(),
      setTouched: jest.fn(),
      setValues: jest.fn(),
      submitForm: jest.fn(),
      unregisterField: jest.fn(),
      validateField: jest.fn(),
      validateForm: jest.fn(),
      getFieldMeta: jest.fn(),
      validateOnBlur: true,
      validateOnChange: true,
      roles: {},
    };
  });
  it('should load the correct Project Access Form structure', () => {
    expect(projectAccessForm.find(MultiColumnField).exists()).toBe(true);
    const formWrapper = projectAccessForm.find(MultiColumnField);
    expect(formWrapper.getElements()[0].props.name).toBe('projectAccess');
    expect(formWrapper.getElements()[0].props.headers).toEqual(['Subject', 'Name', 'Role']);
    expect(formWrapper.getElements()[0].props.addLabel).toEqual('Add access');
    expect(formWrapper.children()).toHaveLength(3);
    expect(formWrapper.children().at(0).is(SubjectNamespaceDropdown)).toBe(true);
    expect(formWrapper.children().at(1).is(InputField)).toBe(true);
    expect(formWrapper.children().at(2).is(DropdownField)).toBe(true);
    expect(projectAccessForm.find(FormFooter).exists()).toBe(true);
  });

  it('should load the dropdown with access roles', () => {
    const formWrapper = projectAccessForm.find(MultiColumnField);
    expect(formWrapper.children().at(2).props().name).toBe('role');
    expect(formWrapper.children().at(2).props().items).toEqual({
      admin: 'Admin',
      view: 'View',
      edit: 'Edit',
    });
  });
});
