import * as fs from 'fs';
import * as path from 'path';
import { ComponentInfo } from './ZccScope';
import { logger } from './logger';
import { SimpleCache } from './SimpleCache';

export interface BuiltinComponentInfo extends ComponentInfo {
  templatePath: string;
  isBuiltin: true;
}

/**
 * Provides access to built-in components from the templates directory
 * Handles discovery and caching of templates bundled with ZCC
 */
export class BuiltinComponentProvider {
  private templatesPath: string;
  private metadataPath: string;
  private cache: SimpleCache;

  constructor(packageRoot?: string) {
    // Default to the package's templates directory
    const root = packageRoot || this.findPackageRoot();
    this.templatesPath = path.join(root, 'templates');
    this.metadataPath = path.join(this.templatesPath, 'metadata.json');
    this.cache = new SimpleCache(600000); // 10 minutes TTL for built-in components (rarely change)
  }

  /**
   * Get all built-in components from templates directory
   */
  async getComponents(): Promise<BuiltinComponentInfo[]> {
    const cacheKey = 'components';
    const cached = this.cache.get<BuiltinComponentInfo[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const components: BuiltinComponentInfo[] = [];

    try {
      // First, try to load from metadata.json if available
      const metadataComponents = await this.loadFromMetadata();
      if (metadataComponents.length > 0) {
        components.push(...metadataComponents);
      } else {
        // Fall back to file system discovery
        const discoveredComponents = await this.discoverComponents();
        components.push(...discoveredComponents);
      }

      this.cache.set(cacheKey, components);
      return components;
    } catch (error: any) {
      logger.debug(`Failed to load built-in components: ${error.message}`);
      const emptyComponents: BuiltinComponentInfo[] = [];
      this.cache.set(cacheKey, emptyComponents);
      return emptyComponents;
    }
  }

  /**
   * Get a specific built-in component by name and type
   */
  async getComponent(name: string, type: ComponentInfo['type']): Promise<BuiltinComponentInfo | null> {
    const components = await this.getComponents();
    return components.find(c => c.name === name && c.type === type) || null;
  }

  /**
   * Get built-in components by type
   */
  async getComponentsByType(type: ComponentInfo['type']): Promise<BuiltinComponentInfo[]> {
    const cacheKey = `components:${type}`;
    const cached = this.cache.get<BuiltinComponentInfo[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const components = await this.getComponents();
    const filtered = components.filter(c => c.type === type);
    this.cache.set(cacheKey, filtered);
    return filtered;
  }

  /**
   * Check if built-in components are available
   */
  isAvailable(): boolean {
    return fs.existsSync(this.templatesPath);
  }

  /**
   * Get the templates directory path
   */
  getTemplatesPath(): string {
    return this.templatesPath;
  }

  /**
   * Clear the component cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Load components from metadata.json file
   */
  private async loadFromMetadata(): Promise<BuiltinComponentInfo[]> {
    if (!fs.existsSync(this.metadataPath)) {
      return [];
    }

    try {
      const metadataContent = fs.readFileSync(this.metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);

      const components: BuiltinComponentInfo[] = [];

      // Process each component type from metadata
      const componentTypes: Array<{ type: ComponentInfo['type']; key: string }> = [
        { type: 'mode', key: 'modes' },
        { type: 'workflow', key: 'workflows' },
        { type: 'agent', key: 'agents' },
        { type: 'hook', key: 'hooks' },
        { type: 'command', key: 'commands' },
        { type: 'script', key: 'scripts' },
        { type: 'template', key: 'templates' }
      ];

      for (const { type, key } of componentTypes) {
        const typeComponents = metadata.templates?.[key] || [];
        
        for (const component of typeComponents) {
          // Determine the expected file path
          const templatePath = this.getExpectedTemplatePath(component.name, type);
          
          if (fs.existsSync(templatePath)) {
            components.push({
              name: component.name,
              type,
              path: templatePath,
              templatePath,
              isBuiltin: true,
              metadata: {
                description: component.description,
                tags: component.tags || [],
                dependencies: component.dependencies || [],
                version: component.version,
                author: component.author,
                ...component
              }
            });
          }
        }
      }

      return components;
    } catch (error: any) {
      logger.debug(`Failed to parse metadata.json: ${error.message}`);
      return [];
    }
  }

  /**
   * Discover components by scanning the file system
   */
  private async discoverComponents(): Promise<BuiltinComponentInfo[]> {
    if (!fs.existsSync(this.templatesPath)) {
      return [];
    }

    const components: BuiltinComponentInfo[] = [];
    const componentTypeDirs = ['modes', 'workflows', 'agents', 'hooks', 'commands', 'scripts', 'templates'];

    for (const typeDir of componentTypeDirs) {
      const typePath = path.join(this.templatesPath, typeDir);
      
      if (fs.existsSync(typePath)) {
        try {
          const files = fs.readdirSync(typePath);
          
          for (const file of files) {
            const filePath = path.join(typePath, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isFile() && !file.startsWith('.')) {
              const name = path.parse(file).name;
              const type = typeDir.slice(0, -1) as ComponentInfo['type']; // Remove 's' suffix
              
              components.push({
                name,
                type,
                path: filePath,
                templatePath: filePath,
                isBuiltin: true,
                metadata: await this.extractFileMetadata(filePath)
              });
            }
          }
        } catch (error: any) {
          logger.debug(`Failed to scan ${typeDir} directory: ${error.message}`);
        }
      }
    }

    return components;
  }

  /**
   * Get the expected template path for a component
   */
  private getExpectedTemplatePath(name: string, type: ComponentInfo['type']): string {
    const typeDir = this.getTypeDirName(type);
    const extensions = this.getExpectedExtensions(type);
    
    // Try each extension in order of preference
    for (const ext of extensions) {
      const templatePath = path.join(this.templatesPath, typeDir, `${name}${ext}`);
      if (fs.existsSync(templatePath)) {
        return templatePath;
      }
    }
    
    // Return the most common extension path even if it doesn't exist
    return path.join(this.templatesPath, typeDir, `${name}${extensions[0]}`);
  }

  /**
   * Get the directory name for a component type
   */
  private getTypeDirName(type: ComponentInfo['type']): string {
    return `${type}s`; // modes, workflows, agents, etc.
  }

  /**
   * Get expected file extensions for a component type
   */
  private getExpectedExtensions(type: ComponentInfo['type']): string[] {
    switch (type) {
      case 'mode':
      case 'workflow':
      case 'agent':
      case 'command':
        return ['.md'];
      case 'hook':
        return ['.json', '.yaml', '.yml'];
      case 'script':
        return ['.sh', '.bash', '.js', '.py'];
      case 'template':
        return ['.md', '.txt', '.json', '.yaml', '.yml'];
      default:
        return ['.md'];
    }
  }

  /**
   * Extract metadata from a file
   */
  private async extractFileMetadata(filePath: string): Promise<any> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      
      if (ext === '.md') {
        return await this.extractMarkdownMetadata(filePath);
      } else if (ext === '.json') {
        return await this.extractJsonMetadata(filePath);
      } else if (ext === '.yaml' || ext === '.yml') {
        return await this.extractYamlMetadata(filePath);
      } else {
        const stats = fs.statSync(filePath);
        return {
          size: stats.size,
          modified: stats.mtime,
          extension: ext
        };
      }
    } catch (error: any) {
      logger.debug(`Failed to extract metadata from ${filePath}: ${error.message}`);
      return {};
    }
  }

  /**
   * Extract metadata from markdown files with frontmatter
   */
  private async extractMarkdownMetadata(filePath: string): Promise<any> {
    try {
      const matter = require('gray-matter');
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = matter(content);
      return parsed.data || {};
    } catch {
      return {};
    }
  }

  /**
   * Extract metadata from JSON files
   */
  private async extractJsonMetadata(filePath: string): Promise<any> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      return parsed.metadata || parsed;
    } catch {
      return {};
    }
  }

  /**
   * Extract metadata from YAML files
   */
  private async extractYamlMetadata(filePath: string): Promise<any> {
    try {
      const yaml = require('js-yaml');
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = yaml.load(content);
      return parsed || {};
    } catch {
      return {};
    }
  }

  /**
   * Find the package root directory by looking for package.json
   */
  private findPackageRoot(): string {
    let currentDir = __dirname;
    
    while (currentDir !== path.dirname(currentDir)) {
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    
    // Fallback to current directory if package.json not found
    return process.cwd();
  }
}