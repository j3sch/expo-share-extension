export type BackgroundColor = {
  red: number;
  green: number;
  blue: number;
  alpha: number;
};

export type Height = number;

export type ActivationRule = {
  type: "image" | "video" | "text" | "url" | "file";
  max?: number;
};

export type ShareExtensionPluginOptions = {
  activationRules?: ActivationRule[];
  appGroupIdentifier?: string;
  backgroundColor?: BackgroundColor;
  deploymentTarget?: string;
  excludedPackages?: string[];
  googleServicesFile?: string;
  height?: Height;
  keychainAccessGroup?: string;
  preprocessingFile?: string;
};
