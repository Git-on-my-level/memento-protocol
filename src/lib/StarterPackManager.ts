import { logger } from "./logger";
import { MementoError } from "./errors";
import {
  PackStructure,
  PackInstallOptions,
  PackValidationResult,
  PackDependencyResult,
  PackInstallationResult,
  ProjectType,
} from "./types/packs";
import { PackRegistry } from "./packs/PackRegistry";
import { PackValidator } from "./packs/PackValidator";
import { PackInstaller } from "./packs/PackInstaller";
import { IPackSource } from "./packs/PackSource";

/**
 * Clean StarterPackManager that orchestrates pack operations using specialized components
 * This is the main entry point for all starter pack functionality
 */
export class StarterPackManager {
  private registry: PackRegistry;
  private validator: PackValidator;
  private installer: PackInstaller;

  constructor(projectRoot: string) {
    this.registry = new PackRegistry();
    this.validator = new PackValidator();
    this.installer = new PackInstaller(projectRoot);
  }

  /**
   * Initialize the manager components
   */
  private async initialize(): Promise<void> {
    await this.validator.initialize();
    logger.debug('StarterPackManager initialized');
  }

  /**
   * List all available starter packs
   */
  async listPacks(): Promise<PackStructure[]> {
    await this.initialize();
    return this.registry.listAvailablePacks();
  }

  /**
   * Load a specific starter pack by name
   */
  async loadPack(name: string, source?: string): Promise<PackStructure> {
    await this.initialize();
    return this.registry.loadPack(name, source);
  }

  /**
   * Validate a starter pack structure
   */
  async validatePack(packStructure: PackStructure, source: IPackSource): Promise<PackValidationResult> {
    await this.initialize();
    return this.validator.validatePackStructure(packStructure, source);
  }

  /**
   * Search packs by criteria
   */
  async searchPacks(criteria: {
    category?: string;
    tags?: string[];
    compatibleWith?: string[];
    author?: string;
  }): Promise<PackStructure[]> {
    await this.initialize();
    return this.registry.searchPacks(criteria);
  }

  /**
   * Get recommended packs for a project type
   */
  async getRecommendedPacks(projectType: ProjectType): Promise<PackStructure[]> {
    await this.initialize();
    return this.registry.getRecommendedPacks(projectType);
  }

  /**
   * Check if a pack exists
   */
  async hasPack(packName: string): Promise<boolean> {
    return this.registry.hasPack(packName);
  }

  /**
   * Resolve dependencies for a starter pack
   */
  async resolveDependencies(packName: string): Promise<PackDependencyResult> {
    await this.initialize();
    return this.registry.resolveDependencies(packName);
  }

  /**
   * Install a starter pack
   */
  async installPack(
    packName: string,
    options: PackInstallOptions = {}
  ): Promise<PackInstallationResult> {
    await this.initialize();

    try {
      // Load the pack
      const packStructure = await this.registry.loadPack(packName);
      const source = this.registry['sources'].get('local')!; // Get local source

      // Validate the pack
      const validation = await this.validator.validatePackStructure(packStructure, source);
      if (!validation.valid) {
        return {
          success: false,
          installed: { modes: [], workflows: [], agents: [], hooks: [] },
          skipped: { modes: [], workflows: [], agents: [], hooks: [] },
          errors: validation.errors,
        };
      }

      // Check dependencies
      const dependencies = await this.registry.resolveDependencies(packName);
      if (dependencies.missing.length > 0 || dependencies.circular.length > 0) {
        const errors = [
          ...dependencies.missing.map(dep => `Dependency '${dep}' not found`),
          ...dependencies.circular.map(dep => `Circular dependency: ${dep}`),
        ];
        
        return {
          success: false,
          installed: { modes: [], workflows: [], agents: [], hooks: [] },
          skipped: { modes: [], workflows: [], agents: [], hooks: [] },
          errors,
        };
      }

      // Install dependencies first
      for (const depName of dependencies.resolved) {
        const depResult = await this.installPack(depName, { ...options, skipOptional: false });
        if (!depResult.success) {
          logger.warn(`Failed to install dependency '${depName}', continuing anyway`);
        }
      }

      // Install the pack itself
      return this.installer.installPack(packStructure, source, options);

    } catch (error) {
      logger.error(`Failed to install pack '${packName}': ${error}`);
      
      return {
        success: false,
        installed: { modes: [], workflows: [], agents: [], hooks: [] },
        skipped: { modes: [], workflows: [], agents: [], hooks: [] },
        errors: [`Installation failed: ${error}`],
      };
    }
  }

  /**
   * Uninstall a starter pack
   */
  async uninstallPack(packName: string): Promise<PackInstallationResult> {
    await this.initialize();
    return this.installer.uninstallPack(packName);
  }

  /**
   * Register a custom pack source
   */
  registerPackSource(name: string, source: IPackSource): void {
    this.registry.registerSource(name, source);
  }

  /**
   * Get registry statistics
   */
  async getRegistryStats(): Promise<{
    totalPacks: number;
    sourceCount: number;
    categoryCounts: Record<string, number>;
    authorCounts: Record<string, number>;
  }> {
    await this.initialize();
    return this.registry.getRegistryStats();
  }

  /**
   * Clear internal caches
   */
  clearCache(): void {
    this.registry.clearCache();
  }
}