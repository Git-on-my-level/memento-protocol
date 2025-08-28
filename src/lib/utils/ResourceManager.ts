import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { logger } from "../logger";
import { FileSystemError } from "../errors";

export interface ResourceHandle {
  id: string;
  type: 'tempDir' | 'fileHandle' | 'process';
  resource: any;
  cleanup: () => Promise<void>;
}

/**
 * ResourceManager provides safe resource management patterns to prevent leaks
 * and ensure proper cleanup of temporary files, directories, and file handles
 */
export class ResourceManager {
  private static instance: ResourceManager;
  private resources: Map<string, ResourceHandle> = new Map();
  private isShuttingDown = false;
  private shutdownPromise: Promise<void> | null = null;

  private constructor() {
    this.setupProcessHandlers();
  }

  static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  /**
   * Create and manage a temporary directory
   * Usage: await withTempDirectory(async (tempDir) => { ... })
   */
  async withTempDirectory<T>(
    prefix: string = 'memento-',
    fn: (tempDir: string) => Promise<T>
  ): Promise<T> {
    const tempDir = await this.createTempDirectory(prefix);
    const handle = await this.registerResource('tempDir', tempDir, async () => {
      await this.cleanupDirectory(tempDir);
    });

    try {
      const result = await fn(tempDir);
      return result;
    } finally {
      await this.releaseResource(handle.id);
    }
  }

  /**
   * Safely manage file operations with automatic cleanup
   * Usage: await withFileOperations(async () => { ... })
   */
  async withFileOperations<T>(fn: () => Promise<T>): Promise<T> {
    const openHandles: fs.FileHandle[] = [];
    
    const handle = await this.registerResource('fileHandle', openHandles, async () => {
      // Close any remaining file handles
      for (const fileHandle of openHandles) {
        try {
          await fileHandle.close();
        } catch (error) {
          logger.debug(`Error closing file handle: ${error}`);
        }
      }
    });

    try {
      // For now, just run the function without file handle tracking
      // In a production environment, this would need a more sophisticated approach
      const result = await fn();
      return result;
    } finally {
      await this.releaseResource(handle.id);
    }
  }

  /**
   * Copy files with automatic cleanup on error
   */
  async safeCopyFile(src: string, dest: string, options?: { backup?: boolean }): Promise<void> {
    const backupPath = options?.backup ? `${dest}.backup` : null;
    let backupCreated = false;

    try {
      // Create backup if requested
      if (backupPath) {
        try {
          await fs.access(dest);
          await fs.copyFile(dest, backupPath);
          backupCreated = true;
        } catch {
          // Destination doesn't exist, no backup needed
        }
      }

      // Ensure destination directory exists
      await fs.mkdir(path.dirname(dest), { recursive: true });
      
      // Perform the copy
      await fs.copyFile(src, dest);

      // Remove backup on success
      if (backupCreated && backupPath) {
        try {
          await fs.unlink(backupPath);
        } catch (error) {
          logger.debug(`Could not remove backup file: ${error}`);
        }
      }
    } catch (error) {
      // Restore from backup on error
      if (backupCreated && backupPath) {
        try {
          await fs.copyFile(backupPath, dest);
          await fs.unlink(backupPath);
        } catch (restoreError) {
          logger.debug(`Could not restore from backup: ${restoreError}`);
        }
      }
      throw error;
    }
  }

