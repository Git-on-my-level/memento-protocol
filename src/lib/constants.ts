/**
 * Centralized constants for consistent messaging across zcc
 */

export const MESSAGES = {
  USAGE_INSTRUCTIONS: {
    MODE_ACTIVATION: '  - Say "act as [mode-name]" to activate a mode (fuzzy matching supported)',
    WORKFLOW_EXECUTION: '  - Say "execute [workflow-name]" to run a workflow',
    CUSTOM_COMMANDS: '  - Use custom commands: /ticket, /mode, /zcc:status'
  },
  
  HELP_INSTRUCTIONS: {
    COMMAND_HELP: 'Run "zcc --help" to see all available commands.',
    HOOK_LIST: 'Run "zcc hook list" to see installed hooks.',
    GLOBAL_CONFIG: 'Global configuration is now active for all your projects.'
  },
  
  SUCCESS_MESSAGES: {
    ZCC_INITIALIZED: 'zcc initialized successfully!',
    GLOBAL_ZCC_INITIALIZED: 'Global zcc initialized successfully!',
    PACK_INSTALLED: (packName: string) => `Starter pack '${packName}' installed successfully`,
    GLOBAL_PACK_INSTALLED: (packName: string) => `Starter pack '${packName}' installed successfully to global scope`
  },
  
  INFO_HEADERS: {
    CLAUDE_CODE_USAGE: 'To use with Claude Code:',
    STARTER_PACK_INFO: 'Starter Pack Information:'
  }
} as const;