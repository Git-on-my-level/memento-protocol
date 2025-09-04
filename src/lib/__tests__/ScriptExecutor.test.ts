import { ScriptExecutor, ScriptContext, Script } from '../ScriptExecutor';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock fs methods
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock execa (already set up in moduleNameMapper)
jest.mock('execa');
const { execa: mockExeca } = require('execa');

describe('ScriptExecutor', () => {
  let tempDir: string;
  let projectRoot: string;
  let globalRoot: string;
  let scriptExecutor: ScriptExecutor;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up test directories (mocked fs doesn't need actual directories)
    tempDir = '/tmp/memento-test-123';
    projectRoot = path.join(tempDir, 'project');
    globalRoot = path.join(os.homedir(), '.zcc');
    
    scriptExecutor = new ScriptExecutor(projectRoot);

    // Reset execa mock to default success behavior
    (mockExeca as jest.Mock).mockImplementation(async () => ({
      stdout: 'Success output',
      stderr: '',
      exitCode: 0
    }));

    // Mock fs.existsSync to return true by default
    mockFs.existsSync.mockReturnValue(true);
    
    // Mock fs.readFileSync for script content
    mockFs.readFileSync.mockReturnValue('#!/bin/bash\necho "Hello World"');
    
    // Mock fs.statSync for file stats
    mockFs.statSync.mockReturnValue({
      size: 100,
      mtime: new Date(),
      mode: 0o755,
      isFile: () => true
    } as any);

    // Mock fs.readdirSync
    mockFs.readdirSync.mockReturnValue(['test-script.sh', 'another-script.js'] as any);

    // Mock fs.chmodSync
    mockFs.chmodSync.mockImplementation(() => {});
  });

  afterEach(() => {
    // No cleanup needed for mocked fs
  });

  describe('constructor', () => {
    it('should initialize with project root', () => {
      const executor = new ScriptExecutor('/test/project');
      expect(executor).toBeInstanceOf(ScriptExecutor);
    });

    it('should accept options', () => {
      const executor = new ScriptExecutor('/test/project', { timeout: 60000 });
      expect(executor).toBeInstanceOf(ScriptExecutor);
    });
  });

  describe('prepareEnvironment', () => {
    it('should prepare environment variables correctly', () => {
      const context: ScriptContext = {
        source: 'project',
        scriptPath: '/test/script.sh',
        workingDirectory: projectRoot,
        env: { CUSTOM_VAR: 'test' }
      };

      const env = scriptExecutor.prepareEnvironment(context);

      expect(env.ZCC_SCRIPT_SOURCE).toBe('/test/script.sh');
      expect(env.ZCC_SCRIPT_SCOPE).toBe('project');
      expect(env.ZCC_PROJECT_ROOT).toBe(projectRoot);
      expect(env.ZCC_GLOBAL_ROOT).toBe(globalRoot);
      expect(env.ZCC_SCRIPT_NAME).toBe('script');
      expect(env.CUSTOM_VAR).toBe('test');
    });

    it('should include PATH modifications', () => {
      const context: ScriptContext = {
        source: 'global',
        scriptPath: '/test/script.sh',
        workingDirectory: projectRoot,
        env: {}
      };

      // Mock existsSync to return true for script directories
      mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
        const pathStr = filePath.toString();
        return pathStr.includes('scripts') || pathStr === '/test/script.sh';
      });

      const env = scriptExecutor.prepareEnvironment(context);
      expect(env.PATH).toBeDefined();
    });
  });

  describe('resolveScriptPath', () => {
    it('should resolve project script path', () => {
      const scriptPath = scriptExecutor.resolveScriptPath('test-script', 'project');
      expect(scriptPath).toBe(path.join(projectRoot, '.zcc', 'scripts', 'test-script.sh'));
    });

    it('should resolve global script path', () => {
      const scriptPath = scriptExecutor.resolveScriptPath('test-script', 'global');
      expect(scriptPath).toBe(path.join(globalRoot, 'scripts', 'test-script.sh'));
    });
  });

  describe('execute', () => {
    it('should execute script successfully', async () => {
      const script: Script = {
        name: 'test-script',
        path: '/test/script.sh'
      };

      const context: ScriptContext = {
        source: 'project',
        scriptPath: '/test/script.sh',
        workingDirectory: projectRoot,
        env: {}
      };

      // Set mock to success behavior (default)
      (mockExeca as any).setMockBehavior('success');

      const result = await scriptExecutor.execute(script, context);

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('Success output');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle script execution failure', async () => {
      const script: Script = {
        name: 'test-script',
        path: '/test/script.sh'
      };

      const context: ScriptContext = {
        source: 'project',
        scriptPath: '/test/script.sh',
        workingDirectory: projectRoot,
        env: {}
      };

      // Mock execa to throw error
      (mockExeca as jest.Mock).mockImplementationOnce(async () => {
        const error = new Error('Script exited with code 1') as any;
        error.exitCode = 1;
        error.stdout = '';
        error.stderr = 'Error output';
        throw error;
      });

      const result = await scriptExecutor.execute(script, context);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBe('Error output');
      expect(result.error).toContain('Script exited with code 1');
    });

    it('should handle script not found', async () => {
      const script: Script = {
        name: 'missing-script',
        path: '/nonexistent/script.sh'
      };

      const context: ScriptContext = {
        source: 'project',
        scriptPath: '/nonexistent/script.sh',
        workingDirectory: projectRoot,
        env: {}
      };

      // Mock script not existing
      mockFs.existsSync.mockReturnValue(false);

      const result = await scriptExecutor.execute(script, context);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(-1);
      expect(result.error).toContain('Script not found');
    });

    it('should handle timeout', async () => {
      const script: Script = {
        name: 'slow-script',
        path: '/test/script.sh'
      };

      const context: ScriptContext = {
        source: 'project',
        scriptPath: '/test/script.sh',
        workingDirectory: projectRoot,
        env: {}
      };

      // Mock execa to timeout
      (mockExeca as jest.Mock).mockImplementationOnce(async () => {
        const error = new Error('Command timed out after 100ms') as any;
        error.timedOut = true;
        error.stdout = '';
        error.stderr = '';
        throw error;
      });

      const result = await scriptExecutor.execute(script, context, { timeout: 100 });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(-2);
      expect(result.error).toContain('timeout');
    });

    it('should handle spawn errors', async () => {
      const script: Script = {
        name: 'test-script',
        path: '/test/script.sh'
      };

      const context: ScriptContext = {
        source: 'project',
        scriptPath: '/test/script.sh',
        workingDirectory: projectRoot,
        env: {}
      };

      // Mock execa to throw spawn error
      (mockExeca as jest.Mock).mockImplementationOnce(async () => {
        const error = new Error('Failed to spawn script') as any;
        error.code = 'ENOENT';
        throw error;
      });

      const result = await scriptExecutor.execute(script, context);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(-1);
      expect(result.error).toContain('Failed to spawn script');
    });
  });

  describe('findScript', () => {
    it('should find project script first', async () => {
      // Mock project script exists
      mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
        const pathStr = filePath.toString();
        return pathStr.includes('.zcc/scripts/test-script');
      });

      const result = await scriptExecutor.findScript('test-script');

      expect(result).toBeTruthy();
      expect(result!.context.source).toBe('project');
      expect(result!.script.name).toBe('test-script');
    });

    it('should fallback to global script', async () => {
      // Mock only global script exists
      mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
        const pathStr = filePath.toString();
        return pathStr.includes('.zcc/scripts/test-script') && pathStr.includes(os.homedir());
      });

      const result = await scriptExecutor.findScript('test-script');

      expect(result).toBeTruthy();
      expect(result!.context.source).toBe('global');
      expect(result!.script.name).toBe('test-script');
    });

    it('should return null if script not found', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await scriptExecutor.findScript('nonexistent-script');

      expect(result).toBeNull();
    });
  });

  describe('executeByName', () => {
    it('should execute script by name with arguments', async () => {
      // Mock script exists
      mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
        const pathStr = filePath.toString();
        return pathStr.includes('.zcc/scripts/test-script');
      });

      // Set mock to success behavior (default)
      (mockExeca as any).setMockBehavior('success');

      const result = await scriptExecutor.executeByName('test-script', ['arg1', 'arg2']);

      expect(result.success).toBe(true);
      expect(mockExeca).toHaveBeenCalled();
    });

    it('should return error if script not found', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await scriptExecutor.executeByName('nonexistent-script');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Script not found');
    });
  });

  describe('listScripts', () => {
    it('should list scripts from both scopes', async () => {
      // Mock directory reading
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['script1.sh', 'script2.js'] as any);

      const result = await scriptExecutor.listScripts();

      expect(result.project).toBeDefined();
      expect(result.global).toBeDefined();
      expect(result.all).toBeDefined();
      expect(Array.isArray(result.all)).toBe(true);
    });

    it('should handle missing script directories', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await scriptExecutor.listScripts();

      expect(result.project).toEqual([]);
      expect(result.global).toEqual([]);
      expect(result.all).toEqual([]);
    });
  });

  describe('validateContext', () => {
    it('should validate valid context', () => {
      const context: ScriptContext = {
        source: 'project',
        scriptPath: '/test/script.sh',
        workingDirectory: projectRoot,
        env: {}
      };

      // Mock paths exist
      mockFs.existsSync.mockReturnValue(true);

      const result = scriptExecutor.validateContext(context);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid context', () => {
      const context: ScriptContext = {
        source: 'invalid' as any,
        scriptPath: '',
        workingDirectory: '/nonexistent',
        env: {}
      };

      // Mock paths don't exist
      mockFs.existsSync.mockReturnValue(false);

      const result = scriptExecutor.validateContext(context);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('cross-platform compatibility', () => {
    it('should handle Windows paths correctly', () => {
      // Mock Windows platform
      Object.defineProperty(process, 'platform', { value: 'win32', writable: true });

      const executor = new ScriptExecutor('C:\\test\\project');
      const context: ScriptContext = {
        source: 'project',
        scriptPath: 'C:\\test\\script.bat',
        workingDirectory: 'C:\\test\\project',
        env: {}
      };

      const env = executor.prepareEnvironment(context);
      expect(env.ZCC_SCRIPT_SOURCE).toBe('C:\\test\\script.bat');
      expect(env.ZCC_PROJECT_ROOT).toBe('C:\\test\\project');

      // Reset platform
      Object.defineProperty(process, 'platform', { value: 'linux', writable: true });
    });

    it('should detect shell correctly on different platforms', () => {
      // Test is mainly about ensuring no errors occur during shell detection
      const executor = new ScriptExecutor('/test/project');
      expect(executor).toBeInstanceOf(ScriptExecutor);
    });
  });

  describe('script types', () => {
    it('should handle different script types', async () => {
      const scriptTypes = [
        { path: '/test/script.sh', expectedCommand: expect.stringContaining('sh') },
        { path: '/test/script.js', expectedCommand: 'node' },
        { path: '/test/script.py', expectedCommand: 'python' },
        { path: '/test/script.ts', expectedCommand: 'npx' }
      ];

      for (const { path: scriptPath } of scriptTypes) {
        const script: Script = { name: 'test', path: scriptPath };
        const context: ScriptContext = {
          source: 'project',
          scriptPath,
          workingDirectory: projectRoot,
          env: {}
        };

        // Set mock to success behavior
        (mockExeca as any).setMockBehavior('success');

        await scriptExecutor.execute(script, context);
        expect(mockExeca).toHaveBeenCalled();
      }
    });
  });

  describe('environment variable injection', () => {
    it('should inject all required environment variables', () => {
      const context: ScriptContext = {
        source: 'global',
        scriptPath: '/global/.zcc/scripts/test.sh',
        workingDirectory: '/project',
        env: { EXTRA_VAR: 'value' }
      };

      const env = scriptExecutor.prepareEnvironment(context);

      // Check required ZCC variables
      expect(env.ZCC_SCRIPT_SOURCE).toBe('/global/.zcc/scripts/test.sh');
      expect(env.ZCC_SCRIPT_SCOPE).toBe('global');
      expect(env.ZCC_PROJECT_ROOT).toBe('/project');
      expect(env.ZCC_GLOBAL_ROOT).toBeDefined();
      expect(env.ZCC_SCRIPT_NAME).toBe('test');
      expect(env.EXTRA_VAR).toBe('value');

      // Check that parent environment is inherited
      expect(env.PATH).toBeDefined();
    });
  });
});