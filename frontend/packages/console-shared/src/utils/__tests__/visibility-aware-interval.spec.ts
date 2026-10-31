import {
  restoreDocumentVisibility,
  setDocumentVisibility,
} from '../../test-utils/document-visibility-test-utils';
import { POLL_HIDDEN_GRACE_PERIOD_MS } from '../document-visibility';
import { startVisibilityAwareInterval } from '../visibility-aware-interval';

const DELAY = 15000;

/** Hides the document and advances past the grace period so the gate settles. */
const settleHidden = () => {
  setDocumentVisibility('hidden');
  jest.advanceTimersByTime(POLL_HIDDEN_GRACE_PERIOD_MS);
};

describe('startVisibilityAwareInterval', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    restoreDocumentVisibility();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('runs the callback every delay while visible', () => {
    const callback = jest.fn();
    const stop = startVisibilityAwareInterval(callback, DELAY);

    jest.advanceTimersByTime(DELAY * 3);
    expect(callback).toHaveBeenCalledTimes(3);

    stop();
  });

  it('clears the interval once the document has settled hidden', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const callback = jest.fn();
    const stop = startVisibilityAwareInterval(callback, DELAY);

    settleHidden();
    expect(clearIntervalSpy).toHaveBeenCalled();

    callback.mockClear();
    jest.advanceTimersByTime(DELAY * 100);
    expect(callback).not.toHaveBeenCalled();

    stop();
  });

  it('keeps polling through a hide shorter than the grace period', () => {
    const callback = jest.fn();
    const stop = startVisibilityAwareInterval(callback, DELAY);

    setDocumentVisibility('hidden');
    jest.advanceTimersByTime(POLL_HIDDEN_GRACE_PERIOD_MS - 1);
    setDocumentVisibility('visible');

    jest.advanceTimersByTime(DELAY * 2);
    expect(callback).toHaveBeenCalledTimes(2);

    stop();
  });

  it('runs once on resume when hidden longer than one period, then resumes the interval', () => {
    const callback = jest.fn();
    const stop = startVisibilityAwareInterval(callback, DELAY, { jitterMs: 0 });

    settleHidden();
    jest.advanceTimersByTime(DELAY * 5);
    callback.mockClear();

    setDocumentVisibility('visible');
    jest.advanceTimersByTime(0);
    expect(callback).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(DELAY);
    expect(callback).toHaveBeenCalledTimes(2);

    stop();
  });

  it('does not run early on resume when hidden for less than one period', () => {
    const callback = jest.fn();
    const stop = startVisibilityAwareInterval(callback, DELAY, { jitterMs: 0 });

    setDocumentVisibility('hidden');
    jest.advanceTimersByTime(POLL_HIDDEN_GRACE_PERIOD_MS);
    expect(callback).not.toHaveBeenCalled();

    setDocumentVisibility('visible');
    jest.advanceTimersByTime(0);
    expect(callback).not.toHaveBeenCalled();

    // The run was already due at DELAY from construction, and lands there rather than sooner.
    jest.advanceTimersByTime(DELAY - POLL_HIDDEN_GRACE_PERIOD_MS);
    expect(callback).toHaveBeenCalledTimes(1);

    stop();
  });

  it('spreads the catch-up run across the jitter window', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const callback = jest.fn();
    const stop = startVisibilityAwareInterval(callback, DELAY, { jitterMs: 1000 });

    settleHidden();
    jest.advanceTimersByTime(DELAY * 5);
    callback.mockClear();

    setDocumentVisibility('visible');
    jest.advanceTimersByTime(499);
    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);

    stop();
  });

  it('stops a pending catch-up and the interval when stopped', () => {
    const callback = jest.fn();
    const stop = startVisibilityAwareInterval(callback, DELAY, { jitterMs: 0 });

    settleHidden();
    jest.advanceTimersByTime(DELAY * 5);
    setDocumentVisibility('visible');
    stop();

    callback.mockClear();
    jest.advanceTimersByTime(DELAY * 5);
    expect(callback).not.toHaveBeenCalled();
  });

  it('arms no interval when the document is already settled hidden', () => {
    const blocker = startVisibilityAwareInterval(jest.fn(), DELAY);
    settleHidden();

    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const callback = jest.fn();
    const stop = startVisibilityAwareInterval(callback, DELAY);

    expect(setIntervalSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(DELAY * 5);
    expect(callback).not.toHaveBeenCalled();

    stop();
    blocker();
  });
});
