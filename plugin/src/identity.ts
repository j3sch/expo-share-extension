import { type ExpoConfig } from "@expo/config-types";

import { type ShareExtensionPluginOptions } from "./types";

export const APP_GROUP_ENTITLEMENT_KEY =
  "com.apple.security.application-groups";
export const KEYCHAIN_ACCESS_GROUPS_ENTITLEMENT_KEY = "keychain-access-groups";
const APP_IDENTIFIER_PREFIX = "$(AppIdentifierPrefix)";

export type ShareExtensionIdentity = {
  appGroupIdentifier: string;
  keychainAccessGroup?: string;
};

function nonEmptyStrings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.length > 0,
    );
  }

  return typeof value === "string" && value.length > 0 ? [value] : [];
}

function validateAppGroupIdentifier(value: string): string {
  const identifier = value.trim();
  if (!identifier.startsWith("group.") || identifier.length <= "group.".length) {
    throw new Error(
      "appGroupIdentifier must be an Apple App Group identifier such as group.com.example.app.",
    );
  }

  return identifier;
}

function resolveLegacyAppGroupIdentifier(config: ExpoConfig): string | undefined {
  const infoPlist = config.ios?.infoPlist as
    | Record<string, unknown>
    | undefined;
  const legacyValue = infoPlist?.AppGroup ?? infoPlist?.AppGroupIdentifier;

  if (typeof legacyValue !== "string" || legacyValue.trim().length === 0) {
    return undefined;
  }

  console.warn(
    "expo-share-extension: ios.infoPlist.AppGroup and AppGroupIdentifier are deprecated. Use the plugin's appGroupIdentifier option instead.",
  );
  return validateAppGroupIdentifier(legacyValue);
}

function resolveAppGroupIdentifier(
  config: ExpoConfig,
  options: ShareExtensionPluginOptions,
): string {
  if (options.appGroupIdentifier) {
    return validateAppGroupIdentifier(options.appGroupIdentifier);
  }

  const legacyAppGroupIdentifier = resolveLegacyAppGroupIdentifier(config);
  if (legacyAppGroupIdentifier) {
    return legacyAppGroupIdentifier;
  }

  const entitlementGroups = nonEmptyStrings(
    config.ios?.entitlements?.[APP_GROUP_ENTITLEMENT_KEY],
  );
  if (entitlementGroups.length === 1) {
    return validateAppGroupIdentifier(entitlementGroups[0]);
  }
  if (entitlementGroups.length > 1) {
    throw new Error(
      "Multiple iOS App Groups are configured. Set appGroupIdentifier explicitly so the share extension uses the intended container.",
    );
  }

  if (!config.ios?.bundleIdentifier) {
    throw new Error("No iOS bundle identifier configured.");
  }

  return `group.${config.ios.bundleIdentifier}`;
}

function normalizeKeychainAccessGroup(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const identifier = value.trim();
  const suffix = identifier.startsWith(APP_IDENTIFIER_PREFIX)
    ? identifier.slice(APP_IDENTIFIER_PREFIX.length)
    : identifier;

  if (!suffix) {
    throw new Error(
      "keychainAccessGroup must include a keychain access-group suffix.",
    );
  }

  return `${APP_IDENTIFIER_PREFIX}${suffix}`;
}

export function resolveShareExtensionIdentity(
  config: ExpoConfig,
  options: ShareExtensionPluginOptions,
): ShareExtensionIdentity {
  return {
    appGroupIdentifier: resolveAppGroupIdentifier(config, options),
    keychainAccessGroup: normalizeKeychainAccessGroup(
      options.keychainAccessGroup,
    ),
  };
}

export function mergeEntitlementValue(
  existing: unknown,
  value: string | undefined,
): string[] {
  const values = nonEmptyStrings(existing);
  return value && !values.includes(value) ? [...values, value] : values;
}
