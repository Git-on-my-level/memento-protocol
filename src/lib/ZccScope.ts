import * as yaml from 'js-yaml';
import { logger } from './logger';
import { ConfigurationError } from './errors';
import { MementoConfig } from './configSchema';
import { SimpleCache } from './SimpleCache';
import { FileSystemAdapter } from './adapters/FileSystemAdapter';
import { NodeFileSystemAdapter } from './adapters/NodeFileSystemAdapter';

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
export class ZccScope {
  private scopePath: string;
  private configPath: string;
  private cache: SimpleCache;
  private isGlobal: boolean;
  private fs: FileSystemAdapter;

  constructor(scopePath: string, isGlobal: boolean = false, fsAdapter?: FileSystemAdapter) {
    this.scopePath = scopePath;
    this.isGlobal = isGlobal;
    this.cache = new SimpleCache(300000); // 5 minutes TTL
    this.fs = fsAdapter || new NodeFileSystemAdapter();
    this.configPath = this.joinPath(scopePath, 'config.yaml');
  }

  /**
   * Helper method to join paths using the filesystem adapter
   */
  private joinPath(...paths: string[]): string {
    return this.fs.join(...paths);
  }

  /**
   * Check if this scope exists (has a directory)
   */
  exists(): boolean {
    return this.fs.existsSync(this.scopePath);
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

    if (!this.fs.existsSync(this.configPath)) {
      this.cache.set(cacheKey, null);
      return null;
    }

    try {
      const content = this.fs.readFileSync(this.configPath, 'utf-8') as string;
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
    if (!this.fs.existsSync(this.scopePath)) {
      this.fs.mkdirSync(this.scopePath, { recursive: true });
    }

    try {
      const yamlContent = yaml.dump(config, {
        indent: 2,
        quotingType: '"',
        forceQuotes: false,
      });
      
      this.fs.writeFileSync(this.configPath, yamlContent, { encoding: 'utf-8' });
      
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
      const componentDir = this.joinPath(this.scopePath, componentType);
      
      if (this.fs.existsSync(componentDir)) {
        try {
          const files = this.fs.readdirSync(componentDir);
          
          for (const file of files) {
            const filePath = this.joinPath(componentDir, file);
            const stats = this.fs.statSync(filePath);
            
            if (stats.isFile()) {
              // Extract name without extension
              const name = this.fs.basename(file, this.fs.extname(file));
              
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
      const ext = this.fs.extname(filePath).toLowerCase();
      
      if (ext === '.md') {
        // Try to extract frontmatter using gray-matter
        try {
          const matter = require('gray-matter');
          const content = this.fs.readFileSync(filePath, 'utf-8') as string;
          const parsed = matter(content);
          return parsed.data || {};
        } catch {
          // If gray-matter fails, return basic info
          return {};
        }
      } else if (ext === '.json') {
        // For JSON files, try to parse for metadata
        try {
          const content = this.fs.readFileSync(filePath, 'utf-8') as string;
          const parsed = JSON.parse(content);
          return parsed.metadata || parsed;
        } catch {
          return {};
        }
      } else if (ext === '.yaml' || ext === '.yml') {
        // For YAML files, try to parse
        try {
          const content = this.fs.readFileSync(filePath, 'utf-8') as string;
          const parsed = yaml.load(content);
          return parsed || {};
        } catch {
          return {};
        }
      }
      
      // For other file types, return basic info
      const stats = this.fs.statSync(filePath);
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
    if (!this.fs.existsSync(this.scopePath)) {
      this.fs.mkdirSync(this.scopePath, { recursive: true });
    }

    // Create standard component directories
    const componentDirs = ['modes', 'workflows', 'scripts', 'hooks', 'agents', 'commands', 'templates'];
    
    for (const dir of componentDirs) {
      const dirPath = this.joinPath(this.scopePath, dir);
      if (!this.fs.existsSync(dirPath)) {
        this.fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    // Create default config if it doesn't exist
    if (!this.fs.existsSync(this.configPath)) {
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