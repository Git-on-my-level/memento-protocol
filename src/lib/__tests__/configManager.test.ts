import { ConfigManager } from '../configManager';
import { createTestFileSystem } from '../testing/createTestFileSystem';
import { MemoryFileSystemAdapter } from '../adapters/MemoryFileSystemAdapter';

describe('ConfigManager', () => {
  let fs: MemoryFileSystemAdapter;
  let configManager: ConfigManager;
  const originalEnv = process.env;
  const projectRoot = '/project';
  const globalRoot = '/home/user/.zcc';

  beforeEach(async () => {
    // Reset environment first
    process.env = { ...originalEnv };
    // Override home directory for tests BEFORE creating ConfigManager
    process.env.HOME = '/home/user';
    
    // Create test filesystem
    fs = await createTestFileSystem({
      // Create directory structure
      [`${projectRoot}/.zcc/.gitkeep`]: '',
      [`${globalRoot}/.gitkeep`]: ''
    });
    
    // Create test ConfigManager with memory filesystem
    configManager = new ConfigManager(projectRoot, fs);
  });

  afterEach(() => {
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
      const yaml = require('js-yaml');
      
      // Create global config
      const globalConfig = {
        defaultMode: 'architect',
        ui: {
          colorOutput: false
        }
      };
      fs.writeFileSync(
        `${globalRoot}/config.yaml`,
        yaml.dump(globalConfig)
      );

      // Create project config
      const projectConfig = {
        preferredWorkflows: ['refactor', 'test'],
        ui: {
          verboseLogging: true
        }
      };
      fs.writeFileSync(
        `${projectRoot}/.zcc/config.yaml`,
        yaml.dump(projectConfig)
      );

      const config = await configManager.load();
      
      expect(config.defaultMode).toBe('architect');
      expect(config.preferredWorkflows).toEqual(['refactor', 'test']);
      expect(config.ui?.colorOutput).toBe(false);
      expect(config.ui?.verboseLogging).toBe(true);
    });

    it('should apply environment variable overrides', async () => {
      process.env.ZCC_DEFAULT_MODE = 'engineer';
      process.env.ZCC_COLOR_OUTPUT = 'false';
      process.env.ZCC_VERBOSE = 'true';

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
      
      // Config is now saved as YAML
      const savedPath = `${projectRoot}/.zcc/config.yaml`;
      expect(fs.existsSync(savedPath)).toBe(true);
      
      // Load and verify the config was saved correctly
      const loadedConfig = await configManager.load();
      expect(loadedConfig.defaultMode).toBe('architect');
      expect(loadedConfig.preferredWorkflows).toEqual(['refactor']);
    });

    it('should save config to global level', async () => {
      const config = {
        ui: {
          colorOutput: false
        }
      };

      await configManager.save(config, true);
      
      // Global config is saved in the home directory  
      // Let's verify it was saved by checking if we can read it back
      const globalConfig = await configManager.list(true);
      expect(globalConfig.ui?.colorOutput).toBe(false);
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
      expect(globalOnly).toEqual({
        defaultMode: 'architect'
      });
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

      await expect(configManager.save(invalidConfig)).rejects.toThrow('Components.modes must be an array of strings');
    });

    it('should validate UI settings', async () => {
      const invalidConfig = {
        ui: {
          colorOutput: 'not-a-boolean',
          verboseLogging: 123
        }
      } as any;

      await expect(configManager.save(invalidConfig)).rejects.toThrow('UI.colorOutput must be a boolean');
    });
  });

  describe('ZCC_HOME support', () => {
    const originalEnv = process.env;
    
    afterEach(() => {
      process.env = originalEnv;
    });

    it('should use ZCC_HOME environment variable when set', async () => {
      // Set ZCC_HOME to a custom path
      const customHome = '/custom/zcc/path';
      process.env.ZCC_HOME = customHome;
      
      // Create new ConfigManager to pick up the environment variable
      const customConfigManager = new ConfigManager(projectRoot, fs);
      
      const globalRoot = customConfigManager.getGlobalRoot();
      expect(globalRoot).toBe(customHome);
    });

    it('should fallback to default ~/.zcc when ZCC_HOME is not set', async () => {
      // Ensure ZCC_HOME is not set
      delete process.env.ZCC_HOME;
      process.env.HOME = '/home/testuser';
      
      // Create new ConfigManager
      const defaultConfigManager = new ConfigManager(projectRoot, fs);
      
      const globalRoot = defaultConfigManager.getGlobalRoot();
      expect(globalRoot).toBe('/home/testuser/.zcc');
    });

    it('should use USERPROFILE on Windows when HOME is not available', async () => {
      // Simulate Windows environment
      delete process.env.ZCC_HOME;
      delete process.env.HOME;
      process.env.USERPROFILE = 'C:\\Users\\testuser';
      
      // Create new ConfigManager
      const windowsConfigManager = new ConfigManager(projectRoot, fs);
      
      const globalRoot = windowsConfigManager.getGlobalRoot();
      // Should use USERPROFILE and add .zcc suffix
      expect(globalRoot).toContain('C:\\Users\\testuser');
      expect(globalRoot).toContain('.zcc');
    });

    it('should fallback to /tmp when no home directory is available', async () => {
      // Remove all home directory environment variables
      delete process.env.ZCC_HOME;
      delete process.env.HOME;
      delete process.env.USERPROFILE;
      
      // Create new ConfigManager
      const fallbackConfigManager = new ConfigManager(projectRoot, fs);
      
      const globalRoot = fallbackConfigManager.getGlobalRoot();
      expect(globalRoot).toBe('/tmp/.zcc');
    });

    it('should create configuration paths using ZCC_HOME', async () => {
      const customHome = '/custom/zcc/path';
      process.env.ZCC_HOME = customHome;
      
      // Create new ConfigManager
      const customConfigManager = new ConfigManager(projectRoot, fs);
      
      const configPaths = customConfigManager.getConfigPaths();
      expect(configPaths.global).toBe('/custom/zcc/path/config.yaml');
      expect(configPaths.project).toBe('/project/.zcc/config.yaml');
    });

    it('should save and load global config using ZCC_HOME', async () => {
      const customHome = '/custom/zcc/home';
      process.env.ZCC_HOME = customHome;
      
      // Create filesystem structure for custom home
      await fs.writeFile(`${customHome}/.gitkeep`, '');
      
      // Create new ConfigManager
      const customConfigManager = new ConfigManager(projectRoot, fs);
      
      // Save global config
      const testConfig = { defaultMode: 'custom-mode' };
      await customConfigManager.save(testConfig, true);
      
      // Load and verify
      const loadedConfig = await customConfigManager.list(true);
      expect(loadedConfig.defaultMode).toBe('custom-mode');
      
      // Verify the file was created in the custom location
      const configPath = `${customHome}/config.yaml`;
      const configExists = fs.existsSync(configPath);
      expect(configExists).toBe(true);
    });
  });
});