import { renderHook } from '@testing-library/react';
import {
  restoreDocumentVisibility,
  setDocumentVisibility,
} from '../../test-utils/document-visibility-test-utils';
import { POLL_HIDDEN_GRACE_PERIOD_MS } from '../../utils/document-visibility';
import { usePoll } from '../usePoll';

const DELAY = 15000;

const settleHidden = () => {
  setDocumentVisibility('hidden');
  jest.advanceTimersByTime(POLL_HIDDEN_GRACE_PERIOD_MS);
};

describe('usePoll', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    restoreDocumentVisibility();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('runs the callback immediately and then every delay', () => {
    const callback = jest.fn();
    renderHook(() => usePoll(callback, DELAY));

    expect(callback).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(DELAY * 2);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('runs once and never repeats when the delay is falsy', () => {
    const callback = jest.fn();
    renderHook(() => usePoll(callback, null));

    expect(callback).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(DELAY * 10);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('re-runs the callback when a dependency changes', () => {
    const callback = jest.fn();
    const { rerender } = renderHook(({ dep }) => usePoll(callback, DELAY, dep), {
      initialProps: { dep: 'a' },
    });

    expect(callback).toHaveBeenCalledTimes(1);
    rerender({ dep: 'b' });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('stops polling once the tab has been hidden for the grace period', () => {
    const callback = jest.fn();
    renderHook(() => usePoll(callback, DELAY));
    callback.mockClear();

    settleHidden();
    jest.advanceTimersByTime(DELAY * 20);
    expect(callback).not.toHaveBeenCalled();
  });

  it('keeps the existing cadence through a tab switch shorter than the grace period', () => {
    const callback = jest.fn();
    renderHook(() => usePoll(callback, DELAY));
    callback.mockClear();

    setDocumentVisibility('hidden');
    jest.advanceTimersByTime(POLL_HIDDEN_GRACE_PERIOD_MS - 1);
    setDocumentVisibility('visible');

    jest.advanceTimersByTime(DELAY * 2);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('refreshes once when the tab becomes visible after a long hide', () => {
    const callback = jest.fn();
    renderHook(() => usePoll(callback, DELAY));

    settleHidden();
    jest.advanceTimersByTime(DELAY * 10);
    callback.mockClear();

    setDocumentVisibility('visible');
    jest.advanceTimersByTime(0);
    expect(callback).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(DELAY);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('keeps today’s cadence when pollWhenHidden is set', () => {
    const callback = jest.fn();
    renderHook(() => usePoll(callback, { delay: DELAY, pollWhenHidden: true }));
    callback.mockClear();

    settleHidden();
    jest.advanceTimersByTime(DELAY * 3);
    expect(callback).toHaveBeenCalledTimes(3);

    setDocumentVisibility('visible');
    jest.advanceTimersByTime(DELAY);
    expect(callback).toHaveBeenCalledTimes(4);
  });

  it('never polls across a visibility cycle when the delay is falsy', () => {
    const callback = jest.fn();
    renderHook(() => usePoll(callback, null));
    expect(callback).toHaveBeenCalledTimes(1);

    settleHidden();
    jest.advanceTimersByTime(DELAY * 5);
    setDocumentVisibility('visible');
    jest.advanceTimersByTime(DELAY * 5);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('stops polling and detaches the visibility listener on unmount', () => {
    const removeSpy = jest.spyOn(document, 'removeEventListener');
    const callback = jest.fn();
    const { unmount } = renderHook(() => usePoll(callback, DELAY));

    unmount();
    expect(removeSpy.mock.calls.filter(([type]) => type === 'visibilitychange')).toHaveLength(1);

    callback.mockClear();
    jest.advanceTimersByTime(DELAY * 5);
    expect(callback).not.toHaveBeenCalled();
  });
});
