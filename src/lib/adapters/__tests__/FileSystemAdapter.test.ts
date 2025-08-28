import { NodeFileSystemAdapter } from '../NodeFileSystemAdapter';
import { MemoryFileSystemAdapter } from '../MemoryFileSystemAdapter';
import { FileSystemAdapter } from '../FileSystemAdapter';
import * as os from 'os';
import * as path from 'path';
import { rmSync, existsSync } from 'fs';

/**
 * Comprehensive tests for FileSystemAdapter implementations.
 * 
 * These tests ensure that both NodeFileSystemAdapter and MemoryFileSystemAdapter
 * provide consistent behavior and implement the FileSystemAdapter interface correctly.
 */

describe('FileSystemAdapter implementations', () => {
  // Test both implementations with the same test suite
  const implementations: Array<{
    name: string;
    createAdapter: () => FileSystemAdapter;
  }> = [
    {
      name: 'NodeFileSystemAdapter',
      createAdapter: () => new NodeFileSystemAdapter()
    },
    {
      name: 'MemoryFileSystemAdapter',
      createAdapter: () => new MemoryFileSystemAdapter()
    }
  ];

  implementations.forEach(({ name, createAdapter }) => {
    describe(name, () => {
      let fs: FileSystemAdapter;
      let testDir: string;

      beforeEach(() => {
        fs = createAdapter();
        
        if (name === 'NodeFileSystemAdapter') {
          // For real filesystem, create a temp directory
          testDir = path.join(os.tmpdir(), `fs-adapter-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
        } else {
          // For memory filesystem, use a virtual path
          testDir = '/test';
        }
      });

      afterEach(() => {
        if (name === 'NodeFileSystemAdapter' && existsSync(testDir)) {
          rmSync(testDir, { recursive: true, force: true });
        }
      });

      describe('Directory operations', () => {
        it('should create directories recursively', async () => {
          const nestedPath = fs.join(testDir, 'level1', 'level2', 'level3');
          
          await fs.mkdir(nestedPath, { recursive: true });
          
          expect(await fs.exists(nestedPath)).toBe(true);
          const stats = await fs.stat(nestedPath);
          expect(stats.isDirectory()).toBe(true);
        });

        it('should create directories non-recursively', async () => {
          await fs.mkdir(testDir, { recursive: true });
          const subDir = fs.join(testDir, 'subdir');
          
          await fs.mkdir(subDir);
          
          expect(await fs.exists(subDir)).toBe(true);
        });

        it('should remove directories recursively', async () => {
          const nestedPath = fs.join(testDir, 'level1', 'level2');
          await fs.mkdir(nestedPath, { recursive: true });
          
          await fs.rmdir(testDir);
          
          expect(await fs.exists(testDir)).toBe(false);
        });

        it('should list directory contents', async () => {
          await fs.mkdir(testDir, { recursive: true });
          await fs.writeFile(fs.join(testDir, 'file1.txt'), 'content1');
          await fs.writeFile(fs.join(testDir, 'file2.txt'), 'content2');
          await fs.mkdir(fs.join(testDir, 'subdir'), { recursive: true });
          
          const contents = await fs.readdir(testDir);
          
          expect(contents).toHaveLength(3);
          expect(contents).toContain('file1.txt');
          expect(contents).toContain('file2.txt');
          expect(contents).toContain('subdir');
        });
      });

      describe('File operations', () => {
        it('should write and read files', async () => {
          const filePath = fs.join(testDir, 'test.txt');
          const content = 'Hello, World!';
          
          await fs.writeFile(filePath, content);
          const readContent = await fs.readFile(filePath, 'utf8');
          
          expect(readContent).toBe(content);
        });

        it('should write and read binary files', async () => {
          const filePath = fs.join(testDir, 'binary.bin');
          const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04]);
          
          await fs.writeFile(filePath, buffer);
          const readBuffer = await fs.readFile(filePath);
          
          expect(Buffer.isBuffer(readBuffer)).toBe(true);
          expect((readBuffer as Buffer).equals(buffer)).toBe(true);
        });

        it('should handle JSON files correctly', async () => {
          const filePath = fs.join(testDir, 'config.json');
          const data = { name: 'test', version: '1.0.0', items: ['a', 'b', 'c'] };
          const jsonContent = JSON.stringify(data, null, 2);
          
          await fs.writeFile(filePath, jsonContent);
          const readContent = await fs.readFile(filePath, 'utf8') as string;
          const parsedData = JSON.parse(readContent);
          
          expect(parsedData).toEqual(data);
        });

        it('should delete files', async () => {
          const filePath = fs.join(testDir, 'to-delete.txt');
          await fs.writeFile(filePath, 'delete me');
          
          expect(await fs.exists(filePath)).toBe(true);
          
          await fs.unlink(filePath);
          
          expect(await fs.exists(filePath)).toBe(false);
        });

        it('should get file stats', async () => {
          const filePath = fs.join(testDir, 'stats.txt');
          await fs.writeFile(filePath, 'content for stats');
          
          const stats = await fs.stat(filePath);
          
          expect(stats.isFile()).toBe(true);
          expect(stats.isDirectory()).toBe(false);
          expect(stats.size).toBeGreaterThan(0);
        });
      });

      describe('Path operations', () => {
        it('should check file existence', async () => {
          const existingFile = fs.join(testDir, 'exists.txt');
          const nonExistentFile = fs.join(testDir, 'does-not-exist.txt');
          
          await fs.writeFile(existingFile, 'exists');
          
          expect(await fs.exists(existingFile)).toBe(true);
          expect(await fs.exists(nonExistentFile)).toBe(false);
        });

        it('should handle path utilities correctly', () => {
          const pathA = '/path/to';
          const pathB = 'file.txt';
          
          const joined = fs.join(pathA, pathB);
          expect(joined).toBe('/path/to/file.txt');
          
          const resolved = fs.resolve('/base', '../other/file.txt');
          expect(resolved).toBe('/other/file.txt');
          
          expect(fs.dirname('/path/to/file.txt')).toBe('/path/to');
          expect(fs.basename('/path/to/file.txt')).toBe('file.txt');
          expect(fs.basename('/path/to/file.txt', '.txt')).toBe('file');
          expect(fs.extname('/path/to/file.txt')).toBe('.txt');
          expect(fs.isAbsolute('/absolute/path')).toBe(true);
          expect(fs.isAbsolute('relative/path')).toBe(false);
        });
      });

      describe('Synchronous operations', () => {
        it('should perform sync directory operations', async () => {
          const dirPath = fs.join(testDir, 'sync-dir');
          
          fs.mkdirSync(dirPath, { recursive: true });
          
          expect(fs.existsSync(dirPath)).toBe(true);
          const stats = fs.statSync(dirPath);
          expect(stats.isDirectory()).toBe(true);
        });

        it('should perform sync file operations', async () => {
          await fs.mkdir(testDir, { recursive: true });
          const filePath = fs.join(testDir, 'sync.txt');
          const content = 'sync content';
          
          fs.writeFileSync(filePath, content);
          
          expect(fs.existsSync(filePath)).toBe(true);
          const readContent = fs.readFileSync(filePath, 'utf8');
          expect(readContent).toBe(content);
        });

        it('should list directory contents synchronously', async () => {
          await fs.mkdir(testDir, { recursive: true });
          fs.writeFileSync(fs.join(testDir, 'sync-file1.txt'), 'content1');
          fs.writeFileSync(fs.join(testDir, 'sync-file2.txt'), 'content2');
          
          const contents = fs.readdirSync(testDir);
          
          expect(contents).toContain('sync-file1.txt');
          expect(contents).toContain('sync-file2.txt');
        });
      });

      describe('Error handling', () => {
        it('should handle reading non-existent files', async () => {
          const nonExistentFile = fs.join(testDir, 'does-not-exist.txt');
          
          await expect(fs.readFile(nonExistentFile)).rejects.toThrow();
        });

        it('should handle creating directories in non-existent parent (without recursive)', async () => {
          const invalidPath = fs.join(testDir, 'non-existent-parent', 'subdir');
          
          await expect(fs.mkdir(invalidPath)).rejects.toThrow();
        });

        it('should handle stat on non-existent paths', async () => {
          const nonExistentPath = fs.join(testDir, 'does-not-exist');
          
          await expect(fs.stat(nonExistentPath)).rejects.toThrow();
        });

        it('should handle unlinking non-existent files', async () => {
          const nonExistentFile = fs.join(testDir, 'does-not-exist.txt');
          
          await expect(fs.unlink(nonExistentFile)).rejects.toThrow();
        });
      });
    });
  });

  describe('MemoryFileSystemAdapter specific features', () => {
    let fs: MemoryFileSystemAdapter;

    beforeEach(() => {
      fs = new MemoryFileSystemAdapter();
    });

    it('should initialize with pre-populated files', () => {
      const initialFiles = {
        '/test.txt': 'test content',
        '/config.json': '{"key": "value"}'
      };
      
      const populatedFs = new MemoryFileSystemAdapter(initialFiles);
      
      expect(populatedFs.existsSync('/test.txt')).toBe(true);
      expect(populatedFs.existsSync('/config.json')).toBe(true);
      expect(populatedFs.readFileSync('/test.txt', 'utf8')).toBe('test content');
    });

    it('should populate filesystem after creation', () => {
      const files = {
        '/new-file.txt': 'new content',
        '/nested/file.txt': 'nested content'
      };
      
      fs.populate(files);
      
      expect(fs.existsSync('/new-file.txt')).toBe(true);
      expect(fs.existsSync('/nested/file.txt')).toBe(true);
      expect(fs.readFileSync('/new-file.txt', 'utf8')).toBe('new content');
    });

    it('should export filesystem as JSON', () => {
      fs.writeFileSync('/test.txt', 'content');
      fs.writeFileSync('/dir/file.txt', 'nested content');
      
      const json = fs.toJSON();
      
      expect(json['/test.txt']).toBe('content');
      expect(json['/dir/file.txt']).toBe('nested content');
    });

    it('should reset filesystem to empty state', () => {
      fs.writeFileSync('/test.txt', 'content');
      expect(fs.existsSync('/test.txt')).toBe(true);
      
      fs.reset();
      
      expect(fs.existsSync('/test.txt')).toBe(false);
      expect(Object.keys(fs.toJSON())).toHaveLength(0);
    });

    it('should provide access to underlying volume', () => {
      const volume = fs.getVolume();
      
      expect(volume).toBeDefined();
      expect(typeof volume.writeFileSync).toBe('function');
    });

    it('should automatically create parent directories when writing files', async () => {
      const deepPath = '/very/deep/nested/structure/file.txt';
      
      await fs.writeFile(deepPath, 'content');
      
      expect(await fs.exists(deepPath)).toBe(true);
      expect(await fs.exists('/very/deep/nested/structure')).toBe(true);
    });
  });
});