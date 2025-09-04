/**
 * Clean TypeScript interfaces for Memento Protocol starter packs
 * Refactored from the original starterPacks.ts for better maintainability
 */

// Core pack component interfaces
export interface PackComponent {
  readonly name: string;
  readonly required?: boolean;
  readonly description?: string;
  readonly customConfig?: Record<string, unknown>;
}

export interface PackComponents {
  readonly modes?: readonly PackComponent[];
  readonly workflows?: readonly PackComponent[];
  readonly agents?: readonly PackComponent[];
  readonly hooks?: readonly PackComponent[];
}

export interface PackConfiguration {
  readonly defaultMode?: string;
  readonly customCommands?: Record<string, {
    readonly description: string;
    readonly template: string;
  }>;
  readonly projectSettings?: Record<string, unknown>;
}

export interface PackHook {
  readonly name: string;
  readonly enabled: boolean;
  readonly config?: Record<string, unknown>;
}

export interface PostInstallAction {
  readonly message?: string;
  readonly commands?: readonly string[];
}

// Enum-like types for better type safety
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

// Main pack manifest interface
export interface PackManifest {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly tags?: readonly string[];
  readonly category?: PackCategory;
  readonly mementoProtocolVersion?: string;
  readonly components: PackComponents;
  readonly configuration?: PackConfiguration;
  readonly hooks?: readonly PackHook[];
  readonly dependencies?: readonly string[];
  readonly compatibleWith?: readonly ProjectType[];
  readonly postInstall?: PostInstallAction;
}

// Pack structure for self-contained packs
export interface PackStructure {
  readonly manifest: PackManifest;
  readonly path: string;
  readonly componentsPath: string;
}

// Installation and validation interfaces
export interface PackInstallOptions {
  readonly force?: boolean;
  readonly skipOptional?: boolean;
  readonly dryRun?: boolean;
  readonly interactive?: boolean;
}

export interface PackValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export interface PackDependencyResult {
  readonly resolved: readonly string[];
  readonly missing: readonly string[];
  readonly circular: readonly string[];
}

export interface PackInstallationResult {
  readonly success: boolean;
  readonly installed: {
    readonly modes: readonly string[];
    readonly workflows: readonly string[];
    readonly agents: readonly string[];
    readonly hooks: readonly string[];
  };
  readonly skipped: {
    readonly modes: readonly string[];
    readonly workflows: readonly string[];
    readonly agents: readonly string[];
    readonly hooks: readonly string[];
  };
  readonly errors: readonly string[];
  readonly postInstallMessage?: string;
}

export interface PackConflictResolution {
  readonly overwrite: boolean;
  readonly backup: boolean;
  readonly skip: boolean;
}

// Registry and source interfaces (simplified for 1.0)
export interface PackSource {
  readonly name: string;
  readonly type: 'local';
}

export interface LocalPackSource extends PackSource {
  readonly type: 'local';
  readonly path: string;
}


// Error types for better error handling
export interface PackError {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
}

export interface PackValidationError extends PackError {
  readonly code: 'VALIDATION_ERROR';
  readonly field: string;
}

export interface PackInstallationError extends PackError {
  readonly code: 'INSTALLATION_ERROR';
  readonly component?: string;
}

export interface PackDependencyError extends PackError {
  readonly code: 'DEPENDENCY_ERROR';
  readonly dependency: string;
}

// Project manifest tracking installed packs
export interface ProjectPackManifest {
  readonly packs: Record<string, {
    readonly version: string;
    readonly installedAt: string;
    readonly source: PackSource;
  }>;
}