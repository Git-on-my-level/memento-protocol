import { DirectoryManager } from '../directoryManager';
import { createTestFileSystem } from '../testing';
import { MemoryFileSystemAdapter } from '../adapters/MemoryFileSystemAdapter';

jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    progress: jest.fn(),
    clearProgress: jest.fn(),
    step: jest.fn(),
  },
}));

let mockFs: any;

jest.mock('../utils/ResourceManager', () => ({
  withFileOperations: jest.fn(async (callback) => callback()),
  safeWriteFile: jest.fn(async (filePath, content) => {
    // Use the test filesystem instance
    const path = require('path');
    await mockFs?.mkdir(path.dirname(filePath), { recursive: true });
    await mockFs?.writeFile(filePath, content);
  }),
  safeCopyFile: jest.fn(async (src, dest) => {
    // Use the test filesystem instance
    const path = require('path');
    const content = await mockFs?.readFile(src);
    await mockFs?.mkdir(path.dirname(dest), { recursive: true });
    await mockFs?.writeFile(dest, content);
  }),
  resourceManager: {
    cleanup: jest.fn(),
    ensureDirectoriesWithAdapter: jest.fn(async (dirs, fs) => {
      for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
      }
    }),
  },
}));

describe('DirectoryManager', () => {
  let dirManager: DirectoryManager;
  let fs: MemoryFileSystemAdapter;
  const mockProjectRoot = '/test/project';
  const mockMementoDir = '/test/project/.memento';

  beforeEach(async () => {
    fs = await createTestFileSystem({});
    mockFs = fs; // Set the mockFs for ResourceManager mocks
    dirManager = new DirectoryManager(mockProjectRoot, fs);
  });

  describe('isInitialized', () => {
    it('should return true when .memento directory exists', async () => {
      // Create the .memento directory
      await fs.mkdir(mockMementoDir, { recursive: true });

      const result = dirManager.isInitialized();
      
      expect(result).toBe(true);
    });

    it('should return false when .memento directory does not exist', () => {
      const result = dirManager.isInitialized();
      
      expect(result).toBe(false);
    });
  });

  describe('initializeStructure', () => {
    it('should create all required directories', async () => {
      await dirManager.initializeStructure();

      const expectedDirs = [
        mockMementoDir,
        fs.join(mockMementoDir, 'modes'),
        fs.join(mockMementoDir, 'workflows'),
        fs.join(mockMementoDir, 'integrations'),
        fs.join(mockMementoDir, 'scripts'),
        fs.join(mockMementoDir, 'tickets'),
        '/test/project/.claude',
        '/test/project/.claude/agents',
      ];

      expectedDirs.forEach(dir => {
        expect(fs.existsSync(dir)).toBe(true);
      });
    });

    it('should create manifest.json file', async () => {
      await dirManager.initializeStructure();

      const manifestPath = fs.join(mockMementoDir, 'manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);
      
      const content = await fs.readFile(manifestPath, 'utf-8') as string;
      const manifest = JSON.parse(content);
      expect(manifest.version).toBe('1.0.0');
      expect(manifest).toHaveProperty('components');
    });

    it('should not overwrite existing manifest', async () => {
      const manifestPath = fs.join(mockMementoDir, 'manifest.json');
      const originalManifest = { version: '0.9.0', custom: 'data' };
      
      // Pre-create directories and manifest
      await fs.mkdir(mockMementoDir, { recursive: true });
      await fs.writeFile(manifestPath, JSON.stringify(originalManifest));

      await dirManager.initializeStructure();

      const content = await fs.readFile(manifestPath, 'utf-8') as string;
      const manifest = JSON.parse(content);
      expect(manifest).toEqual(originalManifest);
    });
  });

  describe('validateStructure', () => {
    it('should report valid when all directories exist', async () => {
      await dirManager.initializeStructure();

      const result = await dirManager.validateStructure();

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should report missing directories', async () => {
      // Create only some directories
      await fs.mkdir(mockMementoDir, { recursive: true });
      await fs.mkdir(fs.join(mockMementoDir, 'integrations'));
      await fs.mkdir(fs.join(mockMementoDir, 'scripts'));
      await fs.mkdir(fs.join(mockMementoDir, 'tickets'));
      await fs.mkdir('/test/project/.claude/agents', { recursive: true });

      const result = await dirManager.validateStructure();

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('modes');
      expect(result.missing).toContain('workflows');
      expect(result.missing).toContain('manifest.json');
    });

    it('should check for manifest.json', async () => {
      // Create all directories but no manifest
      const dirs = ['modes', 'workflows', 'integrations', 'scripts', 'tickets'];
      await fs.mkdir(mockMementoDir, { recursive: true });
      for (const dir of dirs) {
        await fs.mkdir(fs.join(mockMementoDir, dir));
      }
      await fs.mkdir('/test/project/.claude/agents', { recursive: true });

      const result = await dirManager.validateStructure();

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('manifest.json');
    });
  });

  describe('ensureGitignore', () => {
    it('should add .memento to gitignore if not present', async () => {
      const gitignorePath = fs.join(mockProjectRoot, '.gitignore');
      await fs.writeFile(gitignorePath, 'node_modules/\n');

      await dirManager.ensureGitignore();

      const content = await fs.readFile(gitignorePath, 'utf-8') as string;
      expect(content).toContain('.memento/');
      expect(content).toContain('# Memento Protocol');
    });

    it('should not duplicate .memento entry', async () => {
      const gitignorePath = fs.join(mockProjectRoot, '.gitignore');
      const originalContent = 'node_modules/\n.memento/\n';
      await fs.writeFile(gitignorePath, originalContent);

      await dirManager.ensureGitignore();

      const content = await fs.readFile(gitignorePath, 'utf-8') as string;
      expect(content).toBe(originalContent);
    });

    it('should create gitignore if it does not exist', async () => {
      await dirManager.ensureGitignore();

      const gitignorePath = fs.join(mockProjectRoot, '.gitignore');
      const content = await fs.readFile(gitignorePath, 'utf-8') as string;
      expect(content).toContain('# Memento Protocol');
      expect(content).toContain('.memento/');
    });

    it('should recognize various .memento patterns', async () => {
      const patterns = ['.memento', '.memento/', '/.memento', '/.memento/'];
      
      for (const pattern of patterns) {
        // Reset filesystem for each test
        fs.reset();
        
        const gitignorePath = fs.join(mockProjectRoot, '.gitignore');
        const originalContent = `node_modules/\n${pattern}\n`;
        await fs.writeFile(gitignorePath, originalContent);

        await dirManager.ensureGitignore();

        const content = await fs.readFile(gitignorePath, 'utf-8') as string;
        expect(content).toBe(originalContent); // Should not be modified
      }
    });
  });

  describe('getComponentPath', () => {
    it('should return correct path for modes', () => {
      const path = dirManager.getComponentPath('modes', 'architect');
      expect(path).toBe('/test/project/.memento/modes/architect.md');
    });

    it('should return correct path for workflows', () => {
      const path = dirManager.getComponentPath('workflows', 'review');
      expect(path).toBe('/test/project/.memento/workflows/review.md');
    });

    it('should return correct path for agents', () => {
      const path = dirManager.getComponentPath('agents', 'researcher');
      expect(path).toBe('/test/project/.claude/agents/researcher.md');
    });
  });

  describe('getManifest', () => {
    it('should read and parse manifest file', async () => {
      const mockManifest = {
        version: '1.0.0',
        components: {
          modes: ['architect'],
          workflows: ['review']
        }
      };

      const manifestPath = fs.join(mockMementoDir, 'manifest.json');
      await fs.mkdir(mockMementoDir, { recursive: true });
      await fs.writeFile(manifestPath, JSON.stringify(mockManifest));

      const result = await dirManager.getManifest();

      expect(result).toEqual(mockManifest);
    });
    
    it('should throw error when manifest does not exist', async () => {
      await expect(dirManager.getManifest()).rejects.toThrow('Memento Protocol is not initialized');
    });
  });

  describe('updateManifest', () => {
    it('should write manifest file', async () => {
      const manifest = {
        version: '1.0.0',
        components: {
          modes: ['architect', 'engineer'],
          workflows: ['review', 'refactor']
        }
      };

      await fs.mkdir(mockMementoDir, { recursive: true });
      await dirManager.updateManifest(manifest);

      const manifestPath = fs.join(mockMementoDir, 'manifest.json');
      const content = await fs.readFile(manifestPath, 'utf-8') as string;
      expect(JSON.parse(content)).toEqual(manifest);
    });
  });
});