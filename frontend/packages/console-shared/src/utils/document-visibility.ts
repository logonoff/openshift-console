const DISABLE_KEY = 'console.disableVisibilityThrottling';

/** How long the document must stay hidden before subscribers are told to stop working. */
export const POLL_HIDDEN_GRACE_PERIOD_MS = 10000;

/** Upper bound of the random offset spread across catch-up runs when the document is shown. */
export const RESUME_JITTER_MS = 1000;

/** Spacing between resumed dashboard fetch chains. */
export const RESUME_STAGGER_MS = 100;

const throttlingDisabled = (() => {
  try {
    return window.localStorage.getItem(DISABLE_KEY) === 'true';
  } catch {
    return false;
  }
})();

type VisibilityListener = (visible: boolean) => void;

const listeners = new Set<VisibilityListener>();
let settledVisible = true;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener(settledVisible);
    } catch (e) {
      console.error('Document visibility listener failed:', e);
    }
  });
};

const clearHideTimer = () => {
  if (hideTimer !== null) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
};

const syncVisibility = () => {
  // Any state other than 'hidden' counts as visible so an unrecognized value keeps polling.
  if (document.visibilityState !== 'hidden') {
    clearHideTimer();
    if (!settledVisible) {
      settledVisible = true;
      notify();
    }
    return;
  }

  // Already settled, or a grace period is already counting down.
  if (!settledVisible || hideTimer !== null) {
    return;
  }

  hideTimer = setTimeout(() => {
    hideTimer = null;
    settledVisible = false;
    notify();
  }, POLL_HIDDEN_GRACE_PERIOD_MS);
};

/**
 * Whether work scheduled on a timer should run. Returns false only once the document has been
 * continuously hidden for `POLL_HIDDEN_GRACE_PERIOD_MS`, so a brief tab switch changes nothing.
 */
export const isDocumentVisible = (): boolean => {
  if (throttlingDisabled) {
    return true;
  }
  // Without a subscriber nothing keeps `settledVisible` current, so read the document itself.
  // The grace period applies only while something is listening for transitions.
  if (listeners.size === 0) {
    return document.visibilityState !== 'hidden';
  }
  return settledVisible;
};

/**
 * Subscribes to settled visibility transitions. The listener receives `false` once the document
 * has been hidden for the grace period and `true` as soon as it is shown again.
 * @returns a function that removes the listener.
 */
export const subscribeToDocumentVisibility = (listener: VisibilityListener): (() => void) => {
  if (throttlingDisabled) {
    return () => {};
  }

  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener('visibilitychange', syncVisibility);
    syncVisibility();
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      document.removeEventListener('visibilitychange', syncVisibility);
      clearHideTimer();
      settledVisible = true;
    }
  };
};
