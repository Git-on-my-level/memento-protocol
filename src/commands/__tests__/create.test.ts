import { createCommand } from '../create';
import { ZccCore } from '../../lib/ZccCore';
import { logger } from '../../lib/logger';
import inquirer from 'inquirer';
import { createTestFileSystem } from '../../lib/testing';
import * as fs from 'fs';
import * as componentValidator from '../../lib/utils/componentValidator';

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
jest.mock('../../lib/utils/componentValidator', () => ({
  validateComponent: jest.fn(),
  formatValidationIssues: jest.fn().mockReturnValue([]),
}));

describe('Create Command', () => {
  let mockCore: jest.Mocked<ZccCore>;
  let originalExit: any;
  let mockInquirer: jest.Mocked<typeof inquirer>;
  let mockFs: jest.Mocked<typeof fs>;
  let mockValidator: jest.Mocked<typeof componentValidator>;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup fs mocks
    mockFs = fs as jest.Mocked<typeof fs>;
    mockFs.readFileSync.mockReturnValue('# Mock Component Content\n\nThis is a mock component.');
    mockFs.writeFileSync.mockReturnValue();
    mockFs.existsSync.mockReturnValue(true);
    
    // Create test filesystem
    await createTestFileSystem({
      '/project/.zcc/config.json': JSON.stringify({ version: '1.0.0' }, null, 2),
      '/project/.zcc/modes/architect.md': '# Architect Mode\n\nSystem design mode',
      '/project/.zcc/workflows/review.md': '# Review Workflow\n\nCode review workflow',
      '/project/package.json': JSON.stringify({ 
        dependencies: { react: '^18.0.0' } 
      }, null, 2)
    });

    // Setup mocks
    mockCore = {
      getComponent: jest.fn().mockResolvedValue(null),
      getComponentConflicts: jest.fn().mockResolvedValue([]),
      getScopes: jest.fn().mockReturnValue({
        project: { getPath: () => '/project/.zcc' },
        global: { getPath: () => '/home/.zcc' }
      }),
      clearCache: jest.fn(),
      findComponents: jest.fn().mockResolvedValue([])
    } as unknown as jest.Mocked<ZccCore>;
    
    // Mock ZccCore constructor to return our mock
    (ZccCore as jest.MockedClass<typeof ZccCore>).mockImplementation(() => mockCore);
    
    mockInquirer = inquirer as jest.Mocked<typeof inquirer>;
    mockValidator = componentValidator as jest.Mocked<typeof componentValidator>;
    
    // Setup validation mocks
    mockValidator.validateComponent.mockReturnValue({
      isValid: true,
      issues: []
    });
    mockValidator.formatValidationIssues.mockReturnValue([]);

    // Mock exit to prevent test termination
    originalExit = process.exit;
    process.exit = jest.fn() as any;

    // Reset console spies
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    process.exit = originalExit;
    jest.restoreAllMocks();
  });

  describe('create mode', () => {
    it('should create a new mode with interactive prompts', async () => {
      // Setup inquirer responses
      mockInquirer.prompt
        .mockResolvedValueOnce({ inputName: 'custom-mode' })
        .mockResolvedValueOnce({
          description: 'A custom mode for special tasks',
          author: 'testuser',
        });

      try {
        await createCommand.parseAsync(['mode'], { from: 'user' });
      } catch (error) {
        console.error('Command failed:', error);
        throw error;
      }

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/project/.zcc/modes/custom-mode.md',
        expect.stringContaining('name: custom-mode'),
        'utf-8'
      );
      expect(logger.success).toHaveBeenCalledWith(
        "Successfully created mode 'custom-mode' in project scope."
      );
    });

    it('should create mode with name argument', async () => {
      // Setup inquirer responses for template data
      mockInquirer.prompt.mockResolvedValueOnce({
        description: 'A custom mode',
        author: 'testuser',
      });

      await createCommand.parseAsync(['mode', 'my-mode'], { from: 'user' });

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/project/.zcc/modes/my-mode.md',
        expect.stringContaining('name: my-mode'),
        'utf-8'
      );
      expect(mockInquirer.prompt).toHaveBeenCalledTimes(1); // Only for template data
    });

    it('should create mode in global scope', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({
        description: 'A global mode',
        author: 'testuser',
      });

      await createCommand.parseAsync(['mode', 'global-mode', '--global'], { from: 'user' });

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/home/.zcc/modes/global-mode.md',
        expect.stringContaining('name: global-mode'),
        'utf-8'
      );
    });

    it('should handle conflicts with confirmation', async () => {
      // Mock existing component
      mockCore.getComponent.mockResolvedValueOnce({
        name: 'existing-mode',
        type: 'mode',
        path: '/project/.zcc/modes/existing-mode.md',
        metadata: {}
      });
      mockCore.getComponentConflicts.mockResolvedValueOnce([{
        component: {
          name: 'existing-mode',
          type: 'mode',
          path: '/project/.zcc/modes/existing-mode.md',
          metadata: {}
        },
        source: 'project'
      }]);

      mockInquirer.prompt
        .mockResolvedValueOnce({ shouldOverwrite: true })
        .mockResolvedValueOnce({
          description: 'Overwritten mode',
          author: 'testuser',
        });

      await createCommand.parseAsync(['mode', 'existing-mode'], { from: 'user' });

      expect(mockInquirer.prompt).toHaveBeenCalled(); // Should show some prompts for component creation
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('existing-mode.md'),
        expect.stringContaining('name: existing-mode'),
        'utf-8'
      );
    });
  });

  describe('create workflow', () => {
    it('should create a new workflow', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({
        description: 'A custom workflow',
        author: 'testuser',
      });

      await createCommand.parseAsync(['workflow', 'my-workflow'], { from: 'user' });

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('my-workflow.md'),
        expect.stringContaining('name: my-workflow'),
        'utf-8'
      );
    });
  });

  describe('create agent', () => {
    it('should create a new agent with tools prompt', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({
        description: 'A custom agent',
        author: 'testuser',
        tools: 'Read, Write, WebSearch'
      });

      await createCommand.parseAsync(['agent', 'my-agent'], { from: 'user' });

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('my-agent.md'),
        expect.stringContaining('name: my-agent'),
        'utf-8'
      );
    });
  });

  describe('cloning with --from flag', () => {
    it('should clone from existing component', async () => {
      // Mock finding source component
      mockCore.findComponents.mockResolvedValueOnce([{
        name: 'architect',
        component: {
          name: 'architect',
          type: 'mode',
          path: '/templates/modes/architect.md',
          metadata: { description: 'Architecture mode' }
        },
        source: 'builtin',
        score: 100,
        matchType: 'exact'
      }]);

      mockFs.readFileSync
        .mockReturnValueOnce('---\nname: architect\ndescription: Original\n---\n# Architect Mode')
        .mockReturnValueOnce('package.json content'); // For project type detection

      await createCommand.parseAsync(['mode', 'custom-architect', '--from', 'architect'], { from: 'user' });

      expect(mockCore.findComponents).toHaveBeenCalledWith('architect', 'mode', {
        maxResults: 5,
        minScore: 30
      });
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/templates/modes/architect.md', 'utf-8');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('custom-architect.md'),
        expect.stringContaining('name: custom-architect'),
        'utf-8'
      );
    });

    it('should handle source component not found', async () => {
      mockCore.findComponents.mockResolvedValueOnce([]);

      await createCommand.parseAsync(['mode', 'new-mode', '--from', 'nonexistent'], { from: 'user' });

      expect(logger.error).toHaveBeenCalledWith("Source component 'nonexistent' not found");
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle multiple source matches', async () => {
      mockCore.findComponents.mockResolvedValueOnce([
        {
          name: 'architect',
          component: { name: 'architect', type: 'mode', path: '/builtin/architect.md', metadata: {} },
          source: 'builtin',
          score: 100,
          matchType: 'exact'
        },
        {
          name: 'architect',
          component: { name: 'architect', type: 'mode', path: '/global/architect.md', metadata: {} },
          source: 'global',
          score: 90,
          matchType: 'exact'
        }
      ]);

      mockInquirer.prompt.mockResolvedValueOnce({
        selected: {
          name: 'architect',
          component: { name: 'architect', type: 'mode', path: '/builtin/architect.md', metadata: {} },
          source: 'builtin',
          score: 100,
          matchType: 'exact'
        }
      });

      mockFs.readFileSync
        .mockReturnValueOnce('---\nname: architect\n---\n# Architect')
        .mockReturnValueOnce('{}'); // package.json

      await createCommand.parseAsync(['mode', 'new-architect', '--from', 'arch'], { from: 'user' });

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'list',
          name: 'selected',
          message: 'Which component would you like to clone from?'
        })
      ]);
    });
  });

  describe('non-interactive mode', () => {
    it('should create component with defaults in non-interactive mode', async () => {
      mockFs.readFileSync.mockReturnValue('{}'); // package.json

      await createCommand.parseAsync(['mode', 'auto-mode', '--non-interactive'], { from: 'user' });

      expect(mockInquirer.prompt).not.toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('auto-mode.md'),
        expect.stringContaining('author: custom'),
        'utf-8'
      );
    });

    it('should error if name not provided in non-interactive mode', async () => {
      await createCommand.parseAsync(['mode', '--non-interactive'], { from: 'user' });

      expect(logger.error).toHaveBeenCalledWith('Component name is required in non-interactive mode');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('validation', () => {
    it('should reject invalid component type', async () => {
      await createCommand.parseAsync(['invalid', 'name'], { from: 'user' });

      expect(logger.error).toHaveBeenCalledWith('Invalid component type: invalid');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should reject invalid component name', async () => {
      await createCommand.parseAsync(['mode', 'Invalid-Name-123!'], { from: 'user' });

      expect(logger.error).toHaveBeenCalledWith(
        'Component name must contain only lowercase letters, numbers, hyphens, and underscores'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('template variable substitution', () => {
    it('should detect React project type', async () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        dependencies: { react: '^18.0.0' }
      }));

      mockInquirer.prompt.mockResolvedValueOnce({
        description: 'React mode',
        author: 'testuser',
      });

      await createCommand.parseAsync(['mode', 'react-mode'], { from: 'user' });

      // Should create a component successfully
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('automatic validation', () => {
    it('should automatically validate created component and show no issues when valid', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({
        description: 'A valid mode',
        author: 'testuser',
      });

      mockValidator.validateComponent.mockReturnValue({
        isValid: true,
        issues: []
      });

      await createCommand.parseAsync(['mode', 'valid-mode'], { from: 'user' });

      expect(logger.success).toHaveBeenCalledWith(
        "Successfully created mode 'valid-mode' in project scope."
      );
      // Should create component successfully
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should show warnings for components with validation warnings', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({
        description: 'A mode with warnings',
        author: 'testuser',
      });

      const warnings = [
        { type: 'warning' as const, message: 'Description could be more detailed' }
      ];
      mockValidator.validateComponent.mockReturnValue({
        isValid: true,
        issues: warnings
      });
      mockValidator.formatValidationIssues.mockReturnValue(['⚠ Description could be more detailed']);

      await createCommand.parseAsync(['mode', 'warning-mode'], { from: 'user' });

      expect(logger.info).toHaveBeenCalledWith('Component created with 1 warning:');
      expect(logger.info).toHaveBeenCalledWith('  ⚠ Description could be more detailed');
    });

    it('should show errors for components with validation errors', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({
        description: 'A mode with errors',
        author: 'testuser',
      });

      const errors = [
        { type: 'error' as const, message: 'Missing required field: version' }
      ];
      mockValidator.validateComponent.mockReturnValue({
        isValid: false,
        issues: errors
      });
      mockValidator.formatValidationIssues.mockReturnValue(['✗ Missing required field: version']);

      await createCommand.parseAsync(['mode', 'error-mode'], { from: 'user' });

      expect(logger.warn).toHaveBeenCalledWith('Component created with errors:');
      expect(logger.warn).toHaveBeenCalledWith('  ✗ Missing required field: version');
    });

    it('should handle validation errors gracefully and continue creation', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({
        description: 'A mode',
        author: 'testuser',
      });

      mockValidator.validateComponent.mockImplementation(() => {
        throw new Error('Validation system error');
      });

      await createCommand.parseAsync(['mode', 'test-mode'], { from: 'user' });

      // Should still create the component successfully
      expect(logger.success).toHaveBeenCalledWith(
        "Successfully created mode 'test-mode' in project scope."
      );
    });

    it('should handle mixed warnings and errors', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({
        description: 'A complex mode',
        author: 'testuser',
      });

      const issues = [
        { type: 'error' as const, message: 'Missing required field: name' },
        { type: 'warning' as const, message: 'Short description' },
        { type: 'error' as const, message: 'Invalid name format' }
      ];
      mockValidator.validateComponent.mockReturnValue({
        isValid: false,
        issues
      });
      mockValidator.formatValidationIssues
        .mockReturnValueOnce(['✗ Missing required field: name', '✗ Invalid name format'])
        .mockReturnValueOnce(['⚠ Short description']);

      await createCommand.parseAsync(['mode', 'mixed-mode'], { from: 'user' });

      expect(logger.warn).toHaveBeenCalledWith('Component created with errors:');
      expect(logger.warn).toHaveBeenCalledWith('  ✗ Missing required field: name');
      expect(logger.warn).toHaveBeenCalledWith('  ✗ Invalid name format');
      expect(logger.info).toHaveBeenCalledWith('Component created with 1 warning:');
      expect(logger.info).toHaveBeenCalledWith('  ⚠ Short description');
    });
  });
});