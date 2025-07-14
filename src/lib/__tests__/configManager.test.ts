import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager } from '../configManager';

describe('ConfigManager', () => {
  let tempDir: string;
  let configManager: ConfigManager;
  const originalEnv = process.env;

  beforeEach(() => {
    // Create temporary directory
    tempDir = path.join(os.tmpdir(), 'memento-config-test-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.memento'), { recursive: true });
    
    // Create ConfigManager with mocked path
    configManager = new ConfigManager(tempDir);
    // Override the global config path to use temp directory
    (configManager as any).globalConfigPath = path.join(tempDir, '.memento', 'config.json');
    
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    // Restore environment
    process.env = originalEnv;
  });

  describe('load', () => {
    it('should return default config when no files exist', async () => {
      const config = await configManager.load();
      
      expect(config).toEqual({
        ui: {
          colorOutput: true,
          verboseLogging: false
        }
      });
    });

    it('should merge global and project configs', async () => {
      // Create a separate global config directory
      const globalDir = path.join(tempDir, 'global');
      fs.mkdirSync(globalDir, { recursive: true });
      fs.mkdirSync(path.join(globalDir, '.memento'), { recursive: true });
      
      // Create global config
      const globalConfig = {
        defaultMode: 'architect',
        ui: {
          colorOutput: false
        }
      };
      fs.writeFileSync(
        path.join(globalDir, '.memento', 'config.json'),
        JSON.stringify(globalConfig)
      );

      // Create project config
      const projectConfig = {
        preferredWorkflows: ['refactor', 'test'],
        ui: {
          verboseLogging: true
        }
      };
      fs.writeFileSync(
        path.join(tempDir, '.memento', 'config.json'),
        JSON.stringify(projectConfig)
      );

      // Override global path for this test
      (configManager as any).globalConfigPath = path.join(globalDir, '.memento', 'config.json');

      const config = await configManager.load();
      
      expect(config.defaultMode).toBe('architect');
      expect(config.preferredWorkflows).toEqual(['refactor', 'test']);
      expect(config.ui?.colorOutput).toBe(false);
      expect(config.ui?.verboseLogging).toBe(true);
    });

    it('should apply environment variable overrides', async () => {
      process.env.MEMENTO_DEFAULT_MODE = 'engineer';
      process.env.MEMENTO_COLOR_OUTPUT = 'false';
      process.env.MEMENTO_VERBOSE = 'true';

      const config = await configManager.load();
      
      expect(config.defaultMode).toBe('engineer');
      expect(config.ui?.colorOutput).toBe(false);
      expect(config.ui?.verboseLogging).toBe(true);
    });
  });

  describe('save', () => {
    it('should save config to project level', async () => {
      const config = {
        defaultMode: 'architect',
        preferredWorkflows: ['refactor']
      };

      await configManager.save(config);
      
      const savedPath = path.join(tempDir, '.memento', 'config.json');
      expect(fs.existsSync(savedPath)).toBe(true);
      
      const savedConfig = JSON.parse(fs.readFileSync(savedPath, 'utf-8'));
      expect(savedConfig).toEqual(config);
    });

    it('should save config to global level', async () => {
      const config = {
        ui: {
          colorOutput: false
        }
      };

      await configManager.save(config, true);
      
      const savedPath = path.join(tempDir, '.memento', 'config.json');
      expect(fs.existsSync(savedPath)).toBe(true);
    });

    it('should validate config before saving', async () => {
      const invalidConfig = {
        defaultMode: 123, // Should be string
        preferredWorkflows: 'not-an-array' // Should be array
      } as any;

      await expect(configManager.save(invalidConfig)).rejects.toThrow();
    });
  });

  describe('get/set', () => {
    it('should get nested values using dot notation', async () => {
      const config = {
        ui: {
          colorOutput: false,
          verboseLogging: true
        },
        integrations: {
          github: {
            token: 'secret'
          }
        }
      };
      await configManager.save(config);

      expect(await configManager.get('ui.colorOutput')).toBe(false);
      expect(await configManager.get('integrations.github.token')).toBe('secret');
      expect(await configManager.get('nonexistent')).toBeUndefined();
    });

    it('should set nested values using dot notation', async () => {
      await configManager.set('ui.colorOutput', false);
      await configManager.set('integrations.github.token', 'new-secret');

      const config = await configManager.load();
      expect(config.ui?.colorOutput).toBe(false);
      expect(config.integrations?.github?.token).toBe('new-secret');
    });

    it('should parse JSON values when setting', async () => {
      await configManager.set('preferredWorkflows', ['refactor', 'test']);
      
      const value = await configManager.get('preferredWorkflows');
      expect(value).toEqual(['refactor', 'test']);
    });
  });

  describe('unset', () => {
    it('should remove configuration keys', async () => {
      const config = {
        defaultMode: 'architect',
        ui: {
          colorOutput: false,
          verboseLogging: true
        }
      };
      await configManager.save(config);

      await configManager.unset('defaultMode');
      await configManager.unset('ui.colorOutput');

      const updatedConfig = await configManager.load();
      expect(updatedConfig.defaultMode).toBeUndefined();
      expect(updatedConfig.ui?.colorOutput).toBe(true); // Back to default
      expect(updatedConfig.ui?.verboseLogging).toBe(true);
    });

    it('should handle non-existent keys gracefully', async () => {
      await expect(configManager.unset('nonexistent.key')).resolves.not.toThrow();
    });
  });

  describe('list', () => {
    it('should list all configuration with hierarchy', async () => {
      // Create a separate global config directory
      const globalDir = path.join(tempDir, 'global');
      fs.mkdirSync(globalDir, { recursive: true });
      fs.mkdirSync(path.join(globalDir, '.memento'), { recursive: true });
      
      // Override global path for this test
      (configManager as any).globalConfigPath = path.join(globalDir, '.memento', 'config.json');
      
      // Set global config
      await configManager.save({ defaultMode: 'architect' }, true);
      
      // Set project config
      await configManager.save({ preferredWorkflows: ['refactor'] }, false);

      const allConfig = await configManager.list();
      expect(allConfig.defaultMode).toBe('architect');
      expect(allConfig.preferredWorkflows).toEqual(['refactor']);
      expect(allConfig.ui?.colorOutput).toBe(true);
      expect(allConfig.ui?.verboseLogging).toBe(false);

      const globalOnly = await configManager.list(true);
      expect(globalOnly).toEqual({ defaultMode: 'architect' });
    });
  });

  describe('validation', () => {
    it('should validate component arrays', async () => {
      const invalidConfig = {
        components: {
          modes: 'not-an-array',
          workflows: ['valid'],
          languages: {}
        }
      } as any;

      await expect(configManager.save(invalidConfig)).rejects.toThrow('components.modes must be an array');
    });

    it('should validate UI settings', async () => {
      const invalidConfig = {
        ui: {
          colorOutput: 'not-a-boolean',
          verboseLogging: 123
        }
      } as any;

      await expect(configManager.save(invalidConfig)).rejects.toThrow('ui.colorOutput must be a boolean');
    });
  });
});