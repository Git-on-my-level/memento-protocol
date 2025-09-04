import { addCommand } from '../add';
import { ZccCore } from '../../lib/ZccCore';
import { logger } from '../../lib/logger';
import inquirer from 'inquirer';
import { createTestFileSystem } from '../../lib/testing';
import * as fs from 'fs';

jest.mock('../../lib/ZccCore');
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
}));
jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
}));
jest.mock('../../lib/utils/filesystem', () => ({
  ensureDirectorySync: jest.fn(),
}));

describe('Add Command', () => {
  let mockCore: jest.Mocked<ZccCore>;
  let originalExit: any;
  let mockInquirer: jest.Mocked<typeof inquirer>;
  let testFs: any;
  let mockFs: jest.Mocked<typeof fs>;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup fs mocks
    mockFs = fs as jest.Mocked<typeof fs>;
    mockFs.readFileSync.mockReturnValue('# Mock Component Content\n\nThis is a mock component.');
    mockFs.writeFileSync.mockReturnValue();
    mockFs.existsSync.mockReturnValue(true);
    
    // Create test filesystem
    testFs = await createTestFileSystem({
      '/project/.zcc/config.json': JSON.stringify({ version: '1.0.0' }, null, 2),
      '/project/.zcc/modes/architect.md': '# Architect Mode\n\nSystem design mode',
      '/project/.zcc/workflows/review.md': '# Review Workflow\n\nCode review workflow'
    });

    mockCore = {
      findComponents: jest.fn(),
      getComponentsByTypeWithSource: jest.fn(),
      getComponentConflicts: jest.fn(),
      getScopes: jest.fn(),
      clearCache: jest.fn(),
      generateSuggestions: jest.fn()
    } as any;

    mockInquirer = inquirer as jest.Mocked<typeof inquirer>;

    (ZccCore as jest.MockedClass<typeof ZccCore>).mockImplementation(() => mockCore);
    
    originalExit = process.exit;
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe('add mode', () => {
    it('should install a specific mode when exact match found', async () => {
      const mockComponent = {
        component: {
          name: 'architect',
          type: 'mode' as const,
          path: '/templates/modes/architect.md',
          metadata: { description: 'System design mode' }
        },
        source: 'builtin' as const,
        name: 'architect',
        score: 100,
        matchType: 'exact' as const
      };
      
      mockCore.findComponents.mockResolvedValue([mockComponent]);
      mockCore.getComponentConflicts.mockResolvedValue([]);
      mockCore.getScopes.mockReturnValue({
        project: { getPath: () => '/project/.zcc', fs: testFs } as any,
        global: { getPath: () => '/global/.zcc', fs: testFs } as any
      });

      await addCommand.parseAsync(['node', 'test', 'mode', 'architect']);

      expect(mockCore.findComponents).toHaveBeenCalledWith('architect', 'mode', {
        maxResults: 5,
        minScore: 30
      });
      expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('Successfully installed'));
    });

    it('should start interactive mode selection when no name provided', async () => {
      const mockComponents = [
        {
          component: {
            name: 'architect',
            type: 'mode' as const,
            path: '/templates/modes/architect.md',
            metadata: { description: 'System design mode' }
          },
          source: 'builtin' as const
        },
        {
          component: {
            name: 'engineer',
            type: 'mode' as const,
            path: '/templates/modes/engineer.md',
            metadata: { description: 'Implementation mode' }
          },
          source: 'builtin' as const
        }
      ];
      
      mockCore.getComponentsByTypeWithSource.mockResolvedValue(mockComponents);
      mockInquirer.prompt.mockResolvedValue({
        selected: {
          component: mockComponents[0].component,
          source: mockComponents[0].source
        }
      });
      mockCore.getComponentConflicts.mockResolvedValue([]);
      mockCore.getScopes.mockReturnValue({
        project: { getPath: () => '/project/.zcc', fs: testFs } as any,
        global: { getPath: () => '/global/.zcc', fs: testFs } as any
      });

      await addCommand.parseAsync(['node', 'test', 'mode']);

      expect(mockCore.getComponentsByTypeWithSource).toHaveBeenCalledWith('mode');
      expect(mockInquirer.prompt).toHaveBeenCalled();
    });

    it('should handle no matches found', async () => {
      mockCore.findComponents.mockResolvedValue([]);
      mockCore.generateSuggestions.mockResolvedValue(['architect', 'engineer']);

      await addCommand.parseAsync(['node', 'test', 'mode', 'invalid']);

      expect(mockCore.findComponents).toHaveBeenCalledWith('invalid', 'mode', {
        maxResults: 5,
        minScore: 30
      });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('not found'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Did you mean'));
    });
  });

  describe('add workflow', () => {
    it('should install a specific workflow when exact match found', async () => {
      const mockComponent = {
        component: {
          name: 'review',
          type: 'workflow' as const,
          path: '/templates/workflows/review.md',
          metadata: { description: 'Code review workflow' }
        },
        source: 'builtin' as const,
        name: 'review',
        score: 100,
        matchType: 'exact' as const
      };
      
      mockCore.findComponents.mockResolvedValue([mockComponent]);
      mockCore.getComponentConflicts.mockResolvedValue([]);
      mockCore.getScopes.mockReturnValue({
        project: { getPath: () => '/project/.zcc', fs: testFs } as any,
        global: { getPath: () => '/global/.zcc', fs: testFs } as any
      });

      await addCommand.parseAsync(['node', 'test', 'workflow', 'review']);

      expect(mockCore.findComponents).toHaveBeenCalledWith('review', 'workflow', {
        maxResults: 5,
        minScore: 30
      });
      expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('Successfully installed'));
    });

    it('should start interactive workflow selection when no name provided', async () => {
      const mockComponents = [
        {
          component: {
            name: 'review',
            type: 'workflow' as const,
            path: '/templates/workflows/review.md',
            metadata: { description: 'Code review workflow' }
          },
          source: 'builtin' as const
        }
      ];
      
      mockCore.getComponentsByTypeWithSource.mockResolvedValue(mockComponents);
      mockInquirer.prompt.mockResolvedValue({
        selected: {
          component: mockComponents[0].component,
          source: mockComponents[0].source
        }
      });
      mockCore.getComponentConflicts.mockResolvedValue([]);
      mockCore.getScopes.mockReturnValue({
        project: { getPath: () => '/project/.zcc', fs: testFs } as any,
        global: { getPath: () => '/global/.zcc', fs: testFs } as any
      });

      await addCommand.parseAsync(['node', 'test', 'workflow']);

      expect(mockCore.getComponentsByTypeWithSource).toHaveBeenCalledWith('workflow');
      expect(mockInquirer.prompt).toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should handle installation errors', async () => {
      mockCore.findComponents.mockRejectedValue(new Error('Unexpected error'));

      await addCommand.parseAsync(['node', 'test', 'mode', 'architect']);

      expect(logger.error).toHaveBeenCalledWith('Failed to add component:', expect.any(Error));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle invalid component type', async () => {
      await addCommand.parseAsync(['node', 'test', 'invalid']);

      expect(logger.error).toHaveBeenCalledWith('Invalid component type: invalid');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
    
    it('should handle multiple matches with user selection', async () => {
      const mockComponents = [
        {
          component: {
            name: 'architect',
            type: 'mode' as const,
            path: '/templates/modes/architect.md',
            metadata: { description: 'System design mode' }
          },
          source: 'builtin' as const,
          name: 'architect',
          score: 90,
          matchType: 'substring' as const
        },
        {
          component: {
            name: 'architect-pro',
            type: 'mode' as const,
            path: '/global/.zcc/modes/architect-pro.md',
            metadata: { description: 'Advanced system design mode' }
          },
          source: 'global' as const,
          name: 'architect-pro',
          score: 80,
          matchType: 'substring' as const
        }
      ];
      
      mockCore.findComponents.mockResolvedValue(mockComponents);
      mockInquirer.prompt.mockResolvedValue({
        selected: mockComponents[0]
      });
      mockCore.getComponentConflicts.mockResolvedValue([]);
      mockCore.getScopes.mockReturnValue({
        project: { getPath: () => '/project/.zcc', fs: testFs } as any,
        global: { getPath: () => '/global/.zcc', fs: testFs } as any
      });

      await addCommand.parseAsync(['node', 'test', 'mode', 'arch']);

      expect(mockCore.findComponents).toHaveBeenCalledWith('arch', 'mode', {
        maxResults: 5,
        minScore: 30
      });
      expect(mockInquirer.prompt).toHaveBeenCalled();
      expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('Successfully installed'));
    });
  });
  
  describe('conflict handling', () => {
    it('should handle component conflicts with confirmation', async () => {
      const mockComponent = {
        component: {
          name: 'architect',
          type: 'mode' as const,
          path: '/templates/modes/architect.md',
          metadata: { description: 'System design mode' }
        },
        source: 'builtin' as const,
        name: 'architect',
        score: 100,
        matchType: 'exact' as const
      };
      
      mockCore.findComponents.mockResolvedValue([mockComponent]);
      mockCore.getComponentConflicts.mockResolvedValue([
        { source: 'project', component: mockComponent.component }
      ]);
      mockInquirer.prompt.mockResolvedValue({ shouldOverwrite: true });
      mockCore.getScopes.mockReturnValue({
        project: { getPath: () => '/project/.zcc', fs: testFs } as any,
        global: { getPath: () => '/global/.zcc', fs: testFs } as any
      });

      await addCommand.parseAsync(['node', 'test', 'mode', 'architect']);

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('already exists'));
      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'confirm',
          name: 'shouldOverwrite',
          message: 'Do you want to overwrite it?',
          default: false
        }
      ]);
      expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('Successfully installed'));
    });
  });
});