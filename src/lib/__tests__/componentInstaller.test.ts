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
    it('should list available modes and workflows from frontmatter', async () => {
      // Mock directory listing
      (fs.readdir as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('/modes')) {
          return Promise.resolve(['architect.md', 'engineer.md']);
        }
        if (path.includes('/workflows')) {
          return Promise.resolve(['review.md']);
        }
        if (path.includes('/agents')) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });

      // Mock file reading and frontmatter parsing
      (fs.readFile as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('architect.md')) {
          return Promise.resolve('---\nname: architect\ndescription: System design\ntags: [design]\ndependencies: []\n---\n# Content');
        }
        if (path.includes('engineer.md')) {
          return Promise.resolve('---\nname: engineer\ndescription: Implementation\ntags: [code]\ndependencies: []\n---\n# Content');
        }
        if (path.includes('review.md')) {
          return Promise.resolve('---\nname: review\ndescription: Code review\ntags: [quality]\ndependencies: [reviewer]\n---\n# Content');
        }
        return Promise.resolve('');
      });

      (matter as any as jest.Mock).mockImplementation((content: string) => {
        if (content.includes('architect')) {
          return { data: { name: 'architect', description: 'System design', tags: ['design'], dependencies: [] } };
        }
        if (content.includes('engineer')) {
          return { data: { name: 'engineer', description: 'Implementation', tags: ['code'], dependencies: [] } };
        }
        if (content.includes('review')) {
          return { data: { name: 'review', description: 'Code review', tags: ['quality'], dependencies: ['reviewer'] } };
        }
        return { data: {} };
      });

      (existsSync as jest.Mock).mockReturnValue(true);

      const result = await installer.listAvailableComponents();

      expect(result.modes).toHaveLength(2);
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

    it('should handle files with invalid frontmatter', async () => {
      (fs.readdir as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('/modes')) {
          return Promise.resolve(['invalid.md']);
        }
        return Promise.resolve([]);
      });

      (fs.readFile as jest.Mock).mockResolvedValue('---\ninvalid: content\n---\n# Content');
      (matter as any as jest.Mock).mockReturnValue({ data: { invalid: 'content' } }); // Missing name/description

      (existsSync as jest.Mock).mockReturnValue(true);

      const result = await installer.listAvailableComponents();

      expect(result.modes).toEqual([]);
      expect(logger.warn).toHaveBeenCalled();
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

      const modeContent = '---\nname: architect\ndescription: System design\ntags: [design]\ndependencies: []\n---\n# Architect Mode\nContent';

      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('/test/project/templates')) {
          return false;
        }
        return true;
      });
      (fs.readFile as jest.Mock).mockResolvedValue(modeContent);
      (matter as any as jest.Mock).mockReturnValue({
        data: { name: 'architect', description: 'System design', tags: ['design'], dependencies: [] }
      });
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      mockDirManager.getManifest.mockResolvedValue(mockManifest);
      mockDirManager.getComponentPath.mockReturnValue('/test/.memento/modes/architect.md');

      await installer.installComponent('mode', 'architect');

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/.memento/modes/architect.md',
        modeContent
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

      const workflowContent = '---\nname: review\ndescription: Code review\ndependencies: [reviewer]\n---\n# Review Workflow';
      const reviewerContent = '---\nname: reviewer\ndescription: Reviewer mode\ndependencies: []\n---\n# Reviewer Mode';

      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFile as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('review.md')) {
          return Promise.resolve(workflowContent);
        }
        if (path.includes('reviewer.md')) {
          return Promise.resolve(reviewerContent);
        }
        return Promise.resolve('# Content');
      });
      (matter as any as jest.Mock).mockImplementation((content: string) => {
        if (content.includes('review')) {
          return { data: { name: 'review', description: 'Code review', dependencies: ['reviewer'] } };
        }
        if (content.includes('reviewer')) {
          return { data: { name: 'reviewer', description: 'Reviewer mode', dependencies: [] } };
        }
        return { data: {} };
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

      mockDirManager.getManifest.mockResolvedValue(mockManifest);
      (fs.readFile as jest.Mock).mockResolvedValue('---\nname: review\ndescription: Code review\ndependencies: [reviewer]\n---\n# Content');
      (matter as any as jest.Mock).mockReturnValue({
        data: { name: 'review', description: 'Code review', dependencies: ['reviewer'] }
      });

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

      mockDirManager.getManifest.mockResolvedValue(mockManifest);
      (fs.readFile as jest.Mock).mockResolvedValue('---\nname: review\ndescription: Code review\ndependencies: [reviewer]\n---\n# Content');
      (matter as any as jest.Mock).mockReturnValue({
        data: { name: 'review', description: 'Code review', dependencies: ['reviewer'] }
      });

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
      (fs.readdir as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('/modes')) {
          return Promise.resolve(['architect.md']);
        }
        return Promise.resolve([]);
      });

      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue('---\nname: architect\ndescription: System design\ntags: []\ndependencies: []\n---\n# Content');
      (matter as any as jest.Mock).mockReturnValue({
        data: { name: 'architect', description: 'System design', tags: [], dependencies: [] }
      });

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

  describe('parseTemplateFrontmatter (private method testing via integration)', () => {
    it('should parse agent frontmatter with tools and model fields', async () => {
      (fs.readdir as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('/agents')) {
          return Promise.resolve(['test-agent.md']);
        }
        return Promise.resolve([]);
      });

      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue('---\nname: test-agent\ndescription: Test agent\ntools: Read, Write\nmodel: haiku\ntags: []\ndependencies: []\n---\n# Content');
      (matter as any as jest.Mock).mockReturnValue({
        data: { 
          name: 'test-agent', 
          description: 'Test agent',
          tools: 'Read, Write',
          model: 'haiku',
          tags: [], 
          dependencies: [] 
        }
      });

      const result = await installer.listAvailableComponents();

      expect(result.agents).toHaveLength(1);
      expect(result.agents[0].tools).toBe('Read, Write');
      expect(result.agents[0].model).toBe('haiku');
    });

    it('should handle parsing errors gracefully', async () => {
      (fs.readdir as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('/modes')) {
          return Promise.resolve(['error-mode.md']);
        }
        return Promise.resolve([]);
      });

      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File read error'));

      const result = await installer.listAvailableComponents();

      expect(result.modes).toEqual([]);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('scanComponentDirectory (private method testing via integration)', () => {
    it('should only process .md files', async () => {
      (fs.readdir as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('/modes')) {
          return Promise.resolve(['valid.md', 'invalid.txt', 'another.md']);
        }
        return Promise.resolve([]);
      });

      (existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFile as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('valid.md')) {
          return Promise.resolve('---\nname: valid\ndescription: Valid mode\ntags: []\ndependencies: []\n---\n# Content');
        }
        if (path.includes('another.md')) {
          return Promise.resolve('---\nname: another\ndescription: Another mode\ntags: []\ndependencies: []\n---\n# Content');
        }
        return Promise.resolve('Not markdown content');
      });
      (matter as any as jest.Mock).mockImplementation((content: string) => {
        if (content.includes('valid')) {
          return { data: { name: 'valid', description: 'Valid mode', tags: [], dependencies: [] } };
        }
        if (content.includes('another')) {
          return { data: { name: 'another', description: 'Another mode', tags: [], dependencies: [] } };
        }
        return { data: {} };
      });

      const result = await installer.listAvailableComponents();

      expect(result.modes).toHaveLength(2);
      expect(result.modes.find(m => m.name === 'valid')).toBeDefined();
      expect(result.modes.find(m => m.name === 'another')).toBeDefined();
      expect(fs.readFile).not.toHaveBeenCalledWith(expect.stringContaining('invalid.txt'));
    });
  });
});