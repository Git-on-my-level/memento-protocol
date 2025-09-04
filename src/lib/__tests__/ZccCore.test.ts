import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { ZccCore } from '../ZccCore';
import { ZccScope } from '../ZccScope';
import { MementoConfig } from '../configSchema';

describe('ZccCore', () => {
  let tempDir: string;
  let globalDir: string;
  let projectDir: string;
  let mementoCore: ZccCore;

  // Create a test-friendly version of ZccCore
  class TestZccCore extends ZccCore {
    constructor(projectRoot: string, globalPath: string) {
      super(projectRoot);
      // Replace the global scope with our test path
      (this as any).globalScope = new ZccScope(globalPath, true);
      // Mock the built-in component provider to return empty results during testing
      (this as any).builtinProvider = {
        isAvailable: () => false,
        getComponents: async () => [],
        getComponent: async () => null,
        getComponentsByType: async () => [],
        clearCache: () => {},
        getTemplatesPath: () => ''
      };
    }
  }

  beforeEach(() => {
    // Create temporary directories
    tempDir = path.join(os.tmpdir(), 'memento-core-test-' + Date.now());
    globalDir = path.join(tempDir, 'global', '.zcc');
    projectDir = path.join(tempDir, 'project', '.zcc');
    
    fs.mkdirSync(globalDir, { recursive: true });
    fs.mkdirSync(projectDir, { recursive: true });

    mementoCore = new TestZccCore(
      path.join(tempDir, 'project'),
      globalDir
    );
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('getConfig()', () => {
    it('should return default configuration when no configs exist', async () => {
      const config = await mementoCore.getConfig();
      
      expect(config).toEqual({
        ui: {
          colorOutput: true,
          verboseLogging: false
        }
      });
    });

    it('should merge global and project configurations with project taking precedence', async () => {
      // Create global config
      const globalConfig: MementoConfig = {
        defaultMode: 'architect',
        ui: {
          colorOutput: false,
          verboseLogging: false
        },
        integrations: {
          github: { token: 'global' }
        }
      };
      fs.writeFileSync(
        path.join(globalDir, 'config.yaml'),
        yaml.dump(globalConfig)
      );

      // Create project config
      const projectConfig: MementoConfig = {
        preferredWorkflows: ['review'],
        ui: {
          verboseLogging: true
        },
        integrations: {
          github: { token: 'project' },
          slack: { webhook: 'url' }
        }
      };
      fs.writeFileSync(
        path.join(projectDir, 'config.yaml'),
        yaml.dump(projectConfig)
      );

      const config = await mementoCore.getConfig();
      
      // Project values should take precedence
      expect(config.defaultMode).toBe('architect'); // From global
      expect(config.preferredWorkflows).toEqual(['review']); // From project
      expect(config.ui?.colorOutput).toBe(false); // From global
      expect(config.ui?.verboseLogging).toBe(true); // From project (overrides global)
      expect(config.integrations?.github?.token).toBe('project'); // Project overrides global
      expect(config.integrations?.slack?.webhook).toBe('url'); // From project only
    });

    it('should apply environment variable overrides', async () => {
      process.env.ZCC_DEFAULT_MODE = 'env-mode';
      process.env.ZCC_COLOR_OUTPUT = 'false';
      process.env.ZCC_VERBOSE = 'true';

      const config = await mementoCore.getConfig();
      
      expect(config.defaultMode).toBe('env-mode');
      expect(config.ui?.colorOutput).toBe(false);
      expect(config.ui?.verboseLogging).toBe(true);

      delete process.env.ZCC_DEFAULT_MODE;
      delete process.env.ZCC_COLOR_OUTPUT;
      delete process.env.ZCC_VERBOSE;
    });

    it('should cache merged configuration', async () => {
      const config1 = await mementoCore.getConfig();
      
      // Modify project config
      const newConfig: MementoConfig = { defaultMode: 'different' };
      fs.writeFileSync(
        path.join(projectDir, 'config.yaml'),
        yaml.dump(newConfig)
      );
      
      // Should return cached version
      const config2 = await mementoCore.getConfig();
      expect(config2).toEqual(config1);
    });

    it('should clear cache after saving configuration', async () => {
      const config1 = await mementoCore.getConfig();
      expect(config1.defaultMode).toBeUndefined();

      await mementoCore.saveConfig({ defaultMode: 'architect' }, false);
      
      const config2 = await mementoCore.getConfig();
      expect(config2.defaultMode).toBe('architect');
    });
  });

  describe('component management', () => {
    beforeEach(async () => {
      // Set up global components
      fs.mkdirSync(path.join(globalDir, 'modes'), { recursive: true });
      fs.mkdirSync(path.join(globalDir, 'workflows'), { recursive: true });
      
      fs.writeFileSync(
        path.join(globalDir, 'modes', 'architect.md'),
        '---\nsource: global\n---\n# Global Architect'
      );
      fs.writeFileSync(
        path.join(globalDir, 'workflows', 'global-workflow.md'),
        '# Global Workflow'
      );

      // Set up project components
      fs.mkdirSync(path.join(projectDir, 'modes'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'workflows'), { recursive: true });
      
      fs.writeFileSync(
        path.join(projectDir, 'modes', 'architect.md'),
        '---\nsource: project\n---\n# Project Architect'
      );
      fs.writeFileSync(
        path.join(projectDir, 'workflows', 'project-workflow.md'),
        '# Project Workflow'
      );
    });

    describe('getComponent()', () => {
      it('should find project component when both exist', async () => {
        const component = await mementoCore.getComponent('architect', 'mode');
        
        expect(component).toBeDefined();
        expect(component?.metadata?.source).toBe('project');
        expect(component?.path).toBe(path.join(projectDir, 'modes', 'architect.md'));
      });

      it('should fall back to global component when project does not exist', async () => {
        const component = await mementoCore.getComponent('global-workflow', 'workflow');
        
        expect(component).toBeDefined();
        expect(component?.path).toBe(path.join(globalDir, 'workflows', 'global-workflow.md'));
      });

      it('should return null when component does not exist in either scope', async () => {
        const component = await mementoCore.getComponent('nonexistent', 'mode');
        expect(component).toBeNull();
      });
    });

    describe('getComponentsByType()', () => {
      it('should merge components from both scopes with project taking precedence', async () => {
        const modes = await mementoCore.getComponentsByType('mode');
        
        expect(modes).toHaveLength(1); // architect exists in both, project takes precedence
        expect(modes[0].name).toBe('architect');
        expect(modes[0].metadata?.source).toBe('project');
        
        const workflows = await mementoCore.getComponentsByType('workflow');
        
        expect(workflows).toHaveLength(2); // Both workflows exist
        expect(workflows.map(w => w.name).sort()).toEqual(['global-workflow', 'project-workflow']);
      });

      it('should return sorted components', async () => {
        // Add more components to test sorting
        fs.writeFileSync(
          path.join(globalDir, 'modes', 'zebra.md'),
          '# Zebra Mode'
        );
        fs.writeFileSync(
          path.join(projectDir, 'modes', 'alpha.md'),
          '# Alpha Mode'
        );

        const modes = await mementoCore.getComponentsByType('mode');
        const names = modes.map(m => m.name);
        
        expect(names).toEqual(['alpha', 'architect', 'zebra']);
      });
    });

    describe('listComponents()', () => {
      it('should return components organized by type', async () => {
        const components = await mementoCore.listComponents();
        
        expect(components.modes).toHaveLength(1);
        expect(components.workflows).toHaveLength(2);
        expect(components.scripts).toHaveLength(0);
        expect(components.hooks).toHaveLength(0);
        expect(components.agents).toHaveLength(0);
        expect(components.commands).toHaveLength(0);
        expect(components.templates).toHaveLength(0);
      });
    });

    describe('getAllComponents()', () => {
      it('should return all components as a flat sorted list', async () => {
        const components = await mementoCore.getAllComponents();
        
        expect(components).toHaveLength(3);
        expect(components.map(c => c.name)).toEqual(['architect', 'global-workflow', 'project-workflow']);
        expect(components.map(c => c.type)).toEqual(['mode', 'workflow', 'workflow']);
      });
    });
  });

  describe('configuration management', () => {
    describe('saveConfig()', () => {
      it('should save to project scope by default', async () => {
        const testConfig: MementoConfig = {
          defaultMode: 'test',
          ui: { colorOutput: false }
        };

        await mementoCore.saveConfig(testConfig, false);
        
        const projectConfigPath = path.join(projectDir, 'config.yaml');
        expect(fs.existsSync(projectConfigPath)).toBe(true);
        
        const savedContent = fs.readFileSync(projectConfigPath, 'utf-8');
        const savedConfig = yaml.load(savedContent) as MementoConfig;
        expect(savedConfig).toEqual(testConfig);
      });

      it('should save to global scope when requested', async () => {
        const testConfig: MementoConfig = {
          defaultMode: 'global-test'
        };

        await mementoCore.saveConfig(testConfig, true);
        
        const globalConfigPath = path.join(globalDir, 'config.yaml');
        expect(fs.existsSync(globalConfigPath)).toBe(true);
        
        const savedContent = fs.readFileSync(globalConfigPath, 'utf-8');
        const savedConfig = yaml.load(savedContent) as MementoConfig;
        expect(savedConfig).toEqual(testConfig);
      });
    });

    describe('getConfigValue() and setConfigValue()', () => {
      it('should get and set nested configuration values', async () => {
        await mementoCore.setConfigValue('ui.colorOutput', false);
        await mementoCore.setConfigValue('integrations.github.token', 'secret');

        expect(await mementoCore.getConfigValue('ui.colorOutput')).toBe(false);
        expect(await mementoCore.getConfigValue('integrations.github.token')).toBe('secret');
      });

      it('should return undefined for non-existent keys', async () => {
        const value = await mementoCore.getConfigValue('nonexistent.key');
        expect(value).toBeUndefined();
      });

      it('should save to global scope when requested', async () => {
        await mementoCore.setConfigValue('defaultMode', 'global', true);
        
        const globalConfigPath = path.join(globalDir, 'config.yaml');
        const content = fs.readFileSync(globalConfigPath, 'utf-8');
        const config = yaml.load(content) as MementoConfig;
        
        expect(config.defaultMode).toBe('global');
      });
    });

    describe('unsetConfigValue()', () => {
      it('should remove configuration keys', async () => {
        // Set some values first
        await mementoCore.setConfigValue('defaultMode', 'test');
        await mementoCore.setConfigValue('ui.colorOutput', false);
        
        // Unset one value
        await mementoCore.unsetConfigValue('defaultMode');
        
        expect(await mementoCore.getConfigValue('defaultMode')).toBeUndefined();
        expect(await mementoCore.getConfigValue('ui.colorOutput')).toBe(false);
      });

      it('should handle non-existent keys gracefully', async () => {
        await expect(mementoCore.unsetConfigValue('nonexistent.key')).resolves.not.toThrow();
      });
    });
  });

  describe('scope management', () => {


    it('should return correct scope paths', () => {
      const paths = mementoCore.getScopePaths();
      
      expect(paths.global).toBe(globalDir);
      expect(paths.project).toBe(projectDir);
    });

    it('should provide access to scope instances', () => {
      const scopes = mementoCore.getScopes();
      
      expect(scopes.global.getPath()).toBe(globalDir);
      expect(scopes.global.getIsGlobal()).toBe(true);
      expect(scopes.project.getPath()).toBe(projectDir);
      expect(scopes.project.getIsGlobal()).toBe(false);
    });
  });

  describe('getStatus()', () => {
    it('should return comprehensive status information', async () => {
      // Set up some components and configs
      fs.mkdirSync(path.join(globalDir, 'modes'), { recursive: true });
      fs.writeFileSync(path.join(globalDir, 'modes', 'test.md'), '# Test');
      
      const globalConfig: MementoConfig = { defaultMode: 'test' };
      fs.writeFileSync(
        path.join(globalDir, 'config.yaml'),
        yaml.dump(globalConfig)
      );

      const status = await mementoCore.getStatus();
      
      expect(status.global.exists).toBe(true);
      expect(status.global.path).toBe(globalDir);
      expect(status.global.components).toBe(1);
      expect(status.global.hasConfig).toBe(true);
      
      expect(status.project.exists).toBe(true);
      expect(status.project.path).toBe(projectDir);
      expect(status.project.components).toBe(0);
      expect(status.project.hasConfig).toBe(false);
      
      expect(status.totalComponents).toBe(1);
    });
  });

  describe('clearCache()', () => {
    it('should clear all caches', async () => {
      // Load data to populate caches
      await mementoCore.getConfig();
      await mementoCore.getAllComponents();

      // Create a config file
      const config: MementoConfig = { defaultMode: 'original' };
      fs.writeFileSync(
        path.join(projectDir, 'config.yaml'),
        yaml.dump(config)
      );

      // Clear cache
      mementoCore.clearCache();

      // Modify config file directly
      const newConfig: MementoConfig = { defaultMode: 'modified' };
      fs.writeFileSync(
        path.join(projectDir, 'config.yaml'),
        yaml.dump(newConfig)
      );

      // Should reload from disk
      const reloadedConfig = await mementoCore.getConfig();
      expect(reloadedConfig.defaultMode).toBe('modified');
    });
  });

  describe('environment variable handling', () => {
    it('should handle all supported environment variables', async () => {
      process.env.ZCC_DEFAULT_MODE = 'env-architect';
      process.env.ZCC_COLOR_OUTPUT = 'false';
      process.env.ZCC_VERBOSE = 'true';

      // Create base config
      const baseConfig: MementoConfig = {
        defaultMode: 'base',
        ui: {
          colorOutput: true,
          verboseLogging: false
        }
      };
      fs.writeFileSync(
        path.join(projectDir, 'config.yaml'),
        yaml.dump(baseConfig)
      );

      const config = await mementoCore.getConfig();
      
      // Environment should override
      expect(config.defaultMode).toBe('env-architect');
      expect(config.ui?.colorOutput).toBe(false);
      expect(config.ui?.verboseLogging).toBe(true);

      // Cleanup
      delete process.env.ZCC_DEFAULT_MODE;
      delete process.env.ZCC_COLOR_OUTPUT;
      delete process.env.ZCC_VERBOSE;
    });

    it('should ignore unset environment variables', async () => {
      const config = await mementoCore.getConfig();
      
      expect(config.defaultMode).toBeUndefined();
      expect(config.ui?.colorOutput).toBe(true); // Default
      expect(config.ui?.verboseLogging).toBe(false); // Default
    });
  });

  describe('error handling', () => {
    it('should handle missing directories gracefully', async () => {
      // Remove both directories
      fs.rmSync(globalDir, { recursive: true, force: true });
      fs.rmSync(projectDir, { recursive: true, force: true });

      // Should still work with defaults
      const config = await mementoCore.getConfig();
      expect(config).toEqual({
        ui: {
          colorOutput: true,
          verboseLogging: false
        }
      });

      const components = await mementoCore.getAllComponents();
      expect(components).toEqual([]);
    });

    it('should handle corrupt config files', async () => {
      // Create invalid YAML
      fs.writeFileSync(
        path.join(projectDir, 'config.yaml'),
        'invalid: yaml: content: ['
      );

      await expect(mementoCore.getConfig()).rejects.toThrow();
    });
  });
});