import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { logger } from './logger';
import { ConfigurationError, ValidationError } from './errors';
import { VersionedMementoConfig } from './configManager';
import { ConfigMigrator } from './ConfigMigrator';
import { ConfigSchemaRegistry } from './configSchema';

/**
 * RC file discovery result
 */
export interface RCFile {
  path: string;
  format: 'yaml' | 'json';
  exists: boolean;
  content?: VersionedMementoConfig;
}

/**
 * RC file discovery options
 */
export interface RCDiscoveryOptions {
  homeDirectory?: string;
  projectDirectory?: string;
}

/**
 * RCFileLoader handles discovery, parsing, and validation of .mementorc files
 * in YAML and JSON formats. Supports both global (~/.mementorc) and project
 * (.mementorc) configurations.
 */
export class RCFileLoader {
  private migrator: ConfigMigrator;
  private schemaRegistry: ConfigSchemaRegistry;

  constructor() {
    this.migrator = new ConfigMigrator();
    this.schemaRegistry = ConfigSchemaRegistry.getInstance();
  }

  /**
   * Discover RC files in both home directory and project directory.
   * Returns an array of potential RC file locations, ordered by preference.
   */
  discoverRCFiles(options: RCDiscoveryOptions = {}): RCFile[] {
    const homeDir = options.homeDirectory || os.homedir();
    const projectDir = options.projectDirectory || process.cwd();

    const rcFiles: RCFile[] = [];

    // Global RC files (home directory)
    const globalFiles = [
      { name: '.mementorc', format: 'yaml' as const },
      { name: '.mementorc.yaml', format: 'yaml' as const },
      { name: '.mementorc.yml', format: 'yaml' as const },
      { name: '.mementorc.json', format: 'json' as const },
    ];

    for (const file of globalFiles) {
      const filePath = path.join(homeDir, file.name);
      rcFiles.push({
        path: filePath,
        format: file.format,
        exists: fs.existsSync(filePath)
      });
    }

    // Project RC files (project root)
    const projectFiles = [
      { name: '.mementorc', format: 'yaml' as const },
      { name: '.mementorc.yaml', format: 'yaml' as const },
      { name: '.mementorc.yml', format: 'yaml' as const },
      { name: '.mementorc.json', format: 'json' as const },
    ];

    for (const file of projectFiles) {
      const filePath = path.join(projectDir, file.name);
      rcFiles.push({
        path: filePath,
        format: file.format,
        exists: fs.existsSync(filePath)
      });
    }

    return rcFiles;
  }

  /**
   * Load and parse an RC file.
   * Returns null if the file doesn't exist or can't be parsed.
   */
  async loadRCFile(rcFile: RCFile): Promise<VersionedMementoConfig | null> {
    if (!rcFile.exists) {
      return null;
    }

    try {
      const content = fs.readFileSync(rcFile.path, 'utf-8');
      let config: any;

      if (rcFile.format === 'yaml') {
        config = yaml.load(content);
        if (config === null || config === undefined) {
          logger.debug(`Empty RC file: ${rcFile.path}`);
          return null;
        }
        if (typeof config !== 'object' || Array.isArray(config)) {
          throw new ConfigurationError(
            `Invalid YAML structure in RC file: ${rcFile.path}`,
            'RC files must contain an object at the root level'
          );
        }
      } else {
        config = JSON.parse(content);
      }

      // Check if migration is needed
      if (this.migrator.needsMigration(config)) {
        logger.debug(`RC file needs migration: ${rcFile.path}`);
        
        try {
          // For RC files, we don't want to modify the original file during migration
          // Instead, we migrate in-memory and let the user manually update their RC file
          const migratedConfig = await this.migrator.migrateConfig(config);
          
          if (migratedConfig) {
            logger.warn(
              `RC file ${rcFile.path} uses an older format. ` +
              `Consider updating to version ${ConfigMigrator.getCurrentVersion()}`
            );
            config = migratedConfig;
          }
        } catch (migrationError: any) {
          logger.warn(`Migration warning for ${rcFile.path}: ${migrationError.message}`);
          // Continue with original config for backward compatibility
        }
      }

      // Validate the configuration
      try {
        this.validateConfig(config);
      } catch (validationError: any) {
        logger.warn(`Configuration validation warning for ${rcFile.path}: ${validationError.message}`);
        // For backward compatibility, add version if missing
        if (!config.version) {
          config.version = ConfigMigrator.getCurrentVersion();
        }
      }

      return config;
    } catch (error: any) {
      if (error instanceof ConfigurationError || error instanceof ValidationError) {
        throw error;
      }
      
      if (rcFile.format === 'yaml') {
        throw new ConfigurationError(
          `Failed to parse YAML RC file: ${rcFile.path}`,
          `Check YAML syntax: ${error.message}`
        );
      } else {
        throw new ConfigurationError(
          `Failed to parse JSON RC file: ${rcFile.path}`,
          `Check JSON syntax: ${error.message}`
        );
      }
    }
  }

