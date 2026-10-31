import * as _ from 'lodash';
import type { ActionType as Action } from 'typesafe-actions';
import { action } from 'typesafe-actions';
import {
  RESUME_JITTER_MS,
  RESUME_STAGGER_MS,
  isDocumentVisible,
  subscribeToDocumentVisibility,
} from '@console/shared/src/utils/document-visibility';
import { startVisibilityAwareInterval } from '@console/shared/src/utils/visibility-aware-interval';
import type { DiscoveryResources, K8sModel } from '../../../api/common-types';
import type { FilterValue, K8sResourceKind } from '../../../extensions/console-types';
import { getReferenceForModel } from '../../../utils/k8s/k8s-ref';
import { k8sList, k8sGet } from '../../../utils/k8s/k8s-resource';
import { k8sWatch } from '../../../utils/k8s/k8s-utils';
import type { WSFactory } from '../../../utils/k8s/ws-factory';
import { getImpersonate } from '../../core/reducers/coreSelectors';

export enum ActionType {
  ReceivedResources = 'resources',
  GetResourcesInFlight = 'getResourcesInFlight',
  StartWatchK8sObject = 'startWatchK8sObject',
  StartWatchK8sList = 'startWatchK8sList',
  ModifyObject = 'modifyObject',
  StopWatchK8s = 'stopWatchK8s',

  Errored = 'errored',
  Loaded = 'loaded',
  BulkAddToList = 'bulkAddToList',
  UpdateListFromWS = 'updateListFromWS',
  FilterList = 'filterList',
}

type K8sEvent = { type: 'ADDED' | 'DELETED' | 'MODIFIED'; object: K8sResourceKind };

const updateListFromWS = (id: string, k8sObjects: K8sEvent[]) =>
  action(ActionType.UpdateListFromWS, { id, k8sObjects });
const loaded = (
  id: string,
  k8sObjects: K8sResourceKind | K8sResourceKind[],
  /** Set while further pages are still being fetched, so absent objects are not treated as gone. */
  partial = false,
) => action(ActionType.Loaded, { id, k8sObjects, partial });

const bulkAddToList = (id: string, k8sObjects: K8sResourceKind[]) =>
  action(ActionType.BulkAddToList, { id, k8sObjects });

const startWatchK8sObject = (id: string) => action(ActionType.StartWatchK8sObject, { id });
const startWatchK8sList = (id: string, query: { [key: string]: string }) =>
  action(ActionType.StartWatchK8sList, { id, query });
const modifyObject = (id: string, k8sObjects: K8sResourceKind) =>
  action(ActionType.ModifyObject, { id, k8sObjects });
const stopWatchK8s = (id: string) => action(ActionType.StopWatchK8s, { id });

const errored = (id: string, k8sObjects: any) => action(ActionType.Errored, { id, k8sObjects });
export const filterList = (id: string, name: string, value: FilterValue) =>
  action(ActionType.FilterList, { id, name, value });

export const partialObjectMetadataListHeader = {
  Accept: 'application/json;as=PartialObjectMetadataList;v=v1;g=meta.k8s.io,application/json',
};

const partialObjectMetadataHeader = {
  Accept: 'application/json;as=PartialObjectMetadata;v=v1;g=meta.k8s.io,application/json',
};

const WS: { [id: string]: WSFactory } = {};
const POLLs: { [id: string]: number } = {};
const POLL_STOPPERS: { [id: string]: () => void } = {};
const REF_COUNTS: { [id: string]: number } = {};
/** Discards the socket and restarts the list from a fresh resourceVersion, keyed by watch id. */
const RESYNCERS: { [id: string]: () => void } = {};
const RESUME_TIMERS: { [id: string]: ReturnType<typeof setTimeout> } = {};
/** Watches whose socket was closed because the document stayed hidden. */
const CLOSED_WHILE_HIDDEN = new Set<string>();
let visibilityUnsubscribe: (() => void) | null = null;
let closeTimer: ReturnType<typeof setTimeout> | null = null;

const paginationLimit = 250;
const OBJECT_POLL_INTERVAL = 30 * 1000;

