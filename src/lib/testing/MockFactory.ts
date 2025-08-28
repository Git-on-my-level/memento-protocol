/**
 * MockFactory - Comprehensive mock management for Memento Protocol CLI tests
 * 
 * Provides consistent, reusable mocks for all common dependencies with:
 * - Fluent builder APIs for easy configuration
 * - State management and cleanup
 * - Jest integration and spy helpers
 * - Common mock scenarios and presets
 * 
 * @example
 * ```typescript
 * import { MockFactory } from './MockFactory';
 * 
 * // Simple usage
 * const fs = MockFactory.fileSystem().build();
 * const inquirer = MockFactory.inquirer().build();
 * 
 * // Builder pattern with configuration
 * const fs = MockFactory.fileSystem()
 *   .withFile('/config.json', '{"version": "1.0.0"}')
 *   .withDirectory('/src')
 *   .withReadError('/protected.txt')
 *   .build();
 * 
 * // Preset configurations
 * const inquirer = MockFactory.inquirer()
 *   .withPromptSequence([
 *     { name: 'confirm', value: true },
 *     { name: 'choice', value: 'option1' }
 *   ])
 *   .build();
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';
// Remove unused import
import * as child_process from 'child_process';
import { Command } from 'commander';
import inquirer from 'inquirer';
import { logger } from '../logger';

// Type definitions for mock configurations
export interface MockCallInfo {
  method: string;
  args: any[];
  timestamp: number;
  result?: any;
  error?: Error;
}

export interface FileSystemFile {
  content: string;
  isDirectory?: boolean;
  permissions?: number;
  error?: Error;
}

export interface FileSystemMockConfig {
  files: Map<string, FileSystemFile>;
  defaultPermissions: number;
  throwOnMissingFiles: boolean;
}

export interface InquirerPromptResponse {
  name: string;
  value: any;
  delay?: number;
}

export interface ChildProcessMockConfig {
  exitCode: number;
  stdout: string[];
  stderr: string[];
  delay?: number;
  error?: Error;
}

export interface MockState {
  mocks: Map<string, jest.MockedObject<any>>;
  spies: jest.SpyInstance[];
  callHistory: MockCallInfo[];
}

/**
 * Central factory for creating and managing test mocks
 */
export class MockFactory {
  static state: MockState = {
    mocks: new Map(),
    spies: [],
    callHistory: []
  };

  /**
   * Reset all mocks and clear state between tests
   */
  static reset(): void {
    // Clear all mocks
    this.state.mocks.forEach(mock => {
      if (jest.isMockFunction(mock)) {
        (mock as jest.MockedFunction<any>).mockClear();
      }
    });

    // Restore all spies
    this.state.spies.forEach(spy => spy.mockRestore());

    // Clear collections
    this.state.mocks.clear();
    this.state.spies = [];
    this.state.callHistory = [];
  }

  /**
   * Get mock call history for debugging
   */
  static getCallHistory(filter?: string): MockCallInfo[] {
    return filter 
      ? this.state.callHistory.filter(call => call.method.includes(filter))
      : [...this.state.callHistory];
  }

  /**
   * Track a mock call for debugging
   */
  static trackCall(method: string, args: any[], result?: any, error?: Error): void {
    this.state.callHistory.push({
      method,
      args: [...args],
      timestamp: Date.now(),
      result,
      error
    });
  }

  /**
   * Create a file system mock with builder pattern
   */
  static fileSystem(): FileSystemMockBuilder {
    return new FileSystemMockBuilder();
  }

  /**
   * Create an inquirer mock with builder pattern
   */
  static inquirer(): InquirerMockBuilder {
    return new InquirerMockBuilder();
  }

  /**
   * Create a logger mock with builder pattern
   */
  static logger(): LoggerMockBuilder {
    return new LoggerMockBuilder();
  }

  /**
   * Create a child_process mock with builder pattern
   */
  static childProcess(): ChildProcessMockBuilder {
    return new ChildProcessMockBuilder();
  }

  /**
   * Create a commander mock with builder pattern
   */
  static commander(): CommanderMockBuilder {
    return new CommanderMockBuilder();
  }

