/**
 * PackInstaller handles the actual installation of starter pack components
 */

import * as path from "path";
import { FileSystemAdapter } from "../adapters/FileSystemAdapter";
import { NodeFileSystemAdapter } from "../adapters/NodeFileSystemAdapter";
import {
  PackStructure,
  PackInstallOptions,
  PackInstallationResult,
  // PackConflictResolution, // TODO: unused for now
  ProjectPackManifest,
} from "../types/packs";
import { logger } from "../logger";
import { MementoError } from "../errors";
import { DirectoryManager } from "../directoryManager";
import { IPackSource } from "./PackSource";
import { ToolDependencyChecker, ToolDependency } from "./ToolDependencyChecker";

export class PackInstaller {
  private directoryManager: DirectoryManager;
  // projectRoot will be used in future implementation
  private mementoDir: string;
  private claudeDir: string;
  private fs: FileSystemAdapter;
  private toolChecker: ToolDependencyChecker;

  constructor(projectRoot: string, fs?: FileSystemAdapter) {
    this.fs = fs || new NodeFileSystemAdapter();
    // this._projectRoot = projectRoot; // TODO: store for future use
    this.directoryManager = new DirectoryManager(projectRoot);
    this.mementoDir = this.fs.join(projectRoot, '.memento');
    this.claudeDir = this.fs.join(projectRoot, '.claude');
    this.toolChecker = new ToolDependencyChecker();
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

    // Check tool dependencies and provide installation guidance
    await this.checkAndReportToolDependencies(manifest, options);

    // Track installation results
    const installed = { modes: [] as string[], workflows: [] as string[], agents: [] as string[], hooks: [] as string[] };
    const skipped = { modes: [] as string[], workflows: [] as string[], agents: [] as string[], hooks: [] as string[] };
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
        installed: installed as PackInstallationResult['installed'],
        skipped: skipped as PackInstallationResult['skipped'],
        errors: errors as readonly string[],
        postInstallMessage: manifest.postInstall?.message,
      };

    } catch (error) {
      logger.error(`Failed to install pack '${manifest.name}': ${error}`);
      
      return {
        success: false,
        installed: installed as PackInstallationResult['installed'],
        skipped: skipped as PackInstallationResult['skipped'],
        errors: [...errors, `Installation failed: ${error}`] as readonly string[],
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
(skipped[componentType] as string[]).push(component.name);
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
(installed[componentType] as string[]).push(component.name);
          logger.debug(`Installed ${componentType.slice(0, -1)} '${component.name}'`);
        } else {
(skipped[componentType] as string[]).push(component.name);
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
      // Get the component path from the pack source
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
      if (await this.fs.exists(targetPath) && !options.force) {
        logger.debug(`Component '${componentName}' already exists, skipping`);
        return false;
      }

      if (options.dryRun) {
        logger.info(`[DRY RUN] Would install ${componentType.slice(0, -1)} '${componentName}'`);
        return true;
      }

      // Copy the component file
      await this.fs.mkdir(this.fs.dirname(targetPath), { recursive: true });
      await this.fs.copyFile(sourcePath, targetPath);

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

    const configPath = this.fs.join(this.mementoDir, 'config.json');
    let existingConfig: Record<string, unknown> = {};

    // Load existing config if it exists
    if (await this.fs.exists(configPath)) {
      try {
        const configContent = await this.fs.readFile(configPath, 'utf-8');
        existingConfig = JSON.parse(configContent as string);
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
    await this.fs.writeFile(configPath, JSON.stringify(mergedConfig, null, 2));
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
          targetPath = this.fs.join(this.claudeDir, 'agents', `${component.name}.md`);
        } else {
          targetPath = this.fs.join(this.mementoDir, componentType, `${component.name}.md`);
        }

        if (await this.fs.exists(targetPath)) {
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
    const manifestPath = this.fs.join(this.mementoDir, 'packs.json');
    let projectManifest: ProjectPackManifest = { packs: {} };

    // Load existing manifest
    if (await this.fs.exists(manifestPath)) {
      try {
        const content = await this.fs.readFile(manifestPath, 'utf-8');
        projectManifest = JSON.parse(content as string);
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
    await this.fs.writeFile(manifestPath, JSON.stringify(projectManifest, null, 2));
    logger.debug(`Updated project pack manifest for '${packManifest.name}'`);
  }

  /**
   * Load the project pack manifest
   */
  private async loadProjectManifest(): Promise<ProjectPackManifest> {
    const manifestPath = this.fs.join(this.mementoDir, 'packs.json');
    
    if (!await this.fs.exists(manifestPath)) {
      return { packs: {} };
    }

    try {
      const content = await this.fs.readFile(manifestPath, 'utf-8');
      return JSON.parse(content as string);
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
      this.fs.join(this.mementoDir, 'modes'),
      this.fs.join(this.mementoDir, 'workflows'),
      this.fs.join(this.mementoDir, 'hooks'),
      this.fs.join(this.claudeDir, 'agents'),
    ];

    for (const dir of packDirs) {
      await this.fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Check tool dependencies and provide installation guidance
   */
  private async checkAndReportToolDependencies(
    manifest: PackStructure['manifest'],
    options: PackInstallOptions
  ): Promise<void> {
    // Extract tool dependencies from manifest
    const toolDependencies = this.extractToolDependencies(manifest);
    
    if (toolDependencies.length === 0) {
      return;
    }

    logger.debug(`Checking ${toolDependencies.length} tool dependencies for pack '${manifest.name}'`);

    try {
      const results = await this.toolChecker.checkToolDependencies(
        toolDependencies,
        { interactive: options.interactive }
      );

      const guidance = this.toolChecker.generateInstallationGuidance(results);
      
      // Report findings
      if (guidance.warningMessage) {
        if (guidance.required.length > 0) {
          logger.warn(guidance.warningMessage);
        } else {
          logger.info(guidance.warningMessage);
        }
      }

      // Show installation steps if any tools need installation
      if (guidance.installationSteps.length > 0) {
        logger.info('Tool installation commands:');
        guidance.installationSteps.forEach(step => {
          if (step.startsWith('#')) {
            logger.info(step);
          } else if (step.trim()) {
            logger.info(`  ${step}`);
          }
        });
      }

      // Report available tools
      const availableTools = results.filter(r => r.result.available);
      if (availableTools.length > 0) {
        logger.debug(
          `Available tools: ${availableTools
            .map(r => `${r.tool.name}${r.result.version ? ` (${r.result.version})` : ''}`)
            .join(', ')}`
        );
      }

    } catch (error) {
      logger.debug(`Error checking tool dependencies: ${error}`);
      // Don't fail installation due to tool checking errors
    }
  }

  /**
   * Extract tool dependencies from pack manifest
   */
  private extractToolDependencies(manifest: PackStructure['manifest']): ToolDependency[] {
    const toolDependencies: ToolDependency[] = [];
    
    // Check if manifest has dependencies.tools field (extended manifest structure)
    const manifestAny = manifest as any;
    if (manifestAny.dependencies?.tools) {
      for (const tool of manifestAny.dependencies.tools) {
        toolDependencies.push({
          name: tool.name,
          version: tool.version,
          required: tool.required !== false, // Default to required
          installCommand: tool.installCommand,
          description: tool.description,
        });
      }
    }

    return toolDependencies;
  }
}