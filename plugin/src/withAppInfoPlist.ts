import { ConfigPlugin, withInfoPlist } from "@expo/config-plugins";

import { type ShareExtensionIdentity } from "./identity";

export const withAppInfoPlist: ConfigPlugin<{
  identity: ShareExtensionIdentity;
}> = (config, { identity }) => {
  return withInfoPlist(config, (config) => {
    config.modResults["AppGroup"] = identity.appGroupIdentifier;
    config.modResults["AppGroupIdentifier"] = identity.appGroupIdentifier;

    return config;
  });
};
