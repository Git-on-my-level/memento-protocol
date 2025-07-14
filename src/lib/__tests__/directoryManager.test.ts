import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { DirectoryManager } from '../directoryManager';

jest.mock('fs/promises');
jest.mock('fs');

describe('DirectoryManager', () => {
  let dirManager: DirectoryManager;
  const mockProjectRoot = '/test/project';
  const mockMementoDir = '/test/project/.memento';

  beforeEach(() => {
    jest.clearAllMocks();
    dirManager = new DirectoryManager(mockProjectRoot);
  });

  describe('isInitialized', () => {
    it('should return true when .memento directory exists', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const result = dirManager.isInitialized();
      
      expect(result).toBe(true);
      expect(existsSync).toHaveBeenCalledWith(mockMementoDir);
    });

    it('should return false when .memento directory does not exist', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      const result = dirManager.isInitialized();
      
      expect(result).toBe(false);
    });
  });

  describe('initializeStructure', () => {
    it('should create all required directories', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await dirManager.initializeStructure();

      const expectedDirs = [
        mockMementoDir,
        path.join(mockMementoDir, 'modes'),
        path.join(mockMementoDir, 'workflows'),
        path.join(mockMementoDir, 'languages'),
        path.join(mockMementoDir, 'integrations'),
        path.join(mockMementoDir, 'tickets'),
      ];

      expectedDirs.forEach(dir => {
        expect(fs.mkdir).toHaveBeenCalledWith(dir, { recursive: true });
      });
    });

    it('should create manifest.json file', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await dirManager.initializeStructure();

      const manifestPath = path.join(mockMementoDir, 'manifest.json');
      expect(fs.writeFile).toHaveBeenCalledWith(
        manifestPath,
        expect.stringContaining('"version": "1.0.0"')
      );
    });

    it('should not overwrite existing manifest', async () => {
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        return path.endsWith('manifest.json');
      });
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      await dirManager.initializeStructure();

      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('validateStructure', () => {
    it('should report valid when all directories exist', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const result = await dirManager.validateStructure();

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should report missing directories', async () => {
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        return !path.includes('modes') && !path.includes('workflows');
      });

      const result = await dirManager.validateStructure();

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('modes');
      expect(result.missing).toContain('workflows');
    });

    it('should check for manifest.json', async () => {
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        return !path.endsWith('manifest.json');
      });

      const result = await dirManager.validateStructure();

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('manifest.json');
    });
  });

  describe('ensureGitignore', () => {
    it('should add .memento to gitignore if not present', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue('node_modules/\n');
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await dirManager.ensureGitignore();

      const gitignorePath = path.join(mockProjectRoot, '.gitignore');
      expect(fs.writeFile).toHaveBeenCalledWith(
        gitignorePath,
        expect.stringContaining('.memento/')
      );
    });

    it('should not duplicate .memento entry', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue('node_modules/\n.memento/\n');

      await dirManager.ensureGitignore();

      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should create gitignore if it does not exist', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await dirManager.ensureGitignore();

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(mockProjectRoot, '.gitignore'),
        expect.stringContaining('# Memento Protocol\n.memento/')
      );
    });

    it('should recognize various .memento patterns', async () => {
      const patterns = ['.memento', '.memento/', '/.memento', '/.memento/'];
      
      for (const pattern of patterns) {
        jest.clearAllMocks();
        (existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFile as jest.Mock).mockResolvedValue(`node_modules/\n${pattern}\n`);

        await dirManager.ensureGitignore();

        expect(fs.writeFile).not.toHaveBeenCalled();
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

    it('should return correct path for languages', () => {
      const path = dirManager.getComponentPath('languages', 'typescript');
      expect(path).toBe('/test/project/.memento/languages/typescript.md');
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

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockManifest));

      const result = await dirManager.getManifest();

      expect(result).toEqual(mockManifest);
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(mockMementoDir, 'manifest.json'),
        'utf-8'
      );
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

      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await dirManager.updateManifest(manifest);

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(mockMementoDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );
    });
  });
});