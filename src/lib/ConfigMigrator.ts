import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
import { ConfigSchemaRegistry } from './configSchema';
import { ValidationError, ConfigurationError } from './errors';

/**
 * Interface for migration functions
 */
export interface Migration {
  fromVersion: string;
  toVersion: string;
  migrate: (config: any) => any;
  description: string;
}

/**
 * Interface for migration result
 */
export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  backupPath?: string;
  error?: string;
  warnings?: string[];
}

/**
 * Configuration migrator that handles version upgrades
 */
export class ConfigMigrator {
  private static readonly CURRENT_VERSION = '1.0.0';
  private static readonly BACKUP_SUFFIX = '.backup';
  
  private migrations: Migration[] = [];
  private schemaRegistry = ConfigSchemaRegistry.getInstance();

  constructor() {
    this.registerMigrations();
  }

  /**
   * Register all migration functions
   */
  private registerMigrations(): void {
    // Migration from no version to 1.0.0
    this.migrations.push({
      fromVersion: 'none',
      toVersion: '1.0.0',
      description: 'Add version field to configuration',
      migrate: (config: any) => {
        // For configs without version, assume they are valid and just add version
        return {
          version: '1.0.0',
          ...config
        };
      }
    });

    // Future migrations can be added here
    // Example:
    // this.migrations.push({
    //   fromVersion: '1.0.0',
    //   toVersion: '1.1.0',
    //   description: 'Add new feature configuration',
    //   migrate: (config: any) => {
    //     return {
    //       ...config,
    //       version: '1.1.0',
    //       newFeature: {
    //         enabled: false
    //       }
    //     };
    //   }
    // });
  }

  /**
   * Get the current supported version
   */
  static getCurrentVersion(): string {
    return ConfigMigrator.CURRENT_VERSION;
  }

  /**
   * Detect the version of a configuration object
   */
  detectVersion(config: any): string {
    if (!config || typeof config !== 'object') {
      return 'none';
    }

    return config.version || 'none';
  }

  /**
   * Check if a configuration needs migration
   */
  needsMigration(config: any): boolean {
    const currentVersion = this.detectVersion(config);
    return currentVersion !== ConfigMigrator.CURRENT_VERSION;
  }

  /**
   * Get migration path from one version to another
   */
  private getMigrationPath(fromVersion: string, toVersion: string): Migration[] {
    const path: Migration[] = [];
    let currentVersion = fromVersion;

    while (currentVersion !== toVersion) {
      const migration = this.migrations.find(m => m.fromVersion === currentVersion);
      if (!migration) {
        throw new ConfigurationError(
          `No migration path found from version ${currentVersion} to ${toVersion}`,
          `Check if version ${currentVersion} is supported`
        );
      }

      path.push(migration);
      currentVersion = migration.toVersion;
    }

    return path;
  }

