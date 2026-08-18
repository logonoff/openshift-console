/*
 * Transpiles the ESM-only dependencies of react-router 8 (react-router itself,
 * cookie-es and @remix-run/route-pattern) to CommonJS for Jest.
 *
 * Why this file exists:
 *
 * These packages ship only ECMAScript modules ("type": "module" and no
 * "require" condition in their "exports" maps). Jest executes test suites as
 * CommonJS, and on Node.js < 24.9 it cannot `require()` such packages
 * natively: Jest 30 gates its synchronous require(esm) support on
 * `vm.SourceTextModule.prototype.hasAsyncGraph`, which was introduced in
 * Node 24.9. On older Node versions Jest must transpile these packages to
 * CommonJS, which is what this transform does.
 *
 * The transform differs from the main `@swc/jest` entry in jest.config.ts in
 * two ways:
 *
 * 1. `noInterop: false` - the ESM sources of these packages contain default
 *    imports of CommonJS packages (e.g. `import React from "react"` in
 *    react-router), which SWC compiles to `_react.default.Component`. Without
 *    the interop wrapper, `.default` is undefined. Note that the application
 *    code must keep `noInterop: true`; it is not compatible with these
 *    packages.
 *
 * 2. `import.meta.hot` is replaced with `false` - SWC passes `import.meta`
 *    through to the CommonJS output, where it is a syntax error. The only
 *    reference lives in react-router's
 *    dist/{production,development}/lib/dom/ssr/routeModules.js as part of a
 *    Vite SPA-mode HMR guard (`window.__reactRouterContext.isSpaMode &&
 *    import.meta.hot`) that the Console never activates.
 *
 * How to remove this file once the minimum supported Node.js version is
 * bumped to >= 24.9:
 *
 * 1. Confirm that Jest can use native require(esm) on the new minimum
 *    version; the following command must print "function":
 *
 *      node -e "console.log(typeof require('node:vm').SourceTextModule?.prototype.hasAsyncGraph)"
 *
 *    Update the "engines.node" field in frontend/package.json accordingly.
 *
 * 2. In frontend/jest.config.ts, delete the `transform` entry whose key is the
 *    `node_modules[/\](react-router|cookie-es|@remix-run[/\]route-pattern)`
 *    regular expression (it points to this file).
 *
 * 3. In frontend/jest.config.ts, remove `react-router|cookie-es|@remix-run/route-pattern`
 *    from the `transformIgnorePatterns` allowlist. With native require(esm),
 *    Jest loads these packages through the ESM loader, which bypasses the
 *    CommonJS transform pipeline, so they no longer need to be transformed.
 *
 * 4. Delete this file.
 *
 * 5. Run `yarn test` to confirm that all test suites still pass. If a suite
 *    fails with ERR_REQUIRE_ESM ("Must use import to load ES Module"), another
 *    ESM-only dependency still needs to be transpiled (or, if it references
 *    `import.meta`, patched via `yarn patch`) - add it back to the transform
 *    regular expression and the `transformIgnorePatterns` allowlist.
 */

const { createTransformer } = require('@swc/jest');

const swcTransformer = createTransformer({
  jsc: {
    parser: {
      syntax: 'typescript',
      tsx: true,
    },
    transform: {
      react: {
        runtime: 'automatic',
      },
    },
  },
  module: {
    type: 'commonjs',
    noInterop: false,
  },
});

const transformImportMetaHot = (source) => source.replace(/import\.meta\.hot/g, 'false');

/** @type {import('@jest/transform').SyncTransformer} */
module.exports = {
  canInstrument: swcTransformer.canInstrument,
  process(source, filename, options) {
    return swcTransformer.process(transformImportMetaHot(source), filename, options);
  },
  getCacheKey(source, filename, ...args) {
    return swcTransformer.getCacheKey(transformImportMetaHot(source), filename, ...args);
  },
};
