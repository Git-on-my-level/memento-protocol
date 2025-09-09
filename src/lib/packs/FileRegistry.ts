/**
 * FileRegistry manages the tracking of installed pack files
 * It maintains checksums and ownership information for safe installation and removal
 */

import { createHash } from 'crypto';
import { FileSystemAdapter } from '../adapters/FileSystemAdapter';
import { NodeFileSystemAdapter } from '../adapters/NodeFileSystemAdapter';
import { logger } from '../logger';
import { ZccError } from '../errors';

export interface FileInfo {
  pack: string;
  originalPath: string;
  checksum: string;
  installedAt: string;
  modified: boolean;
}

export interface FileRegistryData {
  version: string;
  files: Record<string, FileInfo>;
  packs: Record<string, {
    version: string;
    files: string[];
  }>;
}

export class FileRegistry {
  private registryPath: string;
  private fs: FileSystemAdapter;
  private data: FileRegistryData | null = null;

  constructor(projectRoot: string, fs?: FileSystemAdapter) {
    this.fs = fs || new NodeFileSystemAdapter();
    this.registryPath = this.fs.join(projectRoot, '.zcc', 'file-registry.json');
  }

  /**
   * Refresh the registry by clearing cache and reloading from disk
   */
  async refresh(): Promise<FileRegistryData> {
    this.data = null;
    return await this.load();
  }

  /**
   * Load the registry from disk
   */
  async load(): Promise<FileRegistryData> {
    if (this.data) {
      return this.data;
    }

    if (!await this.fs.exists(this.registryPath)) {
      // Initialize empty registry
      this.data = {
        version: '1.0.0',
        files: {},
        packs: {}
      };
      return this.data;
    }

    try {
      const content = await this.fs.readFile(this.registryPath, 'utf-8');
      this.data = JSON.parse(content as string);
      return this.data!;
    } catch (error) {
      logger.warn(`Failed to load file registry: ${error}`);
      
      // Attempt recovery
      const backupPath = `${this.registryPath}.backup`;
      if (await this.fs.exists(backupPath)) {
        logger.info('Attempting to restore from backup...');
        const backupContent = await this.fs.readFile(backupPath, 'utf-8');
        this.data = JSON.parse(backupContent as string);
        await this.save(); // Save the restored data
        return this.data!;
      }

      // If all else fails, start fresh
      logger.warn('Starting with fresh registry');
      this.data = {
        version: '1.0.0',
        files: {},
        packs: {}
      };
      return this.data;
    }
  }

  /**
   * Save the registry to disk with backup
   */
  async save(): Promise<void> {
    if (!this.data) {
      throw new ZccError(
        'No registry data to save',
        'REGISTRY_NOT_LOADED',
        'Call load() before save()'
      );
    }

    // Create backup of existing registry
    if (await this.fs.exists(this.registryPath)) {
      const backupPath = `${this.registryPath}.backup`;
      await this.fs.copyFile(this.registryPath, backupPath);
    }

    // Ensure directory exists
    const dir = this.fs.dirname(this.registryPath);
    await this.fs.mkdir(dir, { recursive: true });

    // Save new registry
    const content = JSON.stringify(this.data, null, 2);
    await this.fs.writeFile(this.registryPath, content);
  }

  /**
   * Calculate SHA-256 checksum of a file
   */
  async calculateChecksum(filePath: string): Promise<string> {
    if (!await this.fs.exists(filePath)) {
      throw new ZccError(
        `File not found: ${filePath}`,
        'FILE_NOT_FOUND',
        'Cannot calculate checksum of non-existent file'
      );
    }

    const content = await this.fs.readFile(filePath);
    const hash = createHash('sha256');
    
    // Handle both string and Buffer
    if (typeof content === 'string') {
      hash.update(content, 'utf8');
    } else {
      hash.update(content);
    }
    
    return `sha256:${hash.digest('hex')}`;
  }

  /**
   * Register a file installation
   */
  async registerFile(
    targetPath: string,
    packName: string,
    originalPath: string
  ): Promise<void> {
    const data = await this.load();
    const checksum = await this.calculateChecksum(targetPath);

    data.files[targetPath] = {
      pack: packName,
      originalPath,
      checksum,
      installedAt: new Date().toISOString(),
      modified: false
    };

    // Update pack files list
    if (!data.packs[packName]) {
      data.packs[packName] = {
        version: '1.0.0', // Will be updated by PackInstaller
        files: []
      };
    }
    
    if (!data.packs[packName].files.includes(targetPath)) {
      data.packs[packName].files.push(targetPath);
    }

    await this.save();
  }

  /**
   * Unregister a file
   */
  async unregisterFile(targetPath: string): Promise<void> {
    const data = await this.load();
    const fileInfo = data.files[targetPath];
    
    if (!fileInfo) {
      return; // File not registered, nothing to do
    }

    // Remove from pack files list
    if (data.packs[fileInfo.pack]) {
      data.packs[fileInfo.pack].files = data.packs[fileInfo.pack].files.filter(
        f => f !== targetPath
      );
    }

    // Remove file entry
    delete data.files[targetPath];
    
    await this.save();
  }

