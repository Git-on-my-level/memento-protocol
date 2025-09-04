/**
 * Tests for ToolDependencyChecker
 */

import { ToolDependencyChecker, ToolDependency } from '../ToolDependencyChecker';

// Mock child_process
jest.mock('child_process');
const mockExecSync = jest.requireMock('child_process').execSync;

describe('ToolDependencyChecker', () => {
  let checker: ToolDependencyChecker;

  beforeEach(() => {
    checker = new ToolDependencyChecker();
    jest.clearAllMocks();
  });

  describe('checkToolDependencies', () => {
    it('should return empty array for no dependencies', async () => {
      const results = await checker.checkToolDependencies([]);
      expect(results).toEqual([]);
    });

    it('should check ast-grep availability', async () => {
      const toolDependency: ToolDependency = {
        name: '@ast-grep/cli',
        required: false,
        installCommand: 'npm install -g @ast-grep/cli',
        description: 'AST-based code search tool',
      };

      // Mock successful command
      mockExecSync.mockReturnValue('ast-grep 0.12.0\n');

      const results = await checker.checkToolDependencies([toolDependency]);
      
      expect(results).toHaveLength(1);
      expect(results[0].tool).toBe(toolDependency);
      expect(results[0].result.available).toBe(true);
      expect(results[0].result.version).toBe('0.12.0');
    });

    it('should handle unavailable tools gracefully', async () => {
      const toolDependency: ToolDependency = {
        name: '@ast-grep/cli',
        required: true,
        installCommand: 'npm install -g @ast-grep/cli',
      };

      // Mock command failure
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const results = await checker.checkToolDependencies([toolDependency]);
      
      expect(results).toHaveLength(1);
      expect(results[0].result.available).toBe(false);
      expect(results[0].result.needsInstallation).toBe(true);
    });

    it('should handle unsupported tools', async () => {
      const toolDependency: ToolDependency = {
        name: 'unknown-tool',
        required: false,
      };

      const results = await checker.checkToolDependencies([toolDependency]);
      
      expect(results).toHaveLength(1);
      expect(results[0].result.available).toBe(false);
      expect(results[0].shouldPrompt).toBe(false);
    });
  });

  describe('generateInstallationGuidance', () => {
    it('should generate guidance for required tools', async () => {
      const toolDependency: ToolDependency = {
        name: '@ast-grep/cli',
        required: true,
        installCommand: 'npm install -g @ast-grep/cli',
        description: 'AST-based code search tool',
      };

      // Mock unavailable tool
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const results = await checker.checkToolDependencies([toolDependency]);
      const guidance = checker.generateInstallationGuidance(results);

      expect(guidance.required).toHaveLength(1);
      expect(guidance.installationSteps).toContain('npm install -g @ast-grep/cli');
      expect(guidance.warningMessage).toContain('@ast-grep/cli');
    });

    it('should generate guidance for optional tools', async () => {
      const toolDependency: ToolDependency = {
        name: '@ast-grep/cli',
        required: false,
        installCommand: 'npm install -g @ast-grep/cli',
      };

      // Mock unavailable tool
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const results = await checker.checkToolDependencies([toolDependency], { interactive: true });
      const guidance = checker.generateInstallationGuidance(results);

      expect(guidance.optional).toHaveLength(1);
      expect(guidance.installationSteps).toContain('npm install -g @ast-grep/cli');
    });

    it('should not generate guidance for available tools', async () => {
      const toolDependency: ToolDependency = {
        name: '@ast-grep/cli',
        required: false,
        installCommand: 'npm install -g @ast-grep/cli',
      };

      // Mock available tool
      mockExecSync.mockReturnValue('ast-grep 0.12.0\n');

      const results = await checker.checkToolDependencies([toolDependency]);
      const guidance = checker.generateInstallationGuidance(results);

      expect(guidance.required).toHaveLength(0);
      expect(guidance.optional).toHaveLength(0);
      expect(guidance.installationSteps).toHaveLength(0);
      expect(guidance.warningMessage).toBeUndefined();
    });
  });
});