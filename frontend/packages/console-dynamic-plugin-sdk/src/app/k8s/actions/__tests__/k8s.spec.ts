import * as _ from 'lodash';
import {
  restoreDocumentVisibility,
  setDocumentVisibility,
} from '@console/shared/src/test-utils/document-visibility-test-utils';
import {
  POLL_HIDDEN_GRACE_PERIOD_MS,
  RESUME_STAGGER_MS,
} from '@console/shared/src/utils/document-visibility';
import type { K8sModel } from '../../../../api/common-types';
import { k8sList, k8sGet } from '../../../../utils/k8s/k8s-resource';
import { k8sWatch } from '../../../../utils/k8s/k8s-utils';
import * as sdkK8sActions from '../k8s';

jest.mock('../../../../utils/k8s/k8s-resource', () => ({
  ...jest.requireActual('../../../../utils/k8s/k8s-resource'),
  k8sList: jest.fn(),
  k8sGet: jest.fn(),
}));

jest.mock('../../../../utils/k8s/k8s-utils', () => ({
  ...jest.requireActual('../../../../utils/k8s/k8s-utils'),
  k8sWatch: jest.fn(),
}));

const k8sListMock = k8sList as jest.Mock;
const k8sGetMock = k8sGet as jest.Mock;
const k8sWatchMock = k8sWatch as jest.Mock;

type FakeSocket = {
  paused: boolean;
  dropped: boolean;
  destroyed: boolean;
  onclose: jest.Mock;
  ondestroy: jest.Mock;
  onbulkmessage: jest.Mock;
  pause: jest.Mock;
  unpause: jest.Mock;
  isPaused: () => boolean;
  hasDroppedMessages: () => boolean;
  destroy: jest.Mock;
};

const createFakeSocket = (): FakeSocket => {
  const socket: FakeSocket = {
    paused: false,
    dropped: false,
    destroyed: false,
    onclose: jest.fn(() => socket),
    ondestroy: jest.fn(() => socket),
    onbulkmessage: jest.fn(() => socket),
    pause: jest.fn(() => {
      socket.paused = true;
      socket.dropped = false;
    }),
    unpause: jest.fn(() => {
      socket.paused = false;
    }),
    isPaused: () => socket.paused,
    hasDroppedMessages: () => socket.dropped,
    destroy: jest.fn(() => {
      socket.destroyed = true;
    }),
  };
  return socket;
};

const PodModel: K8sModel = {
  apiVersion: 'v1',
  label: 'Pod',
  labelKey: 'public~Pod',
  plural: 'pods',
  abbr: 'P',
  namespaced: true,
  kind: 'Pod',
  id: 'pod',
  labelPlural: 'Pods',
  labelPluralKey: 'public~Pods',
};

const testResourceInstance = {
  apiVersion: 'testapp.coreos.com/v1alpha1',
  kind: 'TestResource',
  metadata: {
    name: 'my-test-resource',
    namespace: 'default',
    uid: 'c02c0a8f-88e0-12e7-851b-081027b424ef',
    creationTimestamp: '2017-06-20T18:19:49Z',
  },
  spec: {
    selector: {
      matchLabels: {
        fizz: 'buzz',
      },
    },
  },
  status: {
    'some-filled-path': 'this is filled!',
  },
};

