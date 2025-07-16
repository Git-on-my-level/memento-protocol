/**
 * Example usage of agent configuration types
 */

import { AgentConfig, AgentFormat, Config, defaultAgents } from '../index';

// Example: Creating a custom agent configuration
export const customAgent: AgentConfig = {
  id: 'copilot',
  name: 'GitHub Copilot',
  filename: '.copilot-rules',
  format: AgentFormat.MARKDOWN_CONTEXT,
  description: 'GitHub Copilot AI pair programmer',
  enabled: true
};

// Example: Creating a project configuration with agents
export const projectConfig: Config = {
  defaultMode: 'engineer',
  preferredWorkflows: ['review', 'summarize'],
  agents: ['claude', 'cursor', 'copilot'],
  ui: {
    colorOutput: true,
    verboseLogging: false
  },
  components: {
    modes: ['engineer', 'architect', 'reviewer'],
    workflows: ['review', 'summarize']
  }
};

// Example: Working with default agents
console.log('Default agents:', defaultAgents.map(agent => agent.name));

// Example: Finding an agent by ID
const findAgentById = (id: string): AgentConfig | undefined => {
  return defaultAgents.find(agent => agent.id === id);
};

const claudeAgent = findAgentById('claude');
console.log('Claude agent config:', claudeAgent);

// Example: Filtering enabled agents
const enabledAgents = defaultAgents.filter(agent => agent.enabled);
console.log('Enabled agents:', enabledAgents.length);