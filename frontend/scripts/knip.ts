import * as fs from 'fs';
import * as path from 'path';
import type { KnipConfig } from 'knip';
import {
  resolvePluginPackages,
  getMonorepoRootDir,
} from '@console/plugin-sdk/src/codegen/plugin-resolver';
import { extensionsFile } from '@console/dynamic-plugin-sdk/src/constants';
import { parseJSONC } from '@console/dynamic-plugin-sdk/src/utils/jsonc';
import type { ConsoleExtensionsJSON } from '@console/dynamic-plugin-sdk/src/schema/console-extensions';

const frontendDir = path.resolve(__dirname, '..');
const packagesDir = path.join(frontendDir, 'packages');

const ignorePatterns = [
  '**/__{tests,mocks}__/**',
  '**/*.{test,spec}.{ts,tsx}',
  '**/integration-tests/**',
  '**/node_modules/**',
];

// Packages with custom workspace configs defined below
const customPackages = new Set(['console-dynamic-plugin-sdk', 'eslint-plugin-console']);

// Matches the parseEncodedCodeRefValue regex from the dynamic plugin SDK
const codeRefPattern = /^([^.]+)(?:\.(.+))?$/;

// Plugin packages indexed by path, resolved once when knip loads the config
const pluginPackagesByPath = new Map(
  resolvePluginPackages(getMonorepoRootDir()).map((pkg) => [pkg._path, pkg]),
);

/** Generate an import statement for a specific export from a module path. */
const makeImport = (modulePath: string, exportName: string, id: number) =>
  exportName === 'default'
    ? `import _${id} from '${modulePath}';`
    : `import { ${exportName} as _${id} } from '${modulePath}';`;

/** Join import statements into a valid module source string. */
const toSource = (imports: string[]) =>
  imports.length > 0 ? `${imports.join('\n')}\nexport {};\n` : '';

/**
 * Scan .ts files in a directory for require('path').exportName patterns
 * and return synthetic import statements using the original require paths
 * (resolved by knip via tsconfig.json path aliases).
 */
const collectRequireImports = (dir: string): string[] => {
  const requireRegex = /require\('([^']+)'\)\s*(?:\n\s*)?\.(\w+)/g;
  const imports: string[] = [];
  const seen = new Set<string>();
  let id = 0;

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    let match: RegExpExecArray | null;
    while ((match = requireRegex.exec(content)) !== null) {
      const key = `${match[1]}:${match[2]}`;
      if (!seen.has(key)) {
        seen.add(key);
        imports.push(makeImport(match[1], match[2], id++));
      }
    }
  }
  return imports;
};

/**
 * Pre-computed imports for SDK API files that use require() to re-export
 * symbols from other packages (dynamic-core-api.ts, internal-api.ts, etc.).
 * Scans all .ts files in the SDK API directory at config load time.
 */
const sdkRequireImports = collectRequireImports(
  path.join(packagesDir, 'console-dynamic-plugin-sdk/src/api'),
);

/**
 * Compiler for console-extensions.json files.
 *
 * Walks the parsed extensions to find $codeRef values and generates import
 * statements so knip treats the referenced exports as used. Also includes
 * SDK require() imports so exports consumed via require() in the SDK API
 * files are not falsely reported as unused.
 *
 * Uses parseJSONC and resolvePluginPackages from the plugin-sdk packages.
 * The isEncodedCodeRef detection and codeRef parsing match the canonical
 * SDK implementations.
 */
const compileConsoleExtensions = (_source: string, filename: string): string => {
  const pkg = pluginPackagesByPath.get(path.dirname(filename));
  if (!pkg) {
    return '';
  }

  const exposedModules = pkg.consolePlugin.exposedModules || {};
  const extensions = parseJSONC<ConsoleExtensionsJSON>(filename);
  const imports: string[] = [];
  let id = 0;

  // Walk the extensions tree using JSON.stringify replacer to find $codeRef
  // values, matching the approach used by getDynamicExtensions in local-plugins.ts.
  JSON.stringify(extensions, (_key, value) => {
    // isEncodedCodeRef: a plain object with exactly one property "$codeRef" (string)
    if (value?.$codeRef && typeof value.$codeRef === 'string' && Object.keys(value).length === 1) {
      const match = value.$codeRef.match(codeRefPattern);
      if (match) {
        const moduleName = match[1];
        const exportName = match[2] || 'default';
        if (exposedModules[moduleName]) {
          const modulePath = `./${exposedModules[moduleName].replace(/\.(tsx?|jsx?)$/, '')}`;
          imports.push(makeImport(modulePath, exportName, id++));
        }
      }
    }
    return value;
  });

  return toSource([...imports, ...sdkRequireImports]);
};

/**
 * Auto-discovered package workspaces.
 *
 * Packages with src/index.ts use it as the entry; others use all src files.
 * Packages with console-extensions.json include it as an entry so the
 * compiler above can process their $codeRef values.
 */
const packageWorkspaces = Object.fromEntries(
  fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter(
      (dir) =>
        dir.isDirectory() &&
        !customPackages.has(dir.name) &&
        fs.existsSync(path.join(packagesDir, dir.name, 'package.json')),
    )
    .map((dir) => {
      const pkgDir = path.join(packagesDir, dir.name);
      const hasIndex =
        fs.existsSync(path.join(pkgDir, 'src/index.ts')) ||
        fs.existsSync(path.join(pkgDir, 'src/index.tsx'));
      const hasExtensions = fs.existsSync(path.join(pkgDir, extensionsFile));

      return [
        `packages/${dir.name}`,
        {
          entry: [
            ...(hasIndex ? ['src/index.{ts,tsx}'] : ['src/**/*.{ts,tsx}']),
            ...(hasExtensions ? [extensionsFile] : []),
          ],
          project: ['src/**/*.{ts,tsx,js,jsx}'],
          ignore: ignorePatterns,
        },
      ];
    }),
);

const config: KnipConfig = {
  compilers: { [extensionsFile]: compileConsoleExtensions },

  workspaces: {
    // Disable auto-detected plugins that fail to load in the knip context
    '.': { entry: [], project: [], ignore: ignorePatterns, webpack: false, jest: false },
    // public/ is the @console/internal workspace (has its own package.json).
    // Dependencies are declared in the root package.json, not public/package.json.
    public: {
      entry: ['components/app.tsx'],
      project: ['**/*.{ts,tsx,js,jsx}'],
      ignore: [...ignorePatterns, 'dist/**'],
    },
    // Dynamic plugin SDK — public API consumed by external plugins.
    // includeEntryExports: false prevents SDK exports from being reported as unused.
    'packages/console-dynamic-plugin-sdk': {
      entry: ['src/lib-core.ts', 'src/lib-internal.ts', 'src/lib-webpack.ts'],
      project: ['src/**/*.{ts,tsx}'],
      ignore: [...ignorePatterns, 'dist/**', 'generated/**', 'scripts/**'],
      includeEntryExports: false,
    },
    ...packageWorkspaces,
  },

  ignoreWorkspaces: ['packages/eslint-plugin-console', 'packages/*/integration-tests'],
  ignore: ignorePatterns,
  // Hide exports that are only used within their own file (not truly dead)
  ignoreExportsUsedInFile: true,
  // Workspace cross-references resolve via yarn workspaces linking.
  // Webpack NormalModuleReplacementPlugin remaps lodash-es to lodash.
  ignoreDependencies: ['@console/.*', 'lodash', 'lodash-es'],
  exclude: ['files', 'binaries', 'devDependencies'],
};

export default config;
