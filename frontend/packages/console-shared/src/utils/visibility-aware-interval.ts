import {
  RESUME_JITTER_MS,
  isDocumentVisible,
  subscribeToDocumentVisibility,
} from './document-visibility';

export type VisibilityAwareIntervalOptions = {
  /** Upper bound of the random offset added to the catch-up run. Pass 0 to resume immediately. */
  jitterMs?: number;
};

/**
 * Runs `callback` every `delay` ms while the document is visible, and schedules nothing while it
 * is hidden. On becoming visible the callback runs once after `max(delay - elapsed, 0)` plus a
 * random offset, then the interval resumes from that run.
 *
 * `delay` is assumed to have elapsed zero times at construction, matching callers that invoke the
 * callback themselves before starting the interval.
 * @returns a function that stops the interval and removes the visibility subscription.
 */
export const startVisibilityAwareInterval = (
  callback: () => void,
  delay: number,
  { jitterMs = RESUME_JITTER_MS }: VisibilityAwareIntervalOptions = {},
): (() => void) => {
  let lastRun = Date.now();
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let resumeId: ReturnType<typeof setTimeout> | null = null;

  const run = () => {
    lastRun = Date.now();
    callback();
  };

  const clearRepeat = () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const clearResume = () => {
    if (resumeId !== null) {
      clearTimeout(resumeId);
      resumeId = null;
    }
  };

  const unsubscribe = subscribeToDocumentVisibility((visible) => {
    if (!visible) {
      clearRepeat();
      clearResume();
      return;
    }
    if (intervalId !== null || resumeId !== null) {
      return;
    }
    const dueIn = Math.max(delay - (Date.now() - lastRun), 0);
    resumeId = setTimeout(
      () => {
        resumeId = null;
        run();
        intervalId = setInterval(run, delay);
      },
      dueIn + Math.random() * jitterMs,
    );
  });

  if (isDocumentVisible()) {
    intervalId = setInterval(run, delay);
  }

  return () => {
    unsubscribe();
    clearRepeat();
    clearResume();
  };
};
