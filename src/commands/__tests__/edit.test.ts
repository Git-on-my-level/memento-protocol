import { editCommand } from '../edit';
import { ZccCore } from '../../lib/ZccCore';
import { logger } from '../../lib/logger';
import inquirer from 'inquirer';
import { createTestFileSystem } from '../../lib/testing';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
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
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));
jest.mock('../../lib/utils/componentValidator', () => ({
  validateComponent: jest.fn(),
  formatValidationIssues: jest.fn().mockReturnValue([]),
}));

describe('Edit Command', () => {
  let mockCore: jest.Mocked<ZccCore>;
  let originalExit: any;
  let mockInquirer: jest.Mocked<typeof inquirer>;
  let mockFs: jest.Mocked<typeof fs>;
  let mockSpawn: jest.MockedFunction<typeof spawn>;
  let mockValidator: jest.Mocked<typeof componentValidator>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup fs mocks
    mockFs = fs as jest.Mocked<typeof fs>;
    mockFs.readFileSync.mockReturnValue('---\nname: test\n---\n# Original Content');
    mockFs.writeFileSync.mockReturnValue();
    mockFs.existsSync.mockReturnValue(true);
    
    // Setup spawn mock
    mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
    
    // Create test filesystem
    await createTestFileSystem({
      '/project/.zcc/config.json': JSON.stringify({ version: '1.0.0' }, null, 2),
      '/project/.zcc/modes/custom-mode.md': '---\nname: custom-mode\n---\n# Custom Mode',
      '/project/.zcc/workflows/custom-workflow.md': '---\nname: custom-workflow\n---\n# Custom Workflow'
    });

    // Setup mocks
    mockCore = {
      findComponents: jest.fn().mockResolvedValue([]),
      getComponentsByTypeWithSource: jest.fn().mockResolvedValue([]),
      generateSuggestions: jest.fn().mockResolvedValue([]),
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

    // Mock environment
    originalEnv = process.env;
    process.env = { ...originalEnv, EDITOR: 'nano' };

    // Mock exit to prevent test termination
    originalExit = process.exit;
    process.exit = jest.fn() as any;

    // Reset console spies
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    process.exit = originalExit;
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('edit mode', () => {
    it('should edit existing mode successfully', async () => {
      const mockComponent = {
        name: 'custom-mode',
        component: {
          name: 'custom-mode',
          type: 'mode' as const,
          path: '/project/.zcc/modes/custom-mode.md',
          metadata: { description: 'Custom mode' }
        },
        source: 'project' as const,
        score: 100,
        matchType: 'exact' as const
      };

      mockCore.findComponents.mockResolvedValueOnce([mockComponent]);

      // Mock editor process
      const mockEditorProcess = new EventEmitter() as any;
      mockEditorProcess.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'close') {
          // Simulate successful edit (exit code 0)
          setTimeout(() => callback(0), 10);
        }
        return mockEditorProcess;
      });
      mockSpawn.mockReturnValueOnce(mockEditorProcess);

      // Mock file content change
      mockFs.readFileSync
        .mockReturnValueOnce('---\nname: custom-mode\n---\n# Original Content')
        .mockReturnValueOnce('---\nname: custom-mode\n---\n# Modified Content');

      editCommand.parseAsync(['mode', 'custom-mode'], { from: 'user' });
      
      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(mockSpawn).toHaveBeenCalledWith('nano', ['/project/.zcc/modes/custom-mode.md'], {
        stdio: 'inherit',
        shell: true
      });
      expect(logger.info).toHaveBeenCalledWith(
        "Opening project mode 'custom-mode' in nano..."
      );
      expect(logger.success).toHaveBeenCalledWith("Mode 'custom-mode' has been updated.");
    });

    it('should handle no matches found', async () => {
      mockCore.findComponents.mockResolvedValueOnce([]);
      mockCore.generateSuggestions.mockResolvedValueOnce(['architect', 'engineer']);

      await editCommand.parseAsync(['mode', 'nonexistent'], { from: 'user' });

      expect(logger.error).toHaveBeenCalledWith("Mode 'nonexistent' not found.");
      expect(logger.info).toHaveBeenCalledWith('Did you mean one of these?');
      expect(logger.info).toHaveBeenCalledWith('  architect');
      expect(logger.info).toHaveBeenCalledWith('  engineer');
    });

    it('should show interactive selection when no name provided', async () => {
      const mockComponents = [
        {
          component: {
            name: 'custom-mode',
            type: 'mode' as const,
            path: '/project/.zcc/modes/custom-mode.md',
            metadata: { description: 'Custom mode' }
          },
          source: 'project' as const
        },
        {
          component: {
            name: 'architect',
            type: 'mode' as const,
            path: '/templates/modes/architect.md',
            metadata: { description: 'Architecture mode' }
          },
          source: 'builtin' as const
        }
      ];

      mockCore.getComponentsByTypeWithSource.mockResolvedValueOnce(mockComponents);

      const selectedComponent = {
        component: mockComponents[0].component,
        name: 'custom-mode',
        score: 100,
        matchType: 'exact' as const
      };

      mockInquirer.prompt.mockResolvedValueOnce({ selected: selectedComponent });

      // Mock editor process
      const mockEditorProcess = new EventEmitter() as any;
      mockEditorProcess.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
        return mockEditorProcess;
      });
      mockSpawn.mockReturnValueOnce(mockEditorProcess);

      // Mock no file changes
      mockFs.readFileSync.mockReturnValue('---\nname: custom-mode\n---\n# Content');

      await editCommand.parseAsync(['mode'], { from: 'user' });

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'list',
          name: 'selected',
          message: 'Select a mode to edit:',
          pageSize: 10
        })
      ]);
    });

    it('should handle multiple matches', async () => {
      const matches = [
        {
          name: 'custom-mode',
          component: {
            name: 'custom-mode',
            type: 'mode' as const,
            path: '/project/.zcc/modes/custom-mode.md',
            metadata: { description: 'Custom mode' }
          },
          source: 'project' as const,
          score: 100,
          matchType: 'exact' as const
        },
        {
          name: 'custom-mode-v2',
          component: {
            name: 'custom-mode-v2',
            type: 'mode' as const,
            path: '/global/.zcc/modes/custom-mode-v2.md',
            metadata: { description: 'Custom mode v2' }
          },
          source: 'global' as const,
          score: 90,
          matchType: 'substring' as const
        }
      ];

      mockCore.findComponents.mockResolvedValueOnce(matches);
      mockInquirer.prompt.mockResolvedValueOnce({ selected: matches[0] });

      // Mock editor process
      const mockEditorProcess = new EventEmitter() as any;
      mockEditorProcess.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
        return mockEditorProcess;
      });
      mockSpawn.mockReturnValueOnce(mockEditorProcess);

      mockFs.readFileSync.mockReturnValue('---\nname: custom-mode\n---\n# Content');

      await editCommand.parseAsync(['mode', 'custom'], { from: 'user' });

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'list',
          name: 'selected',
          message: 'Which component would you like to edit?'
        })
      ]);
    });

    it('should prevent editing builtin components', async () => {
      const builtinComponent = {
        name: 'architect',
        component: {
          name: 'architect',
          type: 'mode' as const,
          path: '/templates/modes/architect.md',
          metadata: { description: 'Architecture mode' }
        },
        source: 'builtin' as const,
        score: 100,
        matchType: 'exact' as const
      };

      mockCore.findComponents.mockResolvedValueOnce([builtinComponent]);

      await editCommand.parseAsync(['mode', 'architect'], { from: 'user' });

      expect(logger.error).toHaveBeenCalledWith(
        "Cannot edit built-in mode 'architect' - it's read-only."
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Create a custom version with: zcc create mode --from architect'
      );
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should handle editor failure', async () => {
      const mockComponent = {
        name: 'custom-mode',
        component: {
          name: 'custom-mode',
          type: 'mode' as const,
          path: '/project/.zcc/modes/custom-mode.md',
          metadata: {}
        },
        source: 'project' as const,
        score: 100,
        matchType: 'exact' as const
      };

      mockCore.findComponents.mockResolvedValueOnce([mockComponent]);

      // Mock editor process failure
      const mockEditorProcess = new EventEmitter() as any;
      mockEditorProcess.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Editor not found')), 10);
        }
        return mockEditorProcess;
      });
      mockSpawn.mockReturnValueOnce(mockEditorProcess);

      mockFs.readFileSync.mockReturnValue('---\nname: custom-mode\n---\n# Content');

      try {
        const promise = editCommand.parseAsync(['mode', 'custom-mode'], { from: 'user' });
        await new Promise(resolve => setTimeout(resolve, 20));
        await promise;
      } catch (error) {
        expect(logger.error).toHaveBeenCalledWith(
          "Failed to launch editor 'nano': Editor not found"
        );
      }
    });

    it('should use custom editor from option', async () => {
      const mockComponent = {
        name: 'custom-mode',
        component: {
          name: 'custom-mode',
          type: 'mode' as const,
          path: '/project/.zcc/modes/custom-mode.md',
          metadata: {}
        },
        source: 'project' as const,
        score: 100,
        matchType: 'exact' as const
      };

      mockCore.findComponents.mockResolvedValueOnce([mockComponent]);

      // Mock editor process
      const mockEditorProcess = new EventEmitter() as any;
      mockEditorProcess.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
        return mockEditorProcess;
      });
      mockSpawn.mockReturnValueOnce(mockEditorProcess);

      mockFs.readFileSync.mockReturnValue('---\nname: custom-mode\n---\n# Content');

      await editCommand.parseAsync(['mode', 'custom-mode', '--editor', 'vim'], { from: 'user' });

      expect(mockSpawn).toHaveBeenCalledWith('vim', ['/project/.zcc/modes/custom-mode.md'], {
        stdio: 'inherit',
        shell: true
      });
    });

    it('should validate component after editing when requested (clean validation)', async () => {
      const mockComponent = {
        name: 'custom-mode',
        component: {
          name: 'custom-mode',
          type: 'mode' as const,
          path: '/project/.zcc/modes/custom-mode.md',
          metadata: {}
        },
        source: 'project' as const,
        score: 100,
        matchType: 'exact' as const
      };

      mockCore.findComponents.mockResolvedValueOnce([mockComponent]);

      // Mock editor process
      const mockEditorProcess = new EventEmitter() as any;
      mockEditorProcess.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
        return mockEditorProcess;
      });
      mockSpawn.mockReturnValueOnce(mockEditorProcess);

      // Mock file content change
      mockFs.readFileSync
        .mockReturnValueOnce('---\nname: custom-mode\n---\n# Original')
        .mockReturnValueOnce('---\nname: custom-mode\ndescription: test\nauthor: test\nversion: 1.0.0\n---\n# Modified');

      // Mock clean validation result
      mockValidator.validateComponent.mockReturnValue({
        isValid: true,
        issues: []
      });

      await editCommand.parseAsync(['mode', 'custom-mode', '--validate'], { from: 'user' });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(mockValidator.validateComponent).toHaveBeenCalledWith('/project/.zcc/modes/custom-mode.md');
      expect(logger.info).toHaveBeenCalledWith('Validating component...');
      expect(logger.success).toHaveBeenCalledWith('Component validation passed.');
    });

    it('should show validation warnings after editing', async () => {
      const mockComponent = {
        name: 'custom-mode',
        component: {
          name: 'custom-mode',
          type: 'mode' as const,
          path: '/project/.zcc/modes/custom-mode.md',
          metadata: {}
        },
        source: 'project' as const,
        score: 100,
        matchType: 'exact' as const
      };

      mockCore.findComponents.mockResolvedValueOnce([mockComponent]);

      // Mock editor process
      const mockEditorProcess = new EventEmitter() as any;
      mockEditorProcess.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
        return mockEditorProcess;
      });
      mockSpawn.mockReturnValueOnce(mockEditorProcess);

      // Mock file content change
      mockFs.readFileSync
        .mockReturnValueOnce('---\nname: custom-mode\n---\n# Original')
        .mockReturnValueOnce('---\nname: custom-mode\ndescription: test\nauthor: test\nversion: 1.0.0\n---\n# Modified');

      // Mock validation with warnings
      const warnings = [
        { type: 'warning' as const, message: 'Description could be more detailed' }
      ];
      mockValidator.validateComponent.mockReturnValue({
        isValid: true,
        issues: warnings
      });
      mockValidator.formatValidationIssues.mockReturnValue(['⚠ Description could be more detailed']);

      await editCommand.parseAsync(['mode', 'custom-mode', '--validate'], { from: 'user' });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(logger.warn).toHaveBeenCalledWith('Validation warnings:');
      expect(logger.warn).toHaveBeenCalledWith('  ⚠ Description could be more detailed');
      expect(logger.success).toHaveBeenCalledWith('Component validation passed (with warnings).');
    });

    it('should show validation errors after editing', async () => {
      const mockComponent = {
        name: 'custom-mode',
        component: {
          name: 'custom-mode',
          type: 'mode' as const,
          path: '/project/.zcc/modes/custom-mode.md',
          metadata: {}
        },
        source: 'project' as const,
        score: 100,
        matchType: 'exact' as const
      };

      mockCore.findComponents.mockResolvedValueOnce([mockComponent]);

      // Mock editor process
      const mockEditorProcess = new EventEmitter() as any;
      mockEditorProcess.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
        return mockEditorProcess;
      });
      mockSpawn.mockReturnValueOnce(mockEditorProcess);

      // Mock file content change
      mockFs.readFileSync
        .mockReturnValueOnce('---\nname: custom-mode\n---\n# Original')
        .mockReturnValueOnce('---\nname: custom-mode\ndescription: test\nauthor: test\nversion: 1.0.0\n---\n# Modified');

      // Mock validation with errors
      const errors = [
        { type: 'error' as const, message: 'Missing required field: version' }
      ];
      mockValidator.validateComponent.mockReturnValue({
        isValid: false,
        issues: errors
      });
      mockValidator.formatValidationIssues.mockReturnValue(['✗ Missing required field: version']);

      await editCommand.parseAsync(['mode', 'custom-mode', '--validate'], { from: 'user' });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(logger.error).toHaveBeenCalledWith('Validation errors found:');
      expect(logger.error).toHaveBeenCalledWith('  ✗ Missing required field: version');
      expect(logger.warn).toHaveBeenCalledWith('Component validation failed.');
    });

    it('should handle validation errors gracefully', async () => {
      const mockComponent = {
        name: 'custom-mode',
        component: {
          name: 'custom-mode',
          type: 'mode' as const,
          path: '/project/.zcc/modes/custom-mode.md',
          metadata: {}
        },
        source: 'project' as const,
        score: 100,
        matchType: 'exact' as const
      };

      mockCore.findComponents.mockResolvedValueOnce([mockComponent]);

      // Mock editor process
      const mockEditorProcess = new EventEmitter() as any;
      mockEditorProcess.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
        return mockEditorProcess;
      });
      mockSpawn.mockReturnValueOnce(mockEditorProcess);

      // Mock file content change
      mockFs.readFileSync
        .mockReturnValueOnce('---\nname: custom-mode\n---\n# Original')
        .mockReturnValueOnce('---\nname: custom-mode\ndescription: test\nauthor: test\nversion: 1.0.0\n---\n# Modified');

      // Mock validation system error
      mockValidator.validateComponent.mockImplementation(() => {
        throw new Error('Validation system error');
      });

      await editCommand.parseAsync(['mode', 'custom-mode', '--validate'], { from: 'user' });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(logger.warn).toHaveBeenCalledWith('Validation failed: Validation system error');
    });
  });

  describe('validation', () => {
    it('should reject invalid component type', async () => {
      await editCommand.parseAsync(['invalid', 'name'], { from: 'user' });

      expect(logger.error).toHaveBeenCalledWith('Invalid component type: invalid');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('interactive selection edge cases', () => {
    it('should show message when no components available', async () => {
      mockCore.getComponentsByTypeWithSource.mockResolvedValueOnce([]);

      await editCommand.parseAsync(['mode'], { from: 'user' });

      expect(logger.info).toHaveBeenCalledWith('No modes available for editing.');
      expect(logger.info).toHaveBeenCalledWith('Create a new mode: zcc create mode');
    });

    it('should filter out builtin components from interactive selection', async () => {
      const mockComponents = [
        {
          component: {
            name: 'architect',
            type: 'mode' as const,
            path: '/templates/modes/architect.md',
            metadata: { description: 'Architecture mode' }
          },
          source: 'builtin' as const
        }
      ];

      mockCore.getComponentsByTypeWithSource.mockResolvedValueOnce(mockComponents);

      await editCommand.parseAsync(['mode'], { from: 'user' });

      expect(logger.info).toHaveBeenCalledWith('No editable modes found. Built-in components are read-only.');
      expect(logger.info).toHaveBeenCalledWith('Create a new mode: zcc create mode');
    });
  });
});