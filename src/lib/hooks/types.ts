export type HookEvent = 
  | 'UserPromptSubmit'
  | 'PreToolUse'
  | 'PostToolUse'
  | 'SessionStart'
  | 'Stop'
  | 'SubagentStop'
  | 'PreCompact'
  | 'Notification';

export interface HookMatcher {
  type: 'regex' | 'exact' | 'fuzzy' | 'tool' | 'keyword';
  pattern: string;
  confidence?: number; // For fuzzy matching
}

export interface HookConfig {
  id: string;
  name: string;
  description?: string;
  event: HookEvent;
  enabled: boolean;
  matcher?: HookMatcher;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
  continueOnError?: boolean;
  priority?: number;
}

export interface HookContext {
  event: HookEvent;
  projectRoot: string;
  prompt?: string;
  tool?: string;
  toolArgs?: any;
  sessionId?: string;
  timestamp: number;
}

export interface HookResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
  duration?: number;
  shouldBlock?: boolean;
  modifiedPrompt?: string;
}

export interface HookDefinition {
  hooks: HookConfig[];
  version: string;
  metadata?: {
    author?: string;
    created?: string;
    updated?: string;
    tags?: string[];
  };
}