  /**
   * Create an axios mock with builder pattern
   */
  static axios(): AxiosMockBuilder {
    return new AxiosMockBuilder();
  }

  /**
   * Verify that a mock was called with specific arguments
   */
  static verifyMockCalls(
    mock: jest.MockedFunction<any>, 
    expectedCalls: any[][]
  ): void {
    expect(mock).toHaveBeenCalledTimes(expectedCalls.length);
    expectedCalls.forEach((expectedArgs, index) => {
      expect(mock).toHaveBeenNthCalledWith(index + 1, ...expectedArgs);
    });
  }

  /**
   * Assert that a mock was not called
   */
  static assertMockNotCalled(mock: jest.MockedFunction<any>): void {
    expect(mock).not.toHaveBeenCalled();
  }

  /**
   * Create a spy on an object method
   */
  static createSpy<T extends object, K extends keyof T>(
    object: T,
    method: K
  ): jest.SpyInstance {
    const spy = jest.spyOn(object, method as any);
    this.state.spies.push(spy);
    return spy;
  }
}

/**
 * Builder for file system mocks
 */
export class FileSystemMockBuilder {
  private config: FileSystemMockConfig = {
    files: new Map(),
    defaultPermissions: 0o644,
    throwOnMissingFiles: false
  };

  /**
   * Add a file to the mock filesystem
   */
  withFile(filePath: string, content: string, permissions?: number): this {
    this.config.files.set(filePath, {
      content,
      permissions: permissions || this.config.defaultPermissions,
      isDirectory: false
    });
    return this;
  }

  /**
   * Add a directory to the mock filesystem
   */
  withDirectory(dirPath: string, permissions?: number): this {
    this.config.files.set(dirPath, {
      content: '',
      permissions: permissions || 0o755,
      isDirectory: true
    });
    return this;
  }

  /**
   * Configure a file to throw an error when accessed
   */
  withReadError(filePath: string, error?: Error): this {
    this.config.files.set(filePath, {
      content: '',
      error: error || new Error(`ENOENT: no such file or directory, open '${filePath}'`)
    });
    return this;
  }

  /**
   * Add multiple files from an object
   */
  withFiles(files: Record<string, string>): this {
    Object.entries(files).forEach(([path, content]) => {
      this.withFile(path, content);
    });
    return this;
  }

  /**
   * Configure whether to throw on missing files
   */
  throwOnMissingFiles(shouldThrow = true): this {
    this.config.throwOnMissingFiles = shouldThrow;
    return this;
  }

  /**
   * Set default file permissions
   */
  defaultPermissions(permissions: number): this {
    this.config.defaultPermissions = permissions;
    return this;
  }

  /**
   * Build the mock file system
   */
  build(): jest.Mocked<typeof fs> {
    const mockFs = {
      readFileSync: jest.fn(),
      writeFileSync: jest.fn(),
      existsSync: jest.fn(),
      mkdirSync: jest.fn(),
      rmSync: jest.fn(),
      readdirSync: jest.fn(),
      statSync: jest.fn(),
      lstatSync: jest.fn(),
      copyFileSync: jest.fn(),
      unlinkSync: jest.fn(),
      chmodSync: jest.fn(),
      promises: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        mkdir: jest.fn(),
        rmdir: jest.fn(),
        readdir: jest.fn(),
        stat: jest.fn(),
        lstat: jest.fn(),
        copyFile: jest.fn(),
        unlink: jest.fn(),
        chmod: jest.fn(),
      }
    } as any;

    // Configure readFileSync
    mockFs.readFileSync.mockImplementation((filePath: string | Buffer | URL, options?: any) => {
      const pathStr = filePath.toString();
      MockFactory.trackCall('fs.readFileSync', [pathStr, options]);
      
      const file = this.config.files.get(pathStr);
      if (file?.error) {
        throw file.error;
      }
      if (file) {
        return file.content;
      }
      if (this.config.throwOnMissingFiles) {
        throw new Error(`ENOENT: no such file or directory, open '${pathStr}'`);
      }
      return '';
    });

    // Configure existsSync
    mockFs.existsSync.mockImplementation((filePath: string | Buffer | URL) => {
      const pathStr = filePath.toString();
      MockFactory.trackCall('fs.existsSync', [pathStr]);
      
      return this.config.files.has(pathStr);
    });

