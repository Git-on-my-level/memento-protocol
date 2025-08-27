import * as path from 'path';
import * as os from 'os';
import { MementoScope, MementoScopeConfig, ComponentInfo } from './MementoScope';
import { ScriptExecutor, ScriptResult, ScriptExecutorOptions } from './ScriptExecutor';
import { BuiltinComponentProvider } from './BuiltinComponentProvider';
import { FuzzyMatcher, FuzzyMatch, FuzzyMatchOptions } from './fuzzyMatcher';
import { ErrorHandler } from './ErrorHandler';
import { logger } from './logger';

/**
 * Central manager for all Memento configuration and components
 * Manages both global (~/.memento) and project (.memento) scopes
 * Implements clean precedence: project → global → built-in
 */
export interface ComponentResolutionResult {
  component: ComponentInfo;
  source: 'builtin' | 'global' | 'project';
}

export interface ComponentSearchResult extends FuzzyMatch {
  conflictsWith?: ComponentResolutionResult[];
  suggestions?: string[];
}

/**
 * Central manager for all Memento configuration and components
 * Manages built-in templates, global (~/.memento), and project (.memento) scopes
 * Implements clean precedence: project → global → built-in
 */
export class MementoCore {
  private globalScope: MementoScope;
  private projectScope: MementoScope;
  private builtinProvider: BuiltinComponentProvider;
  private scriptExecutor: ScriptExecutor;
  private mergedConfigCache: MementoScopeConfig | null = null;
  private allComponentsCache: Array<{ component: ComponentInfo; source: 'builtin' | 'global' | 'project' }> | null = null;
  private errorHandler: ErrorHandler;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    const globalPath = path.join(os.homedir(), '.memento');
    const projectPath = path.join(projectRoot, '.memento');
    
