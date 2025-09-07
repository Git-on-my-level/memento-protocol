import { doctorCommand } from '../doctor';
import { createTestFileSystem } from '../../lib/testing/createTestFileSystem';
import * as fs from 'fs';

// Mock the logger to capture output
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    newline: jest.fn(),
    verbose: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn
};

describe('doctor command', () => {
  const projectRoot = '/test/project';
  const originalEnv = process.env;
  const originalVersion = process.version;
  const originalExitCode = process.exitCode;

  beforeEach(async () => {
    // Reset environment
    process.env = { ...originalEnv };
    process.env.HOME = '/home/testuser';
    delete process.env.ZCC_HOME;
    
    // Reset process.exitCode
    process.exitCode = 0;
    
    // Mock console methods
    console.log = mockConsole.log;
    console.error = mockConsole.error;
    console.warn = mockConsole.warn;
    
    // Clear all mocks and restore spies
    jest.clearAllMocks();
    jest.restoreAllMocks();

    // Create test filesystem - not used in these tests but kept for completeness
    await createTestFileSystem({
      [`${projectRoot}/.zcc/config.yaml`]: 'defaultMode: engineer\nui:\n  colorOutput: true\n  verboseLogging: false',
      [`${projectRoot}/.claude/settings.local.json`]: '{"projectId": "test"}',
      [`${projectRoot}/.claude/commands/mode.md`]: '# Mode Command',
      '/home/testuser/.zcc/config.yaml': 'defaultMode: architect\nui:\n  colorOutput: false',
    });
  });

  afterEach(() => {
    // Restore environment and mocks
    process.env = originalEnv;
    process.exitCode = originalExitCode;
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    
    // Reset Node version if mocked
    if (originalVersion !== process.version) {
      Object.defineProperty(process, 'version', {
        value: originalVersion,
        writable: true
      });
    }
  });

  describe('basic functionality', () => {
    it('should run diagnostics without error', async () => {
      // Mock fs.existsSync to simulate proper installation
      jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('package.json')) return true;
        if (pathStr.includes('.zcc')) return true;
        if (pathStr.includes('.claude')) return true;
        return false;
      });
      
      // Mock fs.readFileSync for package.json
      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('package.json')) {
          return JSON.stringify({
            name: 'z-claude-code',
            version: '1.0.0'
          });
        }
        return '';
      });

      // Get the action function from the doctor command
      const action = doctorCommand.action;
      expect(action).toBeDefined();

      // Run the doctor command action with empty options
      await expect(action.call(doctorCommand, {} as any)).resolves.not.toThrow();

      // Verify that diagnostic output was generated
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should set exit code 1 when failures are detected', async () => {
      // Mock Node.js version as too old
      Object.defineProperty(process, 'version', {
        value: 'v14.0.0',
        writable: true
      });

      // Mock missing package.json
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      const action = doctorCommand.action;
      if (action) {
        await action.call(doctorCommand, {} as any);
      }

      expect(process.exitCode).toBe(1);
    });
  });

  describe('diagnostic checks', () => {
    it('should detect ZCC installation correctly', async () => {
      // Mock successful package.json read
      jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
        return filePath.toString().includes('package.json');
      });
      
      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        if (filePath.toString().includes('package.json')) {
          return JSON.stringify({
            name: 'z-claude-code',
            version: '1.0.0'
          });
        }
        return '';
      });

      const action = doctorCommand.action;
      if (action) {
        await action.call(doctorCommand, {} as any);
      }

      // Should show successful ZCC installation check
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ ZCC Installation')
      );
    });

    it('should detect Node.js version compatibility', async () => {
      // Current Node.js version should be >= 16
      const action = doctorCommand.action;
      if (action) {
        await action.call(doctorCommand, {} as any);
      }

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ Node.js Version')
      );
    });

    it('should detect old Node.js version', async () => {
      // Mock old Node.js version
      Object.defineProperty(process, 'version', {
        value: 'v14.0.0',
        writable: true
      });

      const action = doctorCommand.action;
      if (action) {
        await action.call(doctorCommand, {} as any);
      }

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('❌ Node.js Version')
      );
    });

    it('should check ZCC_HOME environment variable', async () => {
      // Set ZCC_HOME
      process.env.ZCC_HOME = '/custom/zcc/home';
      
      // Mock directory exists
      jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.includes('/custom/zcc/home') || 
               pathStr.includes('package.json') ||
               pathStr.includes('.claude');
      });

      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        if (filePath.toString().includes('package.json')) {
          return JSON.stringify({ name: 'z-claude-code', version: '1.0.0' });
        }
        return '';
      });

      const action = doctorCommand.action;
      if (action) {
        await action.call(doctorCommand, {} as any);
      }

      // Should include ZCC_HOME in the output details
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringMatching(/ZCC_HOME.*custom/)
      );
    });

    it('should detect missing project initialization', async () => {
      // Mock no .zcc directory
      jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('/.zcc')) return false;
        if (pathStr.includes('package.json')) return true;
        return true;
      });

      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        if (filePath.toString().includes('package.json')) {
          return JSON.stringify({ name: 'z-claude-code', version: '1.0.0' });
        }
        return '';
      });

      const action = doctorCommand.action;
      if (action) {
        await action.call(doctorCommand, {} as any);
      }

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Project Configuration')
      );
    });

    it('should detect Claude Code integration', async () => {
      // Mock .claude directory and files exist
      jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.includes('.claude') || pathStr.includes('package.json');
      });

      jest.spyOn(fs, 'readdirSync').mockImplementation(() => {
        return ['mode.md', 'ticket.md'] as any;
      });

      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        if (filePath.toString().includes('package.json')) {
          return JSON.stringify({ name: 'z-claude-code', version: '1.0.0' });
        }
        return '';
      });

      const action = doctorCommand.action;
      if (action) {
        await action.call(doctorCommand, {} as any);
      }

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ Claude Code Integration')
      );
    });
  });

  describe('auto-fix functionality', () => {
    it('should attempt fixes when --fix flag is provided', async () => {
      // Mock missing global directory
      jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('/.zcc') && pathStr.includes('home')) return false;
        return pathStr.includes('package.json');
      });

      // Mock fs.mkdirSync
      const mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);

      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        if (filePath.toString().includes('package.json')) {
          return JSON.stringify({ name: 'z-claude-code', version: '1.0.0' });
        }
        return '';
      });

      const action = doctorCommand.action;
      if (action) {
        await action.call(doctorCommand, { fix: true } as any);
      }

      // Should attempt to create directories
      expect(mkdirSyncSpy).toHaveBeenCalled();
    });

    it('should report when fixes succeed', async () => {
      // Mock directory creation succeeds
      jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('/.zcc')) return false;
        return pathStr.includes('package.json');
      });

      jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        if (filePath.toString().includes('package.json')) {
          return JSON.stringify({ name: 'z-claude-code', version: '1.0.0' });
        }
        return '';
      });

      const action = doctorCommand.action;
      if (action) {
        await action.call(doctorCommand, { fix: true } as any);
      }

      // Should show fixing attempts
      const { logger } = require('../../lib/logger');
      expect(logger.info).toHaveBeenCalledWith('Attempting automatic fixes...');
    });
  });

  describe('edge cases', () => {
    it('should handle missing package.json gracefully', async () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      const action = doctorCommand.action;
      if (action) {
        await action.call(doctorCommand, {} as any);
      }

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('❌ ZCC Installation')
      );
    });

    it('should handle file system errors gracefully', async () => {
      jest.spyOn(fs, 'existsSync').mockImplementation(() => {
        throw new Error('File system error');
      });

      const action = doctorCommand.action;
      if (action) {
        await expect(action.call(doctorCommand, {} as any)).resolves.not.toThrow();
      }
    });

    it('should handle permission errors during fix attempts', async () => {
      jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
        return filePath.toString().includes('package.json');
      });

      jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {
        throw new Error('Permission denied');
      });

      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        if (filePath.toString().includes('package.json')) {
          return JSON.stringify({ name: 'z-claude-code', version: '1.0.0' });
        }
        return '';
      });

      const action = doctorCommand.action;
      if (action) {
        await expect(action.call(doctorCommand, { fix: true } as any)).resolves.not.toThrow();
      }

      const { logger } = require('../../lib/logger');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not automatically fix')
      );
    });
  });
});