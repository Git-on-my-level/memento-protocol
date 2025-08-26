import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import matter from 'gray-matter';
import { ComponentInstaller } from '../componentInstaller';
import { DirectoryManager } from '../directoryManager';
import { logger } from '../logger';

jest.mock('fs/promises');
jest.mock('fs');
jest.mock('gray-matter');
jest.mock('../directoryManager');
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('ComponentInstaller', () => {
  let installer: ComponentInstaller;
  let mockDirManager: jest.Mocked<DirectoryManager>;
  const mockProjectRoot = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create fresh directory manager mock
    mockDirManager = {
      getManifest: jest.fn(),
      updateManifest: jest.fn(),
      getComponentPath: jest.fn(),
      isInitialized: jest.fn()
    } as any;

    (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => mockDirManager);
    
    installer = new ComponentInstaller(mockProjectRoot);
  });

  describe('listAvailableComponents', () => {
    it('should list available modes and workflows from frontmatter', async () => {
      // Simple, deterministic mock setup
      (existsSync as jest.Mock).mockReturnValue(true);
      
      (fs.readdir as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('modes')) return Promise.resolve(['architect.md']);
        if (path.includes('workflows')) return Promise.resolve(['review.md']);
        return Promise.resolve([]);
      });

      (fs.readFile as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('architect.md')) {
          return Promise.resolve('---\nname: architect\ndescription: System design\n---\n# Content');
        }
        if (path.includes('review.md')) {
          return Promise.resolve('---\nname: review\ndescription: Code review\n---\n# Content');
        }
        return Promise.resolve('');
      });

      (matter as any).mockImplementation((content: string) => {
        if (content.includes('architect')) {
          return { data: { name: 'architect', description: 'System design', tags: [], dependencies: [] } };
        }
        if (content.includes('review')) {
          return { data: { name: 'review', description: 'Code review', tags: [], dependencies: [] } };
        }
        return { data: {} };
      });

      const result = await installer.listAvailableComponents();

      expect(result.modes).toHaveLength(1);
      expect(result.modes[0].name).toBe('architect');
      expect(result.workflows).toHaveLength(1);
      expect(result.workflows[0].name).toBe('review');
    });

    it('should handle missing template directories', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      const result = await installer.listAvailableComponents();

      expect(result.modes).toEqual([]);
      expect(result.workflows).toEqual([]);
      expect(result.agents).toEqual([]);
    });
  });

  describe('listInstalledComponents', () => {
    it('should return installed components from manifest', async () => {
      const mockManifest = {
        components: {
          modes: ['architect'],
          workflows: ['review']
        }
      };

      mockDirManager.isInitialized.mockReturnValue(true);
      mockDirManager.getManifest.mockResolvedValue(mockManifest);

      const result = await installer.listInstalledComponents();

      expect(result.modes).toEqual(['architect']);
      expect(result.workflows).toEqual(['review']);
    });

    it('should return empty arrays when not initialized', async () => {
      mockDirManager.isInitialized.mockReturnValue(false);

      const result = await installer.listInstalledComponents();

      expect(result.modes).toEqual([]);
      expect(result.workflows).toEqual([]);
      expect(mockDirManager.getManifest).not.toHaveBeenCalled();
    });
  });

  describe('installComponent', () => {
    it('should install a mode successfully', async () => {
      const mockManifest = {
        components: { modes: [], workflows: [], updated: '' }
      };

      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue('---\nname: architect\n---\n# Content');
      (matter as any).mockReturnValue({
        data: { name: 'architect', description: 'System design', dependencies: [] }
      });
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      
      mockDirManager.getManifest.mockResolvedValue(mockManifest);
      mockDirManager.getComponentPath.mockReturnValue('/test/.memento/modes/architect.md');

      await installer.installComponent('mode', 'architect');

      expect(fs.writeFile).toHaveBeenCalled();
      expect(logger.success).toHaveBeenCalledWith("Installed mode 'architect'");
    });

    it('should skip already installed components', async () => {
      const mockManifest = {
        components: { modes: ['architect'], workflows: [] }
      };

      (existsSync as jest.Mock).mockReturnValue(true);
      mockDirManager.getManifest.mockResolvedValue(mockManifest);

      await installer.installComponent('mode', 'architect');

      expect(logger.warn).toHaveBeenCalledWith("mode 'architect' is already installed");
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent component', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      await expect(installer.installComponent('mode', 'nonexistent'))
        .rejects.toThrow("Component mode 'nonexistent' not found in templates");
    });
  });

  describe('interactiveInstall', () => {
    it('should display available components', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdir as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('modes')) return Promise.resolve(['architect.md']);
        return Promise.resolve([]);
      });
      (fs.readFile as jest.Mock).mockResolvedValue('---\nname: architect\ndescription: System design\n---\n# Content');
      (matter as any).mockReturnValue({
        data: { name: 'architect', description: 'System design', tags: [], dependencies: [] }
      });

      await installer.interactiveInstall('mode');

      expect(logger.info).toHaveBeenCalledWith('Available modes:');
      expect(logger.info).toHaveBeenCalledWith('  - architect: System design');
    });

    it('should handle no available components', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      await installer.interactiveInstall('workflow');

      expect(logger.error).toHaveBeenCalledWith('No workflows available for installation');
    });
  });
});