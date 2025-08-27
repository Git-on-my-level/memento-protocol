import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { logger } from './logger';
import { ConfigurationError } from './errors';
import { MementoConfig } from './configSchema';
import { SimpleCache } from './SimpleCache';

export interface ComponentInfo {
  name: string;
  type: 'mode' | 'workflow' | 'script' | 'hook' | 'agent' | 'command' | 'template';
  path: string;
  metadata?: any;
}

/**
 * Handles a single Memento scope (global or project)
 * Manages config.yaml loading and component discovery
 */
export class MementoScope {
  private scopePath: string;
  private configPath: string;
  private cache: SimpleCache;
  private isGlobal: boolean;

  constructor(scopePath: string, isGlobal: boolean = false) {
    this.scopePath = scopePath;
    this.configPath = path.join(scopePath, 'config.yaml');
    this.isGlobal = isGlobal;
    this.cache = new SimpleCache(300000); // 5 minutes TTL
  }

  /**
   * Check if this scope exists (has a directory)
   */
  exists(): boolean {
    return fs.existsSync(this.scopePath);
  }

  /**
   * Get the scope path
   */
  getPath(): string {
    return this.scopePath;
  }

  /**
   * Check if this is a global scope
   */
  getIsGlobal(): boolean {
    return this.isGlobal;
  }

  /**
   * Load configuration from config.yaml
   * Returns null if config doesn't exist, throws on parse errors
   */
  async getConfig(): Promise<MementoConfig | null> {
    const cacheKey = 'config';
    const cached = this.cache.get<MementoConfig | null>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    if (!fs.existsSync(this.configPath)) {
      this.cache.set(cacheKey, null);
      return null;
    }

    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      const config = yaml.load(content) as MementoConfig;
      
      // Validate basic structure
      if (config && typeof config === 'object') {
        this.cache.set(cacheKey, config);
        return config;
      } else {
        throw new Error('Configuration must be an object');
      }
    } catch (error: any) {
      const scopeType = this.isGlobal ? 'global' : 'project';
      throw new ConfigurationError(
        `Failed to parse ${scopeType} config.yaml: ${error.message}`,
        `Check the YAML syntax in ${this.configPath}`
      );
    }
  }

  /**
   * Save configuration to config.yaml
   */
  async saveConfig(config: MementoConfig): Promise<void> {
    // Ensure directory exists
    if (!fs.existsSync(this.scopePath)) {
      fs.mkdirSync(this.scopePath, { recursive: true });
    }

    try {
      const yamlContent = yaml.dump(config, {
        indent: 2,
        quotingType: '"',
        forceQuotes: false,
      });
      
      fs.writeFileSync(this.configPath, yamlContent, 'utf-8');
      
      // Invalidate config cache
      this.cache.invalidatePattern('config');
      
      const scopeType = this.isGlobal ? 'global' : 'project';
      logger.success(`Configuration saved to ${scopeType} scope: ${this.configPath}`);
    } catch (error: any) {
      const scopeType = this.isGlobal ? 'global' : 'project';
      throw new ConfigurationError(
        `Failed to save ${scopeType} config.yaml: ${error.message}`,
        `Check write permissions for ${this.configPath}`
      );
    }
  }

  /**
   * Discover all components in this scope
   */
  async getComponents(): Promise<ComponentInfo[]> {
    const cacheKey = 'components';
    const cached = this.cache.get<ComponentInfo[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    if (!this.exists()) {
      this.cache.set(cacheKey, []);
      return [];
    }

    const components: ComponentInfo[] = [];
    const componentTypes = ['modes', 'workflows', 'scripts', 'hooks', 'agents', 'commands', 'templates'];

    for (const componentType of componentTypes) {
      const componentDir = path.join(this.scopePath, componentType);
      
      if (fs.existsSync(componentDir)) {
        try {
          const files = fs.readdirSync(componentDir);
          
          for (const file of files) {
            const filePath = path.join(componentDir, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isFile()) {
              // Extract name without extension
              const name = path.parse(file).name;
              
              components.push({
                name,
                type: componentType.slice(0, -1) as ComponentInfo['type'], // Remove 's' suffix
                path: filePath,
                metadata: await this.extractMetadata(filePath)
              });
            }
          }
        } catch (error: any) {
          logger.debug(`Failed to read ${componentType} directory: ${error.message}`);
        }
      }
    }

    this.cache.set(cacheKey, components);
    return components;
  }

  /**
   * Get a specific component by name and type
   */
  async getComponent(name: string, type: ComponentInfo['type']): Promise<ComponentInfo | null> {
    const components = await this.getComponents();
    return components.find(c => c.name === name && c.type === type) || null;
  }

  /**
   * Get components by type
   */
  async getComponentsByType(type: ComponentInfo['type']): Promise<ComponentInfo[]> {
    const cacheKey = `components:${type}`;
    const cached = this.cache.get<ComponentInfo[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const components = await this.getComponents();
    const filtered = components.filter(c => c.type === type);
    this.cache.set(cacheKey, filtered);
    return filtered;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Extract metadata from component files
   * For markdown files, tries to parse frontmatter
   * For other files, returns basic file info
   */
  private async extractMetadata(filePath: string): Promise<any> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      
      if (ext === '.md') {
        // Try to extract frontmatter using gray-matter
        try {
          const matter = require('gray-matter');
          const content = fs.readFileSync(filePath, 'utf-8');
          const parsed = matter(content);
          return parsed.data || {};
        } catch {
          // If gray-matter fails, return basic info
          return {};
        }
      } else if (ext === '.json') {
        // For JSON files, try to parse for metadata
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(content);
          return parsed.metadata || parsed;
        } catch {
          return {};
        }
      } else if (ext === '.yaml' || ext === '.yml') {
        // For YAML files, try to parse
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const parsed = yaml.load(content);
          return parsed || {};
        } catch {
          return {};
        }
      }
      
      // For other file types, return basic info
      const stats = fs.statSync(filePath);
      return {
        size: stats.size,
        modified: stats.mtime,
        extension: ext
      };
    } catch (error: any) {
      logger.debug(`Failed to extract metadata from ${filePath}: ${error.message}`);
      return {};
    }
  }

  /**
   * Initialize the scope directory structure
   */
  async initialize(): Promise<void> {
    if (!fs.existsSync(this.scopePath)) {
      fs.mkdirSync(this.scopePath, { recursive: true });
    }

    // Create standard component directories
    const componentDirs = ['modes', 'workflows', 'scripts', 'hooks', 'agents', 'commands', 'templates'];
    
    for (const dir of componentDirs) {
      const dirPath = path.join(this.scopePath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    // Create default config if it doesn't exist
    if (!fs.existsSync(this.configPath)) {
      const defaultConfig: MementoConfig = {
        ui: {
          colorOutput: true,
          verboseLogging: false
        }
      };
      
      await this.saveConfig(defaultConfig);
    }

    const scopeType = this.isGlobal ? 'global' : 'project';
    logger.success(`Initialized ${scopeType} Memento scope: ${this.scopePath}`);
  }
}