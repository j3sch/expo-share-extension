import plist from "@expo/plist";
import { ConfigPlugin, withEntitlementsPlist } from "expo/config-plugins";
import fs from "fs";
import path from "path";

import {
  APP_GROUP_ENTITLEMENT_KEY,
  KEYCHAIN_ACCESS_GROUPS_ENTITLEMENT_KEY,
  mergeEntitlementValue,
  type ShareExtensionIdentity,
} from "./identity";
import { getShareExtensionName } from "./index";

type Entitlements = Record<string, unknown>;

export function mergeShareExtensionEntitlements(
  existing: Entitlements,
  identity: ShareExtensionIdentity,
  usesAppleSignIn: boolean | undefined,
): Entitlements {
  const entitlements: Entitlements = {
    ...existing,
    [APP_GROUP_ENTITLEMENT_KEY]: mergeEntitlementValue(
      existing[APP_GROUP_ENTITLEMENT_KEY],
      identity.appGroupIdentifier,
    ),
  };

  if (identity.keychainAccessGroup) {
    entitlements[KEYCHAIN_ACCESS_GROUPS_ENTITLEMENT_KEY] =
      mergeEntitlementValue(
        existing[KEYCHAIN_ACCESS_GROUPS_ENTITLEMENT_KEY],
        identity.keychainAccessGroup,
      );
  }

  if (usesAppleSignIn) {
    entitlements["com.apple.developer.applesignin"] = mergeEntitlementValue(
      existing["com.apple.developer.applesignin"],
      "Default",
    );
  }

  return entitlements;
}

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

    let existingEntitlements: Entitlements = {};
    if (fs.existsSync(filePath)) {
      try {
        const parsedEntitlements = plist.parse(fs.readFileSync(filePath, "utf8"));
        if (!parsedEntitlements || typeof parsedEntitlements !== "object") {
          throw new Error("The plist root is not a dictionary.");
        }
        existingEntitlements = parsedEntitlements as Entitlements;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(
          `expo-share-extension: Could not read existing entitlements at ${filePath}: ${reason}`,
        );
      }
    }

    const shareExtensionEntitlements = mergeShareExtensionEntitlements(
      existingEntitlements,
      identity,
      config.ios?.usesAppleSignIn,
    );

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, plist.build(shareExtensionEntitlements));

    return config;
  });
};
