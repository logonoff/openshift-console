import { useEffect, useRef } from 'react';
import { startVisibilityAwareInterval } from '../utils/visibility-aware-interval';

export type PollOptions = {
  /** Interval in ms. A falsy value runs the callback once without repeating. */
  delay: number | null;
  /** Keep polling while the browser tab is hidden. */
  pollWhenHidden?: boolean;
};

const normalize = (delay: number | null | PollOptions): PollOptions =>
  typeof delay === 'object' ? (delay ?? { delay: null }) : { delay };

// Slightly modified from Dan Abramov's blog post about using React hooks for polling
// https://overreacted.io/making-setinterval-declarative-with-react-hooks/
export const usePoll = (callback, delay: number | null | PollOptions, ...dependencies) => {
  const savedCallback = useRef(null);

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const { delay: pollDelay, pollWhenHidden } = normalize(delay);

  // Set up the interval.
  useEffect(() => {
    const tick = () => savedCallback.current();

    tick(); // Run first tick immediately.

    if (!pollDelay) {
      // Only start interval if a delay is provided.
      return () => {};
    }
    if (pollWhenHidden) {
      const id = setInterval(tick, pollDelay);
      return () => clearInterval(id);
    }
    return startVisibilityAwareInterval(tick, pollDelay);
    // eslint-disable-next-line react-hooks-js/exhaustive-deps
  }, [pollDelay, pollWhenHidden, ...dependencies]);
};
