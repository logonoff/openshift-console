import { useRef, useMemo } from 'react';
import { PluginInfoEntry, usePluginInfo as usePluginInfoSDK } from '@openshift/dynamic-plugin-sdk';
import { isEqual } from 'lodash';

/**
 * React hook for consuming Console dynamic plugin runtime information.
 *
 * When the runtime status of a dynamic plugin changes, the React component
 * is re-rendered with the hook returning an up-to-date plugin information.
 *
 * Example usage:
 *
 * ```ts
 * const Example = () => {
 *   const pluginInfoEntries = usePluginInfo();
 *   // process plugin entries and render your component
 * };
 * ```
 *
 * The hook's result elements are guaranteed to be referentially stable across re-renders.
 *
 * @returns Console dynamic plugin runtime information.
 */
export const usePluginInfo = () => {
  const pluginInfo = usePluginInfoSDK();

  const previousResultRef = useRef<PluginInfoEntry[]>([]);

  // This hook returns dynamic plugin information only, i.e., not static/local plugins
  return useMemo(() => {
    const dynamicPluginInfo = pluginInfo.filter(
      (plugin) => plugin.manifest.registrationMethod !== 'local',
    );

    // Ensure referential stability of the result elements
    const stablePluginInfo = dynamicPluginInfo.map((plugin) => {
      const previousPlugin = previousResultRef.current.find(
        (p) => p.manifest.name === plugin.manifest.name,
      );
      // Only reuse previous reference if the data is actually equal
      if (previousPlugin && isEqual(previousPlugin, plugin)) {
        return previousPlugin;
      }
      return plugin;
    });

    previousResultRef.current = stablePluginInfo;
    return stablePluginInfo;
  }, [pluginInfo]);
};
