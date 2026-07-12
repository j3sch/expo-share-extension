import { ConfigPlugin } from "@expo/config-plugins";

import {
  getShareExtensionBundleIdentifier,
  getShareExtensionName,
} from "./index";
import {
  APP_GROUP_ENTITLEMENT_KEY,
  KEYCHAIN_ACCESS_GROUPS_ENTITLEMENT_KEY,
  mergeEntitlementValue,
  type ShareExtensionIdentity,
} from "./identity";

type iOSExtensionConfig = {
  targetName: string;
  bundleIdentifier: string;
  entitlements: Record<string, string | string[]>;
};

// extend expo app config with app extension config for our share extension
export const withExpoConfig: ConfigPlugin<{
  identity: ShareExtensionIdentity;
}> = (config, { identity }) => {
  if (!config.ios?.bundleIdentifier) {
    throw new Error("You need to specify ios.bundleIdentifier in app.json.");
  }

  const extensionName = getShareExtensionName(config);
  const extensionBundleIdentifier = getShareExtensionBundleIdentifier(config);

  const iosExtensions: iOSExtensionConfig[] =
    config.extra?.eas?.build?.experimental?.ios?.appExtensions;

  const shareExtensionConfig = iosExtensions?.find(
    (extension) => extension.targetName === extensionName
  );

  return {
    ...config,
    extra: {
      ...(config.extra ?? {}),
      eas: {
        ...(config.extra?.eas ?? {}),
        build: {
          ...(config.extra?.eas?.build ?? {}),
          experimental: {
            ...(config.extra?.eas?.build?.experimental ?? {}),
            ios: {
              ...(config.extra?.eas?.build?.experimental?.ios ?? {}),
              appExtensions: [
                {
                  ...(shareExtensionConfig ?? {
                    targetName: extensionName,
                    bundleIdentifier: extensionBundleIdentifier,
                  }),
                  entitlements: (() => {
                    const entitlements = {
                      ...shareExtensionConfig?.entitlements,
                      [APP_GROUP_ENTITLEMENT_KEY]: mergeEntitlementValue(
                        shareExtensionConfig?.entitlements?.[
                          APP_GROUP_ENTITLEMENT_KEY
                        ],
                        identity.appGroupIdentifier,
                      ),
                    } as Record<string, string | string[]>;

                    if (identity.keychainAccessGroup) {
                      entitlements[KEYCHAIN_ACCESS_GROUPS_ENTITLEMENT_KEY] =
                        mergeEntitlementValue(
                          entitlements[KEYCHAIN_ACCESS_GROUPS_ENTITLEMENT_KEY],
                          identity.keychainAccessGroup,
                        );
                    }
                    if (config.ios.usesAppleSignIn) {
                      entitlements["com.apple.developer.applesignin"] =
                        mergeEntitlementValue(
                          entitlements["com.apple.developer.applesignin"],
                          "Default",
                        );
                    }

                    return entitlements;
                  })(),
                },
                ...(iosExtensions?.filter(
                  (extension) => extension.targetName !== extensionName
                ) ?? []),
              ],
            },
          },
        },
      },
      appleApplicationGroup: identity.appGroupIdentifier,
    },
  };
};