  /**
   * Write file with atomic operation and cleanup
   */
  async safeWriteFile(filePath: string, content: string | Buffer, options?: { backup?: boolean }): Promise<void> {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    const backupPath = options?.backup ? `${filePath}.backup` : null;
    let backupCreated = false;

    try {
      // Create backup if requested and file exists
      if (backupPath) {
        try {
          await fs.access(filePath);
          await fs.copyFile(filePath, backupPath);
          backupCreated = true;
        } catch {
          // File doesn't exist, no backup needed
        }
      }

      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // Write to temporary file first
      await fs.writeFile(tempPath, content);
      
      // Atomic move
      await fs.rename(tempPath, filePath);

      // Remove backup on success
      if (backupCreated && backupPath) {
        try {
          await fs.unlink(backupPath);
        } catch (error) {
          logger.debug(`Could not remove backup file: ${error}`);
        }
      }
    } catch (error) {
      // Cleanup temporary file
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }

      // Restore from backup on error
      if (backupCreated && backupPath) {
        try {
          await fs.copyFile(backupPath, filePath);
          await fs.unlink(backupPath);
        } catch (restoreError) {
          logger.debug(`Could not restore from backup: ${restoreError}`);
        }
      }

      throw error;
    }
  }

  /**
   * Ensure multiple directories exist with proper cleanup on partial failure
   * This version uses Node.js fs promises API directly
   */
  async ensureDirectories(directories: string[]): Promise<void> {
    const createdDirs: string[] = [];
    
    try {
      for (const dir of directories) {
        try {
          await fs.access(dir);
          // Directory already exists
        } catch {
          // Need to create directory
          await fs.mkdir(dir, { recursive: true });
          createdDirs.push(dir);
        }
      }
    } catch (error) {
      // Cleanup any directories we created before the error
      for (const dir of createdDirs) {
        try {
          await fs.rmdir(dir);
        } catch {
          // Ignore cleanup errors
        }
      }
      throw error;
    }
  }

  /**
   * Ensure directories exist using a FileSystemAdapter (for testing compatibility)
   */
  async ensureDirectoriesWithAdapter(directories: string[], fsAdapter: any): Promise<void> {
    const createdDirs: string[] = [];
    
    try {
      for (const dir of directories) {
        if (!fsAdapter.existsSync(dir)) {
          await fsAdapter.mkdir(dir, { recursive: true });
          createdDirs.push(dir);
        }
      }
    } catch (error) {
      // Cleanup any directories we created before the error
      for (const dir of createdDirs) {
        try {
          if (fsAdapter.existsSync(dir)) {
            await fsAdapter.rmdir(dir);
          }
        } catch {
          // Ignore cleanup errors
        }
      }
      throw error;
    }
  }

  /**
   * Get resource usage statistics
   */
  getResourceStats(): { totalResources: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    
    for (const handle of this.resources.values()) {
      byType[handle.type] = (byType[handle.type] || 0) + 1;
    }

    return {
      totalResources: this.resources.size,
      byType
    };
  }

  /**
   * Force cleanup of all resources (for testing or emergency shutdown)
   */
  async cleanup(): Promise<void> {
    if (this.isShuttingDown) {
      return this.shutdownPromise || Promise.resolve();
    }

    this.isShuttingDown = true;
    this.shutdownPromise = this.performCleanup();
    
    return this.shutdownPromise;
  }

  private async performCleanup(): Promise<void> {
    const cleanupPromises: Promise<void>[] = [];
    
    for (const handle of this.resources.values()) {
      cleanupPromises.push(
        handle.cleanup().catch(error => {
          logger.debug(`Error cleaning up resource ${handle.id}: ${error}`);
        })
      );
    }

    await Promise.all(cleanupPromises);
    this.resources.clear();
  }

  private async createTempDirectory(prefix: string): Promise<string> {
    try {
      return await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    } catch (error) {
      throw new FileSystemError(
        `Failed to create temporary directory with prefix "${prefix}"`,
        os.tmpdir(),
        'Ensure system has sufficient disk space and permissions'
      );
    }
  }

  private async cleanupDirectory(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      logger.debug(`Failed to cleanup directory ${dirPath}: ${error}`);
    }
  }

  private async registerResource(
    type: ResourceHandle['type'],
    resource: any,
    cleanup: () => Promise<void>
  ): Promise<ResourceHandle> {
    const handle: ResourceHandle = {
      id: this.generateId(),
      type,
      resource,
      cleanup
    };

    this.resources.set(handle.id, handle);
    return handle;
  }

  private async releaseResource(id: string): Promise<void> {
    const handle = this.resources.get(id);
    if (handle) {
      try {
        await handle.cleanup();
      } catch (error) {
        logger.debug(`Error during resource cleanup for ${id}: ${error}`);
      } finally {
        this.resources.delete(id);
      }
    }
  }

  private generateId(): string {
    return `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupProcessHandlers(): void {
    // Handle graceful shutdown
    const shutdownHandler = () => {
      if (!this.isShuttingDown) {
        logger.debug('Process termination detected, cleaning up resources...');
        this.cleanup().then(() => {
          process.exit(0);
        }).catch(error => {
          logger.debug(`Error during shutdown cleanup: ${error}`);
          process.exit(1);
        });
      }
    };

    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      logger.debug(`Unhandled promise rejection: ${reason}`);
      // Don't exit immediately, but ensure cleanup happens
      if (!this.isShuttingDown) {
        this.cleanup();
      }
    });
  }
}

// Export convenience functions for common patterns
export const resourceManager = ResourceManager.getInstance();

export const withTempDirectory = <T>(
  prefix: string = 'memento-',
  fn: (tempDir: string) => Promise<T>
): Promise<T> => {
  return resourceManager.withTempDirectory(prefix, fn);
};

export const withFileOperations = <T>(fn: () => Promise<T>): Promise<T> => {
  return resourceManager.withFileOperations(fn);
};

export const safeCopyFile = (
  src: string,
  dest: string,
  options?: { backup?: boolean }
): Promise<void> => {
  return resourceManager.safeCopyFile(src, dest, options);
};

export const safeWriteFile = (
  filePath: string,
  content: string | Buffer,
  options?: { backup?: boolean }
): Promise<void> => {
  return resourceManager.safeWriteFile(filePath, content, options);
};

export const ensureDirectories = (directories: string[]): Promise<void> => {
  return resourceManager.ensureDirectories(directories);
};

export const ensureDirectoriesWithAdapter = (directories: string[], fsAdapter: any): Promise<void> => {
  return resourceManager.ensureDirectoriesWithAdapter(directories, fsAdapter);
};