    this.globalScope = new MementoScope(globalPath, true);
    this.projectScope = new MementoScope(projectPath, false);
    this.builtinProvider = new BuiltinComponentProvider();
    this.scriptExecutor = new ScriptExecutor(projectRoot);
    this.errorHandler = new ErrorHandler(this);
  }

  /**
   * Get merged configuration with precedence: project → global → defaults
   */
  async getConfig(): Promise<MementoScopeConfig> {
    if (this.mergedConfigCache !== null) {
      return this.mergedConfigCache;
    }

    // Start with default configuration
    const defaults: MementoScopeConfig = {
      ui: {
        colorOutput: true,
        verboseLogging: false
      }
    };

    // Load global config
    const globalConfig = await this.globalScope.getConfig();
    let merged = this.mergeConfigs(defaults, globalConfig);

    // Load project config (takes precedence)
    const projectConfig = await this.projectScope.getConfig();
    merged = this.mergeConfigs(merged, projectConfig);

    // Apply environment variable overrides
    merged = this.applyEnvironmentOverrides(merged);

    this.mergedConfigCache = merged;
    return merged;
  }

  /**
   * Get a specific component by name and type
   * Searches project scope first, then global scope, then built-in
   */
  async getComponent(name: string, type: ComponentInfo['type']): Promise<ComponentInfo | null> {
    const result = await this.resolveComponent(name, type);
    return result?.component || null;
  }

  /**
   * Resolve a component with source information
   * Returns the first match with precedence: project → global → built-in
   */
  async resolveComponent(name: string, type: ComponentInfo['type']): Promise<ComponentResolutionResult | null> {
    // Check project scope first
    const projectComponent = await this.projectScope.getComponent(name, type);
    if (projectComponent) {
      return { component: projectComponent, source: 'project' };
    }

    // Fall back to global scope
    const globalComponent = await this.globalScope.getComponent(name, type);
    if (globalComponent) {
      return { component: globalComponent, source: 'global' };
    }

    // Fall back to built-in components
    const builtinComponent = await this.builtinProvider.getComponent(name, type);
    if (builtinComponent) {
      return { component: builtinComponent, source: 'builtin' };
    }

    return null;
  }

  /**
   * List all components of a specific type
   * Combines all scopes with project components taking precedence
   */
  async getComponentsByType(type: ComponentInfo['type']): Promise<ComponentInfo[]> {
    const allComponents = await this.getAllComponentsWithSource();
    const typeComponents = allComponents.filter(({ component }) => component.type === type);
    
    // Create a map to handle precedence (project > global > builtin)
    const componentMap = new Map<string, ComponentInfo>();

    // Add built-in components first (lowest precedence)
    for (const { component, source } of typeComponents) {
      if (source === 'builtin') {
        componentMap.set(component.name, component);
      }
    }

    // Add global components (overrides built-in with same name)
    for (const { component, source } of typeComponents) {
      if (source === 'global') {
        componentMap.set(component.name, component);
      }
    }

    // Add project components (overrides global/builtin with same name)
    for (const { component, source } of typeComponents) {
      if (source === 'project') {
        componentMap.set(component.name, component);
      }
    }

    return Array.from(componentMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * List all components of a specific type with source information
   * Shows which scope each component comes from
   */
  async getComponentsByTypeWithSource(type: ComponentInfo['type']): Promise<ComponentResolutionResult[]> {
    const allComponents = await this.getAllComponentsWithSource();
    return allComponents
      .filter(({ component }) => component.type === type)
      .sort((a, b) => {
        // Sort by name, then by source precedence
        if (a.component.name !== b.component.name) {
          return a.component.name.localeCompare(b.component.name);
        }
        const sourceOrder = { project: 3, global: 2, builtin: 1 };
        return sourceOrder[b.source] - sourceOrder[a.source];
      });
  }

  /**
   * List all components across all types
   * Returns components organized by type
   */
  async listComponents(): Promise<{
    modes: ComponentInfo[];
    workflows: ComponentInfo[];
    scripts: ComponentInfo[];
    hooks: ComponentInfo[];
    agents: ComponentInfo[];
    commands: ComponentInfo[];
    templates: ComponentInfo[];
  }> {
    const result = {
      modes: await this.getComponentsByType('mode'),
      workflows: await this.getComponentsByType('workflow'),
      scripts: await this.getComponentsByType('script'),
      hooks: await this.getComponentsByType('hook'),
      agents: await this.getComponentsByType('agent'),
      commands: await this.getComponentsByType('command'),
      templates: await this.getComponentsByType('template'),
    };

    return result;
  }

  /**
   * List all components across all types with source information
   */
  async listComponentsWithSource(): Promise<{
    modes: ComponentResolutionResult[];
    workflows: ComponentResolutionResult[];
    scripts: ComponentResolutionResult[];
    hooks: ComponentResolutionResult[];
    agents: ComponentResolutionResult[];
    commands: ComponentResolutionResult[];
    templates: ComponentResolutionResult[];
  }> {
    const result = {
      modes: await this.getComponentsByTypeWithSource('mode'),
      workflows: await this.getComponentsByTypeWithSource('workflow'),
      scripts: await this.getComponentsByTypeWithSource('script'),
      hooks: await this.getComponentsByTypeWithSource('hook'),
      agents: await this.getComponentsByTypeWithSource('agent'),
      commands: await this.getComponentsByTypeWithSource('command'),
      templates: await this.getComponentsByTypeWithSource('template'),
    };

    return result;
  }

  /**
   * Get all components as a flat list
   */
  async getAllComponents(): Promise<ComponentInfo[]> {
    const componentsByType = await this.listComponents();
    const allComponents: ComponentInfo[] = [];

    for (const components of Object.values(componentsByType)) {
      allComponents.push(...components);
    }

    return allComponents.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get all components with source information (internal helper)
   */
  private async getAllComponentsWithSource(): Promise<Array<{ component: ComponentInfo; source: 'builtin' | 'global' | 'project' }>> {
    if (this.allComponentsCache !== null) {
      return this.allComponentsCache;
    }

    const allComponents: Array<{ component: ComponentInfo; source: 'builtin' | 'global' | 'project' }> = [];

    try {
      // Get built-in components
      const builtinComponents = await this.builtinProvider.getComponents();
      for (const component of builtinComponents) {
        allComponents.push({ component, source: 'builtin' });
      }
    } catch (error: any) {
      logger.debug(`Failed to load built-in components: ${error.message}`);
    }

    try {
      // Get global components
      const globalComponents = await this.globalScope.getComponents();
      for (const component of globalComponents) {
        allComponents.push({ component, source: 'global' });
      }
    } catch (error: any) {
      logger.debug(`Failed to load global components: ${error.message}`);
    }

    try {
      // Get project components
      const projectComponents = await this.projectScope.getComponents();
      for (const component of projectComponents) {
        allComponents.push({ component, source: 'project' });
      }
    } catch (error: any) {
      logger.debug(`Failed to load project components: ${error.message}`);
    }

    this.allComponentsCache = allComponents;
    return allComponents;
  }

  /**
   * Save configuration to project or global scope
   */
  async saveConfig(config: MementoScopeConfig, global: boolean = false): Promise<void> {
    const scope = global ? this.globalScope : this.projectScope;
    await scope.saveConfig(config);
    
    // Clear merged config cache
    this.clearCache();
  }

  /**
   * Get a specific configuration value using dot notation
   */
  async getConfigValue(key: string): Promise<any> {
    const config = await this.getConfig();
    return this.getNestedValue(config, key);
  }

  /**
   * Set a specific configuration value using dot notation
   */
  async setConfigValue(key: string, value: any, global: boolean = false): Promise<void> {
    const scope = global ? this.globalScope : this.projectScope;
    const currentConfig = await scope.getConfig() || {};
    
    this.setNestedValue(currentConfig, key, value);
    await scope.saveConfig(currentConfig);
    
    // Clear merged config cache
    this.clearCache();
  }

  /**
   * Remove a configuration key
   */
  async unsetConfigValue(key: string, global: boolean = false): Promise<void> {
    const scope = global ? this.globalScope : this.projectScope;
    const currentConfig = await scope.getConfig();
    
    if (!currentConfig) {
      return; // Nothing to unset
    }
    
    this.unsetNestedValue(currentConfig, key);
    await scope.saveConfig(currentConfig);
    
    // Clear merged config cache
    this.clearCache();
  }

  /**
   * Initialize both scopes
   */
  async initialize(): Promise<void> {
    // Initialize global scope first
    await this.globalScope.initialize();
    
    // Initialize project scope
    await this.projectScope.initialize();
    
    logger.success('Initialized Memento Protocol (global and project scopes)');
  }

  /**
   * Check if project scope exists
   */
  hasProjectScope(): boolean {
    return this.projectScope.exists();
  }

  /**
   * Check if global scope exists
   */
  hasGlobalScope(): boolean {
    return this.globalScope.exists();
  }

  /**
   * Get scope instances for direct access (internal use)
   */
  getScopes(): { global: MementoScope; project: MementoScope } {
    return {
      global: this.globalScope,
      project: this.projectScope
    };
  }

  /**
   * Get scope paths
   */
  getScopePaths(): { global: string; project: string } {
    return {
      global: this.globalScope.getPath(),
      project: this.projectScope.getPath()
    };
  }

  /**
   * Get project root directory
   */
  getProjectRoot(): string {
    return this.projectRoot;
  }

  /**
   * Execute a script by name, searching project scope first, then global scope
   */
  async executeScript(name: string, args?: string[], options?: ScriptExecutorOptions): Promise<ScriptResult> {
    return await this.scriptExecutor.executeByName(name, args, options);
  }

  /**
   * List all available scripts from both scopes
   */
  async listScripts(): Promise<{ 
    project: any[]; 
    global: any[]; 
    all: any[];
  }> {
    return await this.scriptExecutor.listScripts();
  }

  /**
   * Find a script by name, returning the script and its context
   */
  async findScript(name: string): Promise<{ script: any; context: any } | null> {
    return await this.scriptExecutor.findScript(name);
  }

  /**
   * Get the script executor instance for advanced operations
   */
  getScriptExecutor(): ScriptExecutor {
    return this.scriptExecutor;
  }

  /**
   * Get the built-in component provider instance for advanced operations
   */
  getBuiltinProvider(): BuiltinComponentProvider {
    return this.builtinProvider;
  }

  /**
   * Get the error handler instance for advanced error handling
   */
  getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }

  /**
   * Find components using fuzzy matching
   * Supports exact matches, substring matches, and acronym matching
   */
  async findComponents(
    query: string,
    type?: ComponentInfo['type'],
    options: FuzzyMatchOptions = {}
  ): Promise<ComponentSearchResult[]> {
    const allComponents = await this.getAllComponentsWithSource();
    
    // Filter by type if specified
    const filteredComponents = type 
      ? allComponents.filter(({ component }) => component.type === type)
      : allComponents;

    const matches = FuzzyMatcher.findMatches(query, filteredComponents, {
      maxResults: 10,
      minScore: 20,
      ...options
    });

    // Enhance matches with conflict information
    const enhancedMatches: ComponentSearchResult[] = [];
    
    for (const match of matches) {
      // Find all versions of this component across scopes
      const conflicts = filteredComponents.filter(
        ({ component }) => component.name === match.name && component.type === match.component.type
      );

      const searchResult: ComponentSearchResult = {
        ...match,
        conflictsWith: conflicts.length > 1 ? conflicts : undefined
      };

      enhancedMatches.push(searchResult);
    }

    return enhancedMatches;
  }

  /**
   * Find the best component match using fuzzy search
   */
  async findBestComponent(
    query: string,
    type?: ComponentInfo['type'],
    options: FuzzyMatchOptions = {}
  ): Promise<ComponentSearchResult | null> {
    const matches = await this.findComponents(query, type, { ...options, maxResults: 1 });
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Generate suggestions for when a component is not found
   */
  async generateSuggestions(
    query: string,
    type?: ComponentInfo['type'],
    maxSuggestions: number = 3
  ): Promise<string[]> {
    const allComponents = await this.getAllComponentsWithSource();
    
    const filteredComponents = type 
      ? allComponents.filter(({ component }) => component.type === type)
      : allComponents;

    return FuzzyMatcher.generateSuggestions(query, filteredComponents, maxSuggestions);
  }

  /**
   * Check if a component exists in any scope
   */
  async hasComponent(name: string, type: ComponentInfo['type']): Promise<boolean> {
    const result = await this.resolveComponent(name, type);
    return result !== null;
  }

  /**
   * Get all conflicts for a component name (same name in multiple scopes)
   */
  async getComponentConflicts(name: string, type: ComponentInfo['type']): Promise<ComponentResolutionResult[]> {
    const allComponents = await this.getAllComponentsWithSource();
    
    return allComponents.filter(
      ({ component }) => component.name === name && component.type === type
    );
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.mergedConfigCache = null;
    this.allComponentsCache = null;
    this.globalScope.clearCache();
    this.projectScope.clearCache();
    this.builtinProvider.clearCache();
  }

  /**
   * Get status of all scopes (built-in, global, project)
   */
  async getStatus(): Promise<{
    builtin: {
      available: boolean;
      path: string;
      components: number;
    };
    global: {
      exists: boolean;
      path: string;
      components: number;
      hasConfig: boolean;
    };
    project: {
      exists: boolean;
      path: string;
      components: number;
      hasConfig: boolean;
    };
    totalComponents: number;
    uniqueComponents: number;
  }> {
    const builtinComponents = await this.builtinProvider.getComponents();
    const globalComponents = await this.globalScope.getComponents();
    const projectComponents = await this.projectScope.getComponents();
    const globalConfig = await this.globalScope.getConfig();
    const projectConfig = await this.projectScope.getConfig();

    // Get all components and unique components
    const allComponentsWithSource = await this.getAllComponentsWithSource();
    const allComponents = await this.getAllComponents();

    return {
      builtin: {
        available: this.builtinProvider.isAvailable(),
        path: this.builtinProvider.getTemplatesPath(),
        components: builtinComponents.length
      },
      global: {
        exists: this.globalScope.exists(),
        path: this.globalScope.getPath(),
        components: globalComponents.length,
        hasConfig: globalConfig !== null
      },
      project: {
        exists: this.projectScope.exists(),
        path: this.projectScope.getPath(),
        components: projectComponents.length,
        hasConfig: projectConfig !== null
      },
      totalComponents: allComponentsWithSource.length,
      uniqueComponents: allComponents.length
    };
  }

  /**
   * Merge two configurations, with right taking precedence over left
   */
  private mergeConfigs(left: MementoScopeConfig, right: MementoScopeConfig | null): MementoScopeConfig {
    if (!right) return left;

    return {
      ...left,
      ...right,
      ui: {
        ...left.ui,
        ...right.ui
      },
      integrations: {
        ...left.integrations,
        ...right.integrations
      },
      components: {
        ...left.components,
        ...right.components
      }
    };
  }

  /**
   * Apply environment variable overrides
   */
  private applyEnvironmentOverrides(config: MementoScopeConfig): MementoScopeConfig {
    const result = { ...config };

    // MEMENTO_DEFAULT_MODE
    if (process.env.MEMENTO_DEFAULT_MODE) {
      result.defaultMode = process.env.MEMENTO_DEFAULT_MODE;
    }

    // MEMENTO_COLOR_OUTPUT
    if (process.env.MEMENTO_COLOR_OUTPUT !== undefined) {
      result.ui = result.ui || {};
      result.ui.colorOutput = process.env.MEMENTO_COLOR_OUTPUT === 'true';
    }

    // MEMENTO_VERBOSE
    if (process.env.MEMENTO_VERBOSE !== undefined) {
      result.ui = result.ui || {};
      result.ui.verboseLogging = process.env.MEMENTO_VERBOSE === 'true';
    }

    return result;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, key: string): any {
    return key.split('.').reduce((current, part) => current?.[part], obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, key: string, value: any): void {
    const parts = key.split('.');
    const last = parts.pop()!;
    
    let current = obj;
    for (const part of parts) {
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[last] = value;
  }

  /**
   * Unset nested value in object using dot notation
   */
  private unsetNestedValue(obj: any, key: string): void {
    const parts = key.split('.');
    const last = parts.pop()!;
    
    let current = obj;
    for (const part of parts) {
      if (!(part in current)) return;
      current = current[part];
    }
    
    delete current[last];
  }
}