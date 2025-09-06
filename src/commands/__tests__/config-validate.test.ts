import { configCommand } from '../config';
import { logger } from '../../lib/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Mock dependencies
jest.mock('../../lib/logger');

describe('config validate command', () => {
  let tempDir: string;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'zcc-test-'));
    
    // Create .zcc directory
    fs.mkdirSync(path.join(tempDir, '.zcc'), { recursive: true });
    
    // Mock process.exit
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('validate subcommand', () => {
    it('should validate a valid configuration', async () => {
      // Create valid config
      const validConfig = {
        defaultMode: 'engineer',
        preferredWorkflows: ['review'],
        ui: {
          colorOutput: true,
          verboseLogging: false
        }
      };
      
      const configPath = path.join(tempDir, '.zcc', 'config.yaml');
      fs.writeFileSync(configPath, yaml.dump(validConfig));
      
      // Change to temp directory
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      
      try {
        // Run validate command
        await configCommand.parseAsync(['node', 'zcc', 'config', 'validate']);
        
        expect(mockLogger.success).toHaveBeenCalledWith('Configuration is valid!');
        expect(process.exit).not.toHaveBeenCalled();
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should report validation errors for invalid configuration', async () => {
      // Create invalid config
      const invalidConfig = {
        defaultMode: 123, // Should be string
        preferredWorkflows: 'review', // Should be array
        ui: {
          colorOutput: 'yes', // Should be boolean
          verboseLogging: null // Should be boolean
        }
      };
      
      const configPath = path.join(tempDir, '.zcc', 'config.yaml');
      fs.writeFileSync(configPath, yaml.dump(invalidConfig));
      
      // Change to temp directory
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      
      try {
        // Run validate command
        await configCommand.parseAsync(['node', 'zcc', 'config', 'validate']);
        
        expect(mockLogger.error).toHaveBeenCalledWith('Configuration validation failed.');
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Validation errors:'));
        expect(process.exit).toHaveBeenCalledWith(1);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should fix invalid configuration with --fix flag', async () => {
      // Create invalid config
      const invalidConfig = {
        defaultMode: 123, // Will be fixed to 'engineer'
        preferredWorkflows: 'review', // Will be fixed to []
        ui: 'invalid' // Will be fixed to default object
      };
      
      const configPath = path.join(tempDir, '.zcc', 'config.yaml');
      fs.writeFileSync(configPath, yaml.dump(invalidConfig));
      
      // Change to temp directory
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      
      try {
        // Run validate command with --fix
        await configCommand.parseAsync(['node', 'zcc', 'config', 'validate', '--fix']);
        
        expect(mockLogger.info).toHaveBeenCalledWith('\nAttempting to fix validation issues...');
        expect(mockLogger.success).toHaveBeenCalledWith('Configuration issues have been fixed!');
        
        // Verify the config was actually fixed
        const fixedContent = fs.readFileSync(configPath, 'utf-8');
        const fixedConfig = yaml.load(fixedContent) as any;
        
        expect(fixedConfig.defaultMode).toBe('engineer');
        expect(Array.isArray(fixedConfig.preferredWorkflows)).toBe(true);
        expect(fixedConfig.ui).toEqual({
          colorOutput: true,
          verboseLogging: false
        });
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle missing configuration file', async () => {
      // Don't create any config file
      
      // Change to temp directory
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      
      try {
        // Run validate command
        await configCommand.parseAsync(['node', 'zcc', 'config', 'validate']);
        
        expect(mockLogger.error).toHaveBeenCalledWith('Configuration validation failed.');
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Configuration file not found'));
        expect(process.exit).toHaveBeenCalledWith(1);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should validate global configuration with --global flag', async () => {
      // Create global config directory
      const globalDir = path.join(require('os').homedir(), '.zcc');
      fs.mkdirSync(globalDir, { recursive: true });
      
      const globalConfig = {
        defaultMode: 'architect',
        preferredWorkflows: ['summarize']
      };
      
      const globalConfigPath = path.join(globalDir, 'config.yaml');
      fs.writeFileSync(globalConfigPath, yaml.dump(globalConfig));
      
      try {
        // Run validate command with --global
        await configCommand.parseAsync(['node', 'zcc', 'config', 'validate', '--global']);
        
        expect(mockLogger.success).toHaveBeenCalledWith('Configuration is valid!');
      } finally {
        // Clean up global config
        if (fs.existsSync(globalConfigPath)) {
          fs.unlinkSync(globalConfigPath);
        }
      }
    });

    it('should create default configuration with --fix when file is missing', async () => {
      // Don't create any config file
      
      // Change to temp directory
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      
      try {
        // Run validate command with --fix
        await configCommand.parseAsync(['node', 'zcc', 'config', 'validate', '--fix']);
        
        expect(mockLogger.info).toHaveBeenCalledWith('\nAttempting to fix validation issues...');
        expect(mockLogger.success).toHaveBeenCalledWith('Configuration issues have been fixed!');
        
        // Verify default config was created
        const configPath = path.join(tempDir, '.zcc', 'config.yaml');
        expect(fs.existsSync(configPath)).toBe(true);
        
        const createdContent = fs.readFileSync(configPath, 'utf-8');
        const createdConfig = yaml.load(createdContent) as any;
        
        expect(createdConfig.defaultMode).toBe('engineer');
        expect(createdConfig.preferredWorkflows).toEqual([]);
        expect(createdConfig.ui).toEqual({
          colorOutput: true,
          verboseLogging: false
        });
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});