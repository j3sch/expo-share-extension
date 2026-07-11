const {
  addXCConfigurationList,
} = require("../../../build/xcode/addToXCConfigurationList");

const createProject = () => {
  const addXCConfigurationListMock = jest.fn(() => ({ uuid: "config-list" }));

  return {
    addXCConfigurationListMock,
    project: {
      addXCConfigurationList: addXCConfigurationListMock,
    },
  };
};

const baseOptions = {
  targetName: "ExampleShareExtension",
  currentProjectVersion: "1",
  bundleIdentifier: "com.example.app.ShareExtension",
};

describe("addXCConfigurationList", () => {
  it("uses the configured iOS deployment target", () => {
    const { project, addXCConfigurationListMock } = createProject();

    addXCConfigurationList(project, {
      ...baseOptions,
      deploymentTarget: "16.4",
    });

    const configurations = addXCConfigurationListMock.mock.calls[0][0];
    expect(configurations).toHaveLength(2);
    expect(configurations[0].buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe(
      '"16.4"',
    );
    expect(configurations[1].buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe(
      '"16.4"',
    );
  });

  it("defaults to the Expo 56 minimum deployment target", () => {
    const { project, addXCConfigurationListMock } = createProject();

    addXCConfigurationList(project, baseOptions);

    const configurations = addXCConfigurationListMock.mock.calls[0][0];
    expect(configurations[0].buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe(
      '"16.4"',
    );
  });
});
