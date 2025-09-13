/**
 * PackSource interface and implementations for loading starter packs from different sources
 */

import { FileSystemAdapter } from "../adapters/FileSystemAdapter";
import { NodeFileSystemAdapter } from "../adapters/NodeFileSystemAdapter";
import {
  PackManifest,
  PackStructure,
  LocalPackSource as LocalPackSourceInterface,
} from "../types/packs";
import { logger } from "../logger";
import { ZccError } from "../errors";

/**
 * Abstract interface for pack sources
 */
export interface IPackSource {
  /**
   * Load a pack manifest and structure from the source
   */
  loadPack(name: string): Promise<PackStructure>;

  /**
   * List available packs from this source
   */
  listPacks(): Promise<string[]>;

  /**
   * Check if a pack exists in this source
   */
  hasPack(name: string): Promise<boolean>;

  /**
   * Get the source identifier
   */
  getSourceInfo(): LocalPackSourceInterface;

  /**
   * Get the path to a specific component file
   */
  getComponentPath(
    packName: string,
    componentType: 'modes' | 'workflows' | 'agents' | 'hooks',
    componentName: string
  ): Promise<string>;

  /**
   * Check if a specific component exists in the pack
   */
  hasComponent(
    packName: string,
    componentType: 'modes' | 'workflows' | 'agents' | 'hooks',
    componentName: string
  ): Promise<boolean>;
}

/**
 * Local file system pack source implementation
 */
export class LocalPackSource implements IPackSource {
  private readonly basePath: string;
  private fs: FileSystemAdapter;

  constructor(basePath: string, fs?: FileSystemAdapter) {
    this.basePath = basePath;
    this.fs = fs || new NodeFileSystemAdapter();
  }

  async loadPack(name: string): Promise<PackStructure> {
    const packPath = this.fs.join(this.basePath, name);
    const manifestPath = this.fs.join(packPath, 'manifest.json');

    // Check if pack directory exists
    if (!await this.fs.exists(packPath)) {
      throw new ZccError(
        `Pack '${name}' not found in local source`,
        'PACK_NOT_FOUND',
        `Expected path: ${packPath}`
      );
    }

    // Check if manifest exists
    if (!await this.fs.exists(manifestPath)) {
      throw new ZccError(
        `Pack manifest not found for '${name}'`,
        'MANIFEST_NOT_FOUND',
        `Expected manifest at: ${manifestPath}`
      );
    }

    try {
      // Load and parse manifest
      const manifestContent = await this.fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent as string) as PackManifest;

      // Validate basic manifest structure
      if (!manifest.name || !manifest.version || !manifest.description) {
        throw new ZccError(
          `Invalid manifest for pack '${name}': missing required fields`,
          'INVALID_MANIFEST',
          'Manifest must contain name, version, and description'
        );
      }

      logger.debug(`Successfully loaded pack '${name}' from local source`);

      return {
        manifest,
        path: packPath,
      };
    } catch (error) {
      if (error instanceof ZccError) {
        throw error;
      }

      if (error instanceof SyntaxError) {
        throw new ZccError(
          `Invalid JSON in manifest for pack '${name}'`,
          'INVALID_JSON',
          `Manifest file contains invalid JSON: ${error.message}`
        );
      }

      throw new ZccError(
        `Failed to load pack '${name}': ${error}`,
        'PACK_LOAD_ERROR',
        'Check pack structure and permissions'
      );
    }
  }

  async listPacks(): Promise<string[]> {
    if (!await this.fs.exists(this.basePath)) {
      logger.debug(`Pack source directory does not exist: ${this.basePath}`);
      return [];
    }

    try {
      const entries = await this.fs.readdir(this.basePath);
      const packs: string[] = [];

      for (const entry of entries) {
        const packName = entry;
        const packPath = this.fs.join(this.basePath, packName);
        const manifestPath = this.fs.join(this.basePath, packName, 'manifest.json');
        
        // Check if it's a directory and has a manifest
        if (await this.fs.exists(packPath)) {
          const stats = await this.fs.stat(packPath);
          if (stats.isDirectory() && await this.fs.exists(manifestPath)) {
            packs.push(packName);
          } else {
            logger.debug(`Skipping directory '${packName}' - no manifest found`);
          }
        }
      }

      logger.debug(`Found ${packs.length} packs in local source`);
      return packs.sort();
    } catch (error) {
      logger.warn(`Error listing packs from ${this.basePath}: ${error}`);
      return [];
    }
  }

  async hasPack(name: string): Promise<boolean> {
    const packPath = this.fs.join(this.basePath, name);
    const manifestPath = this.fs.join(packPath, 'manifest.json');
    
    return await this.fs.exists(packPath) && await this.fs.exists(manifestPath);
  }

  getSourceInfo(): LocalPackSourceInterface {
    return {
      name: 'local',
      type: 'local',
      path: this.basePath,
    };
  }

  /**
   * Verify that a component file exists in the pack
   */
  async hasComponent(
    packName: string,
    componentType: 'modes' | 'workflows' | 'agents' | 'hooks',
    componentName: string
  ): Promise<boolean> {
    try {
      const packStructure = await this.loadPack(packName);
      const extension = componentType === 'hooks' ? 'json' : 'md';
      const componentPath = this.fs.join(
        packStructure.path,
        componentType,
        `${componentName}.${extension}`
      );

      return await this.fs.exists(componentPath);
    } catch {
      return false;
    }
  }

  /**
   * Get the path to a specific component file
   */
  async getComponentPath(
    packName: string,
    componentType: 'modes' | 'workflows' | 'agents' | 'hooks',
    componentName: string
  ): Promise<string> {
    const packStructure = await this.loadPack(packName);
    const extension = componentType === 'hooks' ? 'json' : 'md';
    
    return this.fs.join(
      packStructure.path,
      componentType,
      `${componentName}.${extension}`
    );
  }
}