    // Configure writeFileSync
    mockFs.writeFileSync.mockImplementation((filePath: string | Buffer | URL, data: any, options?: any) => {
      const pathStr = filePath.toString();
      MockFactory.trackCall('fs.writeFileSync', [pathStr, data, options]);
      
      this.config.files.set(pathStr, {
        content: data.toString(),
        permissions: this.config.defaultPermissions
      });
    });

    // Configure statSync
    mockFs.statSync.mockImplementation((filePath: string | Buffer | URL) => {
      const pathStr = filePath.toString();
      MockFactory.trackCall('fs.statSync', [pathStr]);
      
      const file = this.config.files.get(pathStr);
      if (!file) {
        throw new Error(`ENOENT: no such file or directory, stat '${pathStr}'`);
      }
      
      return {
        isFile: () => !file.isDirectory,
        isDirectory: () => !!file.isDirectory,
        isSymbolicLink: () => false,
        size: file.content.length,
        mode: file.permissions || this.config.defaultPermissions,
        mtime: new Date(),
        ctime: new Date(),
        atime: new Date(),
      } as fs.Stats;
    });

    // Configure readdirSync
    mockFs.readdirSync.mockImplementation((dirPath: string | Buffer | URL, options?: any) => {
      const pathStr = dirPath.toString();
      MockFactory.trackCall('fs.readdirSync', [pathStr, options]);
      
      const entries: string[] = [];
      this.config.files.forEach((_, filePath) => {
        const relativePath = path.relative(pathStr, filePath);
        const parts = relativePath.split(path.sep);
        if (parts.length === 1 && !relativePath.startsWith('..')) {
          entries.push(parts[0]);
        }
      });
      
      return entries;
    });

    MockFactory.state.mocks.set('fs', mockFs);
    return mockFs;
  }
}

/**
 * Builder for inquirer mocks
 */
export class InquirerMockBuilder {
  private prompts: InquirerPromptResponse[] = [];
  private promptIndex = 0;

  /**
   * Add a single prompt response
   */
  withPrompt(name: string, value: any, delay?: number): this {
    this.prompts.push({ name, value, delay });
    return this;
  }

  /**
   * Add multiple prompt responses
   */
  withPromptSequence(prompts: InquirerPromptResponse[]): this {
    this.prompts.push(...prompts);
    return this;
  }

  /**
   * Configure confirmation prompts
   */
  withConfirm(value: boolean, delay?: number): this {
    return this.withPrompt('confirm', value, delay);
  }

  /**
   * Configure choice prompts
   */
  withChoice(value: string, delay?: number): this {
    return this.withPrompt('choice', value, delay);
  }

  /**
   * Configure text input prompts
   */
  withInput(value: string, delay?: number): this {
    return this.withPrompt('input', value, delay);
  }

  /**
   * Build the inquirer mock
   */
  build(): jest.Mocked<typeof inquirer> {
    const mockInquirer = {
      prompt: jest.fn(),
      createPromptModule: jest.fn(),
    } as any;

    mockInquirer.prompt.mockImplementation(async (questions: any) => {
      MockFactory.trackCall('inquirer.prompt', [questions]);
      
      if (this.promptIndex >= this.prompts.length) {
        throw new Error(`No more mock responses available. Expected prompt: ${JSON.stringify(questions)}`);
      }

      const response = this.prompts[this.promptIndex++];
      
      if (response.delay) {
        await new Promise(resolve => setTimeout(resolve, response.delay));
      }

      // Return an object with the prompt name as key
      return { [response.name]: response.value };
    });

    MockFactory.state.mocks.set('inquirer', mockInquirer);
    return mockInquirer;
  }
}

/**
 * Builder for logger mocks
 */
export class LoggerMockBuilder {
  private shouldTrack = true;
  private shouldThrow = false;

  /**
   * Enable call tracking (default: true)
   */
  withTracking(enabled = true): this {
    this.shouldTrack = enabled;
    return this;
  }

  /**
   * Configure logger methods to throw errors
   */
  shouldThrowOnError(enabled = true): this {
    this.shouldThrow = enabled;
    return this;
  }

