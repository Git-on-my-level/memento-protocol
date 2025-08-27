import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger } from './logger';
import { ConfigMigrator } from './ConfigMigrator';
import { ConfigSchemaRegistry, VersionedMementoConfig } from './configSchema';
import { ValidationError, ConfigurationError } from './errors';
import { MementoCore } from './MementoCore';
import { MementoScopeConfig } from './MementoScope';

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
  private mementoCore: MementoCore;

  constructor(projectRoot: string) {
    // Keep old paths for backward compatibility with JSON migration
    this.globalConfigPath = path.join(os.homedir(), '.memento', 'config.json');
    this.projectConfigPath = path.join(projectRoot, '.memento', 'config.json');
    this.migrator = new ConfigMigrator();
    this.schemaRegistry = ConfigSchemaRegistry.getInstance();
    this.mementoCore = new MementoCore(projectRoot);
  }

  /**
   * Load configuration with hierarchy: defaults -> global -> project -> env
   */
  async load(): Promise<MementoConfig> {
    // First, migrate any existing JSON configs to YAML
    await this.migrateExistingConfigs();

    // Now use MementoCore for clean YAML-based configuration
    const config = await this.mementoCore.getConfig();
    
    // Convert MementoScopeConfig to MementoConfig (they're compatible)
    return config as MementoConfig;
  }

  /**
   * Save configuration to project or global level
   */
  async save(config: MementoConfig, global: boolean = false): Promise<void> {
    // First, migrate any existing JSON configs to YAML
    await this.migrateExistingConfigs();

    // Add version for validation (backward compatibility)
    const versionedConfig: VersionedMementoConfig = {
      version: ConfigMigrator.getCurrentVersion(),
      ...config
    };

    // Validate config before saving using schema validator
    this.validateConfig(versionedConfig);

    // Save using MementoCore (as YAML)
    const { version, ...configWithoutVersion } = versionedConfig;
    await this.mementoCore.saveConfig(configWithoutVersion as MementoScopeConfig, global);
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
    const scopePaths = this.mementoCore.getScopePaths();
    return {
      global: path.join(scopePaths.global, 'config.yaml'),
      project: path.join(scopePaths.project, 'config.yaml')
    };
  }

  /**
   * Clean up old backup files
   */
  async cleanupBackups(global: boolean = false, keepCount: number = 5): Promise<void> {
    const configPath = global ? this.globalConfigPath : this.projectConfigPath;
    await this.migrator.cleanupBackups(configPath, keepCount);
  }

  /**
   * Migrate existing JSON configurations to YAML format
   * This is called automatically during load/save operations
   */
  private async migrateExistingConfigs(): Promise<void> {
    await this.migrateJsonToYaml(this.globalConfigPath, true);
    await this.migrateJsonToYaml(this.projectConfigPath, false);
  }

  /**
   * Migrate a single JSON config file to YAML
   */
  private async migrateJsonToYaml(jsonPath: string, isGlobal: boolean): Promise<void> {
    if (!fs.existsSync(jsonPath)) {
      return; // No JSON file to migrate
    }

    try {
      // Load the JSON config
      const jsonConfig = await this.loadConfigFile(jsonPath);
      if (!jsonConfig) {
        return;
      }

      // Remove version for YAML storage
      const { version, ...configWithoutVersion } = jsonConfig as VersionedMementoConfig;
      
      // Save to YAML using MementoCore
      await this.mementoCore.saveConfig(configWithoutVersion as MementoScopeConfig, isGlobal);
      
      // Create backup of JSON file before removing
      const backupPath = `${jsonPath}.backup-${Date.now()}`;
      fs.copyFileSync(jsonPath, backupPath);
      fs.unlinkSync(jsonPath);
      
      const scopeType = isGlobal ? 'global' : 'project';
      logger.info(`Migrated ${scopeType} configuration from JSON to YAML (backup: ${backupPath})`);
      
    } catch (error: any) {
      const scopeType = isGlobal ? 'global' : 'project';
      logger.warn(`Failed to migrate ${scopeType} configuration from JSON to YAML: ${error.message}`);
    }
  }
}