/**
 * How long the document stays hidden before list sockets are closed. A console pod proxies every
 * watch as two goroutines and two connections, so an idle tab holding its sockets open is a cost
 * paid cluster-wide. Reopening means a paginated re-list, so this is deliberately far longer than
 * the grace period used for polling: a tab switch must not churn connections.
 */
const WATCH_HIDDEN_CLOSE_DELAY_MS = 5 * 60 * 1000;

const cancelResume = (id: string) => {
  if (RESUME_TIMERS[id] !== undefined) {
    clearTimeout(RESUME_TIMERS[id]);
    delete RESUME_TIMERS[id];
  }
};

const cancelPendingClose = () => {
  if (closeTimer !== null) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
};

/**
 * Drops the socket without touching the reference count or the loaded data, so the list keeps
 * rendering what it last saw and is restored by a re-list rather than a remount.
 */
const closeWatchesWhileHidden = () => {
  closeTimer = null;
  Object.keys(RESYNCERS).forEach((id) => {
    const ws = WS[id];
    if (!ws) {
      return;
    }
    // Clear the entry first: destroy() with no argument reports no timeout, so the ondestroy
    // handler returns without clearing it and pollAndWatch would refuse to open a socket.
    delete WS[id];
    ws.destroy();
    CLOSED_WHILE_HIDDEN.add(id);
  });
};

/**
 * While the document stays hidden, list sockets buffer instead of dispatching, so redux and React
 * do no work, and after `WATCH_HIDDEN_CLOSE_DELAY_MS` they are closed so the cluster stops serving
 * them. On the way back, a socket whose buffer survived intact just flushes; one that was closed,
 * or that dropped messages and so holds an incomplete delta sequence, is replaced by a fresh list
 * plus a new socket.
 */
const handleVisibilityChange = (visible: boolean) => {
  const ids = Object.keys(RESYNCERS);
  ids.forEach(cancelResume);
  cancelPendingClose();

  if (!visible) {
    ids.forEach((id) => WS[id]?.pause());
    closeTimer = setTimeout(closeWatchesWhileHidden, WATCH_HIDDEN_CLOSE_DELAY_MS);
    return;
  }

  const resyncIds: string[] = [];
  ids.forEach((id) => {
    if (CLOSED_WHILE_HIDDEN.delete(id)) {
      resyncIds.push(id);
      return;
    }
    const ws = WS[id];
    if (!ws?.isPaused()) {
      return;
    }
    if (ws.hasDroppedMessages()) {
      resyncIds.push(id);
      return;
    }
    ws.unpause();
  });

  // Every re-list is a paginated quorum read, so spread them rather than firing N at once.
  resyncIds.forEach((id, index) => {
    RESUME_TIMERS[id] = setTimeout(
      () => {
        delete RESUME_TIMERS[id];
        RESYNCERS[id]?.();
      },
      index * RESUME_STAGGER_MS + Math.random() * RESUME_JITTER_MS,
    );
  });
};

const registerResyncer = (id: string, resync: () => void) => {
  RESYNCERS[id] = resync;
  if (!visibilityUnsubscribe) {
    visibilityUnsubscribe = subscribeToDocumentVisibility(handleVisibilityChange);
  }
  // A watch started in a tab that is already hidden gets no visibility transition of its own.
  if (!isDocumentVisible() && closeTimer === null) {
    closeTimer = setTimeout(closeWatchesWhileHidden, WATCH_HIDDEN_CLOSE_DELAY_MS);
  }
};

const unregisterResyncer = (id: string) => {
  delete RESYNCERS[id];
  cancelResume(id);
  CLOSED_WHILE_HIDDEN.delete(id);
  if (visibilityUnsubscribe && !Object.keys(RESYNCERS).length) {
    visibilityUnsubscribe();
    visibilityUnsubscribe = null;
    cancelPendingClose();
  }
};

export const stopK8sWatch = (id: string) => (dispatch) => {
  if (!(id in REF_COUNTS)) {
    return _.noop;
  }

  REF_COUNTS[id] -= 1;
  if (REF_COUNTS[id] > 0) {
    return _.noop;
  }

  const ws = WS[id];
  if (ws) {
    ws.destroy();
    delete WS[id];
  }
  const poller = POLLs[id];
  clearInterval(poller);
  delete POLLs[id];
  POLL_STOPPERS[id]?.();
  delete POLL_STOPPERS[id];
  unregisterResyncer(id);
  delete REF_COUNTS[id];
  return dispatch(stopWatchK8s(id));
};

