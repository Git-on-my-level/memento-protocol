import { addCommand } from '../add';
import { ZccCore } from '../../lib/ZccCore';
import { cliContext, isNonInteractive, shouldProceedWithoutPrompt } from '../../lib/context';
import { logger } from '../../lib/logger';

// Mock dependencies
jest.mock('../../lib/ZccCore');
jest.mock('../../lib/context');
jest.mock('../../lib/logger');
jest.mock('inquirer');

const mockZccCore = ZccCore as jest.MockedClass<typeof ZccCore>;
const mockCliContext = cliContext as jest.Mocked<typeof cliContext>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockIsNonInteractive = isNonInteractive as jest.MockedFunction<typeof isNonInteractive>;
const mockShouldProceedWithoutPrompt = shouldProceedWithoutPrompt as jest.MockedFunction<typeof shouldProceedWithoutPrompt>;

// Mock fs and path for component installation
jest.mock('fs');
jest.mock('path');

describe('Add Command - Non-Interactive Mode', () => {
  let mockCore: jest.Mocked<ZccCore>;
  let originalExit: typeof process.exit;

  beforeEach(() => {
    // Mock process.exit to prevent test termination
    originalExit = process.exit;
    process.exit = jest.fn() as any;

    // Reset process.exitCode
    process.exitCode = 0;

    // Reset all mocks
    jest.clearAllMocks();

    // Setup ZccCore mock
    mockCore = {
      findComponents: jest.fn(),
      getComponentsByTypeWithSource: jest.fn(),
      getComponentConflicts: jest.fn(),
      getComponent: jest.fn(),
      generateSuggestions: jest.fn(),
      clearCache: jest.fn(),
      getScopes: jest.fn().mockReturnValue({
        global: { getPath: () => '/global/.zcc' },
        project: { getPath: () => '/project/.zcc' }
      })
    } as any;

    mockZccCore.mockImplementation(() => mockCore);

    // Default context setup - mock both the context methods and direct exports
    mockCliContext.isNonInteractive = jest.fn().mockReturnValue(false);
    mockCliContext.isForce = jest.fn().mockReturnValue(false);
    mockIsNonInteractive.mockReturnValue(false);
    mockShouldProceedWithoutPrompt.mockReturnValue(false);

    // Mock logger methods
    mockLogger.error = jest.fn();
    mockLogger.info = jest.fn();
    mockLogger.success = jest.fn();
    mockLogger.warn = jest.fn();

    // Mock fs methods
    require('fs').readFileSync = jest.fn().mockReturnValue('mock content');
    require('fs').writeFileSync = jest.fn();
    require('fs').existsSync = jest.fn().mockReturnValue(true);
    
    // Mock path methods
    require('path').join = jest.fn((...args) => args.join('/'));
    require('path').basename = jest.fn((p) => p.split('/').pop());
  });

  afterEach(() => {
    process.exit = originalExit;
    process.exitCode = 0;
  });

  describe('Non-interactive mode behavior', () => {
    beforeEach(() => {
      mockCliContext.isNonInteractive = jest.fn().mockReturnValue(true);
      mockIsNonInteractive.mockReturnValue(true);
    });

    it('should fail when no component name provided', async () => {
      await addCommand.parseAsync(['node', 'zcc', 'mode']);

      expect(process.exitCode).toBe(1);
      expect(mockLogger.error).toHaveBeenCalledWith('Component name is required in non-interactive mode');
    });

    it('should fail when component not found', async () => {
      mockCore.findComponents.mockResolvedValue([]);

      await addCommand.parseAsync(['node', 'zcc', 'mode', 'nonexistent']);

      expect(process.exitCode).toBe(1);
      expect(mockLogger.error).toHaveBeenCalledWith("Mode 'nonexistent' not found.");
    });

    it('should install single exact match', async () => {
      const mockMatch = {
        name: 'architect',
        score: 100,
        source: 'builtin' as const,
        component: {
          name: 'architect',
          type: 'mode' as const,
          path: '/templates/modes/architect.md',
          metadata: { description: 'Architect mode' }
        },
        matchType: 'exact' as const
      };

      mockCore.findComponents.mockResolvedValue([mockMatch]);
      mockCore.getComponentConflicts.mockResolvedValue([]);

      await addCommand.parseAsync(['node', 'zcc', 'mode', 'architect']);

      expect(mockCore.findComponents).toHaveBeenCalledWith('architect', 'mode', {
        maxResults: 5,
        minScore: 30
      });
      expect(mockLogger.success).toHaveBeenCalledWith(
        expect.stringContaining("Successfully installed mode 'architect'")
      );
    });

    it('should auto-select best match from multiple matches', async () => {
      const mockMatches = [
        {
          name: 'architect',
          score: 85,
          source: 'builtin' as const,
          component: {
            name: 'architect',
            type: 'mode' as const,
            path: '/templates/modes/architect.md',
            metadata: { description: 'Architect mode' }
          },
          matchType: 'substring' as const
        },
        {
          name: 'architect-advanced',
          score: 60,
          source: 'builtin' as const,
          component: {
            name: 'architect-advanced',
            type: 'mode' as const,
            path: '/templates/modes/architect-advanced.md',
            metadata: { description: 'Advanced architect mode' }
          },
          matchType: 'substring' as const
        }
      ];

      mockCore.findComponents.mockResolvedValue(mockMatches);
      mockCore.getComponentConflicts.mockResolvedValue([]);

      await addCommand.parseAsync(['node', 'zcc', 'mode', 'arch']);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Auto-selected 'architect' (substring match, 85%)"
      );
      expect(mockLogger.success).toHaveBeenCalledWith(
        expect.stringContaining("Successfully installed mode 'architect'")
      );
    });

    it('should fail with ambiguous low-score matches', async () => {
      const mockMatches = [
        {
          name: 'some-mode',
          score: 40,
          source: 'builtin' as const,
          component: {
            name: 'some-mode',
            type: 'mode' as const,
            path: '/templates/modes/some-mode.md',
            metadata: { description: 'Some mode' }
          },
          matchType: 'partial' as const
        },
        {
          name: 'other-mode',
          score: 35,
          source: 'builtin' as const,
          component: {
            name: 'other-mode',
            type: 'mode' as const,
            path: '/templates/modes/other-mode.md',
            metadata: { description: 'Other mode' }
          },
          matchType: 'partial' as const
        }
      ];

      mockCore.findComponents.mockResolvedValue(mockMatches);

      await addCommand.parseAsync(['node', 'zcc', 'mode', 'xyz']);

      expect(process.exitCode).toBe(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Multiple ambiguous matches found for 'xyz'. Please be more specific."
      );
    });

    it('should handle conflicts in non-interactive mode with shouldProceedWithoutPrompt', async () => {
      mockCliContext.isForce = jest.fn().mockReturnValue(true);
      mockShouldProceedWithoutPrompt.mockReturnValue(true);
      
      const mockMatch = {
        name: 'architect',
        score: 100,
        source: 'builtin' as const,
        component: {
          name: 'architect',
          type: 'mode' as const,
          path: '/templates/modes/architect.md',
          metadata: { description: 'Architect mode' }
        },
        matchType: 'exact' as const
      };

      const mockConflict = {
        component: mockMatch.component,
        source: 'project' as const
      };

      mockCore.findComponents.mockResolvedValue([mockMatch]);
      mockCore.getComponentConflicts.mockResolvedValue([mockConflict]);

      await addCommand.parseAsync(['node', 'zcc', 'mode', 'architect']);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Overwriting existing mode')
      );
      expect(mockLogger.success).toHaveBeenCalledWith(
        expect.stringContaining("Successfully installed mode 'architect'")
      );
    });

    it('should fail on conflicts without force', async () => {
      mockCliContext.isForce = jest.fn().mockReturnValue(false);
      
      const mockMatch = {
        name: 'architect',
        score: 100,
        source: 'builtin' as const,
        component: {
          name: 'architect',
          type: 'mode' as const,
          path: '/templates/modes/architect.md',
          metadata: { description: 'Architect mode' }
        },
        matchType: 'exact' as const
      };

      const mockConflict = {
        component: mockMatch.component,
        source: 'project' as const
      };

      mockCore.findComponents.mockResolvedValue([mockMatch]);
      mockCore.getComponentConflicts.mockResolvedValue([mockConflict]);

      await addCommand.parseAsync(['node', 'zcc', 'mode', 'architect']);

      expect(process.exitCode).toBe(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Mode 'architect' already exists in project scope. Use --force to overwrite."
      );
    });
  });

  describe('Global flags integration', () => {
    it('should respect global --non-interactive flag', async () => {
      mockCliContext.isNonInteractive = jest.fn().mockReturnValue(true);
      mockIsNonInteractive.mockReturnValue(true);
      mockCore.findComponents.mockResolvedValue([]);

      await addCommand.parseAsync(['node', 'zcc', 'mode', 'nonexistent']);

      expect(process.exitCode).toBe(1);
      expect(mockLogger.error).toHaveBeenCalledWith("Mode 'nonexistent' not found.");
    });

    it('should respect global --force flag', async () => {
      mockCliContext.isNonInteractive = jest.fn().mockReturnValue(true);
      mockIsNonInteractive.mockReturnValue(true);
      mockCliContext.isForce = jest.fn().mockReturnValue(true);
      mockShouldProceedWithoutPrompt.mockReturnValue(true);
      
      const mockMatch = {
        name: 'architect',
        score: 100,
        source: 'builtin' as const,
        component: {
          name: 'architect',
          type: 'mode' as const,
          path: '/templates/modes/architect.md',
          metadata: { description: 'Architect mode' }
        },
        matchType: 'exact' as const
      };

      mockCore.findComponents.mockResolvedValue([mockMatch]);
      mockCore.getComponentConflicts.mockResolvedValue([{ component: mockMatch.component, source: 'project' }]);

      await addCommand.parseAsync(['node', 'zcc', 'mode', 'architect']);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Overwriting existing mode')
      );
    });
  });
});