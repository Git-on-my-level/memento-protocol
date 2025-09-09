/**
 * PackInstaller handles the actual installation of starter pack components
 */

import { FileSystemAdapter } from "../adapters/FileSystemAdapter";
import { NodeFileSystemAdapter } from "../adapters/NodeFileSystemAdapter";
import {
  PackStructure,
  PackInstallOptions,
  PackInstallationResult,
  // PackConflictResolution, // TODO: unused for now
  ProjectPackManifest,
  PackHook,
} from "../types/packs";
import { logger } from "../logger";
import { ZccError } from "../errors";
import { DirectoryManager } from "../directoryManager";
import { IPackSource } from "./PackSource";
import { ToolDependencyChecker, ToolDependency } from "./ToolDependencyChecker";
import { HookManager } from "../hooks/HookManager";
import { isVerbose } from "../context";
import { FileRegistry } from "./FileRegistry";

export class PackInstaller {
  private directoryManager: DirectoryManager;
  private projectRoot: string;
  private zccDir: string;
  private claudeDir: string;
  private fs: FileSystemAdapter;
  private toolChecker: ToolDependencyChecker;
  private hookManager: HookManager;
  private fileRegistry: FileRegistry;

  constructor(projectRoot: string, fs?: FileSystemAdapter) {
    this.fs = fs || new NodeFileSystemAdapter();
    this.projectRoot = projectRoot;
    this.directoryManager = new DirectoryManager(projectRoot);
    this.zccDir = this.fs.join(projectRoot, '.zcc');
    this.claudeDir = this.fs.join(projectRoot, '.claude');
    this.toolChecker = new ToolDependencyChecker();
    this.hookManager = new HookManager(projectRoot, this.fs);
    this.fileRegistry = new FileRegistry(projectRoot, this.fs);
  }

