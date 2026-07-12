import { XcodeProject } from "expo/config-plugins";

export function addBuildPhases(
  xcodeProject: XcodeProject,
  {
    targetUuid,
    groupName,
    productFile,
    resources,
  }: {
    targetUuid: string;
    groupName: string;
    productFile: {
      uuid: string;
      target: string;
      basename: string;
      group: string;
    };
    resources: string[];
  },
) {
  const buildPath = `"$(CONTENTS_FOLDER_PATH)/ShareExtensions"`;
  const targetType = "app_extension";

  // Sources build phase
  xcodeProject.addBuildPhase(
    [
      "ShareExtensionViewController.swift",
      "SharedFileStore.swift",
      "ShareDataImporter.swift",
    ],
    "PBXSourcesBuildPhase",
    groupName,
    targetUuid,
    targetType,
    buildPath,
  );

  // Copy files build phase
  xcodeProject.addBuildPhase(
    [],
    "PBXCopyFilesBuildPhase",
    groupName,
    xcodeProject.getFirstTarget().uuid,
    targetType,
  );

  xcodeProject.addBuildPhase(
    [],
    "PBXCopyFilesBuildPhase",
    "Copy Files",
    xcodeProject.getFirstTarget().uuid,
    targetType,
  );
  xcodeProject.addToPbxCopyfilesBuildPhase(productFile);

  // Frameworks build phase
  xcodeProject.addBuildPhase(
    [],
    "PBXFrameworksBuildPhase",
    groupName,
    targetUuid,
    targetType,
    buildPath,
  );

  // Resources build phase
  xcodeProject.addBuildPhase(
    resources,
    "PBXResourcesBuildPhase",
    groupName,
    targetUuid,
    targetType,
    buildPath,
  );

  const bundleBuildPhase = xcodeProject.addBuildPhase(
    [],
    "PBXShellScriptBuildPhase",
    "Bundle React Native code and images",
    targetUuid,
    {
      shellPath: "/bin/sh",
      shellScript: `set -e
  if [[ "$CONFIGURATION" = *Debug* ]]; then
    export SKIP_BUNDLING=1
  fi

  NODE_BINARY=\${NODE_BINARY:-node}
  
  # Source environment files
  if [[ -f "$PODS_ROOT/../.xcode.env" ]]; then
    source "$PODS_ROOT/../.xcode.env"
  fi
  if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
    source "$PODS_ROOT/../.xcode.env.local"
  fi
  
  # Set project root
  export PROJECT_ROOT="$PROJECT_DIR"/..
  
  # Set entry file
  export ENTRY_FILE="$PROJECT_ROOT/index.share.js"
  
  # Set up Expo CLI
  if [[ -z "$CLI_PATH" ]]; then
    export CLI_PATH="$("$NODE_BINARY" --print "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })")"
  fi
  
  if [[ -z "$BUNDLE_COMMAND" ]]; then
    export BUNDLE_COMMAND="export:embed"
  fi
  
  REACT_NATIVE_SCRIPTS_PATH=$("$NODE_BINARY" --print "require('path').dirname(require.resolve('react-native/package.json')) + '/scripts'")
  WITH_ENVIRONMENT="$REACT_NATIVE_SCRIPTS_PATH/xcode/with-environment.sh"
  REACT_NATIVE_XCODE="$REACT_NATIVE_SCRIPTS_PATH/react-native-xcode.sh"
  
  /bin/sh -c "$WITH_ENVIRONMENT $REACT_NATIVE_XCODE"`,
    },
    buildPath,
  );
  bundleBuildPhase.buildPhase.alwaysOutOfDate = 1;
}
