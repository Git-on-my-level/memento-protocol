import { ComponentTypeRegistry } from './ComponentTypeRegistry';
import { ZccCore } from './ZccCore';
import { ComponentInstaller } from './componentInstaller';
import { BuiltinComponentProvider } from './BuiltinComponentProvider';
import { logger } from './logger';
import { FileSystemAdapter } from './adapters/FileSystemAdapter';
import { NodeFileSystemAdapter } from './adapters/NodeFileSystemAdapter';
import { ComponentInfo } from './ZccScope';

export interface ComponentSource {
  name: string;
  type: 'builtin' | 'global' | 'project' | 'remote';
  priority: number;
}

export interface UnifiedComponent extends ComponentInfo {
  source: ComponentSource;
  installed?: boolean;
  version?: string;
}

/**
 * Unified component management system that consolidates:
 * - BuiltinComponentProvider (templates/)
 * - ZccScope (global & project)
 * - ComponentInstaller (manifest.json)
 * 
 * This eliminates the need for three separate systems and provides
 * a single interface for all component operations.
 */
export class ComponentManager {
  private typeRegistry: ComponentTypeRegistry;
  private zccCore: ZccCore;
  private installer: ComponentInstaller;
  private builtinProvider: BuiltinComponentProvider;
  private fs: FileSystemAdapter;

  constructor(projectRoot: string, fs?: FileSystemAdapter) {
    this.fs = fs || new NodeFileSystemAdapter();
    this.typeRegistry = ComponentTypeRegistry.getInstance(this.fs);
    this.zccCore = new ZccCore(projectRoot, this.fs);
    this.installer = new ComponentInstaller(projectRoot, this.fs);
    this.builtinProvider = new BuiltinComponentProvider();
  }

  /**
   * Get a component from any source with proper precedence
   * Priority: project > global > builtin
   */
  async getComponent(type: string, name: string): Promise<UnifiedComponent | null> {
    // Validate type
    if (!this.typeRegistry.validateType(type)) {
      logger.warn(`Invalid component type: ${type}`);
      return null;
    }

    // Check project scope first
    const projectComponent = await this.zccCore.getScopes().project.getComponent(name, type as ComponentInfo['type']);
    if (projectComponent) {
      return {
        ...projectComponent,
        source: { name: 'project', type: 'project', priority: 3 },
        installed: true,
      };
    }

    // Check global scope
    const globalComponent = await this.zccCore.getScopes().global.getComponent(name, type as ComponentInfo['type']);
    if (globalComponent) {
      return {
        ...globalComponent,
        source: { name: 'global', type: 'global', priority: 2 },
        installed: true,
      };
    }

    // Check builtin templates
    const builtinComponent = await this.builtinProvider.getComponent(name, type as ComponentInfo['type']);
    if (builtinComponent) {
      return {
        ...builtinComponent,
        source: { name: 'builtin', type: 'builtin', priority: 1 },
        installed: false,
      };
    }

    return null;
  }

  /**
   * List all components of a specific type from all sources
   */
  async listComponents(type?: string): Promise<UnifiedComponent[]> {
    const components: UnifiedComponent[] = [];
    const seen = new Set<string>();

    // Validate type if provided
    if (type && !this.typeRegistry.validateType(type)) {
      logger.warn(`Invalid component type: ${type}`);
      return [];
    }

    // Get types to list
    const typesToList = type ? [type] : this.typeRegistry.getTypeNames();

    for (const componentType of typesToList) {
      // Skip types that don't have standard component behavior
      if (['script', 'hook', 'command', 'template'].includes(componentType)) {
        continue;
      }

      // Get from all sources
      const projectComponents = await this.zccCore.getScopes().project.getComponentsByType(componentType as ComponentInfo['type']);
      const globalComponents = await this.zccCore.getScopes().global.getComponentsByType(componentType as ComponentInfo['type']);
      const builtinComponents = await this.builtinProvider.getComponentsByType(componentType as ComponentInfo['type']);

      // Add with proper source tracking (project overrides global overrides builtin)
      for (const comp of projectComponents) {
        const key = `${comp.type}:${comp.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          components.push({
            ...comp,
            source: { name: 'project', type: 'project', priority: 3 },
            installed: true,
          });
        }
      }

      for (const comp of globalComponents) {
        const key = `${comp.type}:${comp.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          components.push({
            ...comp,
            source: { name: 'global', type: 'global', priority: 2 },
            installed: true,
          });
        }
      }

      for (const comp of builtinComponents) {
        const key = `${comp.type}:${comp.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          components.push({
            ...comp,
            source: { name: 'builtin', type: 'builtin', priority: 1 },
            installed: false,
          });
        }
      }
    }

    return components;
  }

  /**
   * Install a component to project or global scope
   */
  async installComponent(
    type: string,
    name: string,
    options: {
      global?: boolean;
      force?: boolean;
      source?: 'builtin' | 'remote';
    } = {}
  ): Promise<void> {
    // Validate type
    if (!this.typeRegistry.validateType(type)) {
      throw new Error(`Invalid component type: ${type}. Valid types: ${this.typeRegistry.getValidTypes().join(', ')}`);
    }

    // Check if type supports global installation
    if (options.global && !this.typeRegistry.supportsGlobalInstall(type)) {
      throw new Error(`Component type '${type}' does not support global installation`);
    }

    // For now, delegate to existing installer
    // In future, this will handle remote sources, versioning, etc.
    if (['mode', 'workflow', 'agent'].includes(type)) {
      await this.installer.installComponent(
        type as 'mode' | 'workflow' | 'agent',
        name,
        options.force
      );
    } else {
      throw new Error(`Installation not yet supported for component type: ${type}`);
    }
  }

  /**
   * Register a new component type
   */
  registerComponentType(type: string, definition: any): void {
    this.typeRegistry.register(type, definition);
    logger.info(`Registered new component type: ${type}`);
  }

  /**
   * Get available component types
   */
  getComponentTypes(): string[] {
    return this.typeRegistry.getTypeNames();
  }

  /**
   * Check if a component is installed
   */
  async isInstalled(type: string, name: string): Promise<boolean> {
    const component = await this.getComponent(type, name);
    return component?.installed || false;
  }

  /**
   * Get component metadata
   */
  async getComponentMetadata(type: string, name: string): Promise<any> {
    const component = await this.getComponent(type, name);
    return component?.metadata || null;
  }

  /**
   * Validate a component type
   */
  isValidType(type: string): boolean {
    return this.typeRegistry.validateType(type);
  }

  /**
   * Get type registry for advanced operations
   */
  getTypeRegistry(): ComponentTypeRegistry {
    return this.typeRegistry;
  }
}