  /**
   * Check if a file is registered
   */
  async isFileRegistered(targetPath: string): Promise<boolean> {
    const data = await this.load();
    return targetPath in data.files;
  }

  /**
   * Get file info
   */
  async getFileInfo(targetPath: string): Promise<FileInfo | null> {
    const data = await this.load();
    return data.files[targetPath] || null;
  }

  /**
   * Check if a file has been modified
   */
  async isFileModified(targetPath: string): Promise<boolean> {
    const data = await this.load();
    const fileInfo = data.files[targetPath];
    
    if (!fileInfo) {
      return false;
    }

    // If already marked as modified, return true
    if (fileInfo.modified) {
      return true;
    }

    // Check current checksum
    try {
      const currentChecksum = await this.calculateChecksum(targetPath);
      const isModified = currentChecksum !== fileInfo.checksum;
      
      // Update modified flag if changed
      if (isModified) {
        fileInfo.modified = true;
        await this.save();
      }
      
      return isModified;
    } catch (error) {
      // File might not exist anymore
      logger.debug(`Could not check modification status for ${targetPath}: ${error}`);
      return true; // Treat as modified if we can't check
    }
  }

  /**
   * Get all files owned by a pack
   */
  async getPackFiles(packName: string): Promise<string[]> {
    const data = await this.load();
    return data.packs[packName]?.files || [];
  }

  /**
   * Check for conflicts with existing files
   */
  async checkConflicts(files: string[]): Promise<Array<{
    path: string;
    existingPack: string;
  }>> {
    const data = await this.load();
    const conflicts: Array<{ path: string; existingPack: string }> = [];

    for (const file of files) {
      if (data.files[file]) {
        conflicts.push({
          path: file,
          existingPack: data.files[file].pack
        });
      }
    }

    return conflicts;
  }

  /**
   * Register a pack
   */
  async registerPack(packName: string, version: string): Promise<void> {
    const data = await this.load();
    
    if (!data.packs[packName]) {
      data.packs[packName] = {
        version,
        files: []
      };
    } else {
      data.packs[packName].version = version;
    }
    
    await this.save();
  }

  /**
   * Unregister a pack
   */
  async unregisterPack(packName: string): Promise<void> {
    const data = await this.load();
    
    // Remove all file entries for this pack
    const packFiles = data.packs[packName]?.files || [];
    for (const file of packFiles) {
      delete data.files[file];
    }
    
    // Remove pack entry
    delete data.packs[packName];
    
    await this.save();
  }

  /**
   * Unregister a pack but preserve modified files
   */
  async unregisterPackPreservingModified(packName: string): Promise<void> {
    const data = await this.load();
    
    // Remove only unmodified file entries for this pack
    const packFiles = data.packs[packName]?.files || [];
    for (const file of packFiles) {
      const fileInfo = data.files[file];
      if (fileInfo && !fileInfo.modified) {
        delete data.files[file];
      } else if (fileInfo && fileInfo.modified) {
        // Keep modified file but mark it as no longer owned by any pack
        fileInfo.pack = '';
      }
    }
    
    // Remove pack entry
    delete data.packs[packName];
    
    await this.save();
  }

  /**
   * Detect all modified files
   */
  async detectModifications(): Promise<string[]> {
    const data = await this.load();
    const modifications: string[] = [];

    for (const [path, info] of Object.entries(data.files)) {
      try {
        const currentChecksum = await this.calculateChecksum(path);
        if (currentChecksum !== info.checksum) {
          info.modified = true;
          modifications.push(path);
        }
      } catch (error) {
        // File might not exist or be inaccessible
        logger.debug(`Could not check ${path}: ${error}`);
      }
    }

    if (modifications.length > 0) {
      await this.save();
    }

    return modifications;
  }

  /**
   * Rebuild registry by scanning the file system
   * This is a recovery mechanism for corrupted registries
   */
  async rebuild(): Promise<void> {
    logger.info('Rebuilding file registry from file system scan...');
    
    // Start with empty registry
    this.data = {
      version: '1.0.0',
      files: {},
      packs: {}
    };

    // Scan pack manifests to reconstruct pack info
    const packsJsonPath = this.fs.join(
      this.fs.dirname(this.registryPath),
      'packs.json'
    );
    
    if (await this.fs.exists(packsJsonPath)) {
      try {
        const packsContent = await this.fs.readFile(packsJsonPath, 'utf-8');
        const packsData = JSON.parse(packsContent as string);
        
        // Reconstruct pack entries
        for (const [packName, packInfo] of Object.entries(packsData.packs)) {
          this.data.packs[packName] = {
            version: (packInfo as any).version,
            files: []
          };
        }
      } catch (error) {
        logger.warn(`Could not read packs.json during rebuild: ${error}`);
      }
    }

    await this.save();
    logger.info('File registry rebuilt');
  }

  /**
   * Get statistics about the registry
   */
  async getStats(): Promise<{
    totalFiles: number;
    totalPacks: number;
    modifiedFiles: number;
  }> {
    const data = await this.load();
    
    return {
      totalFiles: Object.keys(data.files).length,
      totalPacks: Object.keys(data.packs).length,
      modifiedFiles: Object.values(data.files).filter(f => f.modified).length
    };
  }
}