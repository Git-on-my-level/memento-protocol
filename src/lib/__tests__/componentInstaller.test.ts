import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { ComponentInstaller } from '../componentInstaller';
import { DirectoryManager } from '../directoryManager';
import { logger } from '../logger';

jest.mock('fs/promises');
jest.mock('fs');
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
    
    mockDirManager = {
      getManifest: jest.fn(),
      updateManifest: jest.fn(),
      getComponentPath: jest.fn(),
      isInitialized: jest.fn()
    } as any;

    (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => mockDirManager);
    
    // Mock existsSync to return false for repo templates dir
    (existsSync as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('/test/project/templates')) {
        return false;
      }
      return true;
    });
    
    installer = new ComponentInstaller(mockProjectRoot);
  });

  describe('listAvailableComponents', () => {
    it('should list available modes and workflows', async () => {
      const globalMetadata = {
        version: '1.0.0',
        templates: {
          modes: [
            { name: 'architect', description: 'System design', tags: ['design'], dependencies: [] },
            { name: 'engineer', description: 'Implementation', tags: ['code'], dependencies: [] }
          ],
          workflows: [
            { name: 'review', description: 'Code review', tags: ['quality'], dependencies: ['reviewer'] }
          ]
        }
      };

      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(globalMetadata));

      const result = await installer.listAvailableComponents();

      expect(result.modes).toHaveLength(2);
      expect(result.modes[0].name).toBe('architect');
      expect(result.workflows).toHaveLength(1);
      expect(result.workflows[0].name).toBe('review');
    });

    it('should handle missing metadata files', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      const result = await installer.listAvailableComponents();

      expect(result.modes).toEqual([]);
      expect(result.workflows).toEqual([]);
    });
  });

  describe('listInstalledComponents', () => {
    it('should return installed components from manifest', async () => {
      const mockManifest = {
        components: {
          modes: ['architect', 'engineer'],
          workflows: ['review']
        }
      };

      mockDirManager.isInitialized.mockReturnValue(true);
      mockDirManager.getManifest.mockResolvedValue(mockManifest);

      const result = await installer.listInstalledComponents();

      expect(result.modes).toEqual(['architect', 'engineer']);
      expect(result.workflows).toEqual(['review']);
    });

    it('should handle empty manifest', async () => {
      mockDirManager.isInitialized.mockReturnValue(true);
      mockDirManager.getManifest.mockResolvedValue({
        components: {}
      });

      const result = await installer.listInstalledComponents();

      expect(result.modes).toEqual([]);
      expect(result.workflows).toEqual([]);
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
        components: {
          modes: [],
          workflows: [],
          updated: ''
        }
      };

      const globalMetadata = {
        version: '1.0.0',
        templates: {
          modes: [
            { name: 'architect', description: 'System design', tags: ['design'], dependencies: [] }
          ],
          workflows: []
        }
      };

      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('/test/project/templates')) {
          return false;
        }
        return true;
      });
      (fs.readFile as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('metadata.json')) {
          return Promise.resolve(JSON.stringify(globalMetadata));
        }
        return Promise.resolve('# Architect Mode\nContent');
      });
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      mockDirManager.getManifest.mockResolvedValue(mockManifest);
      mockDirManager.getComponentPath.mockReturnValue('/test/.memento/modes/architect.md');

      await installer.installComponent('mode', 'architect');

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/.memento/modes/architect.md',
        '# Architect Mode\nContent'
      );
      expect(logger.success).toHaveBeenCalledWith("Installed mode 'architect'");
    });

    it('should install dependencies automatically', async () => {
      const mockManifest = {
        components: {
          modes: [],
          workflows: [],
          updated: ''
        }
      };

      const metadata = {
        version: '1.0.0',
        templates: {
          modes: [],
          workflows: [
            { name: 'review', dependencies: ['reviewer'] }
          ]
        }
      };

      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFile as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('metadata.json')) {
          return Promise.resolve(JSON.stringify(metadata));
        }
        return Promise.resolve('# Content');
      });
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      mockDirManager.getManifest.mockResolvedValue(mockManifest);
      mockDirManager.getComponentPath.mockImplementation((type, name) => 
        `/test/.memento/${type}/${name}.md`
      );

      await installer.installComponent('workflow', 'review');

      expect(logger.info).toHaveBeenCalledWith("Installing required dependency: mode 'reviewer'");
      expect(fs.writeFile).toHaveBeenCalledTimes(2); // dependency + component
    });

    it('should skip already installed components', async () => {
      const mockManifest = {
        components: {
          modes: ['architect'],
          workflows: []
        }
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

  describe('validateDependencies', () => {
    it('should validate all dependencies are satisfied', async () => {
      const mockManifest = {
        components: {
          modes: ['reviewer'],
          workflows: ['review']
        }
      };

      const metadata = {
        version: '1.0.0',
        templates: {
          modes: [],
          workflows: [
            { name: 'review', dependencies: ['reviewer'] }
          ]
        }
      };

      mockDirManager.getManifest.mockResolvedValue(mockManifest);
      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(metadata));

      const result = await installer.validateDependencies();

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should detect missing dependencies', async () => {
      const mockManifest = {
        components: {
          modes: [],
          workflows: ['review']
        }
      };

      const metadata = {
        version: '1.0.0',
        templates: {
          modes: [],
          workflows: [
            { name: 'review', dependencies: ['reviewer'] }
          ]
        }
      };

      mockDirManager.getManifest.mockResolvedValue(mockManifest);
      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(metadata));

      const result = await installer.validateDependencies();

      expect(result.valid).toBe(false);
      expect(result.missing).toHaveLength(1);
      expect(result.missing[0]).toEqual({
        component: 'workflow:review',
        dependencies: ['reviewer']
      });
    });
  });

  describe('interactiveInstall', () => {
    it('should display available components', async () => {
      const metadata = {
        version: '1.0.0',
        templates: {
          modes: [
            { name: 'architect', description: 'System design', tags: [], dependencies: [] }
          ],
          workflows: []
        }
      };

      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(metadata));

      await installer.interactiveInstall('mode');

      expect(logger.info).toHaveBeenCalledWith('Available modes:');
      expect(logger.info).toHaveBeenCalledWith('  - architect: System design');
      expect(logger.info).toHaveBeenCalledWith('Run "memento add mode <name>" to install a specific mode');
    });

    it('should handle no available components', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      await installer.interactiveInstall('workflow');

      expect(logger.error).toHaveBeenCalledWith('No workflows available for installation');
    });
  });
});