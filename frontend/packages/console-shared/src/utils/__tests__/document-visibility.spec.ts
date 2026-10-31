import {
  restoreDocumentVisibility,
  setDocumentVisibility,
} from '../../test-utils/document-visibility-test-utils';
import {
  POLL_HIDDEN_GRACE_PERIOD_MS,
  isDocumentVisible,
  subscribeToDocumentVisibility,
} from '../document-visibility';

describe('document-visibility', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    restoreDocumentVisibility();
    jest.useRealTimers();
  });

  it('reports visible before anything subscribes', () => {
    expect(isDocumentVisible()).toBe(true);
  });

  it('stays visible until the document has been hidden for the whole grace period', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToDocumentVisibility(listener);

    setDocumentVisibility('hidden');
    jest.advanceTimersByTime(POLL_HIDDEN_GRACE_PERIOD_MS - 1);
    expect(isDocumentVisible()).toBe(true);
    expect(listener).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(isDocumentVisible()).toBe(false);
    expect(listener).toHaveBeenCalledWith(false);

    unsubscribe();
  });

  it('cancels a pending transition when the document is shown within the grace period', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToDocumentVisibility(listener);

    setDocumentVisibility('hidden');
    jest.advanceTimersByTime(POLL_HIDDEN_GRACE_PERIOD_MS - 1);
    setDocumentVisibility('visible');
    jest.advanceTimersByTime(POLL_HIDDEN_GRACE_PERIOD_MS);

    expect(isDocumentVisible()).toBe(true);
    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });

  it('notifies immediately when the document is shown again', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToDocumentVisibility(listener);

    setDocumentVisibility('hidden');
    jest.advanceTimersByTime(POLL_HIDDEN_GRACE_PERIOD_MS);
    listener.mockClear();

    setDocumentVisibility('visible');
    expect(isDocumentVisible()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(true);

    unsubscribe();
  });

  it('does not restart the grace period when another listener subscribes while hidden', () => {
    const first = jest.fn();
    const unsubscribeFirst = subscribeToDocumentVisibility(first);

    setDocumentVisibility('hidden');
    jest.advanceTimersByTime(POLL_HIDDEN_GRACE_PERIOD_MS - 1);

    const second = jest.fn();
    const unsubscribeSecond = subscribeToDocumentVisibility(second);

    jest.advanceTimersByTime(1);
    expect(first).toHaveBeenCalledWith(false);
    expect(second).toHaveBeenCalledWith(false);

    unsubscribeFirst();
    unsubscribeSecond();
  });

  it('attaches one DOM listener regardless of subscriber count', () => {
    const addSpy = jest.spyOn(document, 'addEventListener');
    const removeSpy = jest.spyOn(document, 'removeEventListener');

    const unsubscribeFirst = subscribeToDocumentVisibility(jest.fn());
    const unsubscribeSecond = subscribeToDocumentVisibility(jest.fn());
    expect(addSpy.mock.calls.filter(([type]) => type === 'visibilitychange')).toHaveLength(1);

    unsubscribeFirst();
    expect(removeSpy.mock.calls.filter(([type]) => type === 'visibilitychange')).toHaveLength(0);

    unsubscribeSecond();
    expect(removeSpy.mock.calls.filter(([type]) => type === 'visibilitychange')).toHaveLength(1);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('still notifies the remaining listeners when one throws', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const thrower = jest.fn(() => {
      throw new Error('listener failed');
    });
    const survivor = jest.fn();

    const unsubscribeThrower = subscribeToDocumentVisibility(thrower);
    const unsubscribeSurvivor = subscribeToDocumentVisibility(survivor);

    setDocumentVisibility('hidden');
    jest.advanceTimersByTime(POLL_HIDDEN_GRACE_PERIOD_MS);

    expect(thrower).toHaveBeenCalled();
    expect(survivor).toHaveBeenCalledWith(false);
    expect(consoleSpy).toHaveBeenCalled();

    unsubscribeThrower();
    unsubscribeSurvivor();
    consoleSpy.mockRestore();
  });

  it('reports the real state when a hidden document has no listeners left', () => {
    const unsubscribe = subscribeToDocumentVisibility(jest.fn());
    setDocumentVisibility('hidden');
    jest.advanceTimersByTime(POLL_HIDDEN_GRACE_PERIOD_MS);
    expect(isDocumentVisible()).toBe(false);

    unsubscribe();

    expect(isDocumentVisible()).toBe(false);
  });

  it('starts counting down when the first listener subscribes to an already hidden document', () => {
    setDocumentVisibility('hidden');

    const listener = jest.fn();
    const unsubscribe = subscribeToDocumentVisibility(listener);

    expect(isDocumentVisible()).toBe(true);
    jest.advanceTimersByTime(POLL_HIDDEN_GRACE_PERIOD_MS);
    expect(isDocumentVisible()).toBe(false);
    expect(listener).toHaveBeenCalledWith(false);

    unsubscribe();
  });
});
