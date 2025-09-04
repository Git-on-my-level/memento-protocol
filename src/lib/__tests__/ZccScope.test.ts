import * as yaml from 'js-yaml';
import { ZccScope } from '../ZccScope';
import { ZccConfig } from '../configSchema';
import { createTestFileSystem, MemoryFileSystemAdapter } from '../testing';

describe('ZccScope', () => {
  let testDir: string;
  let fs: MemoryFileSystemAdapter;
  let mementoScope: ZccScope;

  beforeEach(async () => {
    // Create in-memory filesystem for each test
    testDir = '/test-scope';
    fs = await createTestFileSystem({});
    // Create the directory explicitly
    await fs.mkdir(testDir, { recursive: true });
    mementoScope = new ZccScope(testDir, false, fs);
  });

  describe('constructor and basic properties', () => {
    it('should create a scope with correct properties', () => {
      expect(mementoScope.getPath()).toBe(testDir);
      expect(mementoScope.getIsGlobal()).toBe(false);
    });

    it('should create a global scope correctly', () => {
      const globalScope = new ZccScope('/tmp/global', true, fs);
      expect(globalScope.getIsGlobal()).toBe(true);
    });
  });

  describe('exists()', () => {
    it('should return true when directory exists', () => {
      expect(mementoScope.exists()).toBe(true);
    });

    it('should return false when directory does not exist', async () => {
      await fs.rmdir(testDir);
      expect(mementoScope.exists()).toBe(false);
    });
  });

  describe('getConfig() and saveConfig()', () => {
    it('should return null when config.yaml does not exist', async () => {
      const config = await mementoScope.getConfig();
      expect(config).toBeNull();
    });

    it('should save and load configuration correctly', async () => {
      const testConfig: ZccConfig = {
        defaultMode: 'architect',
        preferredWorkflows: ['review', 'refactor'],
        ui: {
          colorOutput: false,
          verboseLogging: true
        }
      };

      await mementoScope.saveConfig(testConfig);
      
      // Check that file was created
      const configPath = fs.join(testDir, 'config.yaml');
      expect(fs.existsSync(configPath)).toBe(true);

      // Load and verify
      const loadedConfig = await mementoScope.getConfig();
      expect(loadedConfig).toEqual(testConfig);
    });

    it('should cache configuration after first load', async () => {
      const testConfig: ZccConfig = {
        defaultMode: 'engineer'
      };

      await mementoScope.saveConfig(testConfig);
      
      // First load
      const config1 = await mementoScope.getConfig();
      
      // Modify file directly
      const configPath = fs.join(testDir, 'config.yaml');
      fs.writeFileSync(configPath, yaml.dump({ defaultMode: 'different' }));
      
      // Second load should return cached result
      const config2 = await mementoScope.getConfig();
      expect(config2).toEqual(config1);
      expect(config2?.defaultMode).toBe('engineer');
    });

    it('should invalidate cache after saving', async () => {
      const config1: ZccConfig = { defaultMode: 'architect' };
      const config2: ZccConfig = { defaultMode: 'engineer' };

      await mementoScope.saveConfig(config1);
      const loaded1 = await mementoScope.getConfig();
      expect(loaded1?.defaultMode).toBe('architect');

      await mementoScope.saveConfig(config2);
      const loaded2 = await mementoScope.getConfig();
      expect(loaded2?.defaultMode).toBe('engineer');
    });

    it('should handle YAML parsing errors gracefully', async () => {
      const configPath = fs.join(testDir, 'config.yaml');
      fs.writeFileSync(configPath, 'invalid: yaml: content: [');

      await expect(mementoScope.getConfig()).rejects.toThrow('Failed to parse project config.yaml');
    });

    it('should create directory when saving if it does not exist', async () => {
      const newDir = fs.join(testDir, 'nested', 'deep');
      const nestedScope = new ZccScope(newDir, false, fs);
      
      const testConfig: ZccConfig = { defaultMode: 'test' };
      await nestedScope.saveConfig(testConfig);

      expect(fs.existsSync(newDir)).toBe(true);
      expect(fs.existsSync(fs.join(newDir, 'config.yaml'))).toBe(true);
    });
  });

  describe('component discovery', () => {
    beforeEach(async () => {
      // Create directory structure with components
      const dirs = ['modes', 'workflows', 'scripts', 'hooks', 'agents', 'commands', 'templates'];
      for (const dir of dirs) {
        await fs.mkdir(fs.join(testDir, dir), { recursive: true });
      }

      // Create some test components
      await fs.writeFile(
        fs.join(testDir, 'modes', 'architect.md'),
        '---\nname: architect\ndescription: Architecture mode\n---\n# Architect Mode'
      );
      
      await fs.writeFile(
        fs.join(testDir, 'modes', 'engineer.md'),
        '# Engineer Mode'
      );
      
      await fs.writeFile(
        fs.join(testDir, 'workflows', 'review.md'),
        '# Review Workflow'
      );
      
      await fs.writeFile(
        fs.join(testDir, 'scripts', 'helper.sh'),
        '#!/bin/bash\necho "helper"'
      );

      await fs.writeFile(
        fs.join(testDir, 'hooks', 'example.json'),
        '{"name": "example", "type": "hook"}'
      );
    });

    it('should discover all components', async () => {
      const components = await mementoScope.getComponents();
      
      expect(components).toHaveLength(5);
      
      const modes = components.filter(c => c.type === 'mode');
      expect(modes).toHaveLength(2);
      expect(modes.map(m => m.name).sort()).toEqual(['architect', 'engineer']);
      
      const workflows = components.filter(c => c.type === 'workflow');
      expect(workflows).toHaveLength(1);
      expect(workflows[0].name).toBe('review');
      
      const scripts = components.filter(c => c.type === 'script');
      expect(scripts).toHaveLength(1);
      expect(scripts[0].name).toBe('helper');

      const hooks = components.filter(c => c.type === 'hook');
      expect(hooks).toHaveLength(1);
      expect(hooks[0].name).toBe('example');
    });

    it('should cache components after first discovery', async () => {
      // First call
      const components1 = await mementoScope.getComponents();
      
      // Add a new component
      await fs.writeFile(fs.join(testDir, 'modes', 'new.md'), '# New Mode');
      
      // Second call should return cached results
      const components2 = await mementoScope.getComponents();
      expect(components2).toEqual(components1);
      expect(components2).toHaveLength(5); // Should not include the new component
    });

    it('should extract metadata from markdown frontmatter', async () => {
      const components = await mementoScope.getComponents();
      
      const architect = components.find(c => c.name === 'architect');
      expect(architect).toBeDefined();
      expect(architect?.metadata).toEqual({
        name: 'architect',
        description: 'Architecture mode'
      });
      
      const engineer = components.find(c => c.name === 'engineer');
      expect(engineer?.metadata).toEqual({});
    });

    it('should extract metadata from JSON files', async () => {
      const components = await mementoScope.getComponents();
      
      const hook = components.find(c => c.name === 'example');
      expect(hook?.metadata).toEqual({
        name: 'example',
        type: 'hook'
      });
    });

    it('should handle empty component directories', async () => {
      // Remove all components
      const dirs = ['modes', 'workflows', 'scripts', 'hooks', 'agents', 'commands', 'templates'];
      for (const dir of dirs) {
        const dirPath = fs.join(testDir, dir);
        if (fs.existsSync(dirPath)) {
          await fs.rmdir(dirPath);
        }
      }

      const components = await mementoScope.getComponents();
      expect(components).toEqual([]);
    });

    it('should return empty array when scope does not exist', async () => {
      await fs.rmdir(testDir);
      
      const components = await mementoScope.getComponents();
      expect(components).toEqual([]);
    });
  });

  describe('getComponent()', () => {
    beforeEach(async () => {
      await fs.mkdir(fs.join(testDir, 'modes'), { recursive: true });
      await fs.writeFile(
        fs.join(testDir, 'modes', 'architect.md'),
        '# Architect Mode'
      );
    });

    it('should find specific component', async () => {
      const component = await mementoScope.getComponent('architect', 'mode');
      
      expect(component).toBeDefined();
      expect(component?.name).toBe('architect');
      expect(component?.type).toBe('mode');
      expect(component?.path).toBe(fs.join(testDir, 'modes', 'architect.md'));
    });

    it('should return null for non-existent component', async () => {
      const component = await mementoScope.getComponent('nonexistent', 'mode');
      expect(component).toBeNull();
    });

    it('should return null for wrong type', async () => {
      const component = await mementoScope.getComponent('architect', 'workflow');
      expect(component).toBeNull();
    });
  });

  describe('getComponentsByType()', () => {
    beforeEach(async () => {
      await fs.mkdir(fs.join(testDir, 'modes'), { recursive: true });
      await fs.mkdir(fs.join(testDir, 'workflows'), { recursive: true });
      
      await fs.writeFile(fs.join(testDir, 'modes', 'architect.md'), '# Architect');
      await fs.writeFile(fs.join(testDir, 'modes', 'engineer.md'), '# Engineer');
      await fs.writeFile(fs.join(testDir, 'workflows', 'review.md'), '# Review');
    });

    it('should return all components of specific type', async () => {
      const modes = await mementoScope.getComponentsByType('mode');
      expect(modes).toHaveLength(2);
      expect(modes.map(m => m.name).sort()).toEqual(['architect', 'engineer']);
      
      const workflows = await mementoScope.getComponentsByType('workflow');
      expect(workflows).toHaveLength(1);
      expect(workflows[0].name).toBe('review');
    });

    it('should return empty array for non-existent type', async () => {
      const scripts = await mementoScope.getComponentsByType('script');
      expect(scripts).toEqual([]);
    });
  });

  describe('clearCache()', () => {
    it('should clear both config and component caches', async () => {
      // Set up config and components
      const testConfig: ZccConfig = { defaultMode: 'architect' };
      await mementoScope.saveConfig(testConfig);
      
      await fs.mkdir(fs.join(testDir, 'modes'), { recursive: true });
      await fs.writeFile(fs.join(testDir, 'modes', 'test.md'), '# Test');

      // Load to cache
      await mementoScope.getConfig();
      await mementoScope.getComponents();

      // Clear cache
      mementoScope.clearCache();

      // Modify files
      const configPath = fs.join(testDir, 'config.yaml');
      fs.writeFileSync(configPath, yaml.dump({ defaultMode: 'engineer' }));
      await fs.writeFile(fs.join(testDir, 'modes', 'new.md'), '# New');

      // Should reload from disk
      const config = await mementoScope.getConfig();
      const components = await mementoScope.getComponents();

      expect(config?.defaultMode).toBe('engineer');
      expect(components).toHaveLength(2);
    });
  });

  describe('initialize()', () => {
    beforeEach(async () => {
      // Start with a fresh directory - remove and recreate
      if (fs.existsSync(testDir)) {
        await fs.rmdir(testDir);
      }
      mementoScope = new ZccScope(testDir, false, fs);
    });

    it('should create scope directory and structure', async () => {
      expect(mementoScope.exists()).toBe(false);

      await mementoScope.initialize();

      expect(mementoScope.exists()).toBe(true);
      
      // Check component directories
      const dirs = ['modes', 'workflows', 'scripts', 'hooks', 'agents', 'commands', 'templates'];
      for (const dir of dirs) {
        expect(fs.existsSync(fs.join(testDir, dir))).toBe(true);
      }
    });

    it('should create default config file', async () => {
      await mementoScope.initialize();

      const configPath = fs.join(testDir, 'config.yaml');
      expect(fs.existsSync(configPath)).toBe(true);

      const config = await mementoScope.getConfig();
      expect(config).toEqual({
        ui: {
          colorOutput: true,
          verboseLogging: false
        }
      });
    });

    it('should not overwrite existing config', async () => {
      // Create scope manually with custom config
      await fs.mkdir(testDir, { recursive: true });
      const existingConfig: ZccConfig = {
        defaultMode: 'existing'
      };
      await mementoScope.saveConfig(existingConfig);

      // Initialize should not overwrite
      await mementoScope.initialize();

      const config = await mementoScope.getConfig();
      expect(config?.defaultMode).toBe('existing');
    });
  });

  describe('metadata extraction', () => {
    beforeEach(async () => {
      await fs.mkdir(fs.join(testDir, 'test'), { recursive: true });
    });

    it('should extract metadata from YAML files', async () => {
      const yamlPath = fs.join(testDir, 'test', 'config.yaml');
      await fs.writeFile(yamlPath, yaml.dump({
        name: 'test',
        version: '1.0.0'
      }));

      const testScope = new ZccScope(fs.join(testDir, 'test'), false, fs);
      const metadata = await (testScope as any).extractMetadata(yamlPath);
      
      expect(metadata).toEqual({
        name: 'test',
        version: '1.0.0'
      });
    });

    it('should provide basic file info for unknown file types', async () => {
      const txtPath = fs.join(testDir, 'test', 'readme.txt');
      await fs.writeFile(txtPath, 'Hello world');

      const testScope = new ZccScope(fs.join(testDir, 'test'), false, fs);
      const metadata = await (testScope as any).extractMetadata(txtPath);
      
      expect(metadata.extension).toBe('.txt');
      expect(metadata.size).toBeGreaterThan(0);
      expect(metadata.modified).toBeDefined();
    });

    it('should handle file reading errors gracefully', async () => {
      const nonExistentPath = fs.join(testDir, 'test', 'nonexistent.md');
      
      const testScope = new ZccScope(fs.join(testDir, 'test'), false, fs);
      const metadata = await (testScope as any).extractMetadata(nonExistentPath);
      
      expect(metadata).toEqual({});
    });
  });
});