  /**
   * Build the logger mock
   */
  build(): jest.Mocked<typeof logger> {
    const createLoggerMethod = (method: string) => {
      return jest.fn().mockImplementation((...args: any[]) => {
        if (this.shouldTrack) {
          MockFactory.trackCall(`logger.${method}`, args);
        }
        if (method === 'error' && this.shouldThrow) {
          throw new Error(`Logger error: ${args.join(' ')}`);
        }
      });
    };

    const mockLogger = {
      info: createLoggerMethod('info'),
      success: createLoggerMethod('success'),
      warn: createLoggerMethod('warn'),
      error: createLoggerMethod('error'),
      debug: createLoggerMethod('debug'),
      space: createLoggerMethod('space'),
    } as any;

    MockFactory.state.mocks.set('logger', mockLogger);
    return mockLogger;
  }
}

/**
 * Builder for child_process mocks
 */
export class ChildProcessMockBuilder {
  private configs = new Map<string, ChildProcessMockConfig>();
  private defaultConfig: ChildProcessMockConfig = {
    exitCode: 0,
    stdout: [],
    stderr: [],
    delay: 0
  };

  /**
   * Configure response for a specific command
   */
  withCommand(command: string, config: Partial<ChildProcessMockConfig>): this {
    this.configs.set(command, { ...this.defaultConfig, ...config });
    return this;
  }

  /**
   * Set default configuration for all commands
   */
  withDefaults(config: Partial<ChildProcessMockConfig>): this {
    this.defaultConfig = { ...this.defaultConfig, ...config };
    return this;
  }

  /**
   * Configure a command to succeed with output
   */
  withSuccess(command: string, stdout: string[], stderr: string[] = []): this {
    return this.withCommand(command, { exitCode: 0, stdout, stderr });
  }

  /**
   * Configure a command to fail
   */
  withFailure(command: string, exitCode: number, stderr: string[] = []): this {
    return this.withCommand(command, { exitCode, stderr });
  }

  /**
   * Build the child_process mock
   */
  build(): jest.Mocked<typeof child_process> {
    const mockChildProcess = {
      spawn: jest.fn(),
      exec: jest.fn(),
      execSync: jest.fn(),
      fork: jest.fn(),
    } as any;

    const createMockProcess = (config: ChildProcessMockConfig) => ({
      stdout: {
        on: jest.fn().mockImplementation((event: string, callback: Function) => {
          if (event === 'data') {
            setTimeout(() => {
              config.stdout.forEach(line => callback(line));
            }, config.delay || 0);
          }
        }),
      },
      stderr: {
        on: jest.fn().mockImplementation((event: string, callback: Function) => {
          if (event === 'data') {
            setTimeout(() => {
              config.stderr.forEach(line => callback(line));
            }, config.delay || 0);
          }
        }),
      },
      on: jest.fn().mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(config.exitCode), (config.delay || 0) + 10);
        }
      }),
      kill: jest.fn(),
    });

    mockChildProcess.spawn.mockImplementation((command: string, args?: readonly string[], options?: any) => {
      MockFactory.trackCall('child_process.spawn', [command, args, options]);
      
      const config = this.configs.get(command) || this.defaultConfig;
      if (config.error) {
        throw config.error;
      }
      
      return createMockProcess(config) as any;
    });

    mockChildProcess.execSync.mockImplementation((command: string, options?: any) => {
      MockFactory.trackCall('child_process.execSync', [command, options]);
      
      const config = this.configs.get(command) || this.defaultConfig;
      if (config.error) {
        throw config.error;
      }
      if (config.exitCode !== 0) {
        const error = new Error(`Command failed: ${command}`) as any;
        error.status = config.exitCode;
        error.stderr = config.stderr.join('\n');
        throw error;
      }
      
      return config.stdout.join('\n');
    });

    MockFactory.state.mocks.set('child_process', mockChildProcess);
    return mockChildProcess;
  }
}

/**
 * Builder for commander mocks
 */
export class CommanderMockBuilder {
  private options = new Map<string, any>();
  private args: string[] = [];
  private commandName = 'test';

  /**
   * Add a command option
   */
  withOption(name: string, value: any): this {
    this.options.set(name, value);
    return this;
  }

