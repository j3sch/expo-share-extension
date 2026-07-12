const {
  APP_GROUP_ENTITLEMENT_KEY,
  mergeEntitlementValue,
  resolveShareExtensionIdentity,
} = require("../../build/identity");

const baseConfig = (overrides = {}) => ({
  name: "Example",
  ios: {
    bundleIdentifier: "com.example.app",
    ...overrides.ios,
  },
  ...overrides,
});

describe("resolveShareExtensionIdentity", () => {
  it("uses explicit values and normalizes the keychain access group", () => {
    expect(
      resolveShareExtensionIdentity(baseConfig(), {
        appGroupIdentifier: "group.com.example.shared",
        keychainAccessGroup: "com.example.shared",
      }),
    ).toEqual({
      appGroupIdentifier: "group.com.example.shared",
      keychainAccessGroup: "$(AppIdentifierPrefix)com.example.shared",
    });
  });

  it("uses the single configured App Group when no option is supplied", () => {
    expect(
      resolveShareExtensionIdentity(
        baseConfig({
          ios: {
            bundleIdentifier: "com.example.app",
            entitlements: {
              [APP_GROUP_ENTITLEMENT_KEY]: ["group.com.example.shared"],
            },
          },
        }),
        {},
      ).appGroupIdentifier,
    ).toBe("group.com.example.shared");
  });

  it("requires an explicit App Group when multiple groups are configured", () => {
    expect(() =>
      resolveShareExtensionIdentity(
        baseConfig({
          ios: {
            bundleIdentifier: "com.example.app",
            entitlements: {
              [APP_GROUP_ENTITLEMENT_KEY]: [
                "group.com.example.one",
                "group.com.example.two",
              ],
            },
          },
        }),
        {},
      ),
    ).toThrow("Multiple iOS App Groups");
  });

  it("preserves existing entitlement values when adding the shared identity", () => {
    expect(
      mergeEntitlementValue(
        ["group.com.example.existing"],
        "group.com.example.shared",
      ),
    ).toEqual(["group.com.example.existing", "group.com.example.shared"]);
    expect(
      mergeEntitlementValue(
        ["group.com.example.shared"],
        "group.com.example.shared",
      ),
    ).toEqual(["group.com.example.shared"]);
  });
});
