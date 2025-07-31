import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger } from './logger';
import { ConfigMigrator } from './ConfigMigrator';
import { ConfigSchemaRegistry, VersionedMementoConfig } from './configSchema';
import { ValidationError, ConfigurationError } from './errors';

export interface MementoConfig {
  // Project-level settings
  defaultMode?: string;
  preferredWorkflows?: string[];
  customTemplateSources?: string[];
  
  // Integration settings
  integrations?: {
    [key: string]: any;
  };
  
  // UI preferences
  ui?: {
    colorOutput?: boolean;
    verboseLogging?: boolean;
  };
  
  // Component settings
  components?: {
    modes?: string[];
    workflows?: string[];
  };
}

// Export the versioned config as well for backward compatibility
export { VersionedMementoConfig };

export class ConfigManager {
  private globalConfigPath: string;
  private projectConfigPath: string;
  private migrator: ConfigMigrator;
  private schemaRegistry: ConfigSchemaRegistry;

  constructor(projectRoot: string) {
    this.globalConfigPath = path.join(os.homedir(), '.memento', 'config.json');
    this.projectConfigPath = path.join(projectRoot, '.memento', 'config.json');
    this.migrator = new ConfigMigrator();
    this.schemaRegistry = ConfigSchemaRegistry.getInstance();
  }

  /**
   * Load configuration with hierarchy: defaults -> global -> project -> env
   */
  async load(): Promise<MementoConfig> {
    const defaultConfig: VersionedMementoConfig = {
      version: ConfigMigrator.getCurrentVersion(),
      ui: {
        colorOutput: true,
        verboseLogging: false
      }
    };

    // Merge global config if exists
    const globalConfig = await this.loadConfigFile(this.globalConfigPath);
    const mergedConfig = this.mergeConfigs(defaultConfig, globalConfig);

    // Merge project config if exists
    const projectConfig = await this.loadConfigFile(this.projectConfigPath);
    const finalConfig = this.mergeConfigs(mergedConfig, projectConfig);

    // Apply environment variable overrides
    const result = this.applyEnvironmentOverrides(finalConfig);

    // Strip version from result for backward compatibility
    const { version, ...configWithoutVersion } = result;
    return configWithoutVersion;
  }

  /**
   * Save configuration to project or global level
   */
  async save(config: MementoConfig, global: boolean = false): Promise<void> {
    const configPath = global ? this.globalConfigPath : this.projectConfigPath;
    const configDir = path.dirname(configPath);

    // Ensure directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Add version to config before validation and saving
    const versionedConfig: VersionedMementoConfig = {
      version: ConfigMigrator.getCurrentVersion(),
      ...config
    };

    // Validate config before saving using schema validator
    this.validateConfig(versionedConfig);

    // Write config file
    fs.writeFileSync(configPath, JSON.stringify(versionedConfig, null, 2));
    logger.success(`Configuration saved to ${configPath}`);
  }

  /**
   * Get a specific configuration value
   */
  async get(key: string): Promise<any> {
    const config = await this.load();
    return this.getNestedValue(config, key);
  }

  /**
   * Set a specific configuration value
   */
  async set(key: string, value: any, global: boolean = false): Promise<void> {
    const configPath = global ? this.globalConfigPath : this.projectConfigPath;
    const versionedConfig = await this.loadConfigFile(configPath) || {};
    
    // Strip version for manipulation, then re-add it in save()
    const { version, ...config } = versionedConfig as VersionedMementoConfig;
    
    this.setNestedValue(config, key, value);
    await this.save(config, global);
  }

  /**
   * Remove a configuration key
   */
  async unset(key: string, global: boolean = false): Promise<void> {
    const configPath = global ? this.globalConfigPath : this.projectConfigPath;
    const versionedConfig = await this.loadConfigFile(configPath);
    
    if (!versionedConfig) {
      return;
    }

    // Strip version for manipulation, then re-add it in save()
    const { version, ...config } = versionedConfig as VersionedMementoConfig;
    
    this.unsetNestedValue(config, key);
    await this.save(config, global);
  }

  /**
   * List all configuration values
   */
  async list(global: boolean = false): Promise<MementoConfig> {
    if (global) {
      const versionedConfig = await this.loadConfigFile(this.globalConfigPath) || {};
      const { version, ...config } = versionedConfig as VersionedMementoConfig;
      return config;
    }
    return await this.load();
  }

