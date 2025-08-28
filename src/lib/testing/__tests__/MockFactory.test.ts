/**
 * Tests for MockFactory - Comprehensive mock management system
 */

import { 
  MockFactory, 
  MockPresets, 
  setupMockFactory
} from '../MockFactory';

describe('MockFactory', () => {
  // Use the setup helper to ensure clean state
  setupMockFactory();

  describe('State Management', () => {
    it('should reset all mocks and clear state', () => {
      // Create some mocks
      const mockFs = MockFactory.fileSystem().build();
      const mockLogger = MockFactory.logger().build();
      
      // Make some calls to track history
      mockFs.existsSync('/test');
      mockLogger.info('test message');
      
      // Verify calls were tracked
      const history = MockFactory.getCallHistory();
      expect(history).toHaveLength(2);
      
      // Reset should clear everything
      MockFactory.reset();
      
      const historyAfterReset = MockFactory.getCallHistory();
      expect(historyAfterReset).toHaveLength(0);
    });

    it('should track mock calls for debugging', () => {
      const mockFs = MockFactory.fileSystem()
        .withFile('/test.txt', 'content')
        .build();
      
      mockFs.readFileSync('/test.txt');
      mockFs.existsSync('/test.txt');
      
      const history = MockFactory.getCallHistory();
      expect(history).toHaveLength(2);
      expect(history[0]).toMatchObject({
        method: 'fs.readFileSync',
        args: ['/test.txt', undefined]
      });
      expect(history[1]).toMatchObject({
        method: 'fs.existsSync',
        args: ['/test.txt']
      });
    });

    it('should filter call history by method', () => {
      const mockFs = MockFactory.fileSystem()
        .withFile('/test.txt', 'content')
        .build();
      
      const mockLogger = MockFactory.logger().build();
      
      mockFs.readFileSync('/test.txt');
      mockLogger.info('test');
      mockFs.existsSync('/test.txt');
      
      const fsHistory = MockFactory.getCallHistory('fs.');
      const loggerHistory = MockFactory.getCallHistory('logger.');
      
      expect(fsHistory).toHaveLength(2);
      expect(loggerHistory).toHaveLength(1);
    });

    it('should verify mock calls correctly', () => {
      const mockLogger = MockFactory.logger().build();
      
      mockLogger.info('message 1');
      mockLogger.warn('message 2');
      
      MockFactory.verifyMockCalls(mockLogger.info, [['message 1']]);
      MockFactory.verifyMockCalls(mockLogger.warn, [['message 2']]);
    });

    it('should assert mock was not called', () => {
      const mockLogger = MockFactory.logger().build();
      
      MockFactory.assertMockNotCalled(mockLogger.error);
    });
  });

  describe('FileSystem Mock Builder', () => {
    it('should create basic file system mock', () => {
      const mockFs = MockFactory.fileSystem().build();
      
      expect(mockFs.readFileSync).toBeDefined();
      expect(mockFs.writeFileSync).toBeDefined();
      expect(mockFs.existsSync).toBeDefined();
    });

    it('should handle file operations correctly', () => {
      const mockFs = MockFactory.fileSystem()
        .withFile('/test.txt', 'test content')
        .withDirectory('/src')
        .build();
      
      expect(mockFs.existsSync('/test.txt')).toBe(true);
      expect(mockFs.existsSync('/src')).toBe(true);
      expect(mockFs.existsSync('/nonexistent')).toBe(false);
      
      expect(mockFs.readFileSync('/test.txt')).toBe('test content');
    });

    it('should handle write operations', () => {
      const mockFs = MockFactory.fileSystem().build();
      
      mockFs.writeFileSync('/new-file.txt', 'new content');
      
      expect(mockFs.existsSync('/new-file.txt')).toBe(true);
      expect(mockFs.readFileSync('/new-file.txt')).toBe('new content');
    });

    it('should handle read errors', () => {
      const mockFs = MockFactory.fileSystem()
        .withReadError('/protected.txt', new Error('Permission denied'))
        .build();
      
      expect(() => mockFs.readFileSync('/protected.txt')).toThrow('Permission denied');
    });

    it('should handle stat operations', () => {
      const mockFs = MockFactory.fileSystem()
        .withFile('/file.txt', 'content', 0o644)
        .withDirectory('/dir', 0o755)
        .build();
      
      const fileStat = mockFs.statSync('/file.txt');
      expect(fileStat.isFile()).toBe(true);
      expect(fileStat.isDirectory()).toBe(false);
      expect(fileStat.mode).toBe(0o644);
      
      const dirStat = mockFs.statSync('/dir');
      expect(dirStat.isFile()).toBe(false);
      expect(dirStat.isDirectory()).toBe(true);
      expect(dirStat.mode).toBe(0o755);
    });

    it('should handle multiple files', () => {
      const files = {
        '/package.json': '{"name": "test"}',
        '/README.md': '# Test Project',
        '/src/index.ts': 'export const test = true;'
      };
      
      const mockFs = MockFactory.fileSystem()
        .withFiles(files)
        .build();
      
      Object.entries(files).forEach(([path, content]) => {
        expect(mockFs.existsSync(path)).toBe(true);
        expect(mockFs.readFileSync(path)).toBe(content);
      });
    });

    it('should handle throwOnMissingFiles option', () => {
      const mockFs = MockFactory.fileSystem()
        .throwOnMissingFiles(true)
        .build();
      
      expect(() => mockFs.readFileSync('/nonexistent.txt'))
        .toThrow('ENOENT: no such file or directory');
    });
  });

  describe('Inquirer Mock Builder', () => {
    it('should create basic inquirer mock', () => {
      const mockInquirer = MockFactory.inquirer().build();
      
      expect(mockInquirer.prompt).toBeDefined();
    });

    it('should handle prompt sequence', async () => {
      const mockInquirer = MockFactory.inquirer()
        .withPrompt('confirm', true)
        .withPrompt('name', 'test-project')
        .withPrompt('choice', 'option1')
        .build();
      
      const result1 = await mockInquirer.prompt([]);
      expect(result1).toEqual({ confirm: true });
      
      const result2 = await mockInquirer.prompt([]);
      expect(result2).toEqual({ name: 'test-project' });
      
      const result3 = await mockInquirer.prompt([]);
      expect(result3).toEqual({ choice: 'option1' });
    });

    it('should handle batch prompt configuration', async () => {
      const mockInquirer = MockFactory.inquirer()
        .withPromptSequence([
          { name: 'confirm', value: true },
          { name: 'input', value: 'test-input' },
          { name: 'choice', value: 'selected-option' }
        ])
        .build();
      
      const results = [];
      for (let i = 0; i < 3; i++) {
        const result = await mockInquirer.prompt([]);
        results.push(result);
      }
      
      expect(results).toEqual([
        { confirm: true },
        { input: 'test-input' },
        { choice: 'selected-option' }
      ]);
    });

    it('should handle convenience methods', async () => {
      const mockInquirer = MockFactory.inquirer()
        .withConfirm(true)
        .withChoice('selected')
        .withInput('user-input')
        .build();
      
      const confirmResult = await mockInquirer.prompt([]);
      expect(confirmResult).toEqual({ confirm: true });
      
      const choiceResult = await mockInquirer.prompt([]);
      expect(choiceResult).toEqual({ choice: 'selected' });
      
      const inputResult = await mockInquirer.prompt([]);
      expect(inputResult).toEqual({ input: 'user-input' });
    });

    it('should throw error when no more responses available', async () => {
      const mockInquirer = MockFactory.inquirer()
        .withPrompt('single', 'value')
        .build();
      
      // First call should work
      await expect(mockInquirer.prompt([])).resolves.toEqual({ single: 'value' });
      
      // Second call should throw
      await expect(mockInquirer.prompt([])).rejects.toThrow('No more mock responses available');
    });
  });

  describe('Logger Mock Builder', () => {
    it('should create basic logger mock', () => {
      const mockLogger = MockFactory.logger().build();
      
      expect(mockLogger.info).toBeDefined();
      expect(mockLogger.error).toBeDefined();
      expect(mockLogger.warn).toBeDefined();
      expect(mockLogger.success).toBeDefined();
    });

    it('should track calls by default', () => {
      const mockLogger = MockFactory.logger().build();
      
      mockLogger.info('test message');
      mockLogger.warn('warning message');
      
      const history = MockFactory.getCallHistory('logger.');
      expect(history).toHaveLength(2);
    });

    it('should optionally disable tracking', () => {
      const mockLogger = MockFactory.logger()
        .withTracking(false)
        .build();
      
      mockLogger.info('test message');
      
      const history = MockFactory.getCallHistory('logger.');
      expect(history).toHaveLength(0);
    });

    it('should optionally throw on error', () => {
      const mockLogger = MockFactory.logger()
        .shouldThrowOnError(true)
        .build();
      
      expect(() => mockLogger.error('error message')).toThrow('Logger error: error message');
    });
  });

  describe('Child Process Mock Builder', () => {
    it('should create basic child_process mock', () => {
      const mockChildProcess = MockFactory.childProcess().build();
      
      expect(mockChildProcess.spawn).toBeDefined();
      expect(mockChildProcess.exec).toBeDefined();
      expect(mockChildProcess.execSync).toBeDefined();
    });

    it('should handle successful command execution', () => {
      const mockChildProcess = MockFactory.childProcess()
        .withSuccess('git status', ['On branch main', 'nothing to commit'])
        .build();
      
      const result = mockChildProcess.execSync('git status');
      expect(result).toBe('On branch main\nnothing to commit');
    });

    it('should handle failed command execution', () => {
      const mockChildProcess = MockFactory.childProcess()
        .withFailure('npm test', 1, ['Tests failed'])
        .build();
      
      expect(() => mockChildProcess.execSync('npm test')).toThrow('Command failed: npm test');
    });

    it('should handle spawn with stdout/stderr', (done) => {
      const mockChildProcess = MockFactory.childProcess()
        .withCommand('ls', {
          exitCode: 0,
          stdout: ['file1.txt', 'file2.txt'],
          stderr: []
        })
        .build();
      
      const child = mockChildProcess.spawn('ls');
      
      const stdoutChunks: string[] = [];
      child.stdout.on('data', (chunk: string) => {
        stdoutChunks.push(chunk);
      });
      
      child.on('close', (code: number) => {
        expect(code).toBe(0);
        expect(stdoutChunks).toEqual(['file1.txt', 'file2.txt']);
        done();
      });
    });

    it('should use default config for unconfigured commands', () => {
      const mockChildProcess = MockFactory.childProcess()
        .withDefaults({ exitCode: 0, stdout: ['default output'] })
        .build();
      
      const result = mockChildProcess.execSync('unknown-command');
      expect(result).toBe('default output');
    });
  });

  describe('Commander Mock Builder', () => {
    it('should create basic commander mock', () => {
      const mockCommand = MockFactory.commander().build();
      
      expect(mockCommand.name).toBeDefined();
      expect(mockCommand.option).toBeDefined();
      expect(mockCommand.opts).toBeDefined();
    });

    it('should handle options and arguments', () => {
      const mockCommand = MockFactory.commander()
        .withOption('force', true)
        .withOption('verbose', false)
        .withArgs(['file1', 'file2'])
        .withName('test-command')
        .build();
      
      const opts = mockCommand.opts();
      expect(opts).toEqual({ force: true, verbose: false });
      expect(mockCommand.args).toEqual(['file1', 'file2']);
    });
  });

  describe('Mock Presets', () => {
    it('should create Memento file system preset', () => {
      const mockFs = MockPresets.mementoFileSystem('/test-project').build();
      
      expect(mockFs.existsSync('/test-project/.memento/config.json')).toBe(true);
      expect(mockFs.existsSync('/test-project/.memento/modes')).toBe(true);
      expect(mockFs.existsSync('/test-project/.memento/workflows')).toBe(true);
      
      const config = mockFs.readFileSync('/test-project/.memento/config.json');
      expect(config).toBe('{"version": "1.0.0"}');
    });

    it('should create interactive setup preset', async () => {
      const mockInquirer = MockPresets.interactiveSetup().build();
      
      const confirmResult = await mockInquirer.prompt([]);
      expect(confirmResult).toEqual({ confirm: true });
      
      const choiceResult = await mockInquirer.prompt([]);
      expect(choiceResult).toEqual({ choice: 'architect' });
      
      const inputResult = await mockInquirer.prompt([]);
      expect(inputResult).toEqual({ input: 'test-project' });
    });

    it('should create silent logger preset', () => {
      const mockLogger = MockPresets.silentLogger().build();
      
      mockLogger.info('test');
      mockLogger.warn('test');
      
      // Should not track calls when set to silent
      const history = MockFactory.getCallHistory('logger.');
      expect(history).toHaveLength(0);
    });

    it('should create successful commands preset', () => {
      const mockChildProcess = MockPresets.successfulCommands().build();
      
      const gitResult = mockChildProcess.execSync('git status');
      expect(gitResult).toBe('On branch main');
      
      const npmResult = mockChildProcess.execSync('npm test');
      expect(npmResult).toBe('All tests passed');
    });
  });

  describe('Integration Examples', () => {
    it('should work with existing test patterns', () => {
      // Simulate existing test setup patterns
      const mockFs = MockFactory.fileSystem()
        .withFile('/project/.memento/config.json', JSON.stringify({ version: '1.0.0' }))
        .withFile('/project/.memento/modes/architect.md', '# Architect Mode')
        .build();

      const mockLogger = MockFactory.logger().build();

      // Test the mocks work together
      expect(mockFs.existsSync('/project/.memento/config.json')).toBe(true);
      
      const configContent = mockFs.readFileSync('/project/.memento/config.json');
      const config = JSON.parse(String(configContent));
      expect(config.version).toBe('1.0.0');

      mockLogger.info('Starting test');
      expect(mockLogger.info).toHaveBeenCalledWith('Starting test');
    });

    it('should handle complex scenarios', async () => {
      // Simulate a full CLI interaction
      const mockFs = MockPresets.mementoFileSystem('/project').build();
      const mockInquirer = MockPresets.interactiveSetup().build();
      const mockChildProcess = MockPresets.successfulCommands().build();
      const mockLogger = MockFactory.logger().build();

      // Simulate checking project structure
      expect(mockFs.existsSync('/project/.memento/config.json')).toBe(true);
      mockLogger.info('Found Memento project');

      // Simulate user interaction
      const confirmResult = await mockInquirer.prompt([]);
      expect(confirmResult.confirm).toBe(true);
      mockLogger.info('User confirmed action');

      // Simulate command execution
      const gitResult = mockChildProcess.execSync('git status');
      expect(gitResult).toBe('On branch main');
      mockLogger.success('Git status checked successfully');

      // Verify all interactions were tracked
      const history = MockFactory.getCallHistory();
      expect(history.length).toBeGreaterThan(0);

      // Verify specific mock calls
      expect(mockLogger.info).toHaveBeenCalledWith('Found Memento project');
      expect(mockLogger.success).toHaveBeenCalledWith('Git status checked successfully');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle file system errors gracefully', () => {
      const mockFs = MockFactory.fileSystem()
        .withReadError('/protected.txt', new Error('EACCES: permission denied'))
        .build();

      expect(() => mockFs.readFileSync('/protected.txt')).toThrow('EACCES: permission denied');
    });

    it('should handle child process errors', () => {
      const mockChildProcess = MockFactory.childProcess()
        .withCommand('failing-command', {
          exitCode: 1,
          stdout: [],
          stderr: ['Command failed'],
          error: new Error('Process failed')
        })
        .build();

      expect(() => mockChildProcess.spawn('failing-command')).toThrow('Process failed');
    });

    it('should handle missing mock responses', async () => {
      const mockInquirer = MockFactory.inquirer().build();

      await expect(mockInquirer.prompt([])).rejects.toThrow('No more mock responses available');
    });
  });
});