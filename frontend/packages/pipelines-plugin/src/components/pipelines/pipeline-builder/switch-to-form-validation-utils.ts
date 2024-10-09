import i18n from 'i18next';
import * as yup from 'yup';
import { nameValidationSchema } from '@console/shared';
import { PipelineTask } from '../../../types';
import { PipelineBuilderFormValues } from './types';
import { runAfterMatches } from './validation-utils';

const resourceDefinitionYAML = () => {
  return yup.array().of(
    yup.object({
      name: yup.string().required(),
      resource: yup.string(),
    }),
  );
};

const tektonTaskSpec = () => {
  return yup.object({
    metadata: yup.object(),
    description: yup.string(),
    steps: yup.array().of(
      yup.object({
        name: yup.string().required(),
        args: yup.array().of(yup.string()),
        command: yup.array().of(yup.string()),
        image: yup.string(),
        resources: yup.object().shape({}),
        env: yup.array().of(
          yup.object({
            name: yup.string(),
            value: yup.string(),
          }),
        ),
        script: yup.array().of(yup.string()),
      }),
    ),
    params: yup.array().of(
      yup.object({
        default: yup.lazy((val) => (Array.isArray(val) ? yup.array() : yup.string())),
        description: yup.string(),
        name: yup.string().required(),
        type: yup.string().oneOf(['string', 'array']),
      }),
    ),
    resources: yup.object().shape({
      inputs: resourceDefinitionYAML(),
      outputs: resourceDefinitionYAML(),
    }),
    results: yup.array().of(
      yup.object({
        name: yup.string().required(),
        description: yup.string(),
      }),
    ),
    workspaces: yup.array().of(
      yup.object({
        name: yup.string().required(),
        description: yup.string(),
        mountPath: yup.string(),
        readOnly: yup.boolean(),
        optional: yup.boolean(),
      }),
    ),
  });
};

export const validRunAfter = (formData: PipelineBuilderFormValues, thisTask: PipelineTask) => {
  return yup.array().of(
    yup
      .string()
      .test('tasks-matches-runAfters', i18n.t('pipelines-plugin~Invalid runAfter'), function (
        runAfter: string,
      ) {
        return runAfterMatches(formData, [runAfter], thisTask.name);
      }),
  );
};

const taskValidationYAMLSchema = (formData: PipelineBuilderFormValues) => {
  return yup.array().of(
    yup.lazy((taskObject: PipelineTask) =>
      yup
        .object({
          name: nameValidationSchema((tKey: string) => i18n.t(tKey)),
          params: yup.array().of(
            yup.object({
              name: yup.string().required(),
              value: yup.lazy((value: any) => {
                if (Array.isArray(value)) {
                  return yup.array().of(yup.string());
                }
                return yup.string();
              }),
            }),
          ),
          resources: yup.object({
            inputs: resourceDefinitionYAML(),
            outputs: resourceDefinitionYAML(),
          }),
          runAfter: validRunAfter(formData, taskObject),
          taskRef: yup
            .object({
              name: yup.string(),
              kind: yup.string(),
            })
            .default(undefined),
          taskSpec: tektonTaskSpec().default(undefined),
          when: yup.array().of(
            yup.object({
              input: yup.string(),
              operator: yup.string(),
              values: yup.array().of(yup.string()),
            }),
          ),
          workspaces: yup.array().of(
            yup.object({
              name: yup.string().required(),
              workspace: yup.string(),
            }),
          ),
        })
        .test(
          'taskRef-or-taskSpec',
          i18n.t('pipelines-plugin~TaskSpec or TaskRef must be provided.'),
          (task: PipelineTask) => {
            return !!task.taskRef || !!task.taskSpec;
          },
        ),
    ),
  );
};

export const pipelineBuilderYAMLSchema = (formData: PipelineBuilderFormValues) => {
  return yup.object({
    metadata: yup.object({ name: yup.string() }),
    spec: yup.object({
      params: yup.array().of(
        yup.object({
          name: yup.string(),
          description: yup.string(),
          default: yup.lazy((val) => (Array.isArray(val) ? yup.array() : yup.string())),
        }),
      ),
      resources: yup.array().of(
        yup.object({
          name: yup.string(),
          type: yup.string(),
        }),
      ),
      workspaces: yup.array().of(
        yup.object({
          name: yup.string(),
        }),
      ),
      tasks: taskValidationYAMLSchema(formData),
      finally: taskValidationYAMLSchema(formData),
    }),
  });
};