  /**
   * Validate configuration schema using the new validation system
   */
  private validateConfig(config: VersionedMementoConfig): void {
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
   * Load configuration from file with migration support
   */
  private async loadConfigFile(filePath: string): Promise<VersionedMementoConfig | null> {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      let config = JSON.parse(content);

      // Check if migration is needed
      if (this.migrator.needsMigration(config)) {
        logger.debug(`Configuration needs migration: ${filePath}`);
        
        try {
          const migrationResult = await this.migrator.migrateConfigFile(filePath);
          
          if (migrationResult.success) {
            logger.info(`Successfully migrated configuration from ${migrationResult.fromVersion} to ${migrationResult.toVersion}`);
            
            if (migrationResult.warnings && migrationResult.warnings.length > 0) {
              migrationResult.warnings.forEach(warning => logger.warn(warning));
            }
            
            // Re-read the migrated file
            const migratedContent = fs.readFileSync(filePath, 'utf-8');
            config = JSON.parse(migratedContent);
          } else {
            logger.error(`Configuration migration failed: ${migrationResult.error}`);
            throw new ConfigurationError(
              `Failed to migrate configuration: ${migrationResult.error}`,
              'Try creating a backup and updating the configuration manually'
            );
          }
        } catch (migrationError: any) {
          logger.error(`Migration error for ${filePath}: ${migrationError.message}`);
          // For backward compatibility, try to use the config as-is with a warning
          logger.warn('Attempting to use configuration without migration - some features may not work correctly');
        }
      }

      // Validate the loaded configuration
      try {
        this.validateConfig(config);
      } catch (validationError: any) {
        logger.warn(`Configuration validation warning for ${filePath}: ${validationError.message}`);
        // For backward compatibility, add version if missing
        if (!config.version) {
          config.version = ConfigMigrator.getCurrentVersion();
        }
      }

      return config;
    } catch (error) {
      logger.warn(`Failed to parse config file ${filePath}: ${error}`);
      return null;
    }
  }

  /**
   * Merge two configurations, with right taking precedence
   */
  private mergeConfigs(left: VersionedMementoConfig, right: VersionedMementoConfig | null): VersionedMementoConfig {
    if (!right) return left;

    return {
      ...left,
      ...right,
      // Always use the latest version
      version: right.version || left.version || ConfigMigrator.getCurrentVersion(),
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
  private applyEnvironmentOverrides(config: VersionedMementoConfig): VersionedMementoConfig {
    // MEMENTO_DEFAULT_MODE
    if (process.env.MEMENTO_DEFAULT_MODE) {
      config.defaultMode = process.env.MEMENTO_DEFAULT_MODE;
    }

    // MEMENTO_COLOR_OUTPUT
    if (process.env.MEMENTO_COLOR_OUTPUT !== undefined) {
      config.ui = config.ui || {};
      config.ui.colorOutput = process.env.MEMENTO_COLOR_OUTPUT === 'true';
    }

    // MEMENTO_VERBOSE
    if (process.env.MEMENTO_VERBOSE !== undefined) {
      config.ui = config.ui || {};
      config.ui.verboseLogging = process.env.MEMENTO_VERBOSE === 'true';
    }

    return config;
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

  /**
   * Check if a configuration file exists and needs migration
   */
  async checkMigrationStatus(global: boolean = false): Promise<{
    exists: boolean;
    needsMigration: boolean;
    currentVersion: string;
    targetVersion: string;
    compatible: boolean;
    issues: string[];
  }> {
    const configPath = global ? this.globalConfigPath : this.projectConfigPath;
    
    if (!fs.existsSync(configPath)) {
      return {
        exists: false,
        needsMigration: false,
        currentVersion: 'none',
        targetVersion: ConfigMigrator.getCurrentVersion(),
        compatible: true,
        issues: []
      };
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);
      const currentVersion = this.migrator.detectVersion(config);
      const needsMigration = this.migrator.needsMigration(config);
      const compatibility = this.migrator.checkCompatibility(config);

      return {
        exists: true,
        needsMigration,
        currentVersion,
        targetVersion: ConfigMigrator.getCurrentVersion(),
        compatible: compatibility.compatible,
        issues: compatibility.issues
      };
    } catch (error: any) {
      return {
        exists: true,
        needsMigration: false,
        currentVersion: 'unknown',
        targetVersion: ConfigMigrator.getCurrentVersion(),
        compatible: false,
        issues: [`Failed to parse configuration: ${error.message}`]
      };
    }
  }

  /**
   * Manually trigger migration for a configuration file
   */
  async migrateConfig(global: boolean = false): Promise<void> {
    const configPath = global ? this.globalConfigPath : this.projectConfigPath;
    
    if (!fs.existsSync(configPath)) {
      throw new ConfigurationError(
        `Configuration file not found: ${configPath}`,
        'Create a configuration first using memento init or memento config set'
      );
    }

    const result = await this.migrator.migrateConfigFile(configPath);
    
    if (!result.success) {
      throw new ConfigurationError(
        `Migration failed: ${result.error}`,
        'Check the configuration file format and try again'
      );
    }

    logger.success(`Successfully migrated configuration from ${result.fromVersion} to ${result.toVersion}`);
    
    if (result.warnings && result.warnings.length > 0) {
      result.warnings.forEach(warning => logger.warn(warning));
    }

    if (result.backupPath) {
      logger.info(`Backup created at: ${result.backupPath}`);
    }
  }

  /**
   * Validate a configuration file without loading it
   */
  async validateConfigFile(global: boolean = false): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const configPath = global ? this.globalConfigPath : this.projectConfigPath;
    
    if (!fs.existsSync(configPath)) {
      return {
        valid: false,
        errors: [`Configuration file not found: ${configPath}`],
        warnings: []
      };
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);
      
      // Ensure config has version for validation
      if (!config.version) {
        config.version = ConfigMigrator.getCurrentVersion();
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
    return {
      global: this.globalConfigPath,
      project: this.projectConfigPath
    };
  }

  /**
   * Clean up old backup files
   */
  async cleanupBackups(global: boolean = false, keepCount: number = 5): Promise<void> {
    const configPath = global ? this.globalConfigPath : this.projectConfigPath;
    await this.migrator.cleanupBackups(configPath, keepCount);
  }
}