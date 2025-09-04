/**
 * Centralized error messages for the update command and UpdateManager
 */
export const UPDATE_ERROR_MESSAGES = {
  NOT_INITIALIZED: () =>
    "zcc is not initialized in this project.\n" +
    "Run 'zcc init' to initialize zcc first.",

  INVALID_COMPONENT_FORMAT: (component: string) =>
    `Invalid component format: '${component}'.\n` +
    'Expected format: "mode:name" or "workflow:name"\n' +
    'Examples: mode:architect, workflow:review',

  INVALID_COMPONENT_TYPE: (type: string) =>
    `Invalid component type: '${type}'.\n` +
    'Valid types are: mode, workflow\n' +
    'Example: zcc update mode:architect',

  INVALID_COMPONENT_TYPE_DIFF: (type: string) =>
    `Invalid component type: '${type}'.\n` +
    'Valid types are: mode, workflow\n' +
    'Example: zcc update diff mode:architect',

  EMPTY_COMPONENT_NAME: () =>
    `Component name cannot be empty.\n` +
    'Please provide a valid component name.\n' +
    'Example: zcc update mode:architect',

  EMPTY_COMPONENT_NAME_DIFF: () =>
    `Component name cannot be empty.\n` +
    'Please provide a valid component name.\n' +
    'Example: zcc update diff mode:architect',

  COMPONENT_NOT_INSTALLED: (type: string, name: string) =>
    `${type} '${name}' is not installed.\n` +
    `Run 'zcc add ${type} ${name}' to install it first.`,

  HAS_LOCAL_MODIFICATIONS: (type: string, name: string) =>
    `${type} '${name}' has local modifications.\n` +
    `Use --force to overwrite your changes, or\n` +
    `Run 'zcc update diff ${type}:${name}' to see the differences.`,

  TEMPLATE_NOT_FOUND: (type: string, name: string) =>
    `Template for ${type} '${name}' not found.\n` +
    `The component may have been removed from zcc templates.\n` +
    `Run 'zcc list' to see available components.`,

  NO_TEMPLATE_FOR_DIFF: (type: string, name: string) =>
    `No template found for ${type} '${name}'.\n` +
    `The component may have been removed from zcc templates.\n` +
    `Run 'zcc list' to see available components.`,
};