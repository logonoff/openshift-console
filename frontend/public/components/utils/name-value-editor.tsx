import type { FC, ChangeEvent } from 'react';
import { useRef, useCallback } from 'react';
import * as _ from 'lodash';
import { css } from '@patternfly/react-styles';
import { useDrag, useDrop } from 'react-dnd';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { DRAGGABLE_TYPE } from './draggable-item-types';
import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Button,
  Grid,
  GridItem,
  Tooltip,
} from '@patternfly/react-core';
import { GripVerticalIcon } from '@patternfly/react-icons/dist/esm/icons/grip-vertical-icon';
import { MinusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/minus-circle-icon';
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon';
import { useTranslation } from 'react-i18next';

import { NameValueEditorPair, EnvFromPair, EnvType } from './types';
import { ValueFromPair } from './value-from-pair';
import withDragDropContext from './drag-drop-context';

type ConfigMapSecretKeyRef = {
  name: string;
  key: string;
};

type ConfigMapSecretRef = {
  name: string;
  key: string;
};

type NameValuePairValue = string | Record<string, unknown>;
// NameValuePair: [name: string, value: string | object, index?: number]
// Using a more flexible type to accommodate existing usage patterns
export type NameValuePair =
  | [string, NameValuePairValue]
  | [string, NameValuePairValue, number]
  | string[];

type EnvFromPairValue = Record<string, unknown>;
// EnvFromPairType: [prefix: string, resource: object, index?: number]
export type EnvFromPairType = [string, EnvFromPairValue] | [string, EnvFromPairValue, number];

const isObjectValue = (value: NameValuePairValue): value is Record<string, unknown> =>
  _.isPlainObject(value);

type ResourceData = {
  items?: Array<{
    metadata: { name: string };
    data?: Record<string, string>;
  }>;
};

type DragItem = {
  index: number;
  rowSourceId: number;
};

// Event type that can be either a real ChangeEvent or a synthetic event from ValueFromPair
type NameValueChangeEvent =
  | ChangeEvent<HTMLInputElement>
  | { target: { value: NameValuePairValue } };

type PairElementProps = {
  index: number;
  rowSourceId: number;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onChange: (e: NameValueChangeEvent, index: number, type: NameValueEditorPair) => void;
  onRemove: (index: number) => void;
  nameString: string;
  valueString: string;
  allowSorting: boolean;
  readOnly: boolean;
  pair: NameValuePair;
  configMaps?: ResourceData;
  secrets?: ResourceData;
  isEmpty: boolean;
  disableReorder: boolean;
  toolTip?: string;
  alwaysAllowRemove: boolean;
};

const PairElement: FC<PairElementProps> = ({
  index,
  rowSourceId,
  onMove,
  onChange,
  onRemove,
  nameString,
  valueString,
  allowSorting,
  readOnly,
  pair,
  configMaps,
  secrets,
  isEmpty,
  disableReorder,
  toolTip,
  alwaysAllowRemove,
}) => {
  const { t } = useTranslation();
  const nodeRef = useRef<HTMLDivElement>(null);

  // Extract pair values with proper types
  const pairName = pair[NameValueEditorPair.Name] ?? '';
  const pairValue = pair[NameValueEditorPair.Value];
  const pairValueIsObject = isObjectValue(pairValue);
  const pairValueString = pairValueIsObject ? '' : pairValue ?? '';

  const [{ isDragging }, drag, preview] = useDrag({
    type: DRAGGABLE_TYPE.ENV_ROW,
    item: { index, rowSourceId },
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: DRAGGABLE_TYPE.ENV_ROW,
    hover(item: DragItem, monitor: DropTargetMonitor) {
      if (!nodeRef.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      // Don't replace items with themselves or with other row groupings on the page
      if (dragIndex === hoverIndex || item.rowSourceId !== rowSourceId) {
        return;
      }
      // Determine rectangle on screen
      const hoverBoundingRect = nodeRef.current.getBoundingClientRect();
      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      // Get pixels to the top
      const hoverClientY = (clientOffset?.y ?? 0) - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      onMove(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  const handleRemove = useCallback(() => {
    onRemove(index);
  }, [onRemove, index]);

  const handleChangeName = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e, index, NameValueEditorPair.Name);
    },
    [onChange, index],
  );

  const handleChangeValue = useCallback(
    (e: NameValueChangeEvent) => {
      onChange(e, index, NameValueEditorPair.Value);
    },
    [onChange, index],
  );

  const dragButton = (
    <div ref={disableReorder ? null : drag}>
      <Button
        icon={<GripVerticalIcon className="pairs-list__action-icon--reorder" />}
        type="button"
        className="pairs-list__action-icon"
        tabIndex={-1}
        isDisabled={disableReorder}
        variant="plain"
        aria-label={t('public~Drag to reorder')}
      />
    </div>
  );

  // Combine preview and drop refs
  const combinedRef = useCallback(
    (node: HTMLDivElement | null) => {
      nodeRef.current = node;
      preview(drop(node));
    },
    [preview, drop],
  );

  return (
    // React DND requires the drag source to be a native HTML element--cannot use GridItem
    <div className="pf-v6-l-grid__item" ref={combinedRef}>
      <Grid
        hasGutter
        className={css(isDragging ? 'pairs-list__row-dragging' : 'pairs-list__row')}
        data-test="pairs-list-row"
      >
        {allowSorting && !readOnly && (
          <GridItem span={1} className="pairs-list__action">
            {dragButton}
          </GridItem>
        )}
        <GridItem span={5} className="pairs-list__name-field">
          <span className={css('pf-v6-c-form-control', { 'pf-m-disabled': readOnly })}>
            <input
              type="text"
              data-test="pairs-list-name"
              placeholder={nameString}
              value={pairName}
              onChange={handleChangeName}
              disabled={readOnly}
            />
          </span>
        </GridItem>
        {pairValueIsObject ? (
          <GridItem span={5} className="pairs-list__value-pair-field">
            <ValueFromPair
              data-test="pairs-list-value"
              pair={pairValue}
              configMaps={configMaps}
              secrets={secrets}
              onChange={handleChangeValue}
              disabled={readOnly}
            />
          </GridItem>
        ) : (
          <GridItem span={5} className="pairs-list__value-field">
            <span className={css('pf-v6-c-form-control', { 'pf-m-disabled': readOnly })}>
              <input
                type="text"
                data-test="pairs-list-value"
                placeholder={valueString}
                value={pairValueString}
                onChange={handleChangeValue}
                disabled={readOnly}
              />
            </span>
          </GridItem>
        )}
        {!readOnly && (
          <GridItem span={1} className="pairs-list__action">
            <Tooltip content={toolTip || t('public~Remove')}>
              <Button
                icon={<MinusCircleIcon className="pairs-list__delete-icon" />}
                type="button"
                data-test="delete-button"
                aria-label={t('public~Delete')}
                className={css({
                  'pairs-list__span-btns': allowSorting,
                })}
                onClick={handleRemove}
                isDisabled={isEmpty && !alwaysAllowRemove}
                variant="plain"
              />
            </Tooltip>
          </GridItem>
        )}
      </Grid>
    </div>
  );
};

PairElement.displayName = 'PairElement';

// Event type that can be either a real ChangeEvent or a synthetic event from ValueFromPair
type EnvFromChangeEvent = ChangeEvent<HTMLInputElement> | { target: { value: EnvFromPairValue } };

type EnvFromPairElementProps = {
  index: number;
  rowSourceId: number;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onChange: (e: EnvFromChangeEvent, index: number, type: EnvFromPair) => void;
  onRemove: (index: number) => void;
  nameString: string;
  valueString: string;
  readOnly: boolean;
  pair: EnvFromPairType;
  configMaps?: ResourceData;
  secrets?: ResourceData;
  serviceAccounts?: ResourceData;
};

const EnvFromPairElement: FC<EnvFromPairElementProps> = ({
  index,
  rowSourceId,
  onMove,
  onChange,
  onRemove,
  valueString,
  readOnly,
  pair,
  configMaps,
  secrets,
  serviceAccounts,
}) => {
  const { t } = useTranslation();
  const nodeRef = useRef<HTMLDivElement>(null);

  // Extract pair values with proper types
  const pairPrefix = pair[EnvFromPair.Prefix];
  const pairResource = pair[EnvFromPair.Resource];

  const [{ isDragging }, drag, preview] = useDrag({
    type: DRAGGABLE_TYPE.ENV_FROM_ROW,
    item: { index, rowSourceId },
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: DRAGGABLE_TYPE.ENV_FROM_ROW,
    hover(item: DragItem, monitor: DropTargetMonitor) {
      if (!nodeRef.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      // Don't replace items with themselves or with other row groupings on the page
      if (dragIndex === hoverIndex || item.rowSourceId !== rowSourceId) {
        return;
      }
      // Determine rectangle on screen
      const hoverBoundingRect = nodeRef.current.getBoundingClientRect();
      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      // Get pixels to the top
      const hoverClientY = (clientOffset?.y ?? 0) - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      onMove(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  const handleRemove = useCallback(() => {
    onRemove(index);
  }, [onRemove, index]);

  const handleChangePrefix = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e, index, EnvFromPair.Prefix);
    },
    [onChange, index],
  );

  const handleChangeResource = useCallback(
    (e: EnvFromChangeEvent) => {
      onChange(e, index, EnvFromPair.Resource);
    },
    [onChange, index],
  );

  const deleteButton = (
    <>
      <MinusCircleIcon className="pairs-list__side-btn pairs-list__delete-icon" />
      <span className="pf-v6-u-screen-reader">{t('public~Delete')}</span>
    </>
  );

  // Combine preview and drop refs
  const combinedRef = useCallback(
    (node: HTMLDivElement | null) => {
      nodeRef.current = node;
      preview(drop(node));
    },
    [preview, drop],
  );

  return (
    <div className="pf-v6-l-grid__item" ref={combinedRef}>
      <Grid hasGutter className={css(isDragging ? 'pairs-list__row-dragging' : 'pairs-list__row')}>
        {!readOnly && (
          // React DND requires the drag source to be a native HTML element--cannot use GridItem
          <div className="pf-v6-l-grid__item pf-m-1-col pairs-list__action" ref={drag}>
            <Button
              icon={<GripVerticalIcon className="pairs-list__action-icon--reorder" />}
              type="button"
              className="pairs-list__action-icon"
              tabIndex={-1}
              variant="plain"
              aria-label={t('public~Drag to reorder')}
            />
          </div>
        )}
        <GridItem span={5} className="pairs-list__value-pair-field">
          <ValueFromPair
            pair={pairResource}
            configMaps={configMaps}
            secrets={secrets}
            serviceAccounts={serviceAccounts}
            onChange={handleChangeResource}
            disabled={readOnly}
          />
        </GridItem>
        <GridItem span={5} className="pairs-list__name-field">
          <span className={css('pf-v6-c-form-control', { 'pf-m-disabled': readOnly })}>
            <input
              data-test-id="env-prefix"
              type="text"
              placeholder={valueString}
              value={pairPrefix}
              onChange={handleChangePrefix}
              disabled={readOnly}
            />
          </span>
        </GridItem>
        {readOnly ? null : (
          <GridItem span={1} className="pairs-list__action">
            <Tooltip content={t('public~Remove')}>
              <Button
                icon={deleteButton}
                type="button"
                data-test-id="pairs-list__delete-from-btn"
                className="pairs-list__span-btns"
                onClick={handleRemove}
                variant="plain"
              />
            </Tooltip>
          </GridItem>
        )}
      </Grid>
    </div>
  );
};

EnvFromPairElement.displayName = 'EnvFromPairElement';

export type NameValueEditorProps = {
  nameString?: string;
  valueString?: string;
  addString?: string;
  allowSorting?: boolean;
  readOnly?: boolean;
  nameValueId?: number;
  nameValuePairs: NameValuePair[];
  updateParentData: (data: { nameValuePairs: NameValuePair[] }, id: number) => void;
  configMaps?: ResourceData;
  secrets?: ResourceData;
  addConfigMapSecret?: boolean;
  toolTip?: string;
  onLastItemRemoved?: () => void;
};

const NameValueEditorInner: FC<NameValueEditorProps> = ({
  nameString: nameStringProp,
  valueString: valueStringProp,
  addString,
  allowSorting = false,
  readOnly = false,
  nameValueId = 0,
  nameValuePairs,
  updateParentData,
  configMaps,
  secrets,
  addConfigMapSecret = false,
  toolTip,
  onLastItemRemoved,
}) => {
  const { t } = useTranslation();
  const nameString = nameStringProp || t('public~Key');
  const valueString = valueStringProp || t('public~Value');

  const handleAppend = useCallback(() => {
    updateParentData(
      { nameValuePairs: nameValuePairs.concat([['', '', nameValuePairs.length]]) },
      nameValueId,
    );
  }, [updateParentData, nameValuePairs, nameValueId]);

  const handleAppendConfigMapOrSecret = useCallback(() => {
    const configMapSecretKeyRef: ConfigMapSecretKeyRef = { name: '', key: '' };
    updateParentData(
      {
        nameValuePairs: nameValuePairs.concat([
          ['', { configMapSecretKeyRef }, nameValuePairs.length],
        ]),
      },
      nameValueId,
    );
  }, [updateParentData, nameValuePairs, nameValueId]);

  const handleRemove = useCallback(
    (i: number) => {
      const clonedPairs = _.cloneDeep(nameValuePairs);
      clonedPairs.splice(i, 1);
      clonedPairs.forEach((values, idx) => (values[2] = idx)); // update the indices in order.

      updateParentData(
        { nameValuePairs: clonedPairs.length ? clonedPairs : [['', '', 0]] },
        nameValueId,
      );

      if (clonedPairs.length === 0 && onLastItemRemoved) {
        onLastItemRemoved();
      }
    },
    [nameValuePairs, updateParentData, nameValueId, onLastItemRemoved],
  );

  const handleChange = useCallback(
    (e: NameValueChangeEvent, i: number, type: NameValueEditorPair) => {
      const clonedPairs: NameValuePair[] = _.cloneDeep(nameValuePairs);
      const targetIndex =
        type === NameValueEditorPair.Name ? NameValueEditorPair.Name : NameValueEditorPair.Value;
      (clonedPairs[i] as (string | NameValuePairValue | number | undefined)[])[targetIndex] =
        e.target.value;
      updateParentData({ nameValuePairs: clonedPairs }, nameValueId);
    },
    [nameValuePairs, updateParentData, nameValueId],
  );

  const handleMove = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const clonedPairs = _.cloneDeep(nameValuePairs);
      const movedPair = clonedPairs[dragIndex];

      clonedPairs[dragIndex] = clonedPairs[hoverIndex];
      clonedPairs[hoverIndex] = movedPair;
      updateParentData({ nameValuePairs: clonedPairs }, nameValueId);
    },
    [nameValuePairs, updateParentData, nameValueId],
  );

  const pairElems = nameValuePairs.map((pair, i) => {
    const key = _.get(pair, [NameValueEditorPair.Index], i);
    const isEmpty = nameValuePairs.length === 1 && nameValuePairs[0].every((value) => !value);
    return (
      <PairElement
        onChange={handleChange}
        index={i}
        nameString={nameString}
        valueString={valueString}
        allowSorting={allowSorting}
        readOnly={readOnly}
        pair={pair}
        key={key}
        onRemove={handleRemove}
        onMove={handleMove}
        rowSourceId={nameValueId}
        configMaps={configMaps}
        secrets={secrets}
        isEmpty={isEmpty}
        disableReorder={nameValuePairs.length === 1}
        toolTip={toolTip}
        alwaysAllowRemove={!!onLastItemRemoved}
      />
    );
  });

  return (
    <Grid hasGutter>
      {!readOnly && allowSorting && <GridItem span={1} />}
      <GridItem span={5}>{nameString}</GridItem>
      <GridItem span={5}>{valueString}</GridItem>
      <GridItem span={1} />

      {pairElems}

      <GridItem>
        <ActionList>
          {readOnly ? null : (
            <ActionListGroup>
              <ActionListItem>
                <Button
                  icon={
                    <PlusCircleIcon
                      data-test-id="pairs-list__add-icon"
                      className="co-icon-space-r"
                    />
                  }
                  className="pf-m-link--align-left"
                  data-test="add-button"
                  onClick={handleAppend}
                  type="button"
                  variant="link"
                >
                  {addString || t('public~Add more')}
                </Button>
              </ActionListItem>
              {addConfigMapSecret && (
                <ActionListItem>
                  <Button
                    icon={
                      <PlusCircleIcon
                        data-test-id="pairs-list__add-icon"
                        className="co-icon-space-r"
                      />
                    }
                    className="pf-m-link--align-left"
                    onClick={handleAppendConfigMapOrSecret}
                    type="button"
                    variant="link"
                  >
                    {t('public~Add from ConfigMap or Secret')}
                  </Button>
                </ActionListItem>
              )}
            </ActionListGroup>
          )}
        </ActionList>
      </GridItem>
    </Grid>
  );
};

export const NameValueEditor = withDragDropContext(NameValueEditorInner);
NameValueEditor.displayName = 'Name Value Editor';

export type EnvFromEditorProps = {
  readOnly?: boolean;
  nameValueId?: number;
  nameValuePairs: EnvFromPairType[];
  updateParentData: (
    data: { nameValuePairs: EnvFromPairType[] },
    id: number,
    envType: EnvType,
  ) => void;
  configMaps?: ResourceData;
  secrets?: ResourceData;
  serviceAccounts?: ResourceData;
  firstTitle?: string;
  secondTitle?: string;
  addButtonDisabled?: boolean;
  addButtonLabel?: string;
};

const EnvFromEditorInner: FC<EnvFromEditorProps> = ({
  readOnly = false,
  nameValueId = 0,
  nameValuePairs,
  updateParentData,
  configMaps,
  secrets,
  serviceAccounts,
  firstTitle,
  secondTitle,
  addButtonDisabled = false,
  addButtonLabel,
}) => {
  const { t } = useTranslation();

  const handleAppend = useCallback(() => {
    const configMapSecretRef: ConfigMapSecretRef = { name: '', key: '' };
    updateParentData(
      {
        nameValuePairs: nameValuePairs.concat([
          ['', { configMapSecretRef }, nameValuePairs.length],
        ]),
      },
      nameValueId,
      EnvType.ENV_FROM,
    );
  }, [updateParentData, nameValuePairs, nameValueId]);

  const handleRemove = useCallback(
    (i: number) => {
      const clonedPairs = _.cloneDeep(nameValuePairs);
      clonedPairs.splice(i, 1);
      const configMapSecretRef: ConfigMapSecretRef = { name: '', key: '' };

      updateParentData(
        { nameValuePairs: clonedPairs.length ? clonedPairs : [['', { configMapSecretRef }]] },
        nameValueId,
        EnvType.ENV_FROM,
      );
    },
    [nameValuePairs, updateParentData, nameValueId],
  );

  const handleChange = useCallback(
    (e: EnvFromChangeEvent, i: number, type: EnvFromPair) => {
      const clonedPairs: EnvFromPairType[] = _.cloneDeep(nameValuePairs);
      const targetIndex = type === EnvFromPair.Prefix ? EnvFromPair.Prefix : EnvFromPair.Resource;
      (clonedPairs[i] as (string | EnvFromPairValue | number | undefined)[])[targetIndex] =
        e.target.value;
      updateParentData({ nameValuePairs: clonedPairs }, nameValueId, EnvType.ENV_FROM);
    },
    [nameValuePairs, updateParentData, nameValueId],
  );

  const handleMove = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const clonedPairs = _.cloneDeep(nameValuePairs);
      const movedPair = clonedPairs[dragIndex];

      clonedPairs[dragIndex] = clonedPairs[hoverIndex];
      clonedPairs[hoverIndex] = movedPair;
      updateParentData({ nameValuePairs: clonedPairs }, nameValueId, EnvType.ENV_FROM);
    },
    [nameValuePairs, updateParentData, nameValueId],
  );

  const pairElems = nameValuePairs.map((pair, i) => {
    const key = _.get(pair, [EnvFromPair.Index], i);

    return (
      <EnvFromPairElement
        onChange={handleChange}
        index={i}
        nameString={t('public~ConfigMap/Secret')}
        valueString=""
        readOnly={readOnly}
        pair={pair}
        key={key}
        onRemove={handleRemove}
        onMove={handleMove}
        rowSourceId={nameValueId}
        configMaps={configMaps}
        secrets={secrets}
        serviceAccounts={serviceAccounts}
      />
    );
  });

  return (
    <Grid hasGutter>
      {!readOnly && <GridItem span={1} />}
      <GridItem span={5} className="pf-v6-u-text-color-subtle">
        {firstTitle || t('public~ConfigMap/Secret')}
      </GridItem>
      <GridItem span={5} className="pf-v6-u-text-color-subtle">
        {secondTitle || t('public~Prefix (optional)')}
      </GridItem>
      <GridItem span={1} />

      {pairElems}

      <GridItem>
        <ActionList>
          <ActionListGroup>
            {!readOnly && (
              <Button
                icon={<PlusCircleIcon />}
                className="pf-m-link--align-left"
                onClick={handleAppend}
                type="button"
                variant="link"
                isDisabled={addButtonDisabled}
              >
                {addButtonLabel || t('public~Add all from ConfigMap or Secret')}
              </Button>
            )}
          </ActionListGroup>
        </ActionList>
      </GridItem>
    </Grid>
  );
};

export const EnvFromEditor = withDragDropContext(EnvFromEditorInner);
EnvFromEditor.displayName = 'EnvFromEditor';
