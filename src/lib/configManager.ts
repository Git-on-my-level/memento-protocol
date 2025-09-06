import { ConfigSchemaRegistry, ZccConfig } from './configSchema';
import { ValidationError } from './errors';
import { ZccCore } from './ZccCore';
import { FileSystemAdapter } from './adapters/FileSystemAdapter';
import { NodeFileSystemAdapter } from './adapters/NodeFileSystemAdapter';

/**
 * Simplified configuration manager with YAML-only support
 * No JSON support, no migrations, clean and simple
 */
export class ConfigManager {
  private zccCore: ZccCore;
  private schemaRegistry: ConfigSchemaRegistry;
  private fs: FileSystemAdapter;

  constructor(projectRoot: string, fsAdapter?: FileSystemAdapter) {
    this.fs = fsAdapter || new NodeFileSystemAdapter();
    this.zccCore = new ZccCore(projectRoot, this.fs);
    this.schemaRegistry = ConfigSchemaRegistry.getInstance();
  }

  /**
   * Load configuration with hierarchy: defaults -> global -> project -> env
   */
  async load(): Promise<ZccConfig> {
    return await this.zccCore.getConfig();
  }

  /**
   * Save configuration to project or global level
   */
  async save(config: ZccConfig, global: boolean = false): Promise<void> {
    // Validate config before saving
    this.validateConfig(config);
    
    // Save using ZccCore (as YAML)
    await this.zccCore.saveConfig(config, global);
  }

  /**
   * Get a specific configuration value
   */
  async get(key: string): Promise<any> {
    return await this.zccCore.getConfigValue(key);
  }

  /**
   * Set a specific configuration value
   */
  async set(key: string, value: any, global: boolean = false): Promise<void> {
    await this.zccCore.setConfigValue(key, value, global);
  }

  /**
   * Remove a configuration key
   */
  async unset(key: string, global: boolean = false): Promise<void> {
    await this.zccCore.unsetConfigValue(key, global);
  }

  /**
   * List all configuration values
   */
  async list(global: boolean = false): Promise<ZccConfig> {
    if (global) {
      const scopes = this.zccCore.getScopes();
      const globalConfig = await scopes.global.getConfig();
      return (globalConfig || {}) as ZccConfig;
    }
    return await this.load();
  }

  /**
   * Validate a configuration file
   */
  async validateConfigFile(global: boolean = false): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const paths = this.getConfigPaths();
    const configPath = global ? paths.global : paths.project;
    
    if (!this.fs.existsSync(configPath)) {
      return {
        valid: false,
        errors: [`Configuration file not found: ${configPath}`],
        warnings: []
      };
    }

    try {
      const scope = global ? this.zccCore.getScopes().global : this.zccCore.getScopes().project;
      const config = await scope.getConfig();
      
      if (!config) {
        return {
          valid: false,
          errors: ['Failed to load configuration'],
          warnings: []
        };
      }

      const result = this.schemaRegistry.getZccConfigValidator().validate(config);
      return result;
    } catch (error: any) {
      return {
        valid: false,
        errors: [`Failed to parse or validate configuration: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Attempt to fix configuration issues
   */
  async fixConfigFile(global: boolean = false): Promise<boolean> {
    try {
      const scope = global ? this.zccCore.getScopes().global : this.zccCore.getScopes().project;
      const config = await scope.getConfig();
      
      if (!config) {
        // Create default configuration if missing
        const defaultConfig: ZccConfig = {
          defaultMode: 'engineer',
          preferredWorkflows: [],
          ui: {
            colorOutput: true,
            verboseLogging: false
          }
        };
        await this.save(defaultConfig, global);
        return true;
      }
      
      // Fix common issues
      const fixedConfig = { ...config };
      let hasChanges = false;
      
      // Ensure required fields have valid defaults
      if (typeof fixedConfig.defaultMode !== 'string') {
        fixedConfig.defaultMode = 'engineer';
        hasChanges = true;
      }
      
      if (!Array.isArray(fixedConfig.preferredWorkflows)) {
        fixedConfig.preferredWorkflows = [];
        hasChanges = true;
      }
      
      if (!fixedConfig.ui || typeof fixedConfig.ui !== 'object') {
        fixedConfig.ui = {
          colorOutput: true,
          verboseLogging: false
        };
        hasChanges = true;
      } else {
        if (typeof fixedConfig.ui.colorOutput !== 'boolean') {
          fixedConfig.ui.colorOutput = true;
          hasChanges = true;
        }
        if (typeof fixedConfig.ui.verboseLogging !== 'boolean') {
          fixedConfig.ui.verboseLogging = false;
          hasChanges = true;
        }
      }
      
      // Clean up invalid entries
      if (fixedConfig.customTemplateSources && !Array.isArray(fixedConfig.customTemplateSources)) {
        delete fixedConfig.customTemplateSources;
        hasChanges = true;
      }
      
      if (fixedConfig.components && typeof fixedConfig.components !== 'object') {
        delete fixedConfig.components;
        hasChanges = true;
      }
      
      // Save if changes were made
      if (hasChanges) {
        await this.save(fixedConfig, global);
      }
      
      return true;
    } catch (error: any) {
      return false;
    }
  }

  /**
   * Get configuration file paths
   */
  getConfigPaths(): { global: string; project: string } {
    const scopePaths = this.zccCore.getScopePaths();
    return {
      global: this.fs.join(scopePaths.global, 'config.yaml'),
      project: this.fs.join(scopePaths.project, 'config.yaml')
    };
  }

  /**
   * Validate configuration schema
   */
  private validateConfig(config: ZccConfig): void {
    try {
      this.schemaRegistry.validateAndThrow(
        this.schemaRegistry.getZccConfigValidator(),
        config,
        'Configuration'
      );
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        `Configuration validation failed: ${error.message}`,
        'configuration',
        'Check the configuration format and try again'
      );
    }
  }
}

// Export the unified config interface
export { ZccConfig };