import { ResourceManager, withTempDirectory, withFileOperations, safeCopyFile, safeWriteFile } from '../ResourceManager';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('ResourceManager', () => {
  let resourceManager: ResourceManager;

  beforeEach(() => {
    resourceManager = ResourceManager.getInstance();
  });

  afterEach(async () => {
    await resourceManager.cleanup();
  });

  describe('withTempDirectory', () => {
    it('should create and cleanup temporary directory', async () => {
      let tempDirCreated: string;
      
      await withTempDirectory('test-', async (tempDir) => {
        tempDirCreated = tempDir;
        
        // Verify directory exists
        await fs.access(tempDir); // This will throw if directory doesn't exist
        expect(tempDir).toContain('test-');
        
        // Write a test file
        const testFile = path.join(tempDir, 'test.txt');
        await fs.writeFile(testFile, 'test content');
        expect(await fs.readFile(testFile, 'utf-8')).toBe('test content');
      });
      
      // Verify directory is cleaned up
      await expect(fs.access(tempDirCreated!)).rejects.toThrow();
    });

    it('should cleanup on error', async () => {
      let tempDirCreated: string;
      
      await expect(withTempDirectory('error-test-', async (tempDir) => {
        tempDirCreated = tempDir;
        await fs.access(tempDir); // This will throw if directory doesn't exist
        
        throw new Error('Test error');
      })).rejects.toThrow('Test error');
      
      // Verify directory is still cleaned up despite error
      await expect(fs.access(tempDirCreated!)).rejects.toThrow();
    });
  });

  describe('withFileOperations', () => {
    it('should track file operations', async () => {
      const result = await withFileOperations(async () => {
        // This would normally track file handles in real usage
        return 'test-result';
      });
      
      expect(result).toBe('test-result');
    });

    it('should cleanup on error', async () => {
      await expect(withFileOperations(async () => {
        throw new Error('File operation error');
      })).rejects.toThrow('File operation error');
    });
  });

  describe('safeCopyFile', () => {
    it('should copy file safely', async () => {
      await withTempDirectory('copy-test-', async (tempDir) => {
        const sourceFile = path.join(tempDir, 'source.txt');
        const destFile = path.join(tempDir, 'dest.txt');
        
        await fs.writeFile(sourceFile, 'source content');
        await safeCopyFile(sourceFile, destFile);
        
        const content = await fs.readFile(destFile, 'utf-8');
        expect(content).toBe('source content');
      });
    });

    it('should create backup when requested', async () => {
      await withTempDirectory('backup-test-', async (tempDir) => {
        const sourceFile = path.join(tempDir, 'source.txt');
        const destFile = path.join(tempDir, 'dest.txt');
        const backupFile = `${destFile}.backup`;
        
        // Create source and existing destination
        await fs.writeFile(sourceFile, 'new content');
        await fs.writeFile(destFile, 'original content');
        
        await safeCopyFile(sourceFile, destFile, { backup: true });
        
        // Verify copy succeeded
        const content = await fs.readFile(destFile, 'utf-8');
        expect(content).toBe('new content');
        
        // Verify backup was cleaned up (on success)
        await expect(fs.access(backupFile)).rejects.toThrow();
      });
    });
  });

  describe('safeWriteFile', () => {
    it('should write file atomically', async () => {
      await withTempDirectory('write-test-', async (tempDir) => {
        const testFile = path.join(tempDir, 'test.txt');
        
        await safeWriteFile(testFile, 'test content');
        
        const content = await fs.readFile(testFile, 'utf-8');
        expect(content).toBe('test content');
      });
    });

    it('should create parent directories', async () => {
      await withTempDirectory('nested-test-', async (tempDir) => {
        const nestedFile = path.join(tempDir, 'nested', 'deep', 'test.txt');
        
        await safeWriteFile(nestedFile, 'nested content');
        
        const content = await fs.readFile(nestedFile, 'utf-8');
        expect(content).toBe('nested content');
      });
    });

    it('should handle backup on write', async () => {
      await withTempDirectory('backup-write-test-', async (tempDir) => {
        const testFile = path.join(tempDir, 'test.txt');
        
        // Create existing file
        await fs.writeFile(testFile, 'original content');
        
        // Write new content with backup
        await safeWriteFile(testFile, 'new content', { backup: true });
        
        const content = await fs.readFile(testFile, 'utf-8');
        expect(content).toBe('new content');
      });
    });
  });

  describe('resource tracking', () => {
    it('should track resource statistics', async () => {
      const initialStats = resourceManager.getResourceStats();
      
      await withTempDirectory('stats-test-', async () => {
        const duringStats = resourceManager.getResourceStats();
        expect(duringStats.totalResources).toBeGreaterThan(initialStats.totalResources);
        expect(duringStats.byType.tempDir).toBeGreaterThan(0);
      });
      
      const finalStats = resourceManager.getResourceStats();
      expect(finalStats.totalResources).toBe(initialStats.totalResources);
    });

    it('should cleanup all resources', async () => {
      let tempDir1: string, tempDir2: string;
      
      // Create some resources but don't wait for cleanup
      const promise1 = withTempDirectory('cleanup-test-1-', async (tempDir) => {
        tempDir1 = tempDir;
        // Don't return immediately - simulate long operation
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      const promise2 = withTempDirectory('cleanup-test-2-', async (tempDir) => {
        tempDir2 = tempDir;
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      // Force cleanup while operations are in progress
      await resourceManager.cleanup();
      
      // Wait for operations to complete
      await promise1;
      await promise2;
      
      // Verify directories were cleaned up
      await expect(fs.access(tempDir1!)).rejects.toThrow();
      await expect(fs.access(tempDir2!)).rejects.toThrow();
    });
  });
});