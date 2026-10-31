import { ActionType } from '../../actions/k8s';
import sdkK8sReducers from '../k8s';

const pod = (name: string, resourceVersion: string, phase = 'Running') => ({
  apiVersion: 'v1',
  kind: 'Pod',
  metadata: {
    name,
    namespace: 'ns',
    uid: `uid-${name}`,
    creationTimestamp: '2024-01-01T00:00:00Z',
    resourceVersion,
  },
  status: { phase },
});

const stateWith = (id: string, items: ReturnType<typeof pod>[]) => ({
  [id]: {
    loaded: true,
    loadError: '',
    data: Object.fromEntries(items.map((item) => [`(ns)-${item.metadata.name}`, item])),
  },
});

const updateFromWS = (state, id: string, k8sObjects) =>
  sdkK8sReducers(
    state as any,
    {
      type: ActionType.UpdateListFromWS,
      payload: { id, k8sObjects },
    } as any,
  );

describe('UpdateListFromWS', () => {
  const id = 'pods';

  it('keeps the state identity when every event is a no-op', () => {
    const state = stateWith(id, [pod('a', '1'), pod('b', '1')]);

    // Same content at a newer resourceVersion: updateList compares with the version stripped.
    const next = updateFromWS(state, id, [{ type: 'MODIFIED', object: pod('a', '9') }]);

    expect(next).toBe(state);
  });

  it('keeps the state identity when an event is older than what is held', () => {
    const state = stateWith(id, [pod('a', '5')]);

    const next = updateFromWS(state, id, [{ type: 'MODIFIED', object: pod('a', '2', 'Pending') }]);

    expect(next).toBe(state);
  });

  it('replaces the list when an event changes an object', () => {
    const state = stateWith(id, [pod('a', '1')]);

    const next = updateFromWS(state, id, [{ type: 'MODIFIED', object: pod('a', '9', 'Failed') }]);

    expect(next).not.toBe(state);
    expect(next[id].data['(ns)-a'].status.phase).toBe('Failed');
  });

  it('replaces the list on a delete', () => {
    const state = stateWith(id, [pod('a', '1'), pod('b', '1')]);

    const next = updateFromWS(state, id, [{ type: 'DELETED', object: pod('a', '1') }]);

    expect(next).not.toBe(state);
    expect(Object.keys(next[id].data)).toEqual(['(ns)-b']);
  });

  it('does not resurrect an id whose watch was already stopped', () => {
    const state = { other: { loaded: true, loadError: '', data: {} } };

    const next = updateFromWS(state, id, [{ type: 'MODIFIED', object: pod('a', '9') }]);

    expect(next).toBe(state);
    expect(next[id]).toBeUndefined();
  });
});
