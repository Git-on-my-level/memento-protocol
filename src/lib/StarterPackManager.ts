import { logger } from "./logger";
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
import { FileSystemAdapter } from "./adapters/FileSystemAdapter";
import { NodeFileSystemAdapter } from "./adapters/NodeFileSystemAdapter";

/**
 * Clean StarterPackManager that orchestrates pack operations using specialized components
 * This is the main entry point for all starter pack functionality
 */
export class StarterPackManager {
  private registry: PackRegistry;
  private validator: PackValidator;
  private installer: PackInstaller;
  private fs: FileSystemAdapter;

  constructor(projectRoot: string, fs?: FileSystemAdapter) {
    this.fs = fs || new NodeFileSystemAdapter();
    this.registry = new PackRegistry(this.fs);
    this.validator = new PackValidator(this.fs);
    this.installer = new PackInstaller(projectRoot, this.fs);
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
   * Install a starter pack with iterative dependency resolution to prevent stack overflow
   */
  async installPack(
    packName: string,
    options: PackInstallOptions = {}
  ): Promise<PackInstallationResult> {
    await this.initialize();

    try {
      return await this.installPackWithQueue(packName, options);
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
   * Install a pack directly without processing dependencies
   * This method prevents circular dependency issues
   */
  async installPackDirect(
    packName: string,
    options: PackInstallOptions = {}
  ): Promise<PackInstallationResult> {
    await this.initialize();

    try {
      logger.debug(`Installing pack '${packName}' directly (no dependencies)`);
      
      // Load the pack
      const packStructure = await this.registry.loadPack(packName);
      const source = this.registry.getDefaultSource(); // Get default local source

      // Validate the pack
      const validation = await this.validator.validatePackStructure(packStructure, source);
      if (!validation.valid) {
        logger.warn(`Pack '${packName}' failed validation: ${validation.errors.join(', ')}`);
        return {
          success: false,
          installed: { modes: [], workflows: [], agents: [], hooks: [] },
          skipped: { modes: [], workflows: [], agents: [], hooks: [] },
          errors: validation.errors,
        };
      }

      // Install the pack itself (no dependency processing)
      return this.installer.installPack(packStructure, source, options);

    } catch (error) {
      logger.error(`Failed to install pack '${packName}' directly: ${error}`);
      
      return {
        success: false,
        installed: { modes: [], workflows: [], agents: [], hooks: [] },
        skipped: { modes: [], workflows: [], agents: [], hooks: [] },
        errors: [`Direct installation failed: ${error}`],
      };
    }
  }

  /**
   * Install a pack using iterative queue-based dependency resolution
   * This prevents stack overflow from deep dependency chains
   */
  private async installPackWithQueue(
    rootPackName: string,
    options: PackInstallOptions = {}
  ): Promise<PackInstallationResult> {
    const MAX_RETRIES = 3;
    const installQueue: string[] = [rootPackName];
    const installedPacks = new Set<string>();
    const failedPacks = new Set<string>();
    const retryCount = new Map<string, number>();
    
    let rootResult: PackInstallationResult = {
      success: false,
      installed: { modes: [], workflows: [], agents: [], hooks: [] },
      skipped: { modes: [], workflows: [], agents: [], hooks: [] },
      errors: [],
    };

    logger.debug(`Starting queue-based installation for '${rootPackName}'`);
    logger.debug(`Install queue: [${installQueue.join(', ')}]`);

    while (installQueue.length > 0) {
      const currentPack = installQueue.shift()!;
      
      // Skip if already installed or failed
      if (installedPacks.has(currentPack) || failedPacks.has(currentPack)) {
        logger.debug(`Skipping '${currentPack}' (already processed)`);
        continue;
      }

      logger.debug(`Processing pack '${currentPack}' from queue`);

      try {
        // Check dependencies first
        const dependencies = await this.registry.resolveDependencies(currentPack);
        
        // Handle missing and circular dependencies
        if (dependencies.missing.length > 0 || dependencies.circular.length > 0) {
          const errors = [
            ...dependencies.missing.map(dep => `Dependency '${dep}' not found`),
            ...dependencies.circular.map(dep => `Circular dependency: ${dep}`),
          ];
          
          logger.warn(`Pack '${currentPack}' has dependency issues: ${errors.join(', ')}`);
          
          if (currentPack === rootPackName) {
            return {
              success: false,
              installed: { modes: [], workflows: [], agents: [], hooks: [] },
              skipped: { modes: [], workflows: [], agents: [], hooks: [] },
              errors,
            };
          }
          
          failedPacks.add(currentPack);
          continue;
        }

        // Add uninstalled dependencies to queue (at the front for topological order)
        const uninstalledDeps = dependencies.resolved.filter(dep => 
          !installedPacks.has(dep) && !failedPacks.has(dep)
        );
        
        if (uninstalledDeps.length > 0) {
          logger.debug(`Adding dependencies to front of queue for '${currentPack}': [${uninstalledDeps.join(', ')}]`);
          // Add dependencies to the front of the queue
          installQueue.unshift(...uninstalledDeps);
          // Re-queue current pack after its dependencies
          installQueue.push(currentPack);
          continue;
        }

        // All dependencies satisfied, install the pack
        const installResult = await this.installPackDirect(currentPack, options);
        
        if (installResult.success) {
          logger.debug(`Successfully installed pack '${currentPack}'`);
          installedPacks.add(currentPack);
          
          // If this is the root pack, store the result
          if (currentPack === rootPackName) {
            rootResult = installResult;
          }
        } else {
          const currentRetries = retryCount.get(currentPack) || 0;
          
          if (currentRetries < MAX_RETRIES) {
            logger.warn(`Pack '${currentPack}' installation failed (attempt ${currentRetries + 1}/${MAX_RETRIES}), retrying`);
            retryCount.set(currentPack, currentRetries + 1);
            // Re-queue for retry
            installQueue.push(currentPack);
          } else {
            logger.error(`Pack '${currentPack}' failed after ${MAX_RETRIES} attempts: ${installResult.errors.join(', ')}`);
            failedPacks.add(currentPack);
            
            // If root pack fails, return failure
            if (currentPack === rootPackName) {
              return {
                success: false,
                installed: { modes: [], workflows: [], agents: [], hooks: [] },
                skipped: { modes: [], workflows: [], agents: [], hooks: [] },
                errors: [`Failed to install '${currentPack}' after ${MAX_RETRIES} attempts`, ...installResult.errors],
              };
            }
          }
        }

      } catch (error) {
        const currentRetries = retryCount.get(currentPack) || 0;
        
        if (currentRetries < MAX_RETRIES) {
          logger.warn(`Pack '${currentPack}' threw exception (attempt ${currentRetries + 1}/${MAX_RETRIES}), retrying: ${error}`);
          retryCount.set(currentPack, currentRetries + 1);
          installQueue.push(currentPack);
        } else {
          logger.error(`Pack '${currentPack}' threw exception after ${MAX_RETRIES} attempts: ${error}`);
          failedPacks.add(currentPack);
          
          if (currentPack === rootPackName) {
            return {
              success: false,
              installed: { modes: [], workflows: [], agents: [], hooks: [] },
              skipped: { modes: [], workflows: [], agents: [], hooks: [] },
              errors: [`Exception installing '${currentPack}' after ${MAX_RETRIES} attempts: ${error}`],
            };
          }
        }
      }
    }

    logger.debug(`Queue-based installation completed. Installed: [${Array.from(installedPacks).join(', ')}], Failed: [${Array.from(failedPacks).join(', ')}]`);

    // Return the root pack result
    if (!installedPacks.has(rootPackName)) {
      return {
        success: false,
        installed: { modes: [], workflows: [], agents: [], hooks: [] },
        skipped: { modes: [], workflows: [], agents: [], hooks: [] },
        errors: [`Root pack '${rootPackName}' was not successfully installed`],
      };
    }

    return rootResult;
  }

  /**
   * Get installed packs
   */
  async getInstalledPacks(): Promise<Record<string, any>> {
    await this.initialize();
    return this.installer.getInstalledPacks();
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