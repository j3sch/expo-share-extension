import plist from "@expo/plist";
import { ConfigPlugin, withEntitlementsPlist } from "expo/config-plugins";
import fs from "fs";
import path from "path";

import {
  APP_GROUP_ENTITLEMENT_KEY,
  KEYCHAIN_ACCESS_GROUPS_ENTITLEMENT_KEY,
  type ShareExtensionIdentity,
} from "./identity";
import { getShareExtensionName } from "./index";

export const withShareExtensionEntitlements: ConfigPlugin<{
  identity: ShareExtensionIdentity;
}> = (config, { identity }) => {
  return withEntitlementsPlist(config, (config) => {
    const targetName = getShareExtensionName(config);

    const targetPath = path.join(
      config.modRequest.platformProjectRoot,
      targetName
    );
    const filePath = path.join(targetPath, `${targetName}.entitlements`);

    let shareExtensionEntitlements: Record<string, string | string[]> = {
      [APP_GROUP_ENTITLEMENT_KEY]: [identity.appGroupIdentifier],
    };

    if (identity.keychainAccessGroup) {
      shareExtensionEntitlements[KEYCHAIN_ACCESS_GROUPS_ENTITLEMENT_KEY] = [
        identity.keychainAccessGroup,
      ];
    }

    if (config.ios?.usesAppleSignIn) {
      shareExtensionEntitlements = {
        ...shareExtensionEntitlements,
        "com.apple.developer.applesignin": ["Default"],
      };
    }

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, plist.build(shareExtensionEntitlements));

    return config;
  });
};
