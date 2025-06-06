import * as React from 'react';
import { Content, ContentVariants } from '@patternfly/react-core';
import { Formik } from 'formik';
import * as _ from 'lodash';
import { useTranslation, Trans } from 'react-i18next';
import { Link } from 'react-router-dom-v5-compat';
import {
  documentationURLs,
  getDocumentationURL,
  history,
  isManaged,
  LoadingBox,
  StatusBox,
} from '@console/internal/components/utils';
import { RoleBindingModel, RoleModel } from '@console/internal/models';
import { DocumentTitle } from '@console/shared/src/components/document-title/DocumentTitle';
import { PageHeading } from '@console/shared/src/components/heading/PageHeading';
import { ExternalLink } from '@console/shared/src/components/links/ExternalLink';
import NamespacedPage, { NamespacedPageVariants } from '../NamespacedPage';
import {
  getNewRoles,
  getRemovedRoles,
  sendRoleBindingRequest,
  getRolesWithMultipleSubjects,
  getRolesToUpdate,
} from './project-access-form-submit-utils';
import { getUserRoleBindings, Roles } from './project-access-form-utils';
import { Verb, UserRoleBinding } from './project-access-form-utils-types';
import { validationSchema } from './project-access-form-validation-utils';
import ProjectAccessForm from './ProjectAccessForm';

export interface ProjectAccessProps {
  namespace: string;
  roleBindings?: { data: []; loaded: boolean; loadError: {} };
  roles: { data: Roles; loaded: boolean };
  fullFormView?: boolean;
}

const ProjectAccess: React.FC<ProjectAccessProps> = ({
  namespace,
  roleBindings,
  roles,
  fullFormView,
}) => {
  const { t } = useTranslation();
  if ((!roleBindings.loaded && _.isEmpty(roleBindings.loadError)) || !roles.loaded) {
    return <LoadingBox />;
  }

  const userRoleBindings: UserRoleBinding[] = getUserRoleBindings(
    roleBindings.data,
    Object.keys(roles.data),
    namespace,
  );

  const rbacURL = getDocumentationURL(documentationURLs.usingRBAC);

  const initialValues = {
    projectAccess: roleBindings.loaded && userRoleBindings,
  };

  const handleSubmit = (values, actions) => {
    let newRoles = getNewRoles(initialValues.projectAccess, values.projectAccess);
    let removeRoles = getRemovedRoles(initialValues.projectAccess, values.projectAccess);
    const updateRoles = getRolesToUpdate(newRoles, removeRoles);

    const { updateRolesWithMultipleSubjects, removeRoleSubjectFlag } = getRolesWithMultipleSubjects(
      newRoles,
      removeRoles,
      updateRoles,
    );

    if (updateRoles.length > 0) {
      newRoles = newRoles.filter(
        (o1) => !updateRoles.find((o2) => o1.roleBindingName === o2.roleBindingName),
      );
      removeRoles = removeRoles.filter(
        (o1) => !updateRoles.find((o2) => o1.roleBindingName === o2.roleBindingName),
      );
    }
    updateRoles.push(...updateRolesWithMultipleSubjects);
    const roleBindingRequests = [];
    if (updateRoles.length > 0) {
      roleBindingRequests.push(
        ...sendRoleBindingRequest(Verb.Patch, updateRoles, namespace, removeRoleSubjectFlag),
      );
    }
    if (newRoles.length > 0) {
      roleBindingRequests.push(
        ...sendRoleBindingRequest(Verb.Create, newRoles, namespace, removeRoleSubjectFlag),
      );
    }
    if (removeRoles.length > 0) {
      roleBindingRequests.push(
        ...sendRoleBindingRequest(Verb.Remove, removeRoles, namespace, removeRoleSubjectFlag),
      );
    }

    return Promise.all(roleBindingRequests)
      .then(() => {
        actions.resetForm({
          values: {
            projectAccess: values.projectAccess,
          },
          status: { success: t('devconsole~Successfully updated the project access.') },
        });
      })
      .catch((err) => {
        actions.setStatus({ submitError: err.message });
      });
  };

  const handleReset = (values, actions) => {
    actions.resetForm({ status: { success: null }, values: initialValues });
  };

  const projectAccessForm = (
    <>
      <PageHeading
        title={fullFormView ? t('devconsole~Project access') : null}
        data-test="project-access-page"
        helpText={
          <>
            <Content component={ContentVariants.p}>
              <Trans t={t} ns="devconsole">
                {
                  "Project access allows you to add or remove a user's access to the project. More advanced management of role-based access control appear in "
                }
                <Link to={`/k8s/ns/${namespace}/${RoleModel.plural}`}>Roles</Link> and{' '}
                <Link to={`/k8s/ns/${namespace}/${RoleBindingModel.plural}`}>Role Bindings</Link>.
              </Trans>
              {!isManaged() && (
                <Trans t={t} ns="devconsole">
                  {' '}
                  For more information, see the{' '}
                  <ExternalLink href={rbacURL}>
                    role-based access control documentation
                  </ExternalLink>
                  .
                </Trans>
              )}
            </Content>
          </>
        }
      />
      {roleBindings.loadError ? (
        <StatusBox loaded={roleBindings.loaded} loadError={roleBindings.loadError} />
      ) : (
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onReset={handleReset}
          validationSchema={validationSchema}
        >
          {(formikProps) => (
            <ProjectAccessForm
              {...formikProps}
              roles={roles.data}
              roleBindings={initialValues}
              onCancel={fullFormView ? history.goBack : null}
            />
          )}
        </Formik>
      )}
    </>
  );

  return fullFormView ? (
    <NamespacedPage hideApplications variant={NamespacedPageVariants.light} disabled>
      <DocumentTitle>{t('devconsole~Project access')}</DocumentTitle>
      {projectAccessForm}
    </NamespacedPage>
  ) : (
    projectAccessForm
  );
};

export default ProjectAccess;
