import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { DirectoryManager } from './directoryManager';
import { logger } from './logger';
import { createHash } from 'crypto';
import { PackagePaths } from './packagePaths';

interface ComponentVersion {
  name: string;
  version: string;
  hash: string;
  lastUpdated: string;
}

interface UpdateInfo {
  component: string;
  type: 'mode' | 'workflow';
  currentVersion: string;
  latestVersion: string;
  hasLocalChanges: boolean;
}

export class UpdateManager {
  private dirManager: DirectoryManager;
  private templatesDir: string;

  constructor(projectRoot: string) {
    this.dirManager = new DirectoryManager(projectRoot);
    this.templatesDir = PackagePaths.getTemplatesDir();
  }

  /**
   * Check for available updates
   */
  async checkForUpdates(): Promise<UpdateInfo[]> {
    const updates: UpdateInfo[] = [];
    const manifest = await this.dirManager.getManifest();
    
    // Check modes
    for (const modeName of manifest.components.modes) {
      const updateInfo = await this.checkComponentUpdate('mode', modeName);
      if (updateInfo) {
        updates.push(updateInfo);
      }
    }

    // Check workflows
    for (const workflowName of manifest.components.workflows) {
      const updateInfo = await this.checkComponentUpdate('workflow', workflowName);
      if (updateInfo) {
        updates.push(updateInfo);
      }
    }

    return updates;
  }

  /**
   * Update a specific component
   */
  async updateComponent(type: 'mode' | 'workflow', name: string, force = false): Promise<void> {
    const componentPath = this.dirManager.getComponentPath(
      type === 'mode' ? 'modes' : 'workflows',
      name
    );

    if (!existsSync(componentPath)) {
      throw new Error(`${type} '${name}' is not installed`);
    }

    // Check if update is available
    const updateInfo = await this.checkComponentUpdate(type, name);
    if (!updateInfo) {
      logger.info(`${type} '${name}' is already up to date`);
      return;
    }

    // Check for local modifications
    if (updateInfo.hasLocalChanges && !force) {
      logger.warn(`${type} '${name}' has local modifications. Use --force to overwrite.`);
      return;
    }

    // Create backup
    await this.createBackup(type, name);

    // Copy new version from templates
    const templatePath = path.join(
      this.templatesDir,
      type === 'mode' ? 'modes' : 'workflows',
      `${name}.md`
    );

    const newContent = await fs.readFile(templatePath, 'utf-8');
    await fs.writeFile(componentPath, newContent);

    // Update version info in manifest
    await this.updateVersionInfo(type, name);

    logger.success(`Updated ${type} '${name}' to version ${updateInfo.latestVersion}`);
  }

  /**
   * Update all components
   */
  async updateAll(force = false): Promise<void> {
    const updates = await this.checkForUpdates();
    
    if (updates.length === 0) {
      logger.info('All components are up to date');
      return;
    }

    logger.info(`Found ${updates.length} updates`);
    
    for (const update of updates) {
      try {
        await this.updateComponent(update.type, update.component, force);
      } catch (error) {
        logger.error(`Failed to update ${update.type} '${update.component}': ${error}`);
      }
    }
  }

  /**
   * Check if a specific component has updates
   */
  private async checkComponentUpdate(type: 'mode' | 'workflow', name: string): Promise<UpdateInfo | null> {
    const componentPath = this.dirManager.getComponentPath(
      type === 'mode' ? 'modes' : 'workflows',
      name
    );

    if (!existsSync(componentPath)) {
      return null;
    }

    // Get current version info
    const currentVersion = await this.getComponentVersion(type, name);
    
    // Get latest version from templates
    const templatePath = path.join(
      this.templatesDir,
      type === 'mode' ? 'modes' : 'workflows',
      `${name}.md`
    );

    if (!existsSync(templatePath)) {
      return null;
    }

    await fs.readFile(templatePath, 'utf-8'); // Verify template exists
    const templateVersion = await this.extractVersionFromTemplate(type, name);

    // Check if current content matches stored hash (detect local changes)
    const currentContent = await fs.readFile(componentPath, 'utf-8');
    const currentHash = this.calculateHash(currentContent);
    const hasLocalChanges = currentVersion && currentVersion.hash !== currentHash;

    // Check if update is needed
    if (currentVersion && currentVersion.version === templateVersion && !hasLocalChanges) {
      return null;
    }

    return {
      component: name,
      type,
      currentVersion: currentVersion?.version || 'unknown',
      latestVersion: templateVersion,
      hasLocalChanges: hasLocalChanges || false
    };
  }

