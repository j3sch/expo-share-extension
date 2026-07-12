import { ConfigPlugin, withEntitlementsPlist } from "@expo/config-plugins";

import {
  APP_GROUP_ENTITLEMENT_KEY,
  KEYCHAIN_ACCESS_GROUPS_ENTITLEMENT_KEY,
  mergeEntitlementValue,
  type ShareExtensionIdentity,
} from "./identity";

export const withAppEntitlements: ConfigPlugin<{
  identity: ShareExtensionIdentity;
}> = (config, { identity }) => {
  return withEntitlementsPlist(config, (config) => {
    config.modResults[APP_GROUP_ENTITLEMENT_KEY] = mergeEntitlementValue(
      config.modResults[APP_GROUP_ENTITLEMENT_KEY],
      identity.appGroupIdentifier,
    );
    if (identity.keychainAccessGroup) {
      config.modResults[KEYCHAIN_ACCESS_GROUPS_ENTITLEMENT_KEY] =
        mergeEntitlementValue(
          config.modResults[KEYCHAIN_ACCESS_GROUPS_ENTITLEMENT_KEY],
          identity.keychainAccessGroup,
        );
    }

    return config;
  });
};
