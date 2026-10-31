import { useSyncExternalStore } from 'react';
import { startVisibilityAwareInterval } from '../utils/visibility-aware-interval';

const TICK_INTERVAL = 10000;

let tick = Date.now();
let stopInterval: (() => void) | null = null;
const listeners = new Set<() => void>();

const notify = () => {
  tick = Date.now();
  listeners.forEach((cb) => cb());
};

const subscribe = (callback: () => void): (() => void) => {
  listeners.add(callback);
  if (listeners.size === 1) {
    tick = Date.now();
    stopInterval = startVisibilityAwareInterval(notify, TICK_INTERVAL, { jitterMs: 0 });
  }
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0) {
      stopInterval?.();
      stopInterval = null;
    }
  };
};

const getSnapshot = (): number => tick;

/**
 * Returns the current epoch timestamp (ms) that updates every 10 seconds.
 * Uses a single shared interval across all consumers — the interval starts on
 * first mount and stops when the last consumer unmounts. It also stops while the
 * browser tab is hidden, and the timestamp advances as soon as the tab is shown.
 */
export const useTimestampTick = (): number => useSyncExternalStore(subscribe, getSnapshot);
