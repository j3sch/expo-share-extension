const {
  mergeShareExtensionEntitlements,
} = require("../../build/withShareExtensionEntitlements");

const identity = {
  appGroupIdentifier: "group.com.example.shared",
  keychainAccessGroup: "$(AppIdentifierPrefix)com.example.shared",
};

describe("mergeShareExtensionEntitlements", () => {
  it("preserves unrelated values and extends entitlement arrays", () => {
    expect(
      mergeShareExtensionEntitlements(
        {
          "com.apple.developer.associated-domains": ["applinks:example.com"],
          "com.apple.security.application-groups": ["group.com.example.existing"],
          "keychain-access-groups": ["$(AppIdentifierPrefix)com.example.existing"],
          "com.apple.developer.applesignin": ["Default"],
          "get-task-allow": true,
        },
        identity,
        true,
      ),
    ).toEqual({
      "com.apple.developer.associated-domains": ["applinks:example.com"],
      "com.apple.security.application-groups": [
        "group.com.example.existing",
        "group.com.example.shared",
      ],
      "keychain-access-groups": [
        "$(AppIdentifierPrefix)com.example.existing",
        "$(AppIdentifierPrefix)com.example.shared",
      ],
      "com.apple.developer.applesignin": ["Default"],
      "get-task-allow": true,
    });
  });

  it("does not duplicate managed entitlement values", () => {
    expect(
      mergeShareExtensionEntitlements(
        {
          "com.apple.security.application-groups": [identity.appGroupIdentifier],
          "keychain-access-groups": [identity.keychainAccessGroup],
        },
        identity,
        false,
      ),
    ).toEqual({
      "com.apple.security.application-groups": [identity.appGroupIdentifier],
      "keychain-access-groups": [identity.keychainAccessGroup],
    });
  });
});
