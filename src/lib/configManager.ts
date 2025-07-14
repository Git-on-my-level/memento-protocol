import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger } from './logger';

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
    languages?: string[];
  };
}

export class ConfigManager {
  private globalConfigPath: string;
  private projectConfigPath: string;

  constructor(projectRoot: string) {
    this.globalConfigPath = path.join(os.homedir(), '.memento', 'config.json');
    this.projectConfigPath = path.join(projectRoot, '.memento', 'config.json');
  }

  /**
   * Load configuration with hierarchy: defaults -> global -> project -> env
   */
  async load(): Promise<MementoConfig> {
    const defaultConfig: MementoConfig = {
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
    return this.applyEnvironmentOverrides(finalConfig);
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

    // Validate config before saving
    this.validateConfig(config);

    // Write config file
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
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
    const config = await this.loadConfigFile(configPath) || {};
    
    this.setNestedValue(config, key, value);
    await this.save(config, global);
  }

  /**
   * Remove a configuration key
   */
  async unset(key: string, global: boolean = false): Promise<void> {
    const configPath = global ? this.globalConfigPath : this.projectConfigPath;
    const config = await this.loadConfigFile(configPath);
    
    if (!config) {
      return;
    }

    this.unsetNestedValue(config, key);
    await this.save(config, global);
  }

  /**
   * List all configuration values
   */
  async list(global: boolean = false): Promise<MementoConfig> {
    if (global) {
      return await this.loadConfigFile(this.globalConfigPath) || {};
    }
    return await this.load();
  }

  /**
   * Validate configuration schema
   */
  private validateConfig(config: MementoConfig): void {
    // Validate defaultMode if specified
    if (config.defaultMode && typeof config.defaultMode !== 'string') {
      throw new Error('defaultMode must be a string');
    }

    // Validate preferredWorkflows
    if (config.preferredWorkflows && !Array.isArray(config.preferredWorkflows)) {
      throw new Error('preferredWorkflows must be an array');
    }

    // Validate UI settings
    if (config.ui) {
      if (config.ui.colorOutput !== undefined && typeof config.ui.colorOutput !== 'boolean') {
        throw new Error('ui.colorOutput must be a boolean');
      }
      if (config.ui.verboseLogging !== undefined && typeof config.ui.verboseLogging !== 'boolean') {
        throw new Error('ui.verboseLogging must be a boolean');
      }
    }

    // Validate component arrays
    if (config.components) {
      ['modes', 'workflows', 'languages'].forEach(key => {
        const value = config.components![key as keyof typeof config.components];
        if (value && !Array.isArray(value)) {
          throw new Error(`components.${key} must be an array`);
        }
      });
    }
  }

  /**
   * Load configuration from file
   */
  private async loadConfigFile(filePath: string): Promise<MementoConfig | null> {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.warn(`Failed to parse config file ${filePath}: ${error}`);
      return null;
    }
  }

  /**
   * Merge two configurations, with right taking precedence
   */
  private mergeConfigs(left: MementoConfig, right: MementoConfig | null): MementoConfig {
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
  private applyEnvironmentOverrides(config: MementoConfig): MementoConfig {
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
}