import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { ConfigManager } from '../configManager';
import { ConfigMigrator } from '../ConfigMigrator';

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
      expect(savedConfig).toEqual({
        ...config,
        version: '1.0.0'
      });
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

  describe('RC file support', () => {
    let homeDir: string;
    let projectDir: string;

    beforeEach(() => {
      homeDir = path.join(tempDir, 'home');
      projectDir = path.join(tempDir, 'project');
      fs.mkdirSync(homeDir, { recursive: true });
      fs.mkdirSync(projectDir, { recursive: true });
      
      // Create a new ConfigManager with custom directories for testing
      configManager = new ConfigManager(projectDir);
      
      // Override paths for testing
      (configManager as any).globalConfigPath = path.join(homeDir, '.memento', 'config.json');
      (configManager as any).projectRoot = projectDir;
      
      // Create .memento directories
      fs.mkdirSync(path.join(homeDir, '.memento'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, '.memento'), { recursive: true });
    });

    describe('configuration hierarchy with RC files', () => {
      it('should load configuration with proper precedence: defaults → global RC → global JSON → project RC → project JSON → env', async () => {
        // Create configurations at each level
        const globalRCConfig = {
          version: ConfigMigrator.getCurrentVersion(),
          defaultMode: 'global-rc-mode',
          ui: { colorOutput: false, verboseLogging: true }
        };

        const globalJSONConfig = {
          version: ConfigMigrator.getCurrentVersion(),
          defaultMode: 'global-json-mode',
          preferredWorkflows: ['global-workflow'],
          ui: { verboseLogging: false }  // Should override RC setting
        };

        const projectRCConfig = {
          version: ConfigMigrator.getCurrentVersion(),
          defaultMode: 'project-rc-mode',  // Should override global settings
          customTemplateSources: ['project-rc-source']
        };

        const projectJSONConfig = {
          version: ConfigMigrator.getCurrentVersion(),
          components: { modes: ['final-mode'] }  // Should be in final config
        };

        // Write RC files
        fs.writeFileSync(
          path.join(homeDir, '.mementorc'),
          yaml.dump(globalRCConfig)
        );
        fs.writeFileSync(
          path.join(projectDir, '.mementorc.yaml'),
          yaml.dump(projectRCConfig)
        );

        // Write JSON files
        fs.writeFileSync(
          path.join(homeDir, '.memento', 'config.json'),
          JSON.stringify(globalJSONConfig, null, 2)
        );
        fs.writeFileSync(
          path.join(projectDir, '.memento', 'config.json'),
          JSON.stringify(projectJSONConfig, null, 2)
        );

        // Set environment variables
        process.env.MEMENTO_DEFAULT_MODE = 'env-override-mode';

        const config = await configManager.load();

        // Verify precedence
        expect(config.defaultMode).toBe('env-override-mode'); // Env should win
        expect(config.ui?.colorOutput).toBe(false); // From global RC
        expect(config.ui?.verboseLogging).toBe(false); // Global JSON overrides global RC
        expect(config.preferredWorkflows).toEqual(['global-workflow']); // From global JSON
        expect(config.customTemplateSources).toEqual(['project-rc-source']); // From project RC
        expect(config.components?.modes).toEqual(['final-mode']); // From project JSON

        // Clean up env vars
        delete process.env.MEMENTO_DEFAULT_MODE;
      });

      it('should handle missing RC files gracefully', async () => {
        // Only create JSON configs
        const globalConfig = { defaultMode: 'json-only' };
        fs.writeFileSync(
          path.join(homeDir, '.memento', 'config.json'),
          JSON.stringify(globalConfig)
        );

        const config = await configManager.load();
        expect(config.defaultMode).toBe('json-only');
        expect(config.ui?.colorOutput).toBe(true); // Default should remain
      });

      it('should prefer earlier RC file formats when multiple exist', async () => {
        // Create multiple RC files in home directory
        fs.writeFileSync(
          path.join(homeDir, '.mementorc'),
          'defaultMode: yaml-no-extension'
        );
        fs.writeFileSync(
          path.join(homeDir, '.mementorc.yaml'),
          'defaultMode: yaml-with-extension'
        );
        fs.writeFileSync(
          path.join(homeDir, '.mementorc.json'),
          JSON.stringify({ defaultMode: 'json-extension' })
        );

        const config = await configManager.load();
        expect(config.defaultMode).toBe('yaml-no-extension'); // .mementorc should win
      });

      it('should skip invalid RC files and continue with valid ones', async () => {
        // Create invalid global RC file
        fs.writeFileSync(path.join(homeDir, '.mementorc'), 'invalid: yaml: [');
        
        // Create valid project RC file
        fs.writeFileSync(
          path.join(projectDir, '.mementorc'),
          'defaultMode: valid-project-mode'
        );

        const config = await configManager.load();
        expect(config.defaultMode).toBe('valid-project-mode');
      });

      it('should handle complex nested configurations from YAML', async () => {
        const complexConfig = {
          version: ConfigMigrator.getCurrentVersion(),
          defaultMode: 'complex-engineer',
          preferredWorkflows: ['review', 'summarize'],
          customTemplateSources: ['https://example.com/templates'],
          integrations: {
            git: {
              autoCommit: false,
              signCommits: true
            },
            slack: {
              webhook: 'https://hooks.slack.com/test',
              channel: '#dev'
            }
          },
          ui: {
            colorOutput: true,
            verboseLogging: false
          },
          components: {
            modes: ['engineer', 'architect'],
            workflows: ['review', 'summarize']
          }
        };

        fs.writeFileSync(
          path.join(homeDir, '.mementorc'),
          yaml.dump(complexConfig)
        );

        const config = await configManager.load();
        
        expect(config.defaultMode).toBe('complex-engineer');
        expect(config.preferredWorkflows).toEqual(['review', 'summarize']);
        expect(config.integrations?.git?.autoCommit).toBe(false);
        expect(config.integrations?.slack?.channel).toBe('#dev');
        expect(config.components?.modes).toEqual(['engineer', 'architect']);
      });
    });

    describe('getRCFileStatus', () => {
      it('should return status of RC files', () => {
        // Create some RC files
        fs.writeFileSync(path.join(homeDir, '.mementorc'), 'test: true');
        fs.writeFileSync(path.join(projectDir, '.mementorc.json'), '{}');

        const status = configManager.getRCFileStatus();

        expect(status.global).toHaveLength(4);
        expect(status.project).toHaveLength(4);
        
        // Check that existing files are detected
        expect(status.global.find(rc => rc.path.endsWith('.mementorc'))?.exists).toBe(true);
        expect(status.global.find(rc => rc.path.endsWith('.mementorc.yaml'))?.exists).toBe(false);
        expect(status.project.find(rc => rc.path.endsWith('.mementorc.json'))?.exists).toBe(true);
      });
    });

    describe('validateRCFile', () => {
      it('should validate YAML RC files', async () => {
        const validConfig = {
          version: ConfigMigrator.getCurrentVersion(),
          defaultMode: 'engineer',
          ui: { colorOutput: true }
        };

        const filePath = path.join(homeDir, '.mementorc');
        fs.writeFileSync(filePath, yaml.dump(validConfig));

        const result = await configManager.validateRCFile(filePath);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.format).toBe('yaml');
      });

      it('should validate JSON RC files', async () => {
        const validConfig = {
          version: ConfigMigrator.getCurrentVersion(),
          defaultMode: 'architect',
          ui: { verboseLogging: false }
        };

        const filePath = path.join(homeDir, '.mementorc.json');
        fs.writeFileSync(filePath, JSON.stringify(validConfig));

        const result = await configManager.validateRCFile(filePath);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.format).toBe('json');
      });

      it('should return errors for invalid configurations', async () => {
        const invalidConfig = {
          defaultMode: 123,
          ui: { colorOutput: 'not-boolean' }
        };

        const filePath = path.join(homeDir, '.mementorc');
        fs.writeFileSync(filePath, yaml.dump(invalidConfig));

        const result = await configManager.validateRCFile(filePath);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('generateSampleRC', () => {
      it('should generate valid YAML sample', () => {
        const yamlSample = configManager.generateSampleRC('yaml');
        expect(yamlSample).toContain('version:');
        expect(yamlSample).toContain('defaultMode:');
        
        // Should be parseable
        const parsed = yaml.load(yamlSample);
        expect(parsed).toBeInstanceOf(Object);
      });

      it('should generate valid JSON sample', () => {
        const jsonSample = configManager.generateSampleRC('json');
        expect(jsonSample).toContain('"version"');
        expect(jsonSample).toContain('"defaultMode"');
        
        // Should be parseable
        const parsed = JSON.parse(jsonSample);
        expect(parsed).toBeInstanceOf(Object);
      });
    });

    describe('getConfigurationHierarchy', () => {
      it('should provide detailed configuration hierarchy for debugging', async () => {
        // Create configurations at multiple levels
        const globalRCConfig = {
          version: ConfigMigrator.getCurrentVersion(),
          defaultMode: 'global-rc'
        };

        const projectJSONConfig = {
          version: ConfigMigrator.getCurrentVersion(),
          ui: { colorOutput: false }
        };

        fs.writeFileSync(
          path.join(homeDir, '.mementorc'),
          yaml.dump(globalRCConfig)
        );
        fs.writeFileSync(
          path.join(projectDir, '.memento', 'config.json'),
          JSON.stringify(projectJSONConfig)
        );

        process.env.MEMENTO_VERBOSE = 'true';

        const hierarchy = await configManager.getConfigurationHierarchy();

        expect(hierarchy.defaults).toBeDefined();
        expect(hierarchy.globalRC).toBeDefined();
        expect(hierarchy.globalRC?.config.defaultMode).toBe('global-rc');
        expect(hierarchy.projectJSON).toBeDefined();
        expect(hierarchy.projectJSON?.config.ui?.colorOutput).toBe(false);
        expect(hierarchy.envOverrides['ui.verboseLogging']).toBe(true);
        expect(hierarchy.final).toBeDefined();

        delete process.env.MEMENTO_VERBOSE;
      });

      it('should handle empty hierarchy gracefully', async () => {
        const hierarchy = await configManager.getConfigurationHierarchy();

        expect(hierarchy.defaults).toBeDefined();
        expect(hierarchy.globalRC).toBeUndefined();
        expect(hierarchy.projectRC).toBeUndefined();
        expect(hierarchy.final).toBeDefined();
        expect(Object.keys(hierarchy.envOverrides)).toHaveLength(0);
      });
    });

    describe('backward compatibility', () => {
      it('should maintain compatibility with existing JSON configs when RC files are present', async () => {
        // Create both old JSON and new RC configs
        const jsonConfig = {
          version: ConfigMigrator.getCurrentVersion(),
          defaultMode: 'json-mode',
          ui: { colorOutput: false }
        };

        const rcConfig = {
          version: ConfigMigrator.getCurrentVersion(),
          preferredWorkflows: ['rc-workflow'],
          ui: { verboseLogging: true }
        };

        fs.writeFileSync(
          path.join(homeDir, '.memento', 'config.json'),
          JSON.stringify(jsonConfig)
        );
        fs.writeFileSync(
          path.join(homeDir, '.mementorc'),
          yaml.dump(rcConfig)
        );

        const config = await configManager.load();

        // RC should take precedence over JSON for same-level configs
        expect(config.preferredWorkflows).toEqual(['rc-workflow']);
        expect(config.ui?.verboseLogging).toBe(true); // From RC
        
        // JSON should override RC when it comes after in hierarchy
        expect(config.defaultMode).toBe('json-mode'); // JSON overrides RC
        expect(config.ui?.colorOutput).toBe(false); // JSON overrides RC
      });

      it('should not break existing workflows when RC files have syntax errors', async () => {
        // Create valid JSON config
        const jsonConfig = {
          version: ConfigMigrator.getCurrentVersion(),
          defaultMode: 'fallback-mode'
        };

        // Create invalid RC file
        fs.writeFileSync(path.join(homeDir, '.mementorc'), 'invalid: yaml: [');
        fs.writeFileSync(
          path.join(homeDir, '.memento', 'config.json'),
          JSON.stringify(jsonConfig)
        );

        const config = await configManager.load();
        expect(config.defaultMode).toBe('fallback-mode');
      });
    });
  });
});