  /**
   * Install a starter pack to the project
   */
  async installPack(
    packStructure: PackStructure,
    _source: IPackSource,
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

      // Install scripts from the pack
      if (!options.dryRun) {
        await this.installScripts(packStructure, source, errors);
      }

      // Install configuration and hooks
      if (!options.dryRun) {
        if (manifest.configuration) {
          await this.installConfiguration(manifest);
        }
        
        // Configure hooks (independent of configuration section)
        if (manifest.hooks && manifest.hooks.length > 0) {
          await this.configureHooks(manifest.hooks);
        }
      }

      // Update project pack manifest and save manifest snapshot
      if (!options.dryRun) {
        // Register pack in FileRegistry
        await this.fileRegistry.registerPack(manifest.name, manifest.version);
        
        // Keep old system for backwards compatibility
        await this.updateProjectManifest(manifest, source.getSourceInfo());
        await this.saveManifestSnapshot(manifest);
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
   * Get installed packs
   */
  async getInstalledPacks(): Promise<Record<string, any>> {
    const projectManifest = await this.loadProjectManifest();
    return projectManifest.packs || {};
  }

  /**
   * Uninstall a starter pack from the project
   */
  async uninstallPack(packName: string): Promise<PackInstallationResult> {
    logger.info(`Uninstalling starter pack '${packName}'`);

    // Check if pack is registered
    const packFiles = await this.fileRegistry.getPackFiles(packName);
    
    if (packFiles.length === 0) {
      // Check old project manifest for backwards compatibility
      const projectManifest = await this.loadProjectManifest();
      if (!projectManifest.packs[packName]) {
        return {
          success: false,
          installed: { modes: [], workflows: [], agents: [], hooks: [] },
          skipped: { modes: [], workflows: [], agents: [], hooks: [] },
          errors: [`Pack '${packName}' is not installed`],
        };
      }
    }

    // Track removal results
    const removed = { modes: [] as string[], workflows: [] as string[], agents: [] as string[], hooks: [] as string[] };
    const skipped = { modes: [] as string[], workflows: [] as string[], agents: [] as string[], hooks: [] as string[] };
    const errors: string[] = [];

    try {
      // Remove all files owned by this pack
      for (const filePath of packFiles) {
        try {
          // Check if file has been modified
          const isModified = await this.fileRegistry.isFileModified(filePath);
          
          if (isModified) {
            logger.debug(`File '${filePath}' has been modified, skipping removal`);
            const componentType = this.getComponentTypeFromPath(filePath);
            const componentName = this.fs.basename(filePath).replace(/\.(md|json|sh)$/, '');
            if (componentType) {
              (skipped[componentType] as string[]).push(componentName);
            }
            continue;
          }

          // Safe to remove
          if (await this.fs.exists(filePath)) {
            await this.fs.unlink(filePath);
            await this.fileRegistry.unregisterFile(filePath);
            
            const componentType = this.getComponentTypeFromPath(filePath);
            const componentName = this.fs.basename(filePath).replace(/\.(md|json|sh)$/, '');
            if (componentType) {
              (removed[componentType] as string[]).push(componentName);
            }
            logger.debug(`Removed file: ${filePath}`);
          }
        } catch (error) {
          errors.push(`Failed to remove file '${filePath}': ${error}`);
        }
      }

      // Clean up empty directories
      await this.cleanupEmptyDirectories();

      // Unregister pack from FileRegistry
      await this.fileRegistry.unregisterPack(packName);

      // Clean up pack-specific configuration (for backwards compatibility)
      await this.cleanupPackConfiguration(packName, null, errors);

      // Remove manifest snapshot and update project manifest (for backwards compatibility)
      await this.removeManifestSnapshot(packName);
      await this.removeFromProjectManifest(packName);

      const success = errors.length === 0;
      
      if (success) {
        logger.info(`Successfully uninstalled starter pack '${packName}'`);
      } else {
        logger.warn(`Pack uninstallation completed with ${errors.length} errors`);
      }

      return {
        success,
        installed: removed as PackInstallationResult['installed'],
        skipped: skipped as PackInstallationResult['skipped'],
        errors: errors as readonly string[],
      };

    } catch (error) {
      logger.error(`Failed to uninstall pack '${packName}': ${error}`);
      
      return {
        success: false,
        installed: removed as PackInstallationResult['installed'],
        skipped: skipped as PackInstallationResult['skipped'],
        errors: [...errors, `Uninstallation failed: ${error}`] as readonly string[],
      };
    }
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
      const extension = componentType === 'hooks' ? '.json' : '.md';
      
      if (componentType === 'agents') {
        // Agents go to .claude directory
        targetPath = this.fs.join(this.claudeDir, 'agents', `${componentName}${extension}`);
      } else {
        // Other components go to .zcc directory
        targetPath = this.fs.join(this.zccDir, componentType, `${componentName}${extension}`);
      }

      // Check if file is already registered to another pack
      const existingInfo = await this.fileRegistry.getFileInfo(targetPath);
      if (existingInfo && existingInfo.pack !== packName && !options.force) {
        logger.debug(`Component '${componentName}' already owned by pack '${existingInfo.pack}', skipping`);
        return false;
      }

      if (options.dryRun) {
        logger.info(`[DRY RUN] Would install ${componentType.slice(0, -1)} '${componentName}'`);
        return true;
      }

      // Copy the component file
      await this.fs.mkdir(this.fs.dirname(targetPath), { recursive: true });
      await this.fs.copyFile(sourcePath, targetPath);

      // Register the file in the FileRegistry
      await this.fileRegistry.registerFile(targetPath, packName, sourcePath);

      return true;
    } catch (error) {
      throw new ZccError(
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

    const configPath = this.fs.join(this.zccDir, 'config.json');
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
   * Install scripts from the pack
   */
  private async installScripts(
    packStructure: PackStructure,
    _source: IPackSource,
    errors: string[]
  ): Promise<void> {
    try {
      const scriptsSourcePath = this.fs.join(packStructure.path, 'scripts');
      const scriptsTargetPath = this.fs.join(this.zccDir, 'scripts');

      // Check if pack has scripts directory
      if (!await this.fs.exists(scriptsSourcePath)) {
        logger.debug(`Pack '${packStructure.manifest.name}' has no scripts directory`);
        return;
      }

      // Ensure target scripts directory exists
      await this.fs.mkdir(scriptsTargetPath, { recursive: true });

      // Get list of scripts in the pack
      const scripts = await this.fs.readdir(scriptsSourcePath);
      
      for (const script of scripts) {
        const sourcePath = this.fs.join(scriptsSourcePath, script);
        const targetPath = this.fs.join(scriptsTargetPath, script);
        
        try {
          // Check if it's a file (not a directory)
          const stats = await this.fs.stat(sourcePath);
          if (!stats.isDirectory()) {
            // Check for conflicts in FileRegistry
            const existingInfo = await this.fileRegistry.getFileInfo(targetPath);
            if (existingInfo && existingInfo.pack !== packStructure.manifest.name) {
              errors.push(`Script '${script}' already owned by pack '${existingInfo.pack}'`);
              continue;
            }
            
            // Copy the script file
            await this.fs.copyFile(sourcePath, targetPath);
            
            // Make it executable if it's a shell script
            if (script.endsWith('.sh')) {
              await this.fs.chmod(targetPath, 0o755);
            }
            
            // Register in FileRegistry
            await this.fileRegistry.registerFile(targetPath, packStructure.manifest.name, sourcePath);
            
            logger.debug(`Installed script: ${script}`);
          }
        } catch (error) {
          errors.push(`Failed to install script '${script}': ${error}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to install scripts: ${error}`);
    }
  }

  /**
   * Configure hooks specified in pack manifest
   */
  private async configureHooks(packHooks: readonly PackHook[]): Promise<void> {
    try {
      for (const hookConfig of packHooks) {
        logger.debug(`Configuring hook: ${hookConfig.name}`);
        
        if (hookConfig.enabled) {
          // Try to create/enable the hook from template if it exists
          try {
            await this.hookManager.createHookFromTemplate(hookConfig.name, {
              id: hookConfig.name,
              enabled: hookConfig.enabled,
              ...(hookConfig.config || {}),
            });
            logger.debug(`Successfully configured hook: ${hookConfig.name}`);
          } catch (error) {
            logger.warn(`Failed to configure hook '${hookConfig.name}': ${error}`);
            // Don't fail installation if hook configuration fails
          }
        }
      }
    } catch (error) {
      logger.warn(`Error configuring pack hooks: ${error}`);
      // Don't fail installation if hook configuration fails
    }
  }

  /**
   * Run post-install actions
   * 
   * SECURITY: Post-install command execution is disabled to prevent RCE vulnerabilities.
   * Untrusted starter pack manifests could contain malicious commands.
   */
  private async runPostInstall(manifest: PackStructure['manifest']): Promise<void> {
    if (!manifest.postInstall?.commands) {
      return;
    }

    // SECURITY CRITICAL: Command execution completely disabled
    logger.warn('Security: Post-install commands disabled (use --verbose for details)');
    
    if (isVerbose()) {
      logger.warn('⚠️  Post-install commands could allow arbitrary code execution from untrusted sources');
      logger.warn('⚠️  Found commands in manifest but they will NOT be executed:');
      
      for (const command of manifest.postInstall.commands) {
        logger.warn(`⚠️    - ${command}`);
      }
      
      logger.warn('⚠️  If you trust this pack and need these commands, run them manually');
      logger.warn('⚠️  Never run commands from untrusted starter packs');
    }
  }

  /**
   * Check for installation conflicts
   */
  private async checkConflicts(manifest: PackStructure['manifest']): Promise<string[]> {
    const conflicts: string[] = [];
    const componentTypes = ['modes', 'workflows', 'agents', 'hooks'] as const;
    const allTargetPaths: string[] = [];

    // Collect all target paths for this pack
    for (const componentType of componentTypes) {
      const components = manifest.components[componentType];
      if (!components) continue;

      for (const component of components) {
        let targetPath: string;
        
        if (componentType === 'agents') {
          targetPath = this.fs.join(this.claudeDir, 'agents', `${component.name}.md`);
        } else if (componentType === 'hooks') {
          targetPath = this.fs.join(this.zccDir, componentType, `${component.name}.json`);
        } else {
          targetPath = this.fs.join(this.zccDir, componentType, `${component.name}.md`);
        }

        allTargetPaths.push(targetPath);
      }
    }

    // Check for conflicts using FileRegistry
    const registryConflicts = await this.fileRegistry.checkConflicts(allTargetPaths);
    for (const conflict of registryConflicts) {
      conflicts.push(`File '${conflict.path}' already owned by pack '${conflict.existingPack}'`);
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
    const manifestPath = this.fs.join(this.zccDir, 'packs.json');
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
    const manifestPath = this.fs.join(this.zccDir, 'packs.json');
    
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
    logger.debug(`Ensuring directories for project: ${this.projectRoot}`);
    
    // Ensure pack-specific directories exist
    const packDirs = [
      this.fs.join(this.zccDir, 'modes'),
      this.fs.join(this.zccDir, 'workflows'),
      this.fs.join(this.zccDir, 'hooks'),
      this.fs.join(this.zccDir, 'packs'),
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



  /**
   * Clean up pack-specific configuration
   */
  private async cleanupPackConfiguration(
    packName: string,
    manifest: PackStructure['manifest'] | null,
    errors: string[]
  ): Promise<void> {
    try {
      const configPath = this.fs.join(this.zccDir, 'config.json');
      
      if (!await this.fs.exists(configPath)) {
        return; // No config to clean up
      }

      // Load existing config
      const configContent = await this.fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent as string);

      // If we have the manifest, we can clean up specific settings that were added by this pack
      if (manifest && manifest.configuration) {
        let configChanged = false;

        // Reset default mode if it was set by this pack
        if (manifest.configuration.defaultMode && config.defaultMode === manifest.configuration.defaultMode) {
          delete config.defaultMode;
          configChanged = true;
          logger.debug(`Removed default mode setting from pack '${packName}'`);
        }

        // Remove pack-specific settings
        if (manifest.configuration.projectSettings) {
          for (const key of Object.keys(manifest.configuration.projectSettings)) {
            if (key in config) {
              delete config[key];
              configChanged = true;
              logger.debug(`Removed config setting '${key}' from pack '${packName}'`);
            }
          }
        }

        // Write updated config if changes were made
        if (configChanged) {
          await this.fs.writeFile(configPath, JSON.stringify(config, null, 2));
          logger.debug(`Updated project configuration after removing pack '${packName}'`);
        }
      } else {
        logger.debug(`Pack manifest not available - skipping configuration cleanup for '${packName}'`);
      }

    } catch (error) {
      errors.push(`Failed to clean up configuration for pack '${packName}': ${error}`);
    }
  }

  /**
   * Save manifest snapshot for precise uninstall
   */
  private async saveManifestSnapshot(manifest: PackStructure['manifest']): Promise<void> {
    try {
      const snapshotPath = this.fs.join(this.zccDir, 'packs', `${manifest.name}.manifest.json`);
      await this.fs.writeFile(snapshotPath, JSON.stringify(manifest, null, 2));
      logger.debug(`Saved manifest snapshot for pack '${manifest.name}'`);
    } catch (error) {
      logger.warn(`Failed to save manifest snapshot for pack '${manifest.name}': ${error}`);
      // Don't fail installation for snapshot errors
    }
  }


  /**
   * Remove manifest snapshot
   */
  private async removeManifestSnapshot(packName: string): Promise<void> {
    try {
      const snapshotPath = this.fs.join(this.zccDir, 'packs', `${packName}.manifest.json`);
      
      if (await this.fs.exists(snapshotPath)) {
        await this.fs.unlink(snapshotPath);
        logger.debug(`Removed manifest snapshot for pack '${packName}'`);
      }
    } catch (error) {
      logger.debug(`Failed to remove manifest snapshot for pack '${packName}': ${error}`);
      // Don't fail uninstall for snapshot cleanup errors
    }
  }

  /**
   * Remove pack from project manifest
   */
  private async removeFromProjectManifest(packName: string): Promise<void> {
    const manifestPath = this.fs.join(this.zccDir, 'packs.json');
    
    if (!await this.fs.exists(manifestPath)) {
      return; // No manifest to update
    }

    try {
      const content = await this.fs.readFile(manifestPath, 'utf-8');
      const projectManifest = JSON.parse(content as string) as ProjectPackManifest;

      // Remove the pack from the manifest
      delete projectManifest.packs[packName];

      // Save updated manifest
      await this.fs.writeFile(manifestPath, JSON.stringify(projectManifest, null, 2));
      logger.debug(`Removed pack '${packName}' from project manifest`);

    } catch (error) {
      logger.warn(`Error updating project manifest after removing pack '${packName}': ${error}`);
      throw error;
    }
  }

  /**
   * Get component type from file path
   */
  private getComponentTypeFromPath(filePath: string): 'modes' | 'workflows' | 'agents' | 'hooks' | null {
    if (filePath.includes('/modes/')) return 'modes';
    if (filePath.includes('/workflows/')) return 'workflows';
    if (filePath.includes('/agents/')) return 'agents';
    if (filePath.includes('/hooks/')) return 'hooks';
    if (filePath.includes('/scripts/')) return null; // Scripts are not in the component types
    return null;
  }

  /**
   * Clean up empty directories after uninstall
   */
  private async cleanupEmptyDirectories(): Promise<void> {
    const dirsToCheck = [
      this.fs.join(this.zccDir, 'modes'),
      this.fs.join(this.zccDir, 'workflows'),
      this.fs.join(this.zccDir, 'agents'),
      this.fs.join(this.zccDir, 'hooks'),
      this.fs.join(this.zccDir, 'scripts'),
      this.fs.join(this.claudeDir, 'agents'),
    ];

    for (const dir of dirsToCheck) {
      try {
        if (await this.fs.exists(dir)) {
          const contents = await this.fs.readdir(dir);
          if (contents.length === 0) {
            await this.fs.rmdir(dir);
            logger.debug(`Removed empty directory: ${dir}`);
          }
        }
      } catch (error) {
        logger.debug(`Could not clean up directory ${dir}: ${error}`);
      }
    }
  }
}