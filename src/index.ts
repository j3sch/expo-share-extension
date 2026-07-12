import ExpoShareExtensionModule from "./ExpoShareExtensionModule";

export function close(): void {
  return ExpoShareExtensionModule.close();
}

export function openHostApp(path: string): void {
  return ExpoShareExtensionModule.openHostApp(path);
}

export async function clearAppGroupContainer(args: {
  cleanUpBefore: Date;
}): Promise<void> {
  return await ExpoShareExtensionModule.clearAppGroupContainer(
    args.cleanUpBefore.toISOString(),
  );
}

/** Removes only file URLs created by this package in the App Group shared-data directory. */
export async function deleteSharedFiles(fileURLs: string[]): Promise<void> {
  if (fileURLs.length === 0) {
    return;
  }
  return await ExpoShareExtensionModule.deleteSharedFiles(fileURLs);
}

export interface IExtensionPreprocessingJS {
  run: (args: { completionFunction: (data: unknown) => void }) => void;
  finalize: (args: unknown) => void;
}

export type InitialProps = {
  files?: string[];
  images?: string[];
  videos?: string[];
  text?: string;
  url?: string;
  preprocessingResults?: unknown;
};

export { Text } from "./ui/text";
export { TextInput } from "./ui/text-input";
export { View } from "./ui/view";
