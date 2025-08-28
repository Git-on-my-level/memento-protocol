import matter from 'gray-matter';
import { ComponentInstaller } from '../componentInstaller';
import { DirectoryManager } from '../directoryManager';
import { logger } from '../logger';
import { 
  createTestFileSystem,
  FileSystemAdapter
} from '../testing';

jest.mock('gray-matter');
jest.mock('../directoryManager');
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    progress: jest.fn(),
    clearProgress: jest.fn(),
    step: jest.fn(),
  }
}));

describe('ComponentInstaller', () => {
  let installer: ComponentInstaller;
  let mockDirManager: jest.Mocked<DirectoryManager>;
  let testFs: FileSystemAdapter;
  const mockProjectRoot = '/test/project';

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create test filesystem with template structure
    testFs = await createTestFileSystem({
      // Template structure (PackagePaths.getTemplatesDir() returns /test/templates in test mode)
      '/test/templates/modes/architect.md': '---\nname: architect\ndescription: System design\ntags: []\ndependencies: []\n---\n# Content',
      '/test/templates/workflows/review.md': '---\nname: review\ndescription: Code review\ntags: []\ndependencies: []\n---\n# Content',
      '/test/templates/agents/research.md': '---\nname: research\ndescription: Research agent\ntags: []\ndependencies: []\n---\n# Content'
    });
    
    // Create fresh directory manager mock
    mockDirManager = {
      getManifest: jest.fn(),
      updateManifest: jest.fn(),
      getComponentPath: jest.fn(),
      isInitialized: jest.fn()
    } as any;

    (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => mockDirManager);
    
    installer = new ComponentInstaller(mockProjectRoot, testFs, '/test/templates');
  });

  describe('listAvailableComponents', () => {
    it('should list available modes and workflows from frontmatter', async () => {
      // Mock matter parsing
      (matter as any).mockImplementation((content: string) => {
        if (content.includes('architect')) {
          return { data: { name: 'architect', description: 'System design', tags: [], dependencies: [] } };
        }
        if (content.includes('review')) {
          return { data: { name: 'review', description: 'Code review', tags: [], dependencies: [] } };
        }
        if (content.includes('research')) {
          return { data: { name: 'research', description: 'Research agent', tags: [], dependencies: [] } };
        }
        return { data: {} };
      });

      const result = await installer.listAvailableComponents();

      expect(result.modes).toHaveLength(1);
      expect(result.modes[0].name).toBe('architect');
      expect(result.workflows).toHaveLength(1);
      expect(result.workflows[0].name).toBe('review');
      expect(result.agents).toHaveLength(1);
      expect(result.agents[0].name).toBe('research');
    });

    it('should handle missing template directories', async () => {
      // Create installer with empty filesystem
      const emptyFs = await createTestFileSystem({});
      const emptyInstaller = new ComponentInstaller(mockProjectRoot, emptyFs, '/test/templates');

      const result = await emptyInstaller.listAvailableComponents();

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

      (matter as any).mockReturnValue({
        data: { name: 'architect', description: 'System design', dependencies: [] }
      });
      
      mockDirManager.getManifest.mockResolvedValue(mockManifest);
      mockDirManager.getComponentPath.mockReturnValue('/test/.memento/modes/architect.md');

      await installer.installComponent('mode', 'architect');

      // Verify the file was written to the destination path
      const writtenContent = await testFs.readFile('/test/.memento/modes/architect.md', 'utf-8');
      expect(writtenContent).toContain('System design');
      expect(logger.success).toHaveBeenCalledWith("Installed mode 'architect'");
    });

    it('should skip already installed components', async () => {
      const mockManifest = {
        components: { modes: ['architect'], workflows: [] }
      };

      mockDirManager.getManifest.mockResolvedValue(mockManifest);

      await installer.installComponent('mode', 'architect');

      expect(logger.warn).toHaveBeenCalledWith("mode 'architect' is already installed");
      // Verify file was NOT written
      expect(await testFs.exists('/test/.memento/modes/architect.md')).toBe(false);
    });

    it('should throw error for non-existent component', async () => {
      await expect(installer.installComponent('mode', 'nonexistent'))
        .rejects.toThrow("Component mode 'nonexistent' not found in templates");
    });
  });

  describe('interactiveInstall', () => {
    it('should display available components', async () => {
      (matter as any).mockReturnValue({
        data: { name: 'architect', description: 'System design', tags: [], dependencies: [] }
      });

      await installer.interactiveInstall('mode');

      expect(logger.info).toHaveBeenCalledWith('Available modes:');
      expect(logger.info).toHaveBeenCalledWith('  - architect: System design');
    });

    it('should handle no available components', async () => {
      // Create installer with no workflow templates
      const noWorkflowFs = await createTestFileSystem({
        '/test/templates/modes/architect.md': '---\nname: architect\ndescription: System design\n---\n# Content',
        '/test/templates/agents/research.md': '---\nname: research\ndescription: Research agent\n---\n# Content'
      });
      const noWorkflowInstaller = new ComponentInstaller(mockProjectRoot, noWorkflowFs, '/test/templates');

      await noWorkflowInstaller.interactiveInstall('workflow');

      expect(logger.error).toHaveBeenCalledWith('No workflows available for installation');
    });
  });
});