export const watchK8sList =
  (
    id: string,
    query: { [key: string]: string },
    k8skind: K8sModel,
    extraAction?,
    partialMetadata = false,
    keepWatchingWhileHidden = false,
  ) =>
  (dispatch, getState) => {
    // Only one watch per unique list ID
    if (id in REF_COUNTS) {
      REF_COUNTS[id] += 1;
      return _.noop;
    }

    dispatch(startWatchK8sList(id, query));
    REF_COUNTS[id] = 1;

    const incrementallyLoad = async (
      continueToken = '',
      loadedSoFar: K8sResourceKind[] = [],
    ): Promise<string> => {
      // the list may not still be around...
      if (!REF_COUNTS[id]) {
        // let .then handle the cleanup
        return null;
      }

      const requestOptions: RequestInit = partialMetadata
        ? {
            headers: partialObjectMetadataListHeader,
          }
        : {};

      const response = await k8sList(
        k8skind,
        {
          limit: paginationLimit,
          ...query,
          ...(continueToken ? { continue: continueToken } : {}),
        },
        true,
        requestOptions,
      );

      if (!REF_COUNTS[id]) {
        return null;
      }

      const pageItems = response.items ?? [];
      const allItems = loadedSoFar.concat(pageItems);

      if (!continueToken) {
        dispatch(loaded(id, pageItems, !!response.metadata.continue));
        if (extraAction) {
          dispatch(extraAction(id, pageItems));
        }
      } else {
        dispatch(bulkAddToList(id, pageItems));
      }

      if (response.metadata.continue) {
        return incrementallyLoad(response.metadata.continue, allItems);
      }

      if (loadedSoFar.length) {
        // Only now is the full set known, so this is the first point at which an object missing
        // from the response can be treated as gone.
        dispatch(loaded(id, allItems));
      }
      return response.metadata.resourceVersion;
    };
    /**
     * Incrementally fetch list (XHR) using k8s pagination then use its resourceVersion to
     *  start listening on a WS (?resourceVersion=$resourceVersion)
     *  start the process over when:
     *   1. the WS closes abnormally
     *   2. the WS can not establish a connection within $TIMEOUT
     */
    const pollAndWatch = async () => {
      clearTimeout(POLLs[id]);
      delete POLLs[id];

      try {
        const resourceVersion = await incrementallyLoad();
        // ensure this watch should still exist because pollAndWatch is recursiveish
        if (!REF_COUNTS[id]) {
          console.log(`stopped watching ${id} before finishing incremental loading.`);
          // call cleanup function out of abundance of caution...
          dispatch(stopK8sWatch(id));
          return;
        }

        if (WS[id]) {
          console.warn(`Attempted to create multiple websockets for ${id}.`);
          return;
        }

        if (!_.get(k8skind, 'verbs', ['watch']).includes('watch')) {
          console.warn(
            `${getReferenceForModel(k8skind)} does not support watching, falling back to polling.`,
          );
          if (!POLLs[id]) {
            POLLs[id] = window.setTimeout(pollAndWatch, 15 * 1000);
          }
          return;
        }

        const { subprotocols } = getImpersonate(getState()) || {};
        WS[id] = k8sWatch(
          k8skind,
          { ...query, resourceVersion },
          { subprotocols, timeout: 60 * 1000 },
        );

        // The socket may be built while hidden: the list page was opened in a background tab, or
        // the previous socket was recycled by the apiserver and re-polled on its 15s timer.
        if (!keepWatchingWhileHidden && !isDocumentVisible()) {
          WS[id].pause();
        }
      } catch (e) {
        if (!REF_COUNTS[id]) {
          console.log(
            `stopped watching ${id} before finishing incremental loading with error ${e}!`,
          );
          // call cleanup function out of abundance of caution...
          dispatch(stopK8sWatch(id));
          return;
        }

        dispatch(errored(id, e));

        if (!POLLs[id]) {
          POLLs[id] = window.setTimeout(pollAndWatch, 15 * 1000);
        }
        return;
      }

      WS[id]
        .onclose((event) => {
          // Close Frame Status Codes: https://tools.ietf.org/html/rfc6455#section-7.4.1
          if (event.code !== 1006) {
            return;
          }
          console.log('WS closed abnormally');
          const ws = WS[id];
          const timedOut = true;
          ws && ws.destroy(timedOut);
        })
        .ondestroy((timedOut) => {
          if (!timedOut) {
            return;
          }
          // If the WS is unsuccessful for timeout duration, assume it is less work
          // to update the entire list and then start the WS again

          console.log(`WS ${id} timed out - restarting polling`);
          delete WS[id];

          if (POLLs[id]) {
            return;
          }

          POLLs[id] = window.setTimeout(pollAndWatch, 15 * 1000);
        })
        .onbulkmessage((events) =>
          [updateListFromWS, extraAction].forEach((f) => f && dispatch(f(id, events))),
        );
    };

    if (!keepWatchingWhileHidden) {
      registerResyncer(id, () => {
        if (!REF_COUNTS[id]) {
          return;
        }
        const ws = WS[id];
        if (ws) {
          // Drop the registry entry first: a bare destroy() reports no timeout, so the ondestroy
          // handler returns without clearing it and pollAndWatch would refuse to open a socket.
          delete WS[id];
          ws.destroy();
        }
        if (POLLs[id] !== undefined) {
          clearTimeout(POLLs[id]);
          delete POLLs[id];
        }
        pollAndWatch();
      });
    }

    return pollAndWatch();
  };

