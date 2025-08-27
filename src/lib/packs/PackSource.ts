/**
 * PackSource interface and implementations for loading starter packs from different sources
 */

import * as fs from "fs/promises";
import * as path from "path";
import { existsSync } from "fs";
import {
  PackManifest,
  PackStructure,
  LocalPackSource as LocalPackSourceInterface,
} from "../types/packs";
import { logger } from "../logger";
import { MementoError } from "../errors";

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
}

/**
 * Local file system pack source implementation
 */
export class LocalPackSource implements IPackSource {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async loadPack(name: string): Promise<PackStructure> {
    const packPath = path.join(this.basePath, name);
    const manifestPath = path.join(packPath, 'manifest.json');
    const componentsPath = path.join(packPath, 'components');

    // Check if pack directory exists
    if (!existsSync(packPath)) {
      throw new MementoError(
        `Pack '${name}' not found in local source`,
        'PACK_NOT_FOUND',
        `Expected path: ${packPath}`
      );
    }

    // Check if manifest exists
    if (!existsSync(manifestPath)) {
      throw new MementoError(
        `Pack manifest not found for '${name}'`,
        'MANIFEST_NOT_FOUND',
        `Expected manifest at: ${manifestPath}`
      );
    }

    // Check if components directory exists
    if (!existsSync(componentsPath)) {
      throw new MementoError(
        `Components directory not found for pack '${name}'`,
        'COMPONENTS_NOT_FOUND',
        `Expected components at: ${componentsPath}`
      );
    }

    try {
      // Load and parse manifest
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent) as PackManifest;

      // Validate basic manifest structure
      if (!manifest.name || !manifest.version || !manifest.description) {
        throw new MementoError(
          `Invalid manifest for pack '${name}': missing required fields`,
          'INVALID_MANIFEST',
          'Manifest must contain name, version, and description'
        );
      }

      logger.debug(`Successfully loaded pack '${name}' from local source`);

      return {
        manifest,
        path: packPath,
        componentsPath,
      };
    } catch (error) {
      if (error instanceof MementoError) {
        throw error;
      }

      if (error instanceof SyntaxError) {
        throw new MementoError(
          `Invalid JSON in manifest for pack '${name}'`,
          'INVALID_JSON',
          `Manifest file contains invalid JSON: ${error.message}`
        );
      }

      throw new MementoError(
        `Failed to load pack '${name}': ${error}`,
        'PACK_LOAD_ERROR',
        'Check pack structure and permissions'
      );
    }
  }

  async listPacks(): Promise<string[]> {
    if (!existsSync(this.basePath)) {
      logger.debug(`Pack source directory does not exist: ${this.basePath}`);
      return [];
    }

    try {
      const entries = await fs.readdir(this.basePath, { withFileTypes: true });
      const packs: string[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const packName = entry.name;
          const manifestPath = path.join(this.basePath, packName, 'manifest.json');
          
          // Only include directories that have a manifest
          if (existsSync(manifestPath)) {
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
    const packPath = path.join(this.basePath, name);
    const manifestPath = path.join(packPath, 'manifest.json');
    
    return existsSync(packPath) && existsSync(manifestPath);
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
      const componentPath = path.join(
        packStructure.componentsPath,
        componentType,
        `${componentName}.md`
      );
      
      return existsSync(componentPath);
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
    
    return path.join(
      packStructure.componentsPath,
      componentType,
      `${componentName}.${extension}`
    );
  }
}