import { ConfigSchemaRegistry, MementoConfig } from './configSchema';
import { ValidationError } from './errors';
import { MementoCore } from './MementoCore';
import { FileSystemAdapter } from './adapters/FileSystemAdapter';
import { NodeFileSystemAdapter } from './adapters/NodeFileSystemAdapter';
import { InputValidator } from './validation/InputValidator';
import { withFileOperations } from './utils/ResourceManager';

/**
 * Simplified configuration manager with YAML-only support
 * No JSON support, no migrations, clean and simple
 */
export class ConfigManager {
  private mementoCore: MementoCore;
  private schemaRegistry: ConfigSchemaRegistry;
  private fs: FileSystemAdapter;

  constructor(projectRoot: string, fsAdapter?: FileSystemAdapter) {
    this.fs = fsAdapter || new NodeFileSystemAdapter();
    this.mementoCore = new MementoCore(projectRoot, this.fs);
    this.schemaRegistry = ConfigSchemaRegistry.getInstance();
  }

  /**
   * Load configuration with hierarchy: defaults -> global -> project -> env
   */
  async load(): Promise<MementoConfig> {
    return withFileOperations(async () => {
      return await this.mementoCore.getConfig();
    });
  }

  /**
   * Save configuration to project or global level
   */
  async save(config: MementoConfig, global: boolean = false): Promise<void> {
    return withFileOperations(async () => {
      // Validate config before saving
      this.validateConfig(config);
      
      // Additional security validation for config content
      this.validateConfigSecurity(config);
      
      // Save using MementoCore (as YAML)
      await this.mementoCore.saveConfig(config, global);
    });
  }

  /**
   * Get a specific configuration value
   */
  async get(key: string): Promise<any> {
    return withFileOperations(async () => {
      return await this.mementoCore.getConfigValue(key);
    });
  }

  /**
   * Set a specific configuration value
   */
  async set(key: string, value: any, global: boolean = false): Promise<void> {
    return withFileOperations(async () => {
      // Validate configuration key and value for security
      const validatedValue = InputValidator.validateConfigValue(key, value);
      await this.mementoCore.setConfigValue(key, validatedValue, global);
    });
  }

  /**
   * Remove a configuration key
   */
  async unset(key: string, global: boolean = false): Promise<void> {
    return withFileOperations(async () => {
      await this.mementoCore.unsetConfigValue(key, global);
    });
  }

  /**
   * List all configuration values
   */
  async list(global: boolean = false): Promise<MementoConfig> {
    return withFileOperations(async () => {
      if (global) {
        const scopes = this.mementoCore.getScopes();
        const globalConfig = await scopes.global.getConfig();
        return (globalConfig || {}) as MementoConfig;
      }
      return await this.load();
    });
  }

  /**
   * Validate a configuration file
   */
  async validateConfigFile(global: boolean = false): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return withFileOperations(async () => {
      const paths = this.getConfigPaths();
      const configPath = global ? paths.global : paths.project;
      
      if (!this.fs.existsSync(configPath)) {
        const scopeName = global ? 'global' : 'project';
        return {
          valid: false,
          errors: [`Configuration file not found: ${configPath}`],
          warnings: [`Initialize ${scopeName} configuration with: memento init${global ? '-global' : ''}`]
        };
      }

      try {
        const scope = global ? this.mementoCore.getScopes().global : this.mementoCore.getScopes().project;
        const config = await scope.getConfig();
        
        if (!config) {
          return {
            valid: false,
            errors: ['Failed to load configuration - file may be corrupted or empty'],
            warnings: [`Check file format: cat "${configPath}"`, 'Reinitialize if needed: memento init --force']
          };
        }

        const result = this.schemaRegistry.getMementoConfigValidator().validate(config);
        return result;
      } catch (error: any) {
        const isParseError = error.message.includes('YAML') || error.message.includes('parse');
        const suggestions = isParseError 
          ? [`Check YAML syntax: yamllint "${configPath}"`, 'Fix syntax errors and try again']
          : ['Check configuration values against schema', 'Use memento config list to see valid options'];

        return {
          valid: false,
          errors: [`Configuration ${isParseError ? 'parsing' : 'validation'} failed: ${error.message}`],
          warnings: suggestions
        };
      }
    });
  }

  /**
   * Get configuration file paths
   */
  getConfigPaths(): { global: string; project: string } {
    const scopePaths = this.mementoCore.getScopePaths();
    return {
      global: this.fs.join(scopePaths.global, 'config.yaml'),
      project: this.fs.join(scopePaths.project, 'config.yaml')
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

  /**
   * Additional security validation for configuration content
   */
  private validateConfigSecurity(config: any): void {
    try {
      // Recursively validate all configuration values for security
      this.validateConfigObject(config, 'config', 5); // max depth of 5
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        `Configuration security validation failed: ${error.message}`,
        'configSecurity',
        'Remove any potentially dangerous content from configuration'
      );
    }
  }

  /**
   * Recursively validate configuration object properties
   */
  private validateConfigObject(obj: any, path: string, maxDepth: number): void {
    if (maxDepth <= 0) {
      throw new ValidationError(
        `Configuration object too deeply nested at: ${path}`,
        'configDepth',
        'Simplify configuration structure to reduce nesting'
      );
    }

    if (obj === null || obj === undefined) {
      return;
    }

    if (typeof obj === 'string') {
      InputValidator.validateConfigValue(path, obj);
      return;
    }

    if (Array.isArray(obj)) {
      if (obj.length > 100) {
        throw new ValidationError(
          `Configuration array too large at: ${path} (${obj.length} items, max 100)`,
          'configArraySize',
          'Reduce the size of configuration arrays'
        );
      }

      for (let i = 0; i < obj.length; i++) {
        this.validateConfigObject(obj[i], `${path}[${i}]`, maxDepth - 1);
      }
      return;
    }

    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length > 50) {
        throw new ValidationError(
          `Configuration object has too many properties at: ${path} (${keys.length} props, max 50)`,
          'configObjectSize',
          'Reduce the number of configuration properties'
        );
      }

      for (const key of keys) {
        // Validate key name
        InputValidator.validateConfigValue(`${path}.${key}`, key);
        // Recursively validate value
        this.validateConfigObject(obj[key], `${path}.${key}`, maxDepth - 1);
      }
      return;
    }

    // For primitive types (number, boolean), just check basic limits
    if (typeof obj === 'number' && !isFinite(obj)) {
      throw new ValidationError(
        `Invalid number value in configuration at: ${path}`,
        'configNumber',
        'Use finite numbers in configuration'
      );
    }
  }
}

// Export the unified config interface
export { MementoConfig };