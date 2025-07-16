/**
 * Agent configuration types for Memento Protocol
 */

/**
 * Supported agent file formats
 */
export enum AgentFormat {
  MARKDOWN_ROUTER = 'markdown-router',
  CURSOR_RULES = 'cursor-rules',
  MARKDOWN_CONTEXT = 'markdown-context'
}

/**
 * Agent configuration interface
 */
export interface AgentConfig {
  /**
   * Unique identifier for the agent
   */
  id: string;

  /**
   * Display name of the agent
   */
  name: string;

  /**
   * Filename for the agent configuration (e.g., 'CLAUDE.md', '.cursorrules')
   */
  filename: string;

  /**
   * Format of the agent configuration file
   */
  format: AgentFormat;

  /**
   * Description of the agent and its capabilities
   */
  description: string;

  /**
   * Whether this agent configuration is enabled
   */
  enabled: boolean;
}

/**
 * Type representing supported agents with their configurations
 */
export type SupportedAgent = AgentConfig;