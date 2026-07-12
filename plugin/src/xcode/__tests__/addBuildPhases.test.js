const { addBuildPhases } = require("../../../build/xcode/addBuildPhases");

const createProject = () => {
  const phases = [];
  const project = {
    addBuildPhase: jest.fn((...args) => {
      const buildPhase = {};
      phases.push({ args, buildPhase });
      return { buildPhase };
    }),
    addToPbxCopyfilesBuildPhase: jest.fn(),
    getFirstTarget: jest.fn(() => ({ uuid: "host-target" })),
  };

  return { phases, project };
};

describe("addBuildPhases", () => {
  it("delegates Metro startup to the host target and marks bundling as intentional", () => {
    const { phases, project } = createProject();

    addBuildPhases(project, {
      targetUuid: "extension-target",
      groupName: "Embed Foundation Extensions",
      productFile: {
        uuid: "product",
        target: "ShareExtension.appex",
        basename: "ShareExtension.appex",
        group: "Embed Foundation Extensions",
      },
      resources: [],
    });

    expect(phases.some(({ args }) => args[2] === "Start Packager")).toBe(false);

    const bundlePhase = phases.find(
      ({ args }) => args[2] === "Bundle React Native code and images",
    );
    expect(bundlePhase.buildPhase.alwaysOutOfDate).toBe(1);
    expect(bundlePhase.args[4].shellScript).toContain("SKIP_BUNDLING=1");
    expect(bundlePhase.args[4].shellScript).toContain("index.share.js");
  });
});
