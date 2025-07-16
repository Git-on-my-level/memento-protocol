/**
 * Configuration types for Memento Protocol
 */

import { AgentConfig, AgentFormat } from './agents';

/**
 * Main configuration interface for Memento Protocol
 */
export interface Config {
  /**
   * Project-level settings
   */
  defaultMode?: string;
  preferredWorkflows?: string[];
  customTemplateSources?: string[];

  /**
   * Integration settings
   */
  integrations?: {
    [key: string]: any;
  };

  /**
   * UI preferences
   */
  ui?: {
    colorOutput?: boolean;
    verboseLogging?: boolean;
  };

  /**
   * Component settings
   */
  components?: {
    modes?: string[];
    workflows?: string[];
  };

  /**
   * Agent configurations - array of agent IDs
   */
  agents?: string[];
}

/**
 * Default agent configurations
 */
export const defaultAgents: AgentConfig[] = [
  {
    id: 'claude',
    name: 'Claude',
    filename: 'CLAUDE.md',
    format: AgentFormat.MARKDOWN_ROUTER,
    description: 'Claude AI assistant with markdown-based router configuration',
    enabled: true
  },
  {
    id: 'cursor',
    name: 'Cursor',
    filename: '.cursorrules',
    format: AgentFormat.CURSOR_RULES,
    description: 'Cursor IDE with rules-based configuration',
    enabled: true
  },
  {
    id: 'gemini',
    name: 'Gemini',
    filename: 'GEMINI.md',
    format: AgentFormat.MARKDOWN_CONTEXT,
    description: 'Google Gemini AI with markdown context configuration',
    enabled: true
  }
];