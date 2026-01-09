/* eslint-disable camelcase */
// eslint-disable-next-line @typescript-eslint/triple-slash-reference, spaced-comment
/// <reference types="webpack/module" />

// eslint-disable-next-line no-undef
const shareScopes: typeof __webpack_share_scopes__ = {
  default: {},
};

// @ts-expect-error - share_scopes is typed as const in TypeScript
global.__webpack_share_scopes__ = shareScopes;

global.__webpack_init_sharing__ = jest.fn(() => Promise.resolve());