describe('startWatchK8sList', () => {
  let getState: jest.Mock;
  let resourceList: {
    items: any[];
    metadata: { resourceVersion: string; continue?: string };
    kind: string;
    apiVersion: string;
  };
  let model: K8sModel;

  beforeEach(() => {
    jest.clearAllMocks();
    getState = jest.fn().mockReturnValue({ sdkCore: {} });
    model = _.cloneDeep({ ...PodModel, verbs: ['list', 'get'] });
    resourceList = {
      apiVersion: testResourceInstance.apiVersion,
      kind: `${testResourceInstance.kind}List`,
      items: new Array(300).fill(testResourceInstance),
      metadata: { resourceVersion: '0' },
    };
  });

  it('dispatches `loaded` action only once after first data is received', async () => {
    k8sListMock.mockResolvedValue({
      ...resourceList,
      items: new Array(10).fill(testResourceInstance),
    });

    const dispatch = jest.fn();
    await sdkK8sActions.watchK8sList('some-redux-id', {}, model)(dispatch, getState);

    expect(k8sListMock.mock.calls.length).toEqual(1);

    const dispatchedTypes = dispatch.mock.calls.map((args) => args[0].type);
    const unexpectedTypes = dispatchedTypes.filter(
      (type) =>
        type !== sdkK8sActions.ActionType.StartWatchK8sList &&
        type !== sdkK8sActions.ActionType.Loaded,
    );
    expect(unexpectedTypes).toEqual([]);
    expect(dispatchedTypes).toContain(sdkK8sActions.ActionType.Loaded);

    sdkK8sActions.stopK8sWatch('some-redux-id')(dispatch);
  });

  it('incrementally fetches list until `continue` token is no longer returned in response', async () => {
    k8sListMock.mockImplementation(() => {
      resourceList.metadata.resourceVersion = (
        parseInt(resourceList.metadata.resourceVersion, 10) + 1
      ).toString();
      resourceList.metadata.continue =
        parseInt(resourceList.metadata.resourceVersion, 10) < 10 ? 'toNextPage' : undefined;
      return resourceList;
    });

    const dispatch = jest.fn();
    await sdkK8sActions.watchK8sList('another-redux-id', {}, model)(dispatch, getState);

    // Verify all k8sList calls have limit=250
    expect(k8sListMock).toHaveBeenCalledTimes(10);
    for (const args of k8sListMock.mock.calls) {
      expect(args[1].limit).toEqual(250);
    }

    // First call should not have continue token
    expect(k8sListMock.mock.calls[0][1].continue).toBeUndefined();
    // Remaining calls should have continue token
    for (let i = 1; i < k8sListMock.mock.calls.length; i++) {
      expect(k8sListMock.mock.calls[i][1].continue).toEqual('toNextPage');
    }

    // Verify dispatch calls
    const bulkAddCalls = dispatch.mock.calls.filter(
      (args) => args[0].type === sdkK8sActions.ActionType.BulkAddToList,
    );
    const erroredCalls = dispatch.mock.calls.filter(
      (args) => args[0].type === sdkK8sActions.ActionType.Errored,
    );

    expect(erroredCalls).toHaveLength(0);
    expect(bulkAddCalls).toHaveLength(9);

    for (const call of bulkAddCalls) {
      expect(call[0].payload.k8sObjects).toEqual(resourceList.items);
    }

    const totalItems = bulkAddCalls.reduce(
      (sum, call) => sum + call[0].payload.k8sObjects.length,
      0,
    );
    expect(totalItems).toEqual(resourceList.items.length * 9);

    sdkK8sActions.stopK8sWatch('another-redux-id')(dispatch);
  });

  it('send partial metadata headers to k8sList when partialMetadata is true', async () => {
    k8sListMock.mockImplementation(() => {
      resourceList.metadata.resourceVersion = (
        parseInt(resourceList.metadata.resourceVersion, 10) + 1
      ).toString();
      resourceList.metadata.continue =
        parseInt(resourceList.metadata.resourceVersion, 10) < 10 ? 'toNextPage' : undefined;
      return resourceList;
    });

    const dispatch = jest.fn();
    await sdkK8sActions.watchK8sList(
      'one-more-redux-id',
      {},
      model,
      null,
      true,
    )(dispatch, getState);

    // Verify all k8sList calls have limit=250 and partial metadata headers
    expect(k8sListMock).toHaveBeenCalledTimes(10);
    for (const args of k8sListMock.mock.calls) {
      expect(args[1].limit).toEqual(250);
      expect(args[3].headers).toEqual(sdkK8sActions.partialObjectMetadataListHeader);
    }

    // First call should not have continue token
    expect(k8sListMock.mock.calls[0][1].continue).toBeUndefined();
    // Remaining calls should have continue token
    for (let i = 1; i < k8sListMock.mock.calls.length; i++) {
      expect(k8sListMock.mock.calls[i][1].continue).toEqual('toNextPage');
    }

    // Verify dispatch calls
    const bulkAddCalls = dispatch.mock.calls.filter(
      (args) => args[0].type === sdkK8sActions.ActionType.BulkAddToList,
    );
    const erroredCalls = dispatch.mock.calls.filter(
      (args) => args[0].type === sdkK8sActions.ActionType.Errored,
    );

    expect(erroredCalls).toHaveLength(0);
    expect(bulkAddCalls).toHaveLength(9);

    for (const call of bulkAddCalls) {
      expect(call[0].payload.k8sObjects).toEqual(resourceList.items);
    }

    const totalItems = bulkAddCalls.reduce(
      (sum, call) => sum + call[0].payload.k8sObjects.length,
      0,
    );
    expect(totalItems).toEqual(resourceList.items.length * 9);

    sdkK8sActions.stopK8sWatch('one-more-redux-id')(dispatch);
  });
});