  /**
   * Load the first available RC file from a list of candidates.
   * Returns null if no RC files are found or can be loaded.
   */
  async loadFirstAvailableRC(rcFiles: RCFile[]): Promise<VersionedMementoConfig | null> {
    for (const rcFile of rcFiles) {
      if (rcFile.exists) {
        try {
          const config = await this.loadRCFile(rcFile);
          if (config) {
            logger.debug(`Loaded RC file: ${rcFile.path}`);
            return config;
          }
        } catch (error: any) {
          logger.warn(`Failed to load RC file ${rcFile.path}: ${error.message}`);
          // Continue trying other files
        }
      }
    }
    return null;
  }

  /**
   * Load global RC configuration.
   * Looks for RC files in the home directory.
   */
  async loadGlobalRC(homeDirectory?: string): Promise<VersionedMementoConfig | null> {
    const rcFiles = this.discoverRCFiles({ homeDirectory });
    const globalRCFiles = rcFiles.slice(0, 4); // First 4 are global files
    return this.loadFirstAvailableRC(globalRCFiles);
  }

  /**
   * Load project RC configuration.
   * Looks for RC files in the project directory.
   */
  async loadProjectRC(projectDirectory?: string): Promise<VersionedMementoConfig | null> {
    const rcFiles = this.discoverRCFiles({ projectDirectory });
    const projectRCFiles = rcFiles.slice(4, 8); // Last 4 are project files
    return this.loadFirstAvailableRC(projectRCFiles);
  }

  /**
   * Get information about discovered RC files for diagnostics.
   */
  getRCFileStatus(options: RCDiscoveryOptions = {}): {
    global: RCFile[];
    project: RCFile[];
  } {
    const rcFiles = this.discoverRCFiles(options);
    return {
      global: rcFiles.slice(0, 4),
      project: rcFiles.slice(4, 8)
    };
  }

  /**
   * Validate RC file format without loading it.
   * Returns validation result with errors and warnings.
   */
  async validateRCFile(filePath: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    format?: 'yaml' | 'json';
  }> {
    if (!fs.existsSync(filePath)) {
      return {
        valid: false,
        errors: [`RC file not found: ${filePath}`],
        warnings: []
      };
    }

    const format = this.detectFormat(filePath);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      let config: any;

      if (format === 'yaml') {
        config = yaml.load(content);
        if (config === null || config === undefined) {
          return {
            valid: false,
            errors: ['Empty YAML file'],
            warnings: [],
            format
          };
        }
        if (typeof config !== 'object' || Array.isArray(config)) {
          return {
            valid: false,
            errors: ['YAML must contain an object at the root level'],
            warnings: [],
            format
          };
        }
      } else {
        config = JSON.parse(content);
      }

      // Ensure config has version for validation
      if (!config.version) {
        config.version = ConfigMigrator.getCurrentVersion();
      }

      const validationResult = this.schemaRegistry.getMementoConfigValidator().validate(config);
      return {
        ...validationResult,
        format
      };
    } catch (error: any) {
      return {
        valid: false,
        errors: [`Failed to parse ${format.toUpperCase()}: ${error.message}`],
        warnings: [],
        format
      };
    }
  }

  /**
   * Detect RC file format based on file extension.
   */
  private detectFormat(filePath: string): 'yaml' | 'json' {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.json') {
      return 'json';
    }
    // Default to YAML for .yaml, .yml, or no extension
    return 'yaml';
  }

  /**
   * Validate configuration using the schema validator.
   */
  private validateConfig(config: VersionedMementoConfig): void {
    try {
      this.schemaRegistry.validateAndThrow(
        this.schemaRegistry.getMementoConfigValidator(),
        config,
        'RC Configuration'
      );
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        `RC configuration validation failed: ${error.message}`,
        'rc-configuration',
        'Check the RC file format and structure'
      );
    }
  }

  /**
   * Generate a sample RC file content for documentation/examples.
   */
  generateSampleRC(format: 'yaml' | 'json' = 'yaml'): string {
    const sampleConfig: VersionedMementoConfig = {
      version: ConfigMigrator.getCurrentVersion(),
      defaultMode: 'engineer',
      preferredWorkflows: ['review', 'summarize'],
      customTemplateSources: [],
      integrations: {
        git: {
          autoCommit: false,
          signCommits: true
        }
      },
      ui: {
        colorOutput: true,
        verboseLogging: false
      },
      components: {
        modes: ['engineer', 'architect', 'reviewer'],
        workflows: ['review', 'summarize']
      }
    };

    if (format === 'yaml') {
      return yaml.dump(sampleConfig, {
        indent: 2,
        lineWidth: 80,
        noArrayIndent: false,
        skipInvalid: false,
        flowLevel: -1
      });
    } else {
      return JSON.stringify(sampleConfig, null, 2);
    }
  }
}