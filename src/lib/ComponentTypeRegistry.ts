import { FileSystemAdapter } from './adapters/FileSystemAdapter';
import { NodeFileSystemAdapter } from './adapters/NodeFileSystemAdapter';

export interface ComponentTypeDefinition {
  /** Directory name where components of this type are stored */
  directory: string;
  /** File extension for this component type (including dot) */
  fileExtension: string;
  /** Human-readable name for this type */
  displayName: string;
  /** Whether this type supports dependencies */
  supportsDependencies?: boolean;
  /** Whether this type can be installed globally */
  supportsGlobalInstall?: boolean;
  /** Custom validation function */
  validator?: (metadata: any) => boolean;
}

/**
 * Registry for component types, eliminating hardcoded type checking
 * throughout the codebase. This enables adding new component types
 * without modifying core code.
 */
export class ComponentTypeRegistry {
  private static instance: ComponentTypeRegistry;
  private types = new Map<string, ComponentTypeDefinition>();
  private fs: FileSystemAdapter;

  constructor(fs?: FileSystemAdapter) {
    this.fs = fs || new NodeFileSystemAdapter();
    this.registerDefaultTypes();
  }

  /**
   * Get singleton instance
   */
  static getInstance(fs?: FileSystemAdapter): ComponentTypeRegistry {
    if (!ComponentTypeRegistry.instance) {
      ComponentTypeRegistry.instance = new ComponentTypeRegistry(fs);
    }
    return ComponentTypeRegistry.instance;
  }

  /**
   * Register default component types
   */
  private registerDefaultTypes(): void {
    this.register('mode', {
      directory: 'modes',
      fileExtension: '.md',
      displayName: 'Mode',
      supportsDependencies: false,
      supportsGlobalInstall: true,
    });

    this.register('workflow', {
      directory: 'workflows',
      fileExtension: '.md',
      displayName: 'Workflow',
      supportsDependencies: true,
      supportsGlobalInstall: true,
    });

    this.register('agent', {
      directory: 'agents',
      fileExtension: '.md',
      displayName: 'Agent',
      supportsDependencies: false,
      supportsGlobalInstall: true,
    });

    this.register('script', {
      directory: 'scripts',
      fileExtension: '.sh',
      displayName: 'Script',
      supportsDependencies: false,
      supportsGlobalInstall: false,
    });

    this.register('hook', {
      directory: 'hooks',
      fileExtension: '.json',
      displayName: 'Hook',
      supportsDependencies: false,
      supportsGlobalInstall: false,
    });

    this.register('command', {
      directory: 'commands',
      fileExtension: '.md',
      displayName: 'Command',
      supportsDependencies: false,
      supportsGlobalInstall: false,
    });

    this.register('template', {
      directory: 'templates',
      fileExtension: '.md',
      displayName: 'Template',
      supportsDependencies: false,
      supportsGlobalInstall: true,
    });
  }

  /**
   * Register a new component type
   */
  register(type: string, definition: ComponentTypeDefinition): void {
    this.types.set(type, definition);
  }

  /**
   * Get component type definition
   */
  get(type: string): ComponentTypeDefinition | undefined {
    return this.types.get(type);
  }

  /**
   * Check if a component type is registered
   */
  has(type: string): boolean {
    return this.types.has(type);
  }

  /**
   * Get all registered component types
   */
  getAll(): Map<string, ComponentTypeDefinition> {
    return new Map(this.types);
  }

  /**
   * Get all type names
   */
  getTypeNames(): string[] {
    return Array.from(this.types.keys());
  }

  /**
   * Get the directory for a component type
   */
  getDirectory(type: string): string | undefined {
    return this.types.get(type)?.directory;
  }

  /**
   * Get the file extension for a component type
   */
  getFileExtension(type: string): string | undefined {
    return this.types.get(type)?.fileExtension;
  }

  /**
   * Get the full path for a component
   */
  getComponentPath(basePath: string, type: string, name: string): string | undefined {
    const definition = this.types.get(type);
    if (!definition) {
      return undefined;
    }
    
    return this.fs.join(
      basePath,
      definition.directory,
      `${name}${definition.fileExtension}`
    );
  }

  /**
   * Get the template subdirectory for a component type
   * Used when looking up components in the templates/ directory
   */
  getTemplateSubdir(type: string): string | undefined {
    const definition = this.types.get(type);
    if (!definition) {
      return undefined;
    }
    
    // For templates, we use plural directory names
    // This maintains backward compatibility with existing structure
    return definition.directory;
  }

  /**
   * Check if a type supports dependencies
   */
  supportsDependencies(type: string): boolean {
    return this.types.get(type)?.supportsDependencies || false;
  }

  /**
   * Check if a type supports global installation
   */
  supportsGlobalInstall(type: string): boolean {
    return this.types.get(type)?.supportsGlobalInstall || false;
  }

  /**
   * Validate component type
   */
  validateType(type: string): boolean {
    return this.types.has(type);
  }

  /**
   * Get valid component types for error messages
   */
  getValidTypes(): string[] {
    return Array.from(this.types.keys());
  }

  /**
   * Reset registry (mainly for testing)
   */
  reset(): void {
    this.types.clear();
    this.registerDefaultTypes();
  }
}