describe('watchK8sList page visibility', () => {
  let getState: jest.Mock;
  let model: K8sModel;
  let sockets: FakeSocket[];
  let idCounter: number;

  const startWatch = async (dispatch: jest.Mock, keepWatchingWhileHidden = false) => {
    const id = `list-watch-${(idCounter += 1)}`;
    await sdkK8sActions.watchK8sList(
      id,
      {},
      model,
      undefined,
      false,
      keepWatchingWhileHidden,
    )(dispatch, getState);
    return id;
  };

  const settleHidden = () => {
    setDocumentVisibility('hidden');
    jest.advanceTimersByTime(POLL_HIDDEN_GRACE_PERIOD_MS);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(Math, 'random').mockReturnValue(0);
    idCounter = 0;
    sockets = [];
    getState = jest.fn().mockReturnValue({ sdkCore: {} });
    model = _.cloneDeep({ ...PodModel, verbs: ['list', 'get', 'watch'] });
    k8sListMock.mockResolvedValue({
      items: [testResourceInstance],
      metadata: { resourceVersion: '1' },
    });
    k8sWatchMock.mockImplementation(() => {
      const socket = createFakeSocket();
      sockets.push(socket);
      return socket;
    });
  });

  afterEach(() => {
    restoreDocumentVisibility();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('pauses the socket once the tab has been hidden for the grace period', async () => {
    const dispatch = jest.fn();
    const id = await startWatch(dispatch);

    expect(sockets[0].isPaused()).toBe(false);
    setDocumentVisibility('hidden');
    expect(sockets[0].isPaused()).toBe(false);

    jest.advanceTimersByTime(POLL_HIDDEN_GRACE_PERIOD_MS);
    expect(sockets[0].isPaused()).toBe(true);

    sdkK8sActions.stopK8sWatch(id)(dispatch);
  });

  it('leaves an opted-out watch streaming while hidden', async () => {
    const dispatch = jest.fn();
    const id = await startWatch(dispatch, true);

    settleHidden();

    expect(sockets[0].pause).not.toHaveBeenCalled();

    sdkK8sActions.stopK8sWatch(id)(dispatch);
  });

  it('flushes the buffer on resume without re-listing when nothing was dropped', async () => {
    const dispatch = jest.fn();
    const id = await startWatch(dispatch);

    settleHidden();
    k8sListMock.mockClear();
    setDocumentVisibility('visible');

    expect(sockets[0].unpause).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60 * 1000);
    expect(k8sListMock).not.toHaveBeenCalled();
    expect(sockets).toHaveLength(1);

    sdkK8sActions.stopK8sWatch(id)(dispatch);
  });

  it('re-lists and opens a new socket on resume when messages were dropped', async () => {
    const dispatch = jest.fn();
    const id = await startWatch(dispatch);

    settleHidden();
    sockets[0].dropped = true;
    k8sListMock.mockClear();
    setDocumentVisibility('visible');

    expect(sockets[0].unpause).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(RESUME_STAGGER_MS);
    await Promise.resolve();

    expect(sockets[0].destroy).toHaveBeenCalled();
    expect(k8sListMock).toHaveBeenCalledTimes(1);
    expect(sockets).toHaveLength(2);
    expect(sockets[1].isPaused()).toBe(false);

    sdkK8sActions.stopK8sWatch(id)(dispatch);
  });

  it('staggers the re-lists so every watch does not read at once', async () => {
    const dispatch = jest.fn();
    const ids = [
      await startWatch(dispatch),
      await startWatch(dispatch),
      await startWatch(dispatch),
    ];

    settleHidden();
    sockets.forEach((socket) => {
      socket.dropped = true;
    });
    k8sListMock.mockClear();
    setDocumentVisibility('visible');

    await jest.advanceTimersByTimeAsync(0);
    expect(k8sListMock).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(RESUME_STAGGER_MS);
    expect(k8sListMock).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(RESUME_STAGGER_MS);
    expect(k8sListMock).toHaveBeenCalledTimes(3);

    ids.forEach((id) => sdkK8sActions.stopK8sWatch(id)(dispatch));
  });

  it('pauses a socket that the apiserver recycle rebuilt while still hidden', async () => {
    const dispatch = jest.fn();
    const id = await startWatch(dispatch);

    settleHidden();
    expect(sockets[0].isPaused()).toBe(true);

    // The proxy closes with a bare TCP close, so the browser reports 1006 and the watch re-polls.
    const [onClose] = sockets[0].onclose.mock.calls[0];
    onClose({ code: 1006 });
    const [onDestroy] = sockets[0].ondestroy.mock.calls[0];
    onDestroy(true);

    await jest.advanceTimersByTimeAsync(15 * 1000);
    await Promise.resolve();

    expect(sockets).toHaveLength(2);
    expect(sockets[1].isPaused()).toBe(true);

    sdkK8sActions.stopK8sWatch(id)(dispatch);
  });

  it('drops the visibility subscription and any pending re-list on stopK8sWatch', async () => {
    const removeSpy = jest.spyOn(document, 'removeEventListener');
    const dispatch = jest.fn();
    const id = await startWatch(dispatch);

    settleHidden();
    sockets[0].dropped = true;
    setDocumentVisibility('visible');
    k8sListMock.mockClear();

    sdkK8sActions.stopK8sWatch(id)(dispatch);
    expect(removeSpy.mock.calls.filter(([type]) => type === 'visibilitychange')).toHaveLength(1);

    await jest.advanceTimersByTimeAsync(60 * 1000);
    expect(k8sListMock).not.toHaveBeenCalled();
    expect(sockets).toHaveLength(1);
  });

  it('ignores a stopK8sWatch for an id that is no longer watched', () => {
    const dispatch = jest.fn();

    sdkK8sActions.stopK8sWatch('never-watched')(dispatch);

    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('watchK8sObject page visibility', () => {
  const OBJECT_POLL_INTERVAL = 30 * 1000;
  let getState: jest.Mock;
  let model: K8sModel;
  let idCounter: number;

  // A model without the `watch` verb exercises the safety poll without opening a WebSocket.
  const startWatch = (dispatch: jest.Mock) => {
    const id = `object-watch-${(idCounter += 1)}`;
    sdkK8sActions.watchK8sObject(id, 'my-test-resource', 'default', {}, model)(dispatch, getState);
    return id;
  };

  const settleHidden = () => {
    setDocumentVisibility('hidden');
    jest.advanceTimersByTime(POLL_HIDDEN_GRACE_PERIOD_MS);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    idCounter = 0;
    getState = jest.fn().mockReturnValue({ sdkCore: {} });
    model = _.cloneDeep({ ...PodModel, verbs: ['get'] });
    k8sGetMock.mockResolvedValue(testResourceInstance);
  });

  afterEach(() => {
    restoreDocumentVisibility();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('polls on the configured interval while visible', () => {
    const dispatch = jest.fn();
    const id = startWatch(dispatch);

    expect(k8sGetMock).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(OBJECT_POLL_INTERVAL * 2);
    expect(k8sGetMock).toHaveBeenCalledTimes(3);

    sdkK8sActions.stopK8sWatch(id)(dispatch);
  });

  it('stops polling once the tab has been hidden for the grace period', () => {
    const dispatch = jest.fn();
    const id = startWatch(dispatch);
    k8sGetMock.mockClear();

    settleHidden();
    jest.advanceTimersByTime(OBJECT_POLL_INTERVAL * 20);
    expect(k8sGetMock).not.toHaveBeenCalled();

    sdkK8sActions.stopK8sWatch(id)(dispatch);
  });

  it('polls immediately when the tab becomes visible again', () => {
    const dispatch = jest.fn();
    const id = startWatch(dispatch);

    settleHidden();
    jest.advanceTimersByTime(OBJECT_POLL_INTERVAL * 5);
    k8sGetMock.mockClear();

    setDocumentVisibility('visible');
    jest.advanceTimersByTime(0);
    expect(k8sGetMock).toHaveBeenCalledTimes(1);

    sdkK8sActions.stopK8sWatch(id)(dispatch);
  });

  it('does not poll extra times for a tab switch shorter than the grace period', () => {
    const dispatch = jest.fn();
    const id = startWatch(dispatch);
    k8sGetMock.mockClear();

    setDocumentVisibility('hidden');
    jest.advanceTimersByTime(POLL_HIDDEN_GRACE_PERIOD_MS - 1);
    setDocumentVisibility('visible');
    jest.advanceTimersByTime(POLL_HIDDEN_GRACE_PERIOD_MS);

    expect(k8sGetMock).not.toHaveBeenCalled();
    jest.advanceTimersByTime(OBJECT_POLL_INTERVAL);
    expect(k8sGetMock).toHaveBeenCalledTimes(1);

    sdkK8sActions.stopK8sWatch(id)(dispatch);
  });

  it('never dispatches StopWatchK8s just because the tab was hidden', () => {
    const dispatch = jest.fn();
    const id = startWatch(dispatch);

    settleHidden();
    jest.advanceTimersByTime(OBJECT_POLL_INTERVAL * 20);
    setDocumentVisibility('visible');
    jest.advanceTimersByTime(OBJECT_POLL_INTERVAL);

    const stopCalls = dispatch.mock.calls.filter(
      ([a]) => a?.type === sdkK8sActions.ActionType.StopWatchK8s,
    );
    expect(stopCalls).toHaveLength(0);

    sdkK8sActions.stopK8sWatch(id)(dispatch);
  });

  it('removes the visibility subscription and stops polling on stopK8sWatch', () => {
    const removeSpy = jest.spyOn(document, 'removeEventListener');
    const dispatch = jest.fn();
    const id = startWatch(dispatch);

    sdkK8sActions.stopK8sWatch(id)(dispatch);
    expect(removeSpy.mock.calls.filter(([type]) => type === 'visibilitychange')).toHaveLength(1);

    k8sGetMock.mockClear();
    jest.advanceTimersByTime(OBJECT_POLL_INTERVAL * 5);
    expect(k8sGetMock).not.toHaveBeenCalled();
  });
});

describe('incrementallyLoad pagination', () => {
  let getState: jest.Mock;
  let model: K8sModel;

  beforeEach(() => {
    jest.clearAllMocks();
    getState = jest.fn().mockReturnValue({ sdkCore: {} });
    model = _.cloneDeep({ ...PodModel, verbs: ['list', 'get'] });
  });

  const paginate = (pages: number) => {
    let page = 0;
    k8sListMock.mockImplementation(() => {
      page += 1;
      return {
        apiVersion: 'v1',
        kind: 'PodList',
        items: [{ ...testResourceInstance, metadata: { name: `item-${page}`, namespace: 'ns' } }],
        metadata: { resourceVersion: `${page}`, continue: page < pages ? 'next' : undefined },
      };
    });
  };

  it('marks every page but the last as partial so nothing is pruned mid-load', async () => {
    paginate(3);
    const dispatch = jest.fn();

    await sdkK8sActions.watchK8sList('paginated-partial', {}, model)(dispatch, getState);

    const loadedCalls = dispatch.mock.calls
      .map(([a]) => a)
      .filter((a) => a.type === sdkK8sActions.ActionType.Loaded);

    // One for the first page, one for the complete set.
    expect(loadedCalls).toHaveLength(2);
    expect(loadedCalls[0].payload.partial).toBe(true);
    expect(loadedCalls[1].payload.partial).toBe(false);
    expect(loadedCalls[1].payload.k8sObjects).toHaveLength(3);
  });

  it('does not mark a single-page load as partial and does not re-dispatch it', async () => {
    paginate(1);
    const dispatch = jest.fn();

    await sdkK8sActions.watchK8sList('paginated-single', {}, model)(dispatch, getState);

    const loadedCalls = dispatch.mock.calls
      .map(([a]) => a)
      .filter((a) => a.type === sdkK8sActions.ActionType.Loaded);

    expect(loadedCalls).toHaveLength(1);
    expect(loadedCalls[0].payload.partial).toBe(false);
  });
});