  /**
   * Get component version info from manifest
   */
  private async getComponentVersion(type: 'mode' | 'workflow', name: string): Promise<ComponentVersion | null> {
    const manifest = await this.dirManager.getManifest();
    
    if (!manifest.versions) {
      return null;
    }

    const versionKey = type === 'mode' ? 'modes' : 'workflows';
    return manifest.versions[versionKey]?.[name] || null;
  }

  /**
   * Extract version from template metadata
   */
  private async extractVersionFromTemplate(_type: 'mode' | 'workflow', _name: string): Promise<string> {
    const metadataPath = path.join(this.templatesDir, 'metadata.json');

    if (!existsSync(metadataPath)) {
      return '1.0.0';
    }

    const content = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(content);
    
    // Use global version for all templates
    return metadata.version || '1.0.0';
  }

  /**
   * Update version info in manifest
   */
  private async updateVersionInfo(type: 'mode' | 'workflow', name: string): Promise<void> {
    const manifest = await this.dirManager.getManifest();
    
    if (!manifest.versions) {
      manifest.versions = { modes: {}, workflows: {} };
    }

    const versionKey = type === 'mode' ? 'modes' : 'workflows';
    const templateVersion = await this.extractVersionFromTemplate(type, name);
    
    const componentPath = this.dirManager.getComponentPath(
      type === 'mode' ? 'modes' : 'workflows',
      name
    );
    const content = await fs.readFile(componentPath, 'utf-8');
    const hash = this.calculateHash(content);

    manifest.versions[versionKey][name] = {
      name,
      version: templateVersion,
      hash,
      lastUpdated: new Date().toISOString()
    };

    await this.dirManager.updateManifest(manifest);
  }

  /**
   * Create a backup of a component before updating
   */
  private async createBackup(type: 'mode' | 'workflow', name: string): Promise<void> {
    const componentPath = this.dirManager.getComponentPath(
      type === 'mode' ? 'modes' : 'workflows',
      name
    );

    const backupDir = path.join(
      path.dirname(componentPath),
      '.backups',
      new Date().toISOString().replace(/[:.]/g, '-')
    );

    await fs.mkdir(backupDir, { recursive: true });
    
    const content = await fs.readFile(componentPath, 'utf-8');
    const backupPath = path.join(backupDir, `${name}.md`);
    
    await fs.writeFile(backupPath, content);
    logger.info(`Backup created at ${backupPath}`);
  }

  /**
   * Calculate hash of content
   */
  private calculateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Show diff between current and latest version
   */
  async showDiff(type: 'mode' | 'workflow', name: string): Promise<void> {
    const componentPath = this.dirManager.getComponentPath(
      type === 'mode' ? 'modes' : 'workflows',
      name
    );

    if (!existsSync(componentPath)) {
      throw new Error(`${type} '${name}' is not installed`);
    }

    const templatePath = path.join(
      this.templatesDir,
      type === 'mode' ? 'modes' : 'workflows',
      `${name}.md`
    );

    if (!existsSync(templatePath)) {
      throw new Error(`No template found for ${type} '${name}'`);
    }

    const currentContent = await fs.readFile(componentPath, 'utf-8');
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    if (currentContent === templateContent) {
      logger.info(`${type} '${name}' is up to date`);
      return;
    }

    // In a real implementation, this would use a diff library
    // For now, just show a simple message
    logger.info(`${type} '${name}' has differences from the latest template`);
    logger.info('Run "memento update --check" for more details');
  }
}