import * as React from 'react';
import { DetailsItemComponentProps } from '@console/dynamic-plugin-sdk/src/extensions/details-item';
import { usePluginInfo } from '@console/plugin-sdk/src/api/usePluginInfo';
import { DASH } from '@console/shared/src/constants';

const ConsolePluginDescriptionDetail: React.FC<DetailsItemComponentProps> = ({ obj }) => {
  const pluginName = React.useMemo(() => obj?.metadata?.name, [obj?.metadata?.name]);

  const pluginInfoEntries = usePluginInfo();
  const pluginInfo = React.useMemo(
    () => pluginInfoEntries.find((entry) => entry.manifest.name === pluginName),
    [pluginInfoEntries, pluginName],
  );

  return pluginInfo?.status === 'loaded' ? (
    <>{(pluginInfo.manifest.customProperties?.console as any)?.description || DASH}</>
  ) : (
    <>{DASH}</>
  );
};

export default ConsolePluginDescriptionDetail;
