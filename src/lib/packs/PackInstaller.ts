/**
 * PackInstaller handles the actual installation of starter pack components
 */

import * as fs from "fs/promises";
import * as path from "path";
import { existsSync } from "fs";
import {
  PackStructure,
  PackInstallOptions,
  PackInstallationResult,
  PackConflictResolution,
  ProjectPackManifest,
} from "../types/packs";
import { logger } from "../logger";
import { MementoError } from "../errors";
import { DirectoryManager } from "../directoryManager";
import { IPackSource } from "./PackSource";

export class PackInstaller {
  private directoryManager: DirectoryManager;
  private projectRoot: string;
  private mementoDir: string;
  private claudeDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.directoryManager = new DirectoryManager(projectRoot);
    this.mementoDir = path.join(projectRoot, '.memento');
    this.claudeDir = path.join(projectRoot, '.claude');
  }

  /**
   * Install a starter pack to the project
   */
  async installPack(
    packStructure: PackStructure,
    source: IPackSource,
    options: PackInstallOptions = {}
  ): Promise<PackInstallationResult> {
    const { manifest } = packStructure;
    
    logger.info(`Installing starter pack '${manifest.name}' v${manifest.version}`);

    // Ensure directories exist
    await this.ensureDirectories();

    // Check for conflicts if not forcing
    if (!options.force) {
      const conflicts = await this.checkConflicts(manifest);
      if (conflicts.length > 0) {
        return {
          success: false,
          installed: { modes: [], workflows: [], agents: [], hooks: [] },
          skipped: { modes: [], workflows: [], agents: [], hooks: [] },
          errors: conflicts.map(c => `Conflict: ${c}`),
        };
      }
    }

    // Track installation results
    const installed = { modes: [], workflows: [], agents: [], hooks: [] };
    const skipped = { modes: [], workflows: [], agents: [], hooks: [] };
    const errors: string[] = [];

    try {
      // Install components by type
      await this.installComponents('modes', manifest, source, installed, skipped, errors, options);
      await this.installComponents('workflows', manifest, source, installed, skipped, errors, options);
      await this.installComponents('agents', manifest, source, installed, skipped, errors, options);
      await this.installComponents('hooks', manifest, source, installed, skipped, errors, options);

      // Install configuration
      if (manifest.configuration && !options.dryRun) {
        await this.installConfiguration(manifest);
      }

      // Update project pack manifest
      if (!options.dryRun) {
        await this.updateProjectManifest(manifest, source.getSourceInfo());
      }

      // Run post-install actions
      if (manifest.postInstall && !options.dryRun) {
        await this.runPostInstall(manifest);
      }

      const success = errors.length === 0;
      
      if (success) {
        logger.info(`Successfully installed starter pack '${manifest.name}'`);
      } else {
        logger.warn(`Pack installation completed with ${errors.length} errors`);
      }

      return {
        success,
        installed,
        skipped,
        errors,
        postInstallMessage: manifest.postInstall?.message,
      };

    } catch (error) {
      logger.error(`Failed to install pack '${manifest.name}': ${error}`);
      
      return {
        success: false,
        installed,
        skipped,
        errors: [...errors, `Installation failed: ${error}`],
      };
    }
  }

  /**
   * Uninstall a starter pack from the project
   */
  async uninstallPack(packName: string): Promise<PackInstallationResult> {
    logger.info(`Uninstalling starter pack '${packName}'`);

    const projectManifest = await this.loadProjectManifest();
    const packInfo = projectManifest.packs[packName];
    
    if (!packInfo) {
      return {
        success: false,
        installed: { modes: [], workflows: [], agents: [], hooks: [] },
        skipped: { modes: [], workflows: [], agents: [], hooks: [] },
        errors: [`Pack '${packName}' is not installed`],
      };
    }

    // TODO: Implement actual uninstallation logic
    // This would involve:
    // 1. Loading the pack manifest to know what components to remove
    // 2. Removing component files from .memento directories
    // 3. Removing agents from .claude directory
    // 4. Cleaning up configuration
    // 5. Updating project manifest

    return {
      success: true,
      installed: { modes: [], workflows: [], agents: [], hooks: [] },
      skipped: { modes: [], workflows: [], agents: [], hooks: [] },
      errors: [],
    };
  }

  /**
   * Install components of a specific type
   */
  private async installComponents(
    componentType: 'modes' | 'workflows' | 'agents' | 'hooks',
    manifest: PackStructure['manifest'],
    source: IPackSource,
    installed: PackInstallationResult['installed'],
    skipped: PackInstallationResult['skipped'],
    errors: string[],
    options: PackInstallOptions
  ): Promise<void> {
    const components = manifest.components[componentType];
    if (!components || components.length === 0) {
      return;
    }

    logger.debug(`Installing ${components.length} ${componentType}`);

    for (const component of components) {
      try {
        if (options.skipOptional && !component.required) {
          logger.debug(`Skipping optional ${componentType.slice(0, -1)} '${component.name}'`);
          skipped[componentType].push(component.name);
          continue;
        }

        const success = await this.installComponent(
          componentType,
          component.name,
          manifest.name,
          source,
          options
        );

        if (success) {
          installed[componentType].push(component.name);
          logger.debug(`Installed ${componentType.slice(0, -1)} '${component.name}'`);
        } else {
          skipped[componentType].push(component.name);
          logger.debug(`Skipped ${componentType.slice(0, -1)} '${component.name}' due to conflict`);
        }
      } catch (error) {
        errors.push(`Failed to install ${componentType.slice(0, -1)} '${component.name}': ${error}`);
      }
    }
  }

  /**
   * Install a single component
   */
  private async installComponent(
    componentType: 'modes' | 'workflows' | 'agents' | 'hooks',
    componentName: string,
    packName: string,
    source: IPackSource,
    options: PackInstallOptions
  ): Promise<boolean> {
    try {
      const sourcePath = await source.getComponentPath(packName, componentType, componentName);
      
      let targetPath: string;
      if (componentType === 'agents') {
        // Agents go to .claude directory
        targetPath = path.join(this.claudeDir, 'agents', `${componentName}.md`);
      } else {
        // Other components go to .memento directory
        targetPath = path.join(this.mementoDir, componentType, `${componentName}.md`);
      }

      // Check for conflicts
      if (existsSync(targetPath) && !options.force) {
        logger.debug(`Component '${componentName}' already exists, skipping`);
        return false;
      }

      if (options.dryRun) {
        logger.info(`[DRY RUN] Would install ${componentType.slice(0, -1)} '${componentName}'`);
        return true;
      }

      // Copy the component file
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.copyFile(sourcePath, targetPath);

      return true;
    } catch (error) {
      throw new MementoError(
        `Failed to install ${componentType.slice(0, -1)} '${componentName}'`,
        'COMPONENT_INSTALL_ERROR',
        `Error: ${error}`
      );
    }
  }

  /**
   * Install pack configuration
   */
  private async installConfiguration(manifest: PackStructure['manifest']): Promise<void> {
    if (!manifest.configuration) {
      return;
    }

    const configPath = path.join(this.mementoDir, 'config.json');
    let existingConfig: Record<string, unknown> = {};

    // Load existing config if it exists
    if (existsSync(configPath)) {
      try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        existingConfig = JSON.parse(configContent);
      } catch (error) {
        logger.warn(`Error reading existing config: ${error}`);
      }
    }

    // Merge configurations
    const mergedConfig = {
      ...existingConfig,
      ...manifest.configuration.projectSettings,
      defaultMode: manifest.configuration.defaultMode || existingConfig.defaultMode,
    };

    // Write updated config
    await fs.writeFile(configPath, JSON.stringify(mergedConfig, null, 2));
    logger.debug('Updated project configuration');
  }

  /**
   * Run post-install actions
   */
  private async runPostInstall(manifest: PackStructure['manifest']): Promise<void> {
    if (!manifest.postInstall?.commands) {
      return;
    }

    logger.debug('Running post-install commands');
    
    for (const command of manifest.postInstall.commands) {
      logger.debug(`Running: ${command}`);
      // TODO: Implement safe command execution
      // This would need to use a secure command runner that validates commands
      // against a whitelist and runs them in a restricted environment
    }
  }

  /**
   * Check for installation conflicts
   */
  private async checkConflicts(manifest: PackStructure['manifest']): Promise<string[]> {
    const conflicts: string[] = [];
    const componentTypes = ['modes', 'workflows', 'agents', 'hooks'] as const;

    for (const componentType of componentTypes) {
      const components = manifest.components[componentType];
      if (!components) continue;

      for (const component of components) {
        let targetPath: string;
        
        if (componentType === 'agents') {
          targetPath = path.join(this.claudeDir, 'agents', `${component.name}.md`);
        } else {
          targetPath = path.join(this.mementoDir, componentType, `${component.name}.md`);
        }

        if (existsSync(targetPath)) {
          conflicts.push(`${componentType.slice(0, -1)} '${component.name}' already exists`);
        }
      }
    }

    return conflicts;
  }

  /**
   * Update the project pack manifest
   */
  private async updateProjectManifest(
    packManifest: PackStructure['manifest'],
    source: any
  ): Promise<void> {
    const manifestPath = path.join(this.mementoDir, 'packs.json');
    let projectManifest: ProjectPackManifest = { packs: {} };

    // Load existing manifest
    if (existsSync(manifestPath)) {
      try {
        const content = await fs.readFile(manifestPath, 'utf-8');
        projectManifest = JSON.parse(content);
      } catch (error) {
        logger.warn(`Error reading project pack manifest: ${error}`);
      }
    }

    // Update with new pack info
    projectManifest.packs[packManifest.name] = {
      version: packManifest.version,
      installedAt: new Date().toISOString(),
      source,
    };

    // Save updated manifest
    await fs.writeFile(manifestPath, JSON.stringify(projectManifest, null, 2));
    logger.debug(`Updated project pack manifest for '${packManifest.name}'`);
  }

  /**
   * Load the project pack manifest
   */
  private async loadProjectManifest(): Promise<ProjectPackManifest> {
    const manifestPath = path.join(this.mementoDir, 'packs.json');
    
    if (!existsSync(manifestPath)) {
      return { packs: {} };
    }

    try {
      const content = await fs.readFile(manifestPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.warn(`Error reading project pack manifest: ${error}`);
      return { packs: {} };
    }
  }

  /**
   * Ensure necessary directories exist
   */
  private async ensureDirectories(): Promise<void> {
    await this.directoryManager.initializeStructure();
    
    // Ensure pack-specific directories exist
    const packDirs = [
      path.join(this.mementoDir, 'modes'),
      path.join(this.mementoDir, 'workflows'),
      path.join(this.mementoDir, 'hooks'),
      path.join(this.claudeDir, 'agents'),
    ];

    for (const dir of packDirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}