  /**
   * Set command arguments
   */
  withArgs(args: string[]): this {
    this.args = args;
    return this;
  }

  /**
   * Set the command name
   */
  withName(name: string): this {
    this.commandName = name;
    return this;
  }

  /**
   * Build the commander mock
   */
  build(): jest.Mocked<Command> {
    const mockCommand = {
      name: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      option: jest.fn().mockReturnThis(),
      argument: jest.fn().mockReturnThis(),
      action: jest.fn().mockReturnThis(),
      parse: jest.fn(),
      opts: jest.fn(),
      args: this.args,
      getName: () => this.commandName,
    } as any;

    mockCommand.opts.mockImplementation(() => {
      MockFactory.trackCall('command.opts', []);
      return Object.fromEntries(this.options);
    });

    MockFactory.state.mocks.set('commander', mockCommand);
    return mockCommand;
  }
}

/**
 * Builder for axios mocks
 */
export class AxiosMockBuilder {
  private responses = new Map<string, any>();
  private defaultResponse = { data: {}, status: 200, statusText: 'OK' };

  /**
   * Configure response for a URL pattern
   */
  withResponse(urlPattern: string, response: any): this {
    this.responses.set(urlPattern, response);
    return this;
  }

  /**
   * Configure a successful GET response
   */
  withGet(url: string, data: any): this {
    return this.withResponse(`GET:${url}`, { data, status: 200, statusText: 'OK' });
  }

  /**
   * Configure a POST response
   */
  withPost(url: string, data: any): this {
    return this.withResponse(`POST:${url}`, { data, status: 201, statusText: 'Created' });
  }

  /**
   * Configure an error response
   */
  withError(url: string, status: number, message: string): this {
    const error = new Error(message) as any;
    error.response = { status, statusText: message };
    return this.withResponse(url, { error });
  }

  /**
   * Build the axios mock
   */
  build(): jest.MockedObject<any> {
    const mockAxios = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
      create: jest.fn().mockReturnThis(),
      defaults: { headers: {} },
    };

    const configureMethod = (method: string) => {
      (mockAxios as any)[method].mockImplementation(async (url: string, ...args: any[]) => {
        MockFactory.trackCall(`axios.${method}`, [url, ...args]);
        
        const key = `${method.toUpperCase()}:${url}`;
        const response = this.responses.get(key) || this.responses.get(url) || this.defaultResponse;
        
        if (response.error) {
          throw response.error;
        }
        
        return response;
      });
    };

    ['get', 'post', 'put', 'delete'].forEach(configureMethod);

    MockFactory.state.mocks.set('axios', mockAxios);
    return mockAxios;
  }
}

/**
 * Jest setup helper for automatic mock reset
 */
export const setupMockFactory = (): void => {
  beforeEach(() => {
    MockFactory.reset();
  });

  afterAll(() => {
    MockFactory.reset();
  });
};

/**
 * Common mock presets for quick setup
 */
export class MockPresets {
  /**
   * Standard file system setup for Memento projects
   */
  static mementoFileSystem(projectRoot = '/project') {
    return MockFactory.fileSystem()
      .withFile(`${projectRoot}/.memento/config.json`, '{"version": "1.0.0"}')
      .withDirectory(`${projectRoot}/.memento/modes`)
      .withDirectory(`${projectRoot}/.memento/workflows`)
      .withDirectory(`${projectRoot}/.memento/tickets`)
      .withFile(`${projectRoot}/.memento/modes/architect.md`, '# Architect Mode')
      .withFile(`${projectRoot}/.memento/workflows/review.md`, '# Review Workflow');
  }

  /**
   * Interactive setup prompts
   */
  static interactiveSetup() {
    return MockFactory.inquirer()
      .withConfirm(true) // Confirm initialization
      .withChoice('architect') // Select mode
      .withInput('test-project'); // Project name
  }

  /**
   * Silent logger for tests
   */
  static silentLogger() {
    return MockFactory.logger()
      .withTracking(false);
  }

  /**
   * Successful command execution
   */
  static successfulCommands() {
    return MockFactory.childProcess()
      .withSuccess('git status', ['On branch main'])
      .withSuccess('npm test', ['All tests passed']);
  }
}

export default MockFactory;