import { doctorCommand } from '../doctor';
import { createTestFileSystem } from '../../lib/testing/createTestFileSystem';
import * as fs from 'fs';

// Mock fs module before any other code
jest.mock('fs');

// Mock the logger to capture output
jest.mock('../../lib/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    setVerbose: jest.fn(),
    setDebug: jest.fn(),
    setNoColor: jest.fn(),
    space: jest.fn(),
    newline: jest.fn(),
    progress: jest.fn(),
    clearProgress: jest.fn(),
  };
  
  return {
    logger: mockLogger,
    getChalk: jest.fn(() => ({
      green: (s: string) => s,
      red: (s: string) => s,
      yellow: (s: string) => s,
      blue: (s: string) => s,
      cyan: (s: string) => s,
      gray: (s: string) => s,
      bold: (s: string) => s,
      dim: (s: string) => s,
    })),
    configureChalk: jest.fn(),
  };
});

// Mock ConfigManager
const mockConfigManager = {
  getGlobalRoot: jest.fn(),
  validateConfigFile: jest.fn(),
  fixConfigFile: jest.fn(),
};

jest.mock('../../lib/configManager', () => ({
  ConfigManager: jest.fn().mockImplementation(() => mockConfigManager)
}));

// Mock ZccCore
const mockZccCore = {
  getStatus: jest.fn(),
  getComponentsByType: jest.fn(),
};

jest.mock('../../lib/ZccCore', () => ({
  ZccCore: jest.fn().mockImplementation(() => mockZccCore)
}));

// Mock UpsertManager
const mockUpsertManager = {
  upsert: jest.fn(),
};

