/**
 * Tests for FileRegistry - the pack file tracking system
 */

import { FileRegistry } from '../FileRegistry';
import { createTestFileSystem } from '../../testing';
import { MemoryFileSystemAdapter } from '../../adapters/MemoryFileSystemAdapter';

describe('FileRegistry', () => {
  let fs: MemoryFileSystemAdapter;
  let registry: FileRegistry;
  const projectRoot = '/test-project';
  const registryPath = '/test-project/.zcc/file-registry.json';

  beforeEach(async () => {
    fs = await createTestFileSystem();
    registry = new FileRegistry(projectRoot, fs);
  });

  describe('initialization', () => {
    it('should create empty registry when no file exists', async () => {
      const data = await registry.load();
      
      expect(data).toEqual({
        version: '1.0.0',
        files: {},
        packs: {}
      });
    });

    it('should load existing registry from disk', async () => {
      const existingData = {
        version: '1.0.0',
        files: {
          '/test/file.md': {
            pack: 'test-pack',
            originalPath: '/source/file.md',
            checksum: 'sha256:abc123',
            installedAt: '2025-01-01T00:00:00Z',
            modified: false
          }
        },
        packs: {
          'test-pack': {
            version: '1.0.0',
            files: ['/test/file.md']
          }
        }
      };

      await fs.mkdir('/test-project/.zcc', { recursive: true });
      await fs.writeFile(registryPath, JSON.stringify(existingData));

      const data = await registry.load();
      expect(data).toEqual(existingData);
    });

    it('should handle corrupted registry gracefully', async () => {
      await fs.mkdir('/test-project/.zcc', { recursive: true });
      await fs.writeFile(registryPath, 'invalid json{');

      const data = await registry.load();
      
      expect(data).toEqual({
        version: '1.0.0',
        files: {},
        packs: {}
      });
    });

    it('should restore from backup if main registry is corrupted', async () => {
      const backupData = {
        version: '1.0.0',
        files: { '/backup/file.md': { pack: 'backup-pack' } },
        packs: {}
      };

      await fs.mkdir('/test-project/.zcc', { recursive: true });
      await fs.writeFile(registryPath, 'corrupted');
      await fs.writeFile(`${registryPath}.backup`, JSON.stringify(backupData));

      const data = await registry.load();
      expect(data.files['/backup/file.md']).toBeDefined();
    });
  });

  describe('file registration', () => {
    beforeEach(async () => {
      await fs.mkdir('/test-project/.zcc/modes', { recursive: true });
      await fs.writeFile('/test-project/.zcc/modes/test.md', 'test content');
    });

    it('should register a file with checksum', async () => {
      await registry.registerFile(
        '/test-project/.zcc/modes/test.md',
        'test-pack',
        '/source/modes/test.md'
      );

      const info = await registry.getFileInfo('/test-project/.zcc/modes/test.md');
      
      expect(info).toMatchObject({
        pack: 'test-pack',
        originalPath: '/source/modes/test.md',
        modified: false
      });
      expect(info?.checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('should calculate correct SHA-256 checksum', async () => {
      await fs.writeFile('/test/file.txt', 'Hello World');
      
      const checksum = await registry.calculateChecksum('/test/file.txt');
      
      // SHA-256 of "Hello World"
      expect(checksum).toBe('sha256:a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e');
    });

    it('should update pack files list when registering', async () => {
      await registry.registerFile(
        '/test-project/.zcc/modes/test.md',
        'test-pack',
        '/source/modes/test.md'
      );

      const packFiles = await registry.getPackFiles('test-pack');
      expect(packFiles).toContain('/test-project/.zcc/modes/test.md');
    });

    it('should handle multiple files for same pack', async () => {
      await fs.writeFile('/test-project/.zcc/modes/test2.md', 'content 2');
      
      await registry.registerFile(
        '/test-project/.zcc/modes/test.md',
        'test-pack',
        '/source/modes/test.md'
      );
      await registry.registerFile(
        '/test-project/.zcc/modes/test2.md',
        'test-pack',
        '/source/modes/test2.md'
      );

      const packFiles = await registry.getPackFiles('test-pack');
      expect(packFiles).toHaveLength(2);
    });
  });

  describe('conflict detection', () => {
    beforeEach(async () => {
      await fs.mkdir('/test-project/.zcc/modes', { recursive: true });
      await fs.writeFile('/test-project/.zcc/modes/test.md', 'content');
      
      await registry.registerFile(
        '/test-project/.zcc/modes/test.md',
        'pack-a',
        '/source/test.md'
      );
    });

    it('should detect conflicts with existing files', async () => {
      const conflicts = await registry.checkConflicts([
        '/test-project/.zcc/modes/test.md',
        '/test-project/.zcc/modes/new.md'
      ]);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toEqual({
        path: '/test-project/.zcc/modes/test.md',
        existingPack: 'pack-a'
      });
    });

    it('should not report conflicts for unregistered files', async () => {
      const conflicts = await registry.checkConflicts([
        '/test-project/.zcc/modes/unregistered.md'
      ]);

      expect(conflicts).toHaveLength(0);
    });

    it('should handle checking multiple files', async () => {
      await fs.writeFile('/test-project/.zcc/modes/another.md', 'content');
      await registry.registerFile(
        '/test-project/.zcc/modes/another.md',
        'pack-b',
        '/source/another.md'
      );

      const conflicts = await registry.checkConflicts([
        '/test-project/.zcc/modes/test.md',
        '/test-project/.zcc/modes/another.md',
        '/test-project/.zcc/modes/new.md'
      ]);

      expect(conflicts).toHaveLength(2);
      expect(conflicts[0].existingPack).toBe('pack-a');
      expect(conflicts[1].existingPack).toBe('pack-b');
    });
  });

  describe('modification detection', () => {
    beforeEach(async () => {
      await fs.mkdir('/test-project/.zcc/modes', { recursive: true });
      await fs.writeFile('/test-project/.zcc/modes/test.md', 'original content');
      
      await registry.registerFile(
        '/test-project/.zcc/modes/test.md',
        'test-pack',
        '/source/test.md'
      );
    });

    it('should detect when file is modified', async () => {
      // Modify the file
      await fs.writeFile('/test-project/.zcc/modes/test.md', 'modified content');
      
      const isModified = await registry.isFileModified('/test-project/.zcc/modes/test.md');
      expect(isModified).toBe(true);
    });

    it('should return false for unmodified files', async () => {
      const isModified = await registry.isFileModified('/test-project/.zcc/modes/test.md');
      expect(isModified).toBe(false);
    });

    it('should persist modification status', async () => {
      await fs.writeFile('/test-project/.zcc/modes/test.md', 'modified content');
      await registry.isFileModified('/test-project/.zcc/modes/test.md');
      
      // Load registry again
      const newRegistry = new FileRegistry(projectRoot, fs);
      const data = await newRegistry.load();
      
      expect(data.files['/test-project/.zcc/modes/test.md'].modified).toBe(true);
    });

    it('should detect all modified files', async () => {
      await fs.writeFile('/test-project/.zcc/modes/test2.md', 'content 2');
      await registry.registerFile(
        '/test-project/.zcc/modes/test2.md',
        'test-pack',
        '/source/test2.md'
      );

      // Modify both files
      await fs.writeFile('/test-project/.zcc/modes/test.md', 'modified 1');
      await fs.writeFile('/test-project/.zcc/modes/test2.md', 'modified 2');

      const modifications = await registry.detectModifications();
      
      expect(modifications).toHaveLength(2);
      expect(modifications).toContain('/test-project/.zcc/modes/test.md');
      expect(modifications).toContain('/test-project/.zcc/modes/test2.md');
    });

    it('should handle missing files as modified', async () => {
      await fs.unlink('/test-project/.zcc/modes/test.md');
      
      const isModified = await registry.isFileModified('/test-project/.zcc/modes/test.md');
      expect(isModified).toBe(true);
    });
  });

  describe('pack management', () => {
    it('should register pack with version', async () => {
      await registry.registerPack('test-pack', '1.2.3');
      
      const data = await registry.load();
      expect(data.packs['test-pack']).toEqual({
        version: '1.2.3',
        files: []
      });
    });

    it('should unregister pack and its files', async () => {
      await fs.mkdir('/test-project/.zcc/modes', { recursive: true });
      await fs.writeFile('/test-project/.zcc/modes/test.md', 'content');
      
      await registry.registerPack('test-pack', '1.0.0');
      await registry.registerFile(
        '/test-project/.zcc/modes/test.md',
        'test-pack',
        '/source/test.md'
      );

      await registry.unregisterPack('test-pack');
      
      const data = await registry.load();
      expect(data.packs['test-pack']).toBeUndefined();
      expect(data.files['/test-project/.zcc/modes/test.md']).toBeUndefined();
    });

    it('should get all files for a pack', async () => {
      await fs.mkdir('/test-project/.zcc', { recursive: true });
      await fs.writeFile('/test-project/.zcc/file1.md', 'content1');
      await fs.writeFile('/test-project/.zcc/file2.md', 'content2');
      await fs.writeFile('/test-project/.zcc/file3.md', 'content3');
      
      await registry.registerFile('/test-project/.zcc/file1.md', 'pack-a', '/source/file1.md');
      await registry.registerFile('/test-project/.zcc/file2.md', 'pack-a', '/source/file2.md');
      await registry.registerFile('/test-project/.zcc/file3.md', 'pack-b', '/source/file3.md');

      const packAFiles = await registry.getPackFiles('pack-a');
      
      expect(packAFiles).toHaveLength(2);
      expect(packAFiles).toContain('/test-project/.zcc/file1.md');
      expect(packAFiles).toContain('/test-project/.zcc/file2.md');
    });
  });

  describe('persistence', () => {
    it('should save registry to disk', async () => {
      await fs.mkdir('/test-project/.zcc/modes', { recursive: true });
      await fs.writeFile('/test-project/.zcc/modes/test.md', 'content');
      
      await registry.registerFile(
        '/test-project/.zcc/modes/test.md',
        'test-pack',
        '/source/test.md'
      );

      const savedContent = await fs.readFile(registryPath, 'utf-8') as string;
      const savedData = JSON.parse(savedContent);
      
      expect(savedData.files['/test-project/.zcc/modes/test.md']).toBeDefined();
      expect(savedData.packs['test-pack']).toBeDefined();
    });

    it('should create backup when saving', async () => {
      await fs.mkdir('/test-project/.zcc', { recursive: true });
      await fs.writeFile(registryPath, JSON.stringify({ version: '1.0.0', files: {}, packs: {} }));
      
      await registry.load();
      await registry.registerPack('test-pack', '1.0.0');

      const backupExists = await fs.exists(`${registryPath}.backup`);
      expect(backupExists).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should provide registry statistics', async () => {
      await fs.mkdir('/test-project/.zcc', { recursive: true });
      await fs.writeFile('/test-project/.zcc/file1.md', 'content1');
      await fs.writeFile('/test-project/.zcc/file2.md', 'content2');
      
      await registry.registerPack('pack-a', '1.0.0');
      await registry.registerPack('pack-b', '1.0.0');
      await registry.registerFile('/test-project/.zcc/file1.md', 'pack-a', '/source/file1.md');
      await registry.registerFile('/test-project/.zcc/file2.md', 'pack-b', '/source/file2.md');
      
      // Modify one file
      await fs.writeFile('/test-project/.zcc/file1.md', 'modified');
      await registry.isFileModified('/test-project/.zcc/file1.md');

      const stats = await registry.getStats();
      
      expect(stats).toEqual({
        totalFiles: 2,
        totalPacks: 2,
        modifiedFiles: 1
      });
    });
  });

  describe('error handling', () => {
    it('should throw error when calculating checksum of non-existent file', async () => {
      await expect(registry.calculateChecksum('/non/existent/file.md'))
        .rejects
        .toThrow('File not found');
    });

    it('should handle file info query for unregistered file', async () => {
      const info = await registry.getFileInfo('/unregistered/file.md');
      expect(info).toBeNull();
    });

    it('should return false for modification check on unregistered file', async () => {
      const isModified = await registry.isFileModified('/unregistered/file.md');
      expect(isModified).toBe(false);
    });

    it('should return empty array for non-existent pack files', async () => {
      const files = await registry.getPackFiles('non-existent-pack');
      expect(files).toEqual([]);
    });
  });

  describe('rebuild functionality', () => {
    it('should rebuild registry from packs.json', async () => {
      const packsData = {
        packs: {
          'existing-pack': {
            version: '2.0.0',
            installedAt: '2025-01-01T00:00:00Z'
          }
        }
      };

      await fs.mkdir('/test-project/.zcc', { recursive: true });
      await fs.writeFile(
        '/test-project/.zcc/packs.json',
        JSON.stringify(packsData)
      );

      await registry.rebuild();
      
      const data = await registry.load();
      expect(data.packs['existing-pack']).toEqual({
        version: '2.0.0',
        files: []
      });
    });

    it('should handle missing packs.json during rebuild', async () => {
      await fs.mkdir('/test-project/.zcc', { recursive: true });
      
      await registry.rebuild();
      
      const data = await registry.load();
      expect(data).toEqual({
        version: '1.0.0',
        files: {},
        packs: {}
      });
    });
  });
});