  /**
   * Migrate configuration from file
   */
  async migrateConfigFile(configPath: string): Promise<MigrationResult> {
    try {
      // Check if file exists
      if (!fs.existsSync(configPath)) {
        throw new ConfigurationError(
          `Configuration file not found: ${configPath}`,
          'Check the file path and try again'
        );
      }

      // Read current config
      const configContent = fs.readFileSync(configPath, 'utf-8');
      let currentConfig: any;
      
      try {
        currentConfig = JSON.parse(configContent);
      } catch (parseError) {
        throw new ConfigurationError(
          `Failed to parse configuration file: ${configPath}`,
          'Check that the file contains valid JSON'
        );
      }

      // Detect current version
      const currentVersion = this.detectVersion(currentConfig);
      
      // Check if migration is needed
      if (!this.needsMigration(currentConfig)) {
        return {
          success: true,
          fromVersion: currentVersion,
          toVersion: currentVersion,
          warnings: ['Configuration is already at the latest version']
        };
      }

      logger.info(`Migrating configuration from version ${currentVersion} to ${ConfigMigrator.CURRENT_VERSION}`);

      // Create backup
      const backupPath = await this.createBackup(configPath);

      try {
        // Get migration path
        const migrationPath = this.getMigrationPath(currentVersion, ConfigMigrator.CURRENT_VERSION);
        
        // Apply migrations
        let migratedConfig = currentConfig;
        const warnings: string[] = [];

        for (const migration of migrationPath) {
          logger.debug(`Applying migration: ${migration.description}`);
          try {
            migratedConfig = migration.migrate(migratedConfig);
          } catch (migrationError: any) {
            warnings.push(`Warning during migration from ${migration.fromVersion} to ${migration.toVersion}: ${migrationError.message}`);
          }
        }

        // Validate migrated config
        this.validateMigratedConfig(migratedConfig, configPath);

        // Save migrated config
        fs.writeFileSync(configPath, JSON.stringify(migratedConfig, null, 2));

        logger.success(`Successfully migrated configuration to version ${ConfigMigrator.CURRENT_VERSION}`);

        return {
          success: true,
          fromVersion: currentVersion,
          toVersion: ConfigMigrator.CURRENT_VERSION,
          backupPath,
          warnings: warnings.length > 0 ? warnings : undefined
        };

      } catch (migrationError: any) {
        // Restore from backup on failure
        await this.restoreFromBackup(configPath, backupPath);
        throw migrationError;
      }

    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        success: false,
        fromVersion: 'unknown',
        toVersion: ConfigMigrator.CURRENT_VERSION,
        error: errorMessage
      };
    }
  }

  /**
   * Migrate configuration object in memory
   */
  migrateConfig(config: any): any {
    const currentVersion = this.detectVersion(config);
    
    if (!this.needsMigration(config)) {
      return config;
    }

    const migrationPath = this.getMigrationPath(currentVersion, ConfigMigrator.CURRENT_VERSION);
    
    let migratedConfig = config;
    for (const migration of migrationPath) {
      migratedConfig = migration.migrate(migratedConfig);
    }

    return migratedConfig;
  }

  /**
   * Create backup of configuration file
   */
  private async createBackup(configPath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${configPath}${ConfigMigrator.BACKUP_SUFFIX}.${timestamp}`;
    
    try {
      fs.copyFileSync(configPath, backupPath);
      logger.debug(`Created backup: ${backupPath}`);
      return backupPath;
    } catch (error: any) {
      throw new ConfigurationError(
        `Failed to create backup: ${error.message}`,
        'Check write permissions for the configuration directory'
      );
    }
  }

  /**
   * Restore configuration from backup
   */
  private async restoreFromBackup(configPath: string, backupPath: string): Promise<void> {
    try {
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, configPath);
        logger.info(`Restored configuration from backup: ${backupPath}`);
      }
    } catch (error: any) {
      logger.error(`Failed to restore from backup: ${error.message}`);
    }
  }

  /**
   * Validate migrated configuration
   */
  private validateMigratedConfig(config: any, configPath: string): void {
    try {
      // Determine config type based on file path and content
      if (configPath.includes('acronyms.json')) {
        this.schemaRegistry.validateAndThrow(
          this.schemaRegistry.getAcronymConfigValidator(),
          config,
          'Migrated acronym configuration'
        );
      } else if (this.isHookConfig(config)) {
        this.schemaRegistry.validateAndThrow(
          this.schemaRegistry.getHookConfigValidator(),
          config,
          'Migrated hook configuration'
        );
      } else {
        this.schemaRegistry.validateAndThrow(
          this.schemaRegistry.getMementoConfigValidator(),
          config,
          'Migrated memento configuration'
        );
      }
    } catch (validationError: any) {
      throw new ValidationError(
        `Migrated configuration is invalid: ${validationError.message}`,
        'migration result',
        'Please report this as a migration bug'
      );
    }
  }

  /**
   * Check if config looks like a hook configuration
   */
  private isHookConfig(config: any): boolean {
    return config && 
           typeof config === 'object' && 
           ('id' in config || 'name' in config || 'event' in config || 'command' in config);
  }

  /**
   * Clean up old backup files (keep only the most recent N backups)
   */
  async cleanupBackups(configPath: string, keepCount: number = 5): Promise<void> {
    try {
      const configDir = path.dirname(configPath);
      const configName = path.basename(configPath);
      const backupPattern = `${configName}${ConfigMigrator.BACKUP_SUFFIX}.`;

      const files = fs.readdirSync(configDir);
      const backupFiles = files
        .filter(file => file.startsWith(backupPattern))
        .map(file => ({
          name: file,
          path: path.join(configDir, file),
          mtime: fs.statSync(path.join(configDir, file)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      if (backupFiles.length > keepCount) {
        const filesToDelete = backupFiles.slice(keepCount);
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          logger.debug(`Cleaned up old backup: ${file.name}`);
        }
      }
    } catch (error: any) {
      logger.warn(`Failed to cleanup backups: ${error.message}`);
    }
  }

  /**
   * Get list of available migrations
   */
  getAvailableMigrations(): Migration[] {
    return [...this.migrations];
  }

  /**
   * Check configuration compatibility
   */
  checkCompatibility(config: any): { compatible: boolean; issues: string[] } {
    const issues: string[] = [];
    const version = this.detectVersion(config);

    if (version === 'none') {
      issues.push('Configuration has no version field');
    }

    try {
      const migrationPath = this.getMigrationPath(version, ConfigMigrator.CURRENT_VERSION);
      if (migrationPath.length > 0) {
        issues.push(`Configuration needs migration from version ${version} to ${ConfigMigrator.CURRENT_VERSION}`);
      }
    } catch (error: any) {
      issues.push(`No migration path available from version ${version}`);
      return { compatible: false, issues };
    }

    return {
      compatible: issues.length === 0,
      issues
    };
  }
}