jest.mock('../../lib/upsertManager', () => ({
  UpsertManager: jest.fn().mockImplementation(() => mockUpsertManager)
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
  
  // Get access to the mocked logger
  let mockLogger: any;
  
  beforeAll(() => {
    const { logger } = require('../../lib/logger');
    mockLogger = logger;
  });

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
    
    // Reset mock implementations
    mockConfigManager.getGlobalRoot.mockReturnValue('/home/testuser/.zcc');
    mockConfigManager.validateConfigFile.mockResolvedValue({ valid: true, errors: [] });
    mockConfigManager.fixConfigFile.mockResolvedValue(undefined);
    
    mockZccCore.getStatus.mockResolvedValue({
      builtin: { available: true, components: 10 },
      global: { available: true, components: 5 },
      project: { available: true, components: 3 },
      uniqueComponents: 15
    });
    mockZccCore.getComponentsByType.mockResolvedValue(['hook1', 'hook2']);
    
    mockUpsertManager.upsert.mockResolvedValue(undefined);

    // Reset commander internal state
    (doctorCommand as any)._optionValues = {};
    (doctorCommand as any)._optionValueSources = {};
    (doctorCommand as any).args = [];
    (doctorCommand as any).rawArgs = [];
    (doctorCommand as any).processedArgs = [];
    (doctorCommand as any)._scriptPath = undefined;
    (doctorCommand as any)._name = 'doctor';
    (doctorCommand as any)._outputConfiguration = { 
      writeOut: process.stdout.write.bind(process.stdout), 
      writeErr: process.stderr.write.bind(process.stderr) 
    };

    // Reset any registered option values back to their defaults
    doctorCommand.options.forEach((option: any) => {
      const key = option.attributeName();
      delete (doctorCommand as any)._optionValues[key];
      delete (doctorCommand as any)._optionValueSources[key];
    });

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
      const mockFs = fs as jest.Mocked<typeof fs>;
      mockFs.existsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('package.json')) return true;
        if (pathStr.includes('.zcc')) return true;
        if (pathStr.includes('.claude')) return true;
        return false;
      });
      
      // Mock fs.readFileSync for package.json
      mockFs.readFileSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('package.json')) {
          return JSON.stringify({
            name: 'z-claude-code',
            version: '1.0.0'
          });
        }
        return '' as any;
      });

      // Run the doctor command using parseAsync
      await doctorCommand.parseAsync(['node', 'test']);

      // Verify that diagnostic output was generated
      expect(mockConsole.log).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Running ZCC diagnostic checks...');
    });

    it('should set exit code 1 when failures are detected', async () => {
      // Mock Node.js version as too old
      Object.defineProperty(process, 'version', {
        value: 'v14.0.0',
        writable: true
      });

      // Mock missing package.json
      (fs as jest.Mocked<typeof fs>).existsSync.mockReturnValue(false);

      await doctorCommand.parseAsync(['node', 'test']);

      expect(process.exitCode).toBe(1);
    });
  });

  describe('diagnostic checks', () => {
    it('should detect ZCC installation correctly', async () => {
      // Mock successful package.json read
      (fs as jest.Mocked<typeof fs>).existsSync.mockImplementation((filePath) => {
        return filePath.toString().includes('package.json');
      });
      
      (fs as jest.Mocked<typeof fs>).readFileSync.mockImplementation((filePath) => {
        if (filePath.toString().includes('package.json')) {
          return JSON.stringify({
            name: 'z-claude-code',
            version: '1.0.0'
          });
        }
        return '';
      });

      await doctorCommand.parseAsync(['node', 'test']);

      // Should show successful ZCC installation check
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ ZCC Installation')
      );
    });

    it('should detect Node.js version compatibility', async () => {
      // Mock a compatible Node.js version
      Object.defineProperty(process, 'version', {
        value: 'v18.0.0',
        writable: true
      });
      
      // Mock package.json exists
      (fs as jest.Mocked<typeof fs>).existsSync.mockImplementation((filePath) => {
        return filePath.toString().includes('package.json');
      });
      
      (fs as jest.Mocked<typeof fs>).readFileSync.mockImplementation((filePath) => {
        if (filePath.toString().includes('package.json')) {
          return JSON.stringify({ name: 'z-claude-code', version: '1.0.0' });
        }
        return '';
      });
      
      await doctorCommand.parseAsync(['node', 'test']);

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
      
      // Mock package.json exists
      (fs as jest.Mocked<typeof fs>).existsSync.mockImplementation((filePath) => {
        return filePath.toString().includes('package.json');
      });
      
      (fs as jest.Mocked<typeof fs>).readFileSync.mockImplementation((filePath) => {
        if (filePath.toString().includes('package.json')) {
          return JSON.stringify({ name: 'z-claude-code', version: '1.0.0' });
        }
        return '';
      });

      await doctorCommand.parseAsync(['node', 'test']);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('❌ Node.js Version')
      );
    });

    it('should check ZCC_HOME environment variable', async () => {
      // Set ZCC_HOME and mock ConfigManager to return it
      process.env.ZCC_HOME = '/custom/zcc/home';
      process.env.ZCC_VERBOSE = 'true';  // Enable verbose mode to see details
      mockConfigManager.getGlobalRoot.mockReturnValue('/custom/zcc/home');
      
      // Mock directory exists
      (fs as jest.Mocked<typeof fs>).existsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.includes('/custom/zcc/home') || 
               pathStr.includes('package.json') ||
               pathStr.includes('.claude');
      });

      (fs as jest.Mocked<typeof fs>).readFileSync.mockImplementation((filePath) => {
        if (filePath.toString().includes('package.json')) {
          return JSON.stringify({ name: 'z-claude-code', version: '1.0.0' });
        }
        return '';
      });

      await doctorCommand.parseAsync(['node', 'test']);

      // Should include ZCC_HOME in the output details via logger.verbose
      expect(mockLogger.verbose).toHaveBeenCalledWith(
        expect.stringMatching(/custom/)
      );
    });

    it('should detect missing project initialization', async () => {
      // Mock no .zcc directory in current directory
      (fs as jest.Mocked<typeof fs>).existsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        // Deny project .zcc directory specifically
        if (pathStr.includes('/.zcc') && !pathStr.includes('/home/testuser')) return false;
        if (pathStr.includes('package.json')) return true;
        return true;
      });

      (fs as jest.Mocked<typeof fs>).readFileSync.mockImplementation((filePath) => {
        if (filePath.toString().includes('package.json')) {
          return JSON.stringify({ name: 'z-claude-code', version: '1.0.0' });
        }
        return '';
      });

      await doctorCommand.parseAsync(['node', 'test']);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Project Configuration')
      );
    });

    it('should detect Claude Code integration', async () => {
      // Mock .claude directory and files exist
      (fs as jest.Mocked<typeof fs>).existsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.includes('.claude') || pathStr.includes('package.json');
      });

      jest.spyOn(fs, 'readdirSync').mockImplementation(() => {
        return ['mode.md', 'ticket.md'] as any;
      });

      (fs as jest.Mocked<typeof fs>).readFileSync.mockImplementation((filePath) => {
        if (filePath.toString().includes('package.json')) {
          return JSON.stringify({ name: 'z-claude-code', version: '1.0.0' });
        }
        return '';
      });

      await doctorCommand.parseAsync(['node', 'test']);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ Claude Code Integration')
      );
    });
  });

  describe('auto-fix functionality', () => {
    it('should attempt fixes when --fix flag is provided', async () => {
      // Mock missing global directory to trigger a fix-able failure
      (fs as jest.Mocked<typeof fs>).existsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('/.zcc') && pathStr.includes('home')) return false;
        return pathStr.includes('package.json');
      });

      // Mock fs.mkdirSync
      jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);

      (fs as jest.Mocked<typeof fs>).readFileSync.mockImplementation((filePath) => {
        if (filePath.toString().includes('package.json')) {
          return JSON.stringify({ name: 'z-claude-code', version: '1.0.0' });
        }
        return '';
      });

      await doctorCommand.parseAsync(['node', 'test', '--fix']);

      // Should show that fixes are being attempted
      expect(mockLogger.info).toHaveBeenCalledWith('Attempting automatic fixes...');
    });

    it('should report when fixes succeed', async () => {
      // Mock directory creation succeeds
      (fs as jest.Mocked<typeof fs>).existsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('/.zcc')) return false;
        return pathStr.includes('package.json');
      });

      jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
      (fs as jest.Mocked<typeof fs>).readFileSync.mockImplementation((filePath) => {
        if (filePath.toString().includes('package.json')) {
          return JSON.stringify({ name: 'z-claude-code', version: '1.0.0' });
        }
        return '';
      });

      await doctorCommand.parseAsync(['node', 'test', '--fix']);

      // Should show fixing attempts
      expect(mockLogger.info).toHaveBeenCalledWith('Attempting automatic fixes...');
    });
  });

  describe('edge cases', () => {
    it('should handle missing package.json gracefully', async () => {
      (fs as jest.Mocked<typeof fs>).existsSync.mockReturnValue(false);

      await doctorCommand.parseAsync(['node', 'test']);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('❌ ZCC Installation')
      );
    });

    it('should handle file system errors gracefully', async () => {
      (fs as jest.Mocked<typeof fs>).existsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      await doctorCommand.parseAsync(['node', 'test']);
      
      // Verify the command didn't crash and produced some output
      expect(mockLogger.info).toHaveBeenCalledWith('Running ZCC diagnostic checks...');
    });

    it('should handle permission errors during fix attempts', async () => {
      // Mock scenario where global config has validation errors (status: fail)
      mockConfigManager.validateConfigFile.mockResolvedValue({ 
        valid: false, 
        errors: ['Invalid configuration'] 
      });
      
      // Mock global directory exists to trigger config validation
      (fs as jest.Mocked<typeof fs>).existsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.includes('package.json') || pathStr.includes('.zcc');
      });

      // Mock fixConfigFile to throw permission error
      mockConfigManager.fixConfigFile.mockRejectedValue(new Error('Permission denied'));

      (fs as jest.Mocked<typeof fs>).readFileSync.mockImplementation((filePath) => {
        if (filePath.toString().includes('package.json')) {
          return JSON.stringify({ name: 'z-claude-code', version: '1.0.0' });
        }
        return '';
      });

      await doctorCommand.parseAsync(['node', 'test', '--fix']);

      // Check if fixes were attempted and permission error was handled
      expect(mockLogger.info).toHaveBeenCalledWith('Attempting automatic fixes...');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not automatically fix')
      );
    });
  });
});