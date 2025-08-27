/**
 * TypeScript interfaces for Memento Protocol starter packs
 * These correspond to the JSON schema in templates/starter-packs/schema.json
 */

export interface PackComponent {
  name: string;
  required?: boolean;
  customConfig?: Record<string, any>;
}

export interface PackComponents {
  modes?: PackComponent[];
  workflows?: PackComponent[];
  agents?: PackComponent[];
}

export interface PackConfiguration {
  defaultMode?: string;
  customCommands?: Record<string, {
    description: string;
    template: string;
  }>;
  projectSettings?: Record<string, any>;
}

export interface PackHook {
  name: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface PostInstallAction {
  message?: string;
  commands?: string[];
}

export type PackCategory = 
  | 'frontend'
  | 'backend' 
  | 'fullstack'
  | 'devops'
  | 'mobile'
  | 'ai-ml'
  | 'data'
  | 'general';

export type ProjectType =
  | 'javascript'
  | 'typescript'
  | 'react'
  | 'vue'
  | 'angular'
  | 'node'
  | 'python'
  | 'java'
  | 'go'
  | 'rust'
  | 'php'
  | 'ruby'
  | 'generic';

export interface StarterPack {
  name: string;
  version: string;
  description: string;
  author: string;
  tags?: string[];
  category?: PackCategory;
  mementoProtocolVersion?: string;
  components: PackComponents;
  configuration?: PackConfiguration;
  hooks?: PackHook[];
  dependencies?: string[];
  compatibleWith?: ProjectType[];
  postInstall?: PostInstallAction;
}

export interface PackInstallOptions {
  force?: boolean;
  skipOptional?: boolean;
  dryRun?: boolean;
  interactive?: boolean;
}

export interface PackValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PackDependencyResult {
  resolved: string[];
  missing: string[];
  circular: string[];
}

export interface PackInstallResult {
  success: boolean;
  installed: {
    modes: string[];
    workflows: string[];
    agents: string[];
  };
  skipped: {
    modes: string[];
    workflows: string[];
    agents: string[];
  };
  errors: string[];
  postInstallMessage?: string;
}