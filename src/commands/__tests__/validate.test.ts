import { validateCommand } from '../validate';
import { logger } from '../../lib/logger';
import { ZccCore } from '../../lib/ZccCore';
import { validateComponent } from '../../lib/utils/componentValidator';

// Mock dependencies
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
}));
jest.mock('../../lib/ZccCore');
jest.mock('../../lib/utils/componentValidator');
jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));

describe('Validate Command', () => {
  let mockCore: jest.Mocked<ZccCore>;
  const mockLogger = logger as jest.Mocked<typeof logger>;
  const mockValidateComponent = validateComponent as jest.MockedFunction<typeof validateComponent>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCore = {
      getComponentsByTypeWithSource: jest.fn(),
      findComponents: jest.fn(),
      generateSuggestions: jest.fn(),
      getComponent: jest.fn(),
      getScopes: jest.fn(),
      clearCache: jest.fn(),
      getComponentConflicts: jest.fn()
    } as any;
    (ZccCore as jest.MockedClass<typeof ZccCore>).mockReturnValue(mockCore);

    // Setup console.log spy to avoid test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('Process.exit called');
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('basic validation', () => {
    it('should reject invalid component type', async () => {
      await expect(async () => {
        await validateCommand.parseAsync(['node', 'test', 'invalid-type']);
      }).rejects.toThrow('Process.exit called');

      expect(mockLogger.error).toHaveBeenCalledWith('Invalid component type: invalid-type');
    });

    it('should validate all components when no arguments provided', async () => {
      const mockModes = [
        {
          component: { name: 'test-mode', type: 'mode' as const, path: '/test/mode.md' },
          source: 'project' as const
        }
      ];
      const mockWorkflows = [
        {
          component: { name: 'test-workflow', type: 'workflow' as const, path: '/test/workflow.md' },
          source: 'project' as const
        }
      ];

      mockCore.getComponentsByTypeWithSource
        .mockResolvedValueOnce(mockModes)
        .mockResolvedValueOnce(mockWorkflows)
        .mockResolvedValueOnce([]); // agents

      mockValidateComponent.mockReturnValue({
        isValid: true,
        issues: []
      });

      await validateCommand.parseAsync(['node', 'test']);

      expect(mockCore.getComponentsByTypeWithSource).toHaveBeenCalledWith('mode');
      expect(mockCore.getComponentsByTypeWithSource).toHaveBeenCalledWith('workflow');
      expect(mockCore.getComponentsByTypeWithSource).toHaveBeenCalledWith('agent');
      expect(mockLogger.success).toHaveBeenCalledWith('All components are valid!');
    });

    it('should validate specific component type', async () => {
      const mockModes = [
        {
          component: { name: 'test-mode', type: 'mode' as const, path: '/test/mode.md' },
          source: 'project' as const
        }
      ];

      mockCore.getComponentsByTypeWithSource.mockResolvedValue(mockModes);
      mockValidateComponent.mockReturnValue({
        isValid: true,
        issues: []
      });

      await validateCommand.parseAsync(['node', 'test', 'mode']);

      expect(mockCore.getComponentsByTypeWithSource).toHaveBeenCalledWith('mode');
      expect(mockLogger.success).toHaveBeenCalledWith('All modes are valid!');
    });
  });

  describe('component-specific validation', () => {
    it('should validate single component with exact match', async () => {
      const mockMatches = [{
        name: 'test-mode',
        component: { name: 'test-mode', type: 'mode' as const, path: '/test/mode.md' },
        source: 'project' as const,
        score: 100,
        matchType: 'exact' as const
      }];

      mockCore.findComponents.mockResolvedValue(mockMatches);
      mockValidateComponent.mockReturnValue({
        isValid: true,
        issues: []
      });

      await validateCommand.parseAsync(['node', 'test', 'mode', 'test-mode']);

      expect(mockCore.findComponents).toHaveBeenCalledWith('test-mode', 'mode', {
        maxResults: 5,
        minScore: 30
      });
      expect(mockLogger.success).toHaveBeenCalledWith('Component is valid!');
    });

    it('should handle component not found', async () => {
      mockCore.findComponents.mockResolvedValue([]);
      mockCore.generateSuggestions.mockResolvedValue(['similar-mode', 'other-mode']);

      await expect(async () => {
        await validateCommand.parseAsync(['node', 'test', 'mode', 'nonexistent']);
      }).rejects.toThrow('Process.exit called');

      expect(mockLogger.error).toHaveBeenCalledWith('Component mode \'nonexistent\' not found.');
    });
  });
});