export const watchK8sObject =
  (
    id: string,
    name: string,
    namespace: string,
    query: { [key: string]: string },
    k8sModel: K8sModel,
    partialMetadata = false,
  ) =>
  (dispatch, getState) => {
    if (id in REF_COUNTS) {
      REF_COUNTS[id] += 1;
      return _.noop;
    }
    const watch = dispatch(startWatchK8sObject(id));
    REF_COUNTS[id] = 1;

    const requestOptions: RequestInit = partialMetadata
      ? {
          headers: partialObjectMetadataHeader,
        }
      : {};

    const poller = () => {
      k8sGet(k8sModel, name, namespace, {}, requestOptions)
        .then(
          (o) => dispatch(modifyObject(id, o)),
          (e) => dispatch(errored(id, e)),
        )
        .catch((err) => {
          console.log(err);
        });
    };
    poller();
    POLL_STOPPERS[id] = startVisibilityAwareInterval(poller, OBJECT_POLL_INTERVAL, {
      jitterMs: 0,
    });

    if (!_.get(k8sModel, 'verbs', ['watch']).includes('watch')) {
      console.warn(`${getReferenceForModel(k8sModel)} does not support watching`);
      return _.noop;
    }

    // Validate that a namespace is provided when watching a singular namespaced object. Must happen
    // on frontend since we use field selectors against the list endpoint to watch singular resources.
    if (k8sModel.namespaced && query.name && !query.ns) {
      console.error('Namespace required to watch namespaced resource: ', k8sModel.kind, query.name);
      return _.noop;
    }

    if (query.name) {
      query.fieldSelector = `metadata.name=${query.name}`;
      delete query.name;
    }

    const { subprotocols } = getImpersonate(getState()) || {};

    WS[id] = k8sWatch(k8sModel, query, {
      subprotocols,
    }).onbulkmessage((events) => events.forEach((e) => dispatch(modifyObject(id, e.object))));
    return watch;
  };

export const receivedResources = (resources: DiscoveryResources) =>
  action(ActionType.ReceivedResources, { resources });
export const getResourcesInFlight = () => action(ActionType.GetResourcesInFlight);

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in typeof for type export
const k8sActions = {
  startWatchK8sObject,
  startWatchK8sList,
  modifyObject,
  stopWatchK8s,
  errored,
  loaded,
  bulkAddToList,
  updateListFromWS,
  filterList,
  receivedResources,
  getResourcesInFlight,
};

export type K8sAction = Action<typeof k8sActions>;
