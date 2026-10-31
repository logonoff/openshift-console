const define = (property: 'visibilityState' | 'hidden', value: unknown): void => {
  Object.defineProperty(document, property, { configurable: true, get: () => value });
};

/**
 * Overrides `document.visibilityState` and `document.hidden` and dispatches `visibilitychange`.
 * jsdom defines the two independently, so both are set to keep them consistent.
 * Pair with `restoreDocumentVisibility` in `afterEach`.
 */
export const setDocumentVisibility = (visibilityState: 'visible' | 'hidden'): void => {
  define('visibilityState', visibilityState);
  define('hidden', visibilityState === 'hidden');
  document.dispatchEvent(new Event('visibilitychange'));
};

export const restoreDocumentVisibility = (): void => {
  Reflect.deleteProperty(document, 'visibilityState');
  Reflect.deleteProperty(document, 'hidden');
};
