import * as fs from 'fs';
import * as path from 'path';
import { ConfigSchemaRegistry, MementoConfig } from './configSchema';
import { ValidationError } from './errors';
import { MementoCore } from './MementoCore';

/**
 * Simplified configuration manager with YAML-only support
 * No JSON support, no migrations, clean and simple
 */
export class ConfigManager {
  private mementoCore: MementoCore;
  private schemaRegistry: ConfigSchemaRegistry;

  constructor(projectRoot: string) {
    this.mementoCore = new MementoCore(projectRoot);
    this.schemaRegistry = ConfigSchemaRegistry.getInstance();
  }

  /**
   * Load configuration with hierarchy: defaults -> global -> project -> env
   */
  async load(): Promise<MementoConfig> {
    return await this.mementoCore.getConfig();
  }

  /**
   * Save configuration to project or global level
   */
  async save(config: MementoConfig, global: boolean = false): Promise<void> {
    // Validate config before saving
    this.validateConfig(config);
    
    // Save using MementoCore (as YAML)
    await this.mementoCore.saveConfig(config, global);
  }

  /**
   * Get a specific configuration value
   */
  async get(key: string): Promise<any> {
    return await this.mementoCore.getConfigValue(key);
  }

  /**
   * Set a specific configuration value
   */
  async set(key: string, value: any, global: boolean = false): Promise<void> {
    await this.mementoCore.setConfigValue(key, value, global);
  }

  /**
   * Remove a configuration key
   */
  async unset(key: string, global: boolean = false): Promise<void> {
    await this.mementoCore.unsetConfigValue(key, global);
  }

  /**
   * List all configuration values
   */
  async list(global: boolean = false): Promise<MementoConfig> {
    if (global) {
      const scopes = this.mementoCore.getScopes();
      const globalConfig = await scopes.global.getConfig();
      return (globalConfig || {}) as MementoConfig;
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
    
    if (!fs.existsSync(configPath)) {
      return {
        valid: false,
        errors: [`Configuration file not found: ${configPath}`],
        warnings: []
      };
    }

    try {
      const scope = global ? this.mementoCore.getScopes().global : this.mementoCore.getScopes().project;
      const config = await scope.getConfig();
      
      if (!config) {
        return {
          valid: false,
          errors: ['Failed to load configuration'],
          warnings: []
        };
      }

      const result = this.schemaRegistry.getMementoConfigValidator().validate(config);
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
   * Get configuration file paths
   */
  getConfigPaths(): { global: string; project: string } {
    const scopePaths = this.mementoCore.getScopePaths();
    return {
      global: path.join(scopePaths.global, 'config.yaml'),
      project: path.join(scopePaths.project, 'config.yaml')
    };
  }

  /**
   * Validate configuration schema
   */
  private validateConfig(config: MementoConfig): void {
    try {
      this.schemaRegistry.validateAndThrow(
        this.schemaRegistry.getMementoConfigValidator(